"use client";
/**
 * SettingsMenu — camera, microphone, speaker, background effects, and info.
 *
 * Rendered inside the LK `lk-settings-menu-modal` div (dark bg from LK theme).
 * All text colors use --lk-* CSS vars so they read well on #111 background.
 */
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
}

export default function SettingsMenu({
  lang,
  peerLangs,
  translationDirection,
  onClose,
  bgEffect,
  onBgEffect,
  bgSupported,
}: SettingsMenuProps) {
  const langInfo = getLanguageByCode(lang);

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
