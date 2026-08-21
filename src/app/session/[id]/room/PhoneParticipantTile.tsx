"use client";
/**
 * PhoneParticipantTile — custom tile for SIP (phone) participants.
 *
 * Why this exists:
 *   The standard <ParticipantTile> shows a mic-mute icon whenever no camera
 *   track is present. SIP participants never have a camera, so every phone
 *   caller would permanently show "muted" — even though their audio flows
 *   fine via <RoomAudioRenderer />.
 *
 *   This tile renders a clean phone-icon avatar + caller name + animated
 *   "On call" pulse, with NO camera/mute UI at all.
 *
 * DTMF keypad (host-only):
 *   A small keypad button opens the DtmfKeypad modal which lets the host
 *   send live DTMF tones mid-call for IVR navigation.
 *   Uses localParticipant.publishDtmf(code, digit) from livekit-client —
 *   no server round-trip, no SDK upgrade required.
 */
import { useRef, useState } from "react";
import type { RemoteParticipant, LocalParticipant } from "livekit-client";
import { getLanguageByCode } from "@/lib/languages";
import { PARTICIPANT_LANG_ATTR } from "@/lib/config";
import DtmfKeypad from "./DtmfKeypad";

interface PhoneParticipantTileProps {
  participant:      RemoteParticipant;
  /** True when the current user is the session host — shows keypad button */
  isHost?:          boolean;
  /** Local participant — required for DTMF (only needed when isHost=true) */
  localParticipant?: LocalParticipant;
}

export default function PhoneParticipantTile({
  participant,
  isHost = false,
  localParticipant,
}: PhoneParticipantTileProps) {
  const lang     = participant.attributes?.[PARTICIPANT_LANG_ATTR];
  const langInfo = lang ? getLanguageByCode(lang) : undefined;

  // Fall-back chain: p.name → strip "sip_" prefix from identity → raw identity.
  // Also strip any legacy "📞 " prefix from names set before the emoji removal fix.
  const displayName = (
    participant.name?.trim() ||
    participant.identity.replace(/^sip_/i, "")
  ).replace(/^📞\s*/, "").trim() || participant.identity;

  // Ref used only for potential future focus / a11y needs
  const tileRef = useRef<HTMLDivElement>(null);

  // DTMF keypad modal state
  const [keypadOpen, setKeypadOpen] = useState(false);

  return (
    <>
      <div className="ppt-tile" ref={tileRef} aria-label={`Phone caller: ${displayName}`}>
        {/* Avatar circle with phone icon */}
        <div className="ppt-avatar" aria-hidden>
          {/* Animated pulse ring — subtle "on call" indicator */}
          <span className="ppt-pulse" aria-hidden />
          <svg
            className="ppt-phone-icon"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M6.62 10.79a15.053 15.053 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24
               1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1
               C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1
               0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* Name + language badge */}
        <div className="ppt-info">
          <span className="ppt-name">{displayName}</span>
          {langInfo && (
            <span className="ppt-lang">
              {langInfo.flag} {langInfo.name}
            </span>
          )}
          <span className="ppt-status">On call</span>
        </div>

        {/* DTMF keypad button — host only */}
        {isHost && localParticipant && (
          <button
            className="ppt-keypad-btn"
            onClick={() => setKeypadOpen(true)}
            title="Open IVR keypad — send DTMF tones mid-call"
            aria-label="Open DTMF keypad"
          >
            {/* 3×3 grid icon representing a keypad */}
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden>
              <rect x="1"  y="1"  width="4" height="4" rx="1" fill="currentColor" opacity="0.85"/>
              <rect x="7"  y="1"  width="4" height="4" rx="1" fill="currentColor" opacity="0.85"/>
              <rect x="13" y="1"  width="4" height="4" rx="1" fill="currentColor" opacity="0.85"/>
              <rect x="1"  y="7"  width="4" height="4" rx="1" fill="currentColor" opacity="0.85"/>
              <rect x="7"  y="7"  width="4" height="4" rx="1" fill="currentColor" opacity="0.85"/>
              <rect x="13" y="7"  width="4" height="4" rx="1" fill="currentColor" opacity="0.85"/>
              <rect x="1"  y="13" width="4" height="4" rx="1" fill="currentColor" opacity="0.85"/>
              <rect x="7"  y="13" width="4" height="4" rx="1" fill="currentColor" opacity="0.85"/>
              <rect x="13" y="13" width="4" height="4" rx="1" fill="currentColor" opacity="0.85"/>
            </svg>
            <span className="ppt-keypad-label">Keypad</span>
          </button>
        )}
      </div>

      {/* DTMF keypad modal — portals to document body via CSS overlay */}
      {keypadOpen && localParticipant && (
        <DtmfKeypad
          localParticipant={localParticipant}
          callerName={displayName}
          onClose={() => setKeypadOpen(false)}
        />
      )}
    </>
  );
}
