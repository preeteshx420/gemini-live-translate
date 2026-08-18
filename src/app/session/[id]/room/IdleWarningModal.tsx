"use client";
/**
 * IdleWarningModal — Google Meet-style "Still there?" dialog.
 *
 * Appears after 14 min of idle (no mouse/keyboard/touch activity).
 * User has 5 minutes to click "Continue" or the room is closed automatically.
 *
 * Visual:  centered modal card, dark backdrop
 *          animated countdown ring around the seconds number
 *          two action buttons: "End session" (destructive) and "Continue"
 */

import React from "react";

interface IdleWarningModalProps {
  secondsLeft: number;
  totalSeconds: number; // used for ring animation — pass closeAfterMs/1000
  onContinue: () => void;
  onEnd: () => void;
}

export default function IdleWarningModal({
  secondsLeft,
  totalSeconds = 300,
  onContinue,
  onEnd,
}: IdleWarningModalProps) {
  // SVG ring progress: 0% = full ring, 100% = empty ring
  const RADIUS     = 28;
  const CIRCUMF    = 2 * Math.PI * RADIUS;
  const progress   = Math.max(0, Math.min(1, secondsLeft / totalSeconds));
  const dashOffset = CIRCUMF * (1 - progress);

  // Colour shifts to red when under 60 s
  const ringColor  = secondsLeft <= 60 ? "#ef4444" : "#0090ff";
  const textColor  = secondsLeft <= 60 ? "#ef4444" : "var(--lk-fg)";

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────────────────── */}
      <div
        style={{
          position:        "fixed",
          inset:           0,
          zIndex:          9999,
          background:      "rgba(0,0,0,0.55)",
          backdropFilter:  "blur(2px)",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
        }}
      >
        {/* ── Modal card ───────────────────────────────────────────────── */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="idle-title"
          style={{
            background:    "var(--lk-bg2, #1e1e1e)",
            border:        "1px solid var(--lk-border, #333)",
            borderRadius:  "12px",
            boxShadow:     "0 8px 40px rgba(0,0,0,0.5)",
            padding:       "32px 28px 24px",
            width:         "clamp(280px, 90vw, 380px)",
            display:       "flex",
            flexDirection: "column",
            alignItems:    "center",
            gap:           "20px",
            textAlign:     "center",
          }}
        >
          {/* ── Countdown ring ─────────────────────────────────────────── */}
          <div style={{ position: "relative", width: 72, height: 72 }}>
            <svg
              width="72"
              height="72"
              viewBox="0 0 72 72"
              style={{ transform: "rotate(-90deg)" }}
              aria-hidden
            >
              {/* Track */}
              <circle
                cx="36" cy="36" r={RADIUS}
                fill="none"
                stroke="var(--lk-border, #333)"
                strokeWidth="5"
              />
              {/* Progress */}
              <circle
                cx="36" cy="36" r={RADIUS}
                fill="none"
                stroke={ringColor}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={CIRCUMF}
                strokeDashoffset={dashOffset}
                style={{ transition: "stroke-dashoffset 1s linear, stroke 0.4s" }}
              />
            </svg>

            {/* Seconds number centred inside ring */}
            <span
              style={{
                position:  "absolute",
                inset:     0,
                display:   "flex",
                alignItems:"center",
                justifyContent: "center",
                fontSize:  "18px",
                fontWeight:700,
                fontVariantNumeric: "tabular-nums",
                color:     textColor,
                transition:"color 0.4s",
              }}
            >
              {secondsLeft}
            </span>
          </div>

          {/* ── Copy ───────────────────────────────────────────────────── */}
          <div>
            <p
              id="idle-title"
              style={{
                margin:    0,
                fontSize:  "17px",
                fontWeight:600,
                color:     "var(--lk-fg, #fff)",
                lineHeight:1.3,
              }}
            >
              Still there?
            </p>
            <p
              style={{
                margin:     "6px 0 0",
                fontSize:   "13px",
                color:      "var(--lk-fg2, #aaa)",
                lineHeight: 1.5,
              }}
            >
              Your session will end automatically due to inactivity.
            </p>
          </div>

          {/* ── Buttons ────────────────────────────────────────────────── */}
          <div
            style={{
              display:       "flex",
              gap:           "10px",
              width:         "100%",
            }}
          >
            {/* End session — destructive / secondary */}
            <button
              onClick={onEnd}
              style={{
                flex:          1,
                padding:       "9px 0",
                borderRadius:  "7px",
                border:        "1px solid var(--lk-border, #444)",
                background:    "transparent",
                color:         "#ef4444",
                fontSize:      "14px",
                fontWeight:    500,
                cursor:        "pointer",
                transition:    "background 0.15s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
              }
            >
              End session
            </button>

            {/* Continue — primary */}
            <button
              onClick={onContinue}
              autoFocus
              style={{
                flex:          2,
                padding:       "9px 0",
                borderRadius:  "7px",
                border:        "none",
                background:    "#0090ff",
                color:         "#fff",
                fontSize:      "14px",
                fontWeight:    600,
                cursor:        "pointer",
                transition:    "background 0.15s",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background = "#0070cc")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background = "#0090ff")
              }
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
