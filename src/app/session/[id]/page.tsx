"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { PICKER_LANGUAGES } from "@/lib/languages";

const STORAGE_KEY_NAME = "lt.displayName";
const STORAGE_KEY_LANG  = "lt.lang";

/** Reverse the base64url encoding done in page.tsx → room name */
function decodeSessionId(sessionId: string): string {
  try {
    const base64 = sessionId
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(sessionId.length + ((4 - (sessionId.length % 4)) % 4), "=");
    return atob(base64);
  } catch {
    return sessionId;
  }
}

// "loading"   — waiting for first API response
// "exists"    — LiveKit confirms the room is alive → anyone may join
// "not_found" — room not on LiveKit server → guest sees waiting lobby, host may proceed
// "ended"     — room was live but is now gone → call has ended
// "error"     — API call failed (network/server) → fail open (allow join)
type RoomCheckState = "loading" | "exists" | "not_found" | "ended" | "error";

// How often to poll while waiting for the room to appear (guest lobby)
const POLL_WAITING_MS = 5_000;
// How often to poll once the room is known to be live (detect when it ends)
const POLL_LIVE_MS    = 4_000;

export default function PreFlightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }   = use(params);
  const router   = useRouter();
  const { user, isLoaded } = useUser();

  const [displayName, setDisplayName] = useState("");
  const [lang, setLang]               = useState<string>("en");
  const [shareCopied, setShareCopied] = useState(false);

  // ── Room existence check ────────────────────────────────────────────────
  const [roomCheck, setRoomCheck] = useState<RoomCheckState>("loading");

  const liveKitRoom = decodeSessionId(id);

  // Continuously poll room existence so we detect both:
  //   • room appearing  (not_found → exists)   — guest waiting for host
  //   • room disappearing (exists → ended)     — host ended the call
  //
  // Polling interval switches once we know the room is live:
  //   • While waiting  → 5s (low priority, saves requests)
  //   • While live     → 4s (faster detection of call ending)
  //
  // We never stop polling while the page is open (unless we reach "ended"
  // or "error"). Previously the loop stopped on first exists:true which
  // meant guests were stuck on "Session is live" indefinitely after the
  // host ended the call.
  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    // Track whether the room was ever seen as live so we can distinguish
    // "never existed" (not_found) from "used to exist, now gone" (ended).
    let wasEverLive = false;

    async function check() {
      try {
        const r = await fetch(`/api/session/exists?room=${encodeURIComponent(liveKitRoom)}`);
        const data = await r.json();
        if (cancelled) return;

        if (data.exists === true) {
          wasEverLive = true;
          setRoomCheck("exists");
          // Room is live — re-poll at faster interval to detect when it ends
          pollTimer = setTimeout(check, POLL_LIVE_MS);
        } else {
          // Room not on LiveKit
          if (wasEverLive) {
            // Was live before → host ended the call
            setRoomCheck("ended");
            // Stop polling — call is definitively over
            return;
          }
          // Never been live → host hasn't started yet
          setRoomCheck("not_found");
          pollTimer = setTimeout(check, POLL_WAITING_MS);
        }
      } catch {
        if (cancelled) return;
        setRoomCheck("error"); // fail open — don't block on network error
        return;
      }
    }

    check();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [liveKitRoom]);

  // Pre-fill name from Clerk profile or sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const clerkName = user?.fullName ?? user?.firstName ?? "";
    if (clerkName) {
      setDisplayName(clerkName);
    } else {
      const saved = window.sessionStorage.getItem(STORAGE_KEY_NAME);
      if (saved) setDisplayName(saved);
    }
    const savedLang = window.sessionStorage.getItem(STORAGE_KEY_LANG);
    if (savedLang) setLang(savedLang);
  }, [user]);

  // ── Derived: is this user allowed to join? ──────────────────────────────
  // Signed-in user  → always allowed (they may be the host creating a fresh room)
  // Guest           → only allowed if the room is confirmed active on LiveKit
  const isSignedIn  = isLoaded && !!user;
  const isGuest     = isLoaded && !user;
  const roomActive  = roomCheck === "exists";
  const guestBlocked = isGuest && roomCheck === "not_found";

  function handleJoin() {
    if (!displayName.trim()) return;
    if (guestBlocked) return; // safety — button is disabled
    window.sessionStorage.setItem(STORAGE_KEY_NAME, displayName.trim());
    window.sessionStorage.setItem(STORAGE_KEY_LANG, lang);
    router.push(`/session/${id}/room`);
  }

  async function copyInviteLink() {
    const url = `${window.location.origin}/session/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // ignored
    }
  }

  // ── "Call has ended" screen — room was live but is now gone ────────────
  // Shown to guests when the host ends the call while they are on the
  // waiting lobby or after having been disconnected and returned here.
  if (isGuest && roomCheck === "ended") {
    return (
      <div className="page">
        <div className="container" style={{ textAlign: "center" }}>
          <Image
            src="/logo.png"
            alt="AiOnPhone"
            width={44}
            height={44}
            priority
            style={{ borderRadius: "50%", marginBottom: 20 }}
          />
          <h1 className="display display-md" style={{ marginBottom: 12 }}>
            The call has ended
          </h1>
          <p className="body" style={{ marginBottom: 32, color: "var(--fg-secondary)" }}>
            The host has ended this session. Thank you for joining!
          </p>
          <button className="btn btn-outline" onClick={() => router.push("/")}>
            Back to home
          </button>
        </div>
      </div>
    );
  }

  // ── Waiting lobby for guests — host hasn't started yet ─────────────────
  // Instead of a dead-end error, guests see a friendly "waiting for host"
  // screen. The polling loop above will flip roomCheck to "exists" the moment
  // the host joins, which re-renders this component into the join form.
  if (isGuest && roomCheck === "not_found") {
    return (
      <div className="page">
        <div className="container" style={{ textAlign: "center" }}>
          <Image
            src="/logo.png"
            alt="AiOnPhone"
            width={44}
            height={44}
            priority
            style={{ borderRadius: "50%", marginBottom: 20 }}
          />
          <h1 className="display display-md" style={{ marginBottom: 12 }}>
            Waiting for host to start…
          </h1>
          <p className="body" style={{ marginBottom: 24, color: "var(--fg-secondary)" }}>
            The host hasn&apos;t started the call yet. You&apos;ll be able to
            join as soon as they do — this page checks automatically.
          </p>
          {/* Animated dots to show it's actively checking */}
          <div
            style={{
              display:        "flex",
              justifyContent: "center",
              alignItems:     "center",
              gap:            6,
              marginBottom:   32,
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width:            8,
                  height:           8,
                  borderRadius:     "50%",
                  background:       "var(--fg-secondary)",
                  display:          "inline-block",
                  animation:        `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  opacity:          0.5,
                }}
              />
            ))}
          </div>
          <style>{`
            @keyframes pulse {
              0%, 100% { transform: scale(1);   opacity: 0.4; }
              50%       { transform: scale(1.4); opacity: 1;   }
            }
          `}</style>
          <button className="btn btn-outline" onClick={() => router.push("/")}>
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        {/* Brand logo */}
        <div className="preflight-brand enter">
          <Image
            src="/logo.png"
            alt="Mednaath AiOnPhone"
            width={44}
            height={44}
            priority
            style={{ borderRadius: "50%" }}
          />
          <span className="preflight-brand-name">AiOnPhone</span>
        </div>

        <h1 className="display display-lg enter" style={{ marginBottom: 8 }}>
          Join the call
        </h1>
        <p className="body enter-d1" style={{ marginBottom: 36 }}>
          Pick your language — that&apos;s what you&apos;ll speak and hear
          everyone else in.
        </p>

        {/* Room status indicator — only shown while checking */}
        {roomCheck === "loading" && (
          <div
            className="enter"
            style={{
              display:       "flex",
              alignItems:    "center",
              gap:           8,
              marginBottom:  20,
              color:         "var(--fg-secondary)",
              fontSize:      13,
            }}
          >
            <span className="spinner" style={{ width: 14, height: 14 }} />
            Checking session…
          </div>
        )}

        {/* Active room badge — reassures the guest the call is live */}
        {roomActive && isGuest && (
          <div
            className="enter"
            style={{
              display:       "inline-flex",
              alignItems:    "center",
              gap:           6,
              marginBottom:  20,
              padding:       "4px 10px",
              borderRadius:  20,
              background:    "rgba(0,200,100,0.12)",
              color:         "#00c864",
              fontSize:      12,
              fontWeight:    600,
            }}
          >
            <span
              style={{
                width:        7,
                height:       7,
                borderRadius: "50%",
                background:   "#00c864",
                display:      "inline-block",
              }}
            />
            Session is live
          </div>
        )}

        <div
          className="enter-d2"
          style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 32 }}
        >
          <label style={{ display: "block" }}>
            <span className="label" style={{ display: "block", marginBottom: 8 }}>
              Your name
            </span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="e.g. Jesse"
              autoFocus
              className="select-field"
              maxLength={40}
            />
          </label>

          <label style={{ display: "block" }}>
            <span className="label" style={{ display: "block", marginBottom: 8 }}>
              Language
            </span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="select-field"
            >
              {PICKER_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          className="enter-d3"
          style={{ display: "flex", gap: 10, flexDirection: "column" }}
        >
          <button
            className="btn btn-dark"
            style={{ width: "100%" }}
            onClick={handleJoin}
            // Disable while still checking, or if guest + room not found / ended
            disabled={
              !displayName.trim() ||
              roomCheck === "loading" ||
              guestBlocked ||
              roomCheck === "ended"
            }
            id="join-btn"
          >
            {roomCheck === "loading" ? "Checking…" : "Join the call"}
          </button>

          {/* Only show invite copy for signed-in users (hosts) */}
          {isSignedIn && (
            <button
              className="btn btn-outline"
              style={{ width: "100%" }}
              onClick={copyInviteLink}
            >
              {shareCopied ? "Link copied" : "Copy invite link"}
            </button>
          )}
        </div>

        <p className="mono enter-d4" style={{ marginTop: 32 }}>
          Camera and mic stay off until you turn them on.
        </p>
      </div>
    </div>
  );
}
