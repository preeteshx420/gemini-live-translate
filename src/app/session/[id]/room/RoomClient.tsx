"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { LiveKitRoom } from "@livekit/components-react";
import "@livekit/components-styles";
import InCall from "./InCall";

const STORAGE_KEY_NAME     = "lt.displayName";
const STORAGE_KEY_LANG     = "lt.lang";
const STORAGE_KEY_GUEST_ID = "lt.guestId";

interface TokenResponse {
  token: string;
  serverUrl: string;
}

/**
 * Decode the public session ID back to the LiveKit room name.
 *
 * Encoding (done in page.tsx):
 *   roomName  = "jesse@company.com-a3f9b2"
 *   sessionId = base64url(roomName) → "amVzc2VAY29tcGFueS5jb20tYTNmOWIy"
 *
 * Decoding here:
 *   base64url → base64 → roomName
 */
function decodeSessionId(sessionId: string): string {
  try {
    const base64 = sessionId
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(sessionId.length + ((4 - (sessionId.length % 4)) % 4), "=");
    return atob(base64);
  } catch {
    // If decoding fails (e.g. legacy UUID room), use as-is
    return sessionId;
  }
}

/**
 * Generate (or reuse) a stable guest ID for this browser session.
 * Stored in sessionStorage so the same tab keeps the same identity on
 * reconnect, but a new tab / new browser gets a fresh one.
 */
function getOrCreateGuestId(): string {
  const existing = window.sessionStorage.getItem(STORAGE_KEY_GUEST_ID);
  if (existing) return existing;
  const id = "guest-" + Math.random().toString(36).slice(2, 10);
  window.sessionStorage.setItem(STORAGE_KEY_GUEST_ID, id);
  return id;
}

export default function RoomClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  // useUser() is still imported so signed-in users get a stable Clerk identity.
  // Guests (not signed in) get a "guest-XXXXXXXX" identity instead.
  // No auth redirect here — anyone with the link can join.
  const { user, isLoaded } = useUser();

  const [token, setToken]             = useState<string | null>(null);
  const [serverUrl, setServerUrl]     = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [initialLang, setInitialLang] = useState<string>("en");
  const [identity, setIdentity]       = useState<string | null>(null);

  // The LiveKit room name is the base64-decoded session ID
  const liveKitRoom = decodeSessionId(sessionId);

  // Resolve identity once Clerk has finished loading:
  //   - Signed-in users  → stable Clerk user.id
  //   - Guests           → "guest-XXXXXXXX" (persisted in sessionStorage)
  useEffect(() => {
    if (!isLoaded) return;
    if (user) {
      setIdentity(user.id);
    } else {
      setIdentity(getOrCreateGuestId());
    }
  }, [isLoaded, user]);

  // Pull name + lang chosen on the pre-flight screen
  useEffect(() => {
    if (typeof window === "undefined") return;
    const name = window.sessionStorage.getItem(STORAGE_KEY_NAME);
    const lang = window.sessionStorage.getItem(STORAGE_KEY_LANG);
    if (!name || !lang) {
      // No pre-flight data — send back to the join page
      router.replace(`/session/${sessionId}`);
      return;
    }
    setDisplayName(name);
    setInitialLang(lang);
  }, [router, sessionId]);

  // Mint a LiveKit token once we have identity + displayName
  useEffect(() => {
    if (!identity || !displayName) return;

    const url =
      `/api/token` +
      `?room=${encodeURIComponent(liveKitRoom)}` +
      `&identity=${encodeURIComponent(identity)}` +
      `&name=${encodeURIComponent(displayName)}`;

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Token request failed (${res.status})`);
        }
        return res.json() as Promise<TokenResponse>;
      })
      .then((data) => {
        setToken(data.token);
        setServerUrl(data.serverUrl);
      })
      .catch((err) => setError(err.message));
  }, [liveKitRoom, identity, displayName]);

  function handleLeave() {
    router.push("/");
  }

  if (error) {
    return (
      <div className="page">
        <div className="container" style={{ textAlign: "center" }}>
          <h1 className="display display-md" style={{ marginBottom: 16 }}>
            Couldn&apos;t join the call
          </h1>
          <p className="body" style={{ marginBottom: 24 }}>
            {error}
          </p>
          <button className="btn btn-outline" onClick={() => router.push("/")}>
            Back to home
          </button>
        </div>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="page">
        <div className="container" style={{ textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }} />
          <p className="mono">Connecting…</p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      video={false}
      audio={false}
      connect={true}
      onDisconnected={handleLeave}
      data-lk-theme="default"
      style={{ height: "100dvh", minHeight: "-webkit-fill-available", background: "var(--bg)", overflow: "hidden" }}
    >
      {/* InCall renders RoomAudioRenderer internally — no need to add it here. */}
      <InCall initialLang={initialLang} onLeave={handleLeave} />
    </LiveKitRoom>
  );
}
