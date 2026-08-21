"use client";

/**
 * ParticipantsPanel — slide-in sidebar listing all participants.
 *
 * Shows:
 *   - Local participant (You · Host or You · Guest)
 *   - Remote web participants (human, non-agent)
 *   - SIP (phone) participants
 *
 * Host controls (only visible when isHost === true):
 *   - Mute mic  button  → POST /api/participants/mute (source: microphone)
 *   - Mute cam  button  → POST /api/participants/mute (source: camera) — web only
 *   - "Kick"    button  → DELETE /api/participants/remove
 *   - "Hang up" button  → DELETE /api/sip/invite
 *
 * Kicked/hung-up participants are immediately removed from LiveKit by the
 * server; the LiveKit room events will remove them from the UI automatically
 * via useRemoteParticipants().
 *
 * Muted state is read from participant.getTrackPublication(source).isMuted
 * so the button reflects the current server-side mute status.
 *
 */

import { useCallback, useState } from "react";
import DtmfKeypad from "./DtmfKeypad";
import { ParticipantKind, Track } from "livekit-client";
import type { RemoteParticipant, LocalParticipant as LKLocalParticipant } from "livekit-client";
import { getLanguageByCode } from "@/lib/languages";
import { PARTICIPANT_LANG_ATTR } from "@/lib/config";

// ── Types ────────────────────────────────────────────────────────────────────

type ActionState = "idle" | "busy" | "done" | "error";


// ── Mute toggle button ────────────────────────────────────────────────────────

/**
 * MuteButton — toggles server-side mute for one track source on a participant.
 *
 * @param participant  The RemoteParticipant whose track to mute/unmute.
 * @param source       Track.Source.Microphone | Track.Source.Camera
 * @param roomName     LiveKit room name (needed for the API call).
 */
function MuteButton({
  participant,
  source,
  roomName,
}: {
  participant: RemoteParticipant;
  source:      Track.Source.Microphone | Track.Source.Camera;
  roomName:    string;
}) {
  const pub = participant.getTrackPublication(source);
  // If the participant doesn't publish this track source at all, hide the button.
  if (!pub) return null;

  const isMic  = source === Track.Source.Microphone;
  const isMuted = pub.isMuted;
  const trackSid = pub.trackSid;

  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState("");

  const toggle = useCallback(async () => {
    if (busy || !trackSid) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/participants/mute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          room:     roomName,
          identity: participant.identity,
          trackSid,
          muted:    !isMuted,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error || `HTTP ${res.status}`);
      }
      // LiveKit will push a ParticipantUpdated event which React hooks will
      // pick up automatically — no local state needed for the muted value.
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }, [busy, trackSid, roomName, participant.identity, isMuted]);

  const label = isMic
    ? (isMuted ? "Unmute mic"  : "Mute mic")
    : (isMuted ? "Unmute cam"  : "Mute cam");

  const title = isMic
    ? (isMuted ? "Unmute microphone" : "Mute microphone")
    : (isMuted ? "Unmute camera"     : "Mute camera");

  return (
    <button
      className={`pp-mute-btn${isMuted ? " pp-mute-btn--muted" : ""}`}
      onClick={toggle}
      disabled={busy}
      title={title}
      aria-label={title}
    >
      {busy ? (
        <span className="pp-action-spinner" aria-hidden />
      ) : isMic ? (
        isMuted ? (
          /* Mic-off (slash) icon */
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 1a4 4 0 0 1 4 4v5a4 4 0 0 1-4 4 4 4 0 0 1-4-4V5a4 4 0 0 1 4-4z" stroke="currentColor" strokeWidth="1.8"/>
            <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M19 10a7 7 0 0 1-14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        ) : (
          /* Mic-on icon */
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 1a4 4 0 0 1 4 4v5a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M19 10a7 7 0 0 1-14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        )
      ) : isMuted ? (
        /* Camera-off (slash) icon */
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M16 16H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M22 8l-6 4 6 4V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
          <line x1="2" y1="2" x2="22" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      ) : (
        /* Camera-on icon */
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="2" y="6" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M22 8l-6 4 6 4V8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
        </svg>
      )}
      <span className="pp-mute-label">{label}</span>
      {error && <span className="pp-mute-error" title={error}>!</span>}
    </button>
  );
}

// ── Single participant row ────────────────────────────────────────────────────

function ParticipantRow({
  participant,
  identity,
  name,
  isSip,
  isSelf,
  isHost,
  lang,
  roomName,
  localParticipant,
  onRemoved,
}: {
  participant?:       RemoteParticipant;  // undefined for local participant (self)
  identity:          string;
  name:              string;
  isSip:             boolean;
  isSelf:            boolean;
  isHost:            boolean;
  lang?:             string;
  roomName:          string;
  /** Local participant — used for DTMF on SIP rows */
  localParticipant?: LKLocalParticipant;
  onRemoved:         (identity: string) => void;
}) {
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [errorMsg,    setErrorMsg]    = useState<string>("");

  const langInfo = lang ? getLanguageByCode(lang) : undefined;

  const handleRemove = useCallback(async () => {
    setActionState("busy");
    setErrorMsg("");

    try {
      const endpoint = isSip ? "/api/sip/invite" : "/api/participants/remove";
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, room: roomName }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error || `HTTP ${res.status}`);
      }

      setActionState("done");
      // Notify parent so it can optimistically hide this row while LiveKit
      // catches up with the ParticipantDisconnected event.
      setTimeout(() => onRemoved(identity), 600);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      setErrorMsg(msg);
      setActionState("error");
    }
  }, [identity, isSip, roomName, onRemoved]);

  // For SIP participants, LiveKit sometimes doesn't propagate participantName
  // back to p.name on the RemoteParticipant object — it arrives as "".
  // Fall back chain: p.name → strip "sip_" prefix from identity → raw identity.
  // Also strip any legacy "📞 " prefix that was set before this fix.
  const rawName = isSip
    ? (name.trim() || identity.replace(/^sip_/i, "")).replace(/^📞\s*/, "")
    : (name || identity);

  return (
    <div className={`pp-row${actionState === "done" ? " pp-row--leaving" : ""}`}>
      <span className="pp-avatar" aria-hidden>
        {isSip ? (
          /* Phone / SIP participant icon */
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6.62 10.79a15.053 15.053 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
              fill="currentColor"
            />
          </svg>
        ) : (
          /* Web participant person icon */
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M4 20v-1a8 8 0 0 1 16 0v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        )}
      </span>

      <div className="pp-info">
        <span className="pp-name">
          {rawName}
          {isSelf && <span className="pp-you-badge"> (You)</span>}
        </span>
        {langInfo && (
          <span className="pp-lang">
            {langInfo.flag} {langInfo.name}
          </span>
        )}
        {actionState === "error" && errorMsg && (
          <span className="pp-row-error">{errorMsg}</span>
        )}
      </div>

      {/* DTMF keypad modal — only for SIP rows, host-only */}
      {keypadOpen && localParticipant && isSip && (
        <DtmfKeypad
          localParticipant={localParticipant}
          callerName={rawName}
          onClose={() => setKeypadOpen(false)}
        />
      )}

      {/* Host-only controls — not shown for self */}
      {isHost && !isSelf && participant && (
        <div className="pp-controls">
          {/* ── DTMF keypad button — SIP rows only ──────────────────────── */}
          {isSip && localParticipant && (
            <button
              className="pp-panel-keypad-btn"
              onClick={() => setKeypadOpen(true)}
              title="Open IVR keypad — send DTMF tones mid-call"
              aria-label="Open DTMF keypad"
            >
              <svg width="12" height="12" viewBox="0 0 18 18" fill="none" aria-hidden>
                <rect x="1"  y="1"  width="4" height="4" rx="0.8" fill="currentColor"/>
                <rect x="7"  y="1"  width="4" height="4" rx="0.8" fill="currentColor"/>
                <rect x="13" y="1"  width="4" height="4" rx="0.8" fill="currentColor"/>
                <rect x="1"  y="7"  width="4" height="4" rx="0.8" fill="currentColor"/>
                <rect x="7"  y="7"  width="4" height="4" rx="0.8" fill="currentColor"/>
                <rect x="13" y="7"  width="4" height="4" rx="0.8" fill="currentColor"/>
                <rect x="1"  y="13" width="4" height="4" rx="0.8" fill="currentColor"/>
                <rect x="7"  y="13" width="4" height="4" rx="0.8" fill="currentColor"/>
                <rect x="13" y="13" width="4" height="4" rx="0.8" fill="currentColor"/>
              </svg>
              <span className="pp-panel-keypad-label">Keypad</span>
            </button>
          )}

          {/* ── Mute mic toggle ─────────────────────────────────────────── */}
          <MuteButton
            participant={participant}
            source={Track.Source.Microphone}
            roomName={roomName}
          />

          {/* ── Mute camera toggle — web participants only ─────────────── */}
          {!isSip && (
            <MuteButton
              participant={participant}
              source={Track.Source.Camera}
              roomName={roomName}
            />
          )}

          {/* ── Kick / hang-up ──────────────────────────────────────────── */}
          <button
            className={`pp-action-btn${isSip ? " pp-action-btn--hangup" : " pp-action-btn--kick"}`}
            onClick={handleRemove}
            disabled={actionState === "busy" || actionState === "done"}
            title={isSip ? "Hang up" : "Kick from call"}
          >
            {actionState === "busy" ? (
              <span className="pp-action-spinner" aria-hidden />
            ) : actionState === "done" ? (
              "✓"
            ) : isSip ? (
              /* Phone hang-up icon */
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1 .23l-2.2 2.2a15.097 15.097 0 0 1-6.53-6.53l2.2-2.21a.977.977 0 0 0 .23-1 11.36 11.36 0 0 1-.56-3.53c0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"
                  fill="currentColor"
                />
                <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              /* Remove / kick icon */
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M17 9l-5 5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 4v10M4 20h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
            <span className="pp-action-label">
              {actionState === "done" ? "Done" : isSip ? "Hang up" : "Kick"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function ParticipantsPanel({
  open,
  onClose,
  localParticipant,
  remoteParticipants,
  isHost,
  roomName,
}: {
  open:               boolean;
  onClose:            () => void;
  localParticipant:   LKLocalParticipant;
  remoteParticipants: RemoteParticipant[];
  isHost:             boolean;
  roomName:           string;
}) {
  // Optimistic removal: when the host kicks someone, hide them immediately
  // rather than waiting for the LiveKit room event to propagate.
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  const handleRemoved = useCallback((identity: string) => {
    setRemovedIds((prev) => new Set([...prev, identity]));
  }, []);

  // Separate into web participants and SIP participants, excluding removed ones
  const webRemotes = remoteParticipants.filter(
    (p) =>
      p.kind !== ParticipantKind.AGENT &&
      p.kind !== ParticipantKind.SIP &&
      !removedIds.has(p.identity),
  );

  const sipRemotes = remoteParticipants.filter(
    (p) => p.kind === ParticipantKind.SIP && !removedIds.has(p.identity),
  );

  const totalVisible = 1 + webRemotes.length + sipRemotes.length;
  const localLang = localParticipant.attributes?.[PARTICIPANT_LANG_ATTR];

  return (
    <>
      {/* Backdrop — click to close */}
      {open && (
        <div className="pp-backdrop" onClick={onClose} aria-hidden />
      )}

      {/* Slide-in panel */}
      <aside
        className={`pp-panel${open ? " pp-panel--open" : ""}`}
        aria-label="Participants"
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="pp-header">
          <div className="pp-header-left">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
              <path d="M3 21v-1a6 6 0 0 1 12 0v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M16 11a4 4 0 1 1 0-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M21 21v-1a6 6 0 0 0-5-5.92" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <h2 className="pp-title">
              People
              <span className="pp-count">{totalVisible}</span>
            </h2>
          </div>
          <button className="pp-close" onClick={onClose} aria-label="Close participants panel">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="pp-body">

          {/* ── You (local participant) ────────────────────────────────────── */}
          <div className="pp-section">
            <p className="pp-section-label">You</p>
            <ParticipantRow
              identity={localParticipant.identity}
              name={localParticipant.name || localParticipant.identity}
              isSip={false}
              isSelf={true}
              isHost={isHost}
              lang={localLang}
              roomName={roomName}
              onRemoved={handleRemoved}
            />
          </div>

          {/* ── Web participants ────────────────────────────────────────────── */}
          {webRemotes.length > 0 && (
            <div className="pp-section">
              <p className="pp-section-label">
                In this call · {webRemotes.length}
              </p>
              {webRemotes.map((p) => (
                <ParticipantRow
                  key={p.identity}
                  participant={p}
                  identity={p.identity}
                  name={p.name ?? ""}
                  isSip={false}
                  isSelf={false}
                  isHost={isHost}
                  lang={p.attributes?.[PARTICIPANT_LANG_ATTR]}
                  roomName={roomName}
                  onRemoved={handleRemoved}
                />
              ))}
            </div>
          )}

          {/* ── SIP / phone participants ────────────────────────────────────── */}
          {sipRemotes.length > 0 && (
            <div className="pp-section">
              <p className="pp-section-label">
                Phone · {sipRemotes.length}
              </p>
              {sipRemotes.map((p) => (
                <ParticipantRow
                  key={p.identity}
                  participant={p}
                  identity={p.identity}
                  name={p.name ?? ""}
                  isSip={true}
                  isSelf={false}
                  isHost={isHost}
                  lang={p.attributes?.[PARTICIPANT_LANG_ATTR]}
                  roomName={roomName}
                  localParticipant={localParticipant}
                  onRemoved={handleRemoved}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {webRemotes.length === 0 && sipRemotes.length === 0 && (
            <p className="pp-empty">No other participants yet.</p>
          )}
        </div>
      </aside>
    </>
  );
}
