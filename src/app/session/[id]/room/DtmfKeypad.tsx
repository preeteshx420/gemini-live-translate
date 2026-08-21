"use client";
/**
 * DtmfKeypad — floating keypad for sending mid-call DTMF tones to IVR systems.
 *
 * HOW IT WORKS (the real answer to "we don't know what to dial"):
 *   This is a live mid-call keypad. The host can press any digit (1, 2, 3, *, #…)
 *   AT ANY TIME during an active call — exactly like pressing keys on a real phone.
 *   No pre-planning needed. When the IVR says "Press 1 for billing", the host
 *   just taps 1 right then.
 *
 * TECHNICAL MECHANISM:
 *   localParticipant.publishDtmf(code, digit)  — from livekit-client (browser SDK)
 *   ↓
 *   LiveKit room (WebRTC data channel)
 *   ↓
 *   LiveKit SIP gateway relays the tone to the phone network as RFC 4733 RTP event
 *   ↓
 *   IVR / bank phone system receives it as a standard DTMF tone
 *
 *   NO server route needed. NO SDK upgrade needed. Already in livekit-client ^2.19.0.
 *
 * RFC 4733 digit → code mapping:
 *   0–9  →  0–9
 *   *    →  10
 *   #    →  11
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { LocalParticipant } from "livekit-client";

// RFC 4733 §3.2 DTMF event codes
const DTMF_CODES: Record<string, number> = {
  "0": 0,  "1": 1,  "2": 2,  "3": 3,
  "4": 4,  "5": 5,  "6": 6,  "7": 7,
  "8": 8,  "9": 9,  "*": 10, "#": 11,
};

// Standard 12-key telephone keypad layout with sub-labels
const KEYPAD_ROWS = [
  [
    { digit: "1", sub: ""     },
    { digit: "2", sub: "ABC"  },
    { digit: "3", sub: "DEF"  },
  ],
  [
    { digit: "4", sub: "GHI"  },
    { digit: "5", sub: "JKL"  },
    { digit: "6", sub: "MNO"  },
  ],
  [
    { digit: "7", sub: "PQRS" },
    { digit: "8", sub: "TUV"  },
    { digit: "9", sub: "WXYZ" },
  ],
  [
    { digit: "*", sub: ""     },
    { digit: "0", sub: "+"    },
    { digit: "#", sub: ""     },
  ],
];

interface DtmfKeypadProps {
  /** The local participant who will publish the DTMF tone */
  localParticipant: LocalParticipant;
  /** Display name of the phone caller — shown in the keypad header */
  callerName: string;
  /** Called when the user closes the keypad */
  onClose: () => void;
}

export default function DtmfKeypad({
  localParticipant,
  callerName,
  onClose,
}: DtmfKeypadProps) {
  const [sequence, setSequence] = useState<string>("");  // digits sent this session
  const [lastSent, setLastSent] = useState<string>("");  // last digit (brief highlight)
  const [sending,  setSending]  = useState(false);
  const [error,    setError]    = useState("");

  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a stable ref to sendDigit so the keyboard handler always calls
  // the latest version without needing it in the effect dependency array.
  const sendDigitRef = useRef<(digit: string) => Promise<void>>(async () => {});

  const sendDigit = useCallback(async (digit: string) => {
    const code = DTMF_CODES[digit];
    if (code === undefined) return;
    if (sending) return;

    setSending(true);
    setError("");
    setLastSent(digit);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setLastSent(""), 400);

    try {
      await localParticipant.publishDtmf(code, digit);
      setSequence((prev) => prev + digit);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send tone");
    } finally {
      setSending(false);
    }
  }, [localParticipant, sending]);

  // Keep the ref up to date on every render
  sendDigitRef.current = sendDigit;

  // Keyboard shortcuts: physical 0-9, *, # keys send the tone.
  // Escape closes the keypad.
  // Uses the ref so we always call the latest sendDigit.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key in DTMF_CODES) {
        e.preventDefault();
        sendDigitRef.current(e.key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);  // onClose is the only external dep; sendDigit accessed via ref

  // Backdrop click → close
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <div
      className="dtmf-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="DTMF Keypad"
    >
      <div className="dtmf-card">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="dtmf-header">
          <div className="dtmf-header-left">
            <span className="dtmf-phone-icon" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6.62 10.79a15.053 15.053 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36
                     1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1
                     C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1
                     0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <div>
              <p className="dtmf-title">IVR Keypad</p>
              <p className="dtmf-caller">{callerName}</p>
            </div>
          </div>
          <button
            className="dtmf-close"
            onClick={onClose}
            aria-label="Close keypad"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* ── Sequence display — shows digits sent so far ─────────────── */}
        <div className="dtmf-display" aria-live="polite" aria-label="Digits sent">
          {sequence
            ? <span className="dtmf-display-digits">{sequence}</span>
            : <span className="dtmf-display-placeholder">Press a key to send tone</span>
          }
          {sequence && (
            <button
              className="dtmf-clear-btn"
              onClick={() => setSequence("")}
              title="Clear history"
              aria-label="Clear digit history"
            >
              ×
            </button>
          )}
        </div>

        {/* ── Error message ───────────────────────────────────────────── */}
        {error && (
          <p className="dtmf-error" role="alert">{error}</p>
        )}

        {/* ── Keypad grid ─────────────────────────────────────────────── */}
        <div className="dtmf-grid" role="group" aria-label="DTMF keys">
          {KEYPAD_ROWS.map((row, ri) => (
            <div key={ri} className="dtmf-row">
              {row.map(({ digit, sub }) => (
                <button
                  key={digit}
                  className={`dtmf-key${lastSent === digit ? " dtmf-key--active" : ""}`}
                  onClick={() => sendDigit(digit)}
                  disabled={sending}
                  aria-label={`Send ${digit}`}
                  title={`Press ${digit}`}
                >
                  <span className="dtmf-key-digit">{digit}</span>
                  {sub && <span className="dtmf-key-sub">{sub}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* ── Hint ───────────────────────────────────────────────────── */}
        <p className="dtmf-hint">
          Tones are sent live to the caller's phone — works for any IVR menu
        </p>
      </div>
    </div>
  );
}
