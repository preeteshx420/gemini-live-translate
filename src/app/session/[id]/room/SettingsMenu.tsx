"use client";
/**
 * SettingsMenu — camera, microphone, speaker, background effects, and info.
 *
 * Rendered inside the LK `lk-settings-menu-modal` div (dark bg from LK theme).
 * All text colors use --lk-* CSS vars so they read well on #111 background.
 */
import { useState, useCallback } from "react";
import { Track } from "livekit-client";
import { MediaDeviceMenu, TrackToggle } from "@livekit/components-react";
import { getLanguageByCode } from "@/lib/languages";
import type { BgEffect } from "./useBackgroundEffect";

interface SettingsMenuProps {
  lang: string;
  peerLangs: Map<string, string | undefined>;
  translationDirection: string | null;
  onClose: () => void;
  bgEffect: BgEffect;
  onBgEffect: (e: BgEffect) => void;
  bgSupported: boolean | null;
  isHost?: boolean;
  /** Called after the host successfully verifies+saves their passcode */
  onTrunkSaved?: () => void;
}

// ── Passcode verification state ───────────────────────────────────────────────
type VerifyState = "idle" | "verifying" | "valid" | "invalid" | "error";

export default function SettingsMenu({
  lang,
  peerLangs,
  translationDirection,
  onClose,
  bgEffect,
  onBgEffect,
  bgSupported,
  isHost = false,
  onTrunkSaved,
}: SettingsMenuProps) {
  const langInfo = getLanguageByCode(lang);

  // ── Passcode section state ─────────────────────────────────────────────────
  const [passcode, setPasscode]         = useState("");
  const [verifyState, setVerifyState]   = useState<VerifyState>("idle");
  const [verifyMessage, setVerifyMessage] = useState("");
  const [isSaving, setIsSaving]         = useState(false);

  const handleVerifyAndSave = useCallback(async () => {
    const trimmed = passcode.trim();
    if (!trimmed) return;

    setVerifyState("verifying");
    setVerifyMessage("");

    try {
      // Step 1: validate the trunk ID exists
      const verifyRes = await fetch("/api/user/verify-sip-trunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trunkId: trimmed }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setVerifyState("error");
        setVerifyMessage("Verification failed — please try again.");
        return;
      }

      if (!verifyData.valid) {
        setVerifyState("invalid");
        setVerifyMessage("Invalid passcode. Please check it or contact team@mednaath.com.");
        return;
      }

      // Step 2: save to Clerk privateMetadata
      setIsSaving(true);
      const saveRes = await fetch("/api/user/sip-trunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trunkId: trimmed }),
      });
      setIsSaving(false);

      if (!saveRes.ok) {
        setVerifyState("error");
        setVerifyMessage("Passcode verified but failed to save — please try again.");
        return;
      }

      setVerifyState("valid");
      setVerifyMessage(
        verifyData.name
          ? `✓ Passcode saved. Trunk: ${verifyData.name}`
          : "✓ Passcode verified and saved.",
      );
      setPasscode(""); // clear the input after successful save
      onTrunkSaved?.(); // notify parent so hasTrunk re-fetches
    } catch {
      setIsSaving(false);
      setVerifyState("error");
      setVerifyMessage("Network error — please check your connection.");
    }
  }, [passcode]);

  const isVerifying = verifyState === "verifying" || isSaving;

  return (
    <div className="settings-menu">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="settings-header">
        <h2 className="settings-title">Settings</h2>
        <button
          className="settings-close-btn"
          onClick={onClose}
          aria-label="Close settings"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M3 3l10 10M13 3L3 13"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* ── Translation info ─────────────────────────────────────────────── */}
      <div className="settings-section">
        <h3 className="settings-section-title">Translation</h3>
        <div className="settings-info-row">
          <span className="settings-info-label">Hearing in</span>
          <span className="settings-info-value">
            {langInfo?.flag} {langInfo?.name ?? lang}
          </span>
        </div>
        {translationDirection ? (
          <div className="settings-info-row">
            <span className="settings-info-label">Direction</span>
            <span className="settings-info-value settings-direction">
              {translationDirection}
            </span>
          </div>
        ) : peerLangs.size === 0 ? (
          <div className="settings-info-row">
            <span className="settings-info-label">Direction</span>
            <span className="settings-info-value settings-info-muted">
              Waiting for others to join…
            </span>
          </div>
        ) : (
          <div className="settings-info-row">
            <span className="settings-info-label">Direction</span>
            <span className="settings-info-value settings-info-muted">
              Everyone speaks {langInfo?.name ?? lang}
            </span>
          </div>
        )}
      </div>

      {/* ── Phone Calls (host only) ──────────────────────────────────────── */}
      {isHost && (
        <div className="settings-section">
          <h3 className="settings-section-title">Phone Calls</h3>

          <p className="settings-passcode-desc">
            Enter your passcode to enable calling phone numbers into this room.
          </p>

          <div className="settings-passcode-row">
            <input
              type="password"
              className="settings-passcode-input"
              placeholder="Your passcode"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                // reset status when user starts typing again
                if (verifyState !== "idle") {
                  setVerifyState("idle");
                  setVerifyMessage("");
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && passcode.trim() && !isVerifying) {
                  handleVerifyAndSave();
                }
              }}
              disabled={isVerifying}
              aria-label="Phone call passcode"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              className={`settings-passcode-btn${isVerifying ? " settings-passcode-btn--loading" : ""}`}
              onClick={handleVerifyAndSave}
              disabled={!passcode.trim() || isVerifying}
            >
              {isVerifying ? "Saving…" : "Verify & Save"}
            </button>
          </div>

          {/* Status message */}
          {verifyMessage && (
            <p
              className={`settings-passcode-status${
                verifyState === "valid"
                  ? " settings-passcode-status--ok"
                  : verifyState === "invalid" || verifyState === "error"
                  ? " settings-passcode-status--err"
                  : ""
              }`}
            >
              {verifyMessage}
            </p>
          )}

          {/* Contact link — shown when not yet verified or on invalid */}
          {(verifyState === "idle" || verifyState === "invalid") && (
            <p className="settings-passcode-contact">
              Don&apos;t have a passcode?{" "}
              <a
                href="mailto:team@mednaath.com"
                className="settings-passcode-link"
              >
                Contact team@mednaath.com
              </a>
            </p>
          )}
        </div>
      )}

      {/* ── Background effects ───────────────────────────────────────────── */}
      <div className="settings-section">
        <h3 className="settings-section-title">Background Effect</h3>
        {bgSupported === false ? (
          <p className="settings-info-muted" style={{ fontSize: 12, padding: "2px 0 4px" }}>
            Not supported in this browser.
          </p>
        ) : (
          /* Use the CSS grid class so mobile breakpoint (2-col) kicks in automatically */
          <div className="settings-bg-grid">

            {/* None */}
            <button
              onClick={() => onBgEffect("none")}
              disabled={bgSupported === null}
              aria-pressed={bgEffect === "none"}
              className={`settings-bg-btn${bgEffect === "none" ? " settings-bg-btn--active" : ""}${bgSupported === null ? " settings-bg-btn--loading" : ""}`}
            >
              <span className="settings-bg-icon">✕</span>
              <span className="settings-bg-label">None</span>
            </button>

            {/* Blur */}
            <button
              onClick={() => onBgEffect("blur")}
              disabled={bgSupported === null}
              aria-pressed={bgEffect === "blur"}
              className={`settings-bg-btn${bgEffect === "blur" ? " settings-bg-btn--active" : ""}${bgSupported === null ? " settings-bg-btn--loading" : ""}`}
              style={{ background: "rgba(200,200,200,0.15)" }}
            >
              <span className="settings-bg-icon" style={{ filter: "blur(2px)", fontSize: 22 }}>◼</span>
              <span className="settings-bg-label">Blur</span>
            </button>

            {/* Office / Desk */}
            <button
              onClick={() => onBgEffect("desk")}
              disabled={bgSupported === null}
              aria-pressed={bgEffect === "desk"}
              className={`settings-bg-btn${bgEffect === "desk" ? " settings-bg-btn--active" : ""}${bgSupported === null ? " settings-bg-btn--loading" : ""}`}
              style={{
                backgroundImage: "url(/backgrounds/desk.jpg)",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <span className="settings-bg-label" style={{ backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 3, padding: "2px 5px" }}>Office</span>
            </button>

            {/* Nature */}
            <button
              onClick={() => onBgEffect("nature")}
              disabled={bgSupported === null}
              aria-pressed={bgEffect === "nature"}
              className={`settings-bg-btn${bgEffect === "nature" ? " settings-bg-btn--active" : ""}${bgSupported === null ? " settings-bg-btn--loading" : ""}`}
              style={{
                backgroundImage: "url(/backgrounds/nature.jpg)",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <span className="settings-bg-label" style={{ backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 3, padding: "2px 5px" }}>Nature</span>
            </button>

          </div>
        )}
      </div>

      {/* ── Camera ──────────────────────────────────────────────────────── */}
      <div className="settings-section">
        <h3 className="settings-section-title">Camera</h3>
        <section className="lk-button-group">
          <TrackToggle source={Track.Source.Camera} showIcon>
            Camera
          </TrackToggle>
          <div className="lk-button-group-menu">
            <MediaDeviceMenu kind="videoinput" />
          </div>
        </section>
      </div>

      {/* ── Microphone ──────────────────────────────────────────────────── */}
      <div className="settings-section">
        <h3 className="settings-section-title">Microphone</h3>
        <section className="lk-button-group">
          <TrackToggle source={Track.Source.Microphone} showIcon>
            Microphone
          </TrackToggle>
          <div className="lk-button-group-menu">
            <MediaDeviceMenu kind="audioinput" />
          </div>
        </section>
      </div>

      {/* ── Speaker ─────────────────────────────────────────────────────── */}
      <div className="settings-section">
        <h3 className="settings-section-title">Speaker</h3>
        <section className="lk-button-group">
          <span className="lk-button">Audio Output</span>
          <div className="lk-button-group-menu">
            <MediaDeviceMenu kind="audiooutput" />
          </div>
        </section>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div className="settings-footer">
        <button className="lk-button" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
