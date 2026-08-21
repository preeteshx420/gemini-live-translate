"use client";

/**
 * InCall — custom room layout using LiveKit building blocks.
 *
 * Why not plain <VideoConference>?
 *   The VideoConference prefab has no participantFilter prop — it renders
 *   every participant including the AI translator agent. We build the same
 *   layout with GridLayout + FocusLayout + ControlBar + Chat so we can strip
 *   out ParticipantKind.AGENT tracks before they reach the grid.
 *
 * Chat & Settings rendering strategy:
 *   We mirror how VideoConference renders them internally:
 *   - Chat:     rendered always in DOM, shown via display:grid / display:none
 *               (LK's own CSS handles its layout, size, and the mobile fixed-position rule)
 *   - Settings: rendered inside an `lk-settings-menu-modal` div (LK's own class),
 *               shown/hidden via display:block / display:none
 *               LK's CSS positions it fixed at top:50% left:50% with a dark bg.
 *               We add a separate clickable backdrop div for dismiss.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Chat,
  ControlBar,
  FocusLayout,
  FocusLayoutContainer,
  GridLayout,
  LayoutContextProvider,
  ParticipantTile,
  RoomAudioRenderer,
  usePinnedTracks,
  useTracks,
  useVisualStableUpdate,
  useGridLayout,
  useCreateLayoutContext,
  useDisconnectButton,
  useLocalParticipant,
  useRemoteParticipants,
  useRoomContext,
  isTrackReference,
} from "@livekit/components-react";
import {
  ConnectionState,
  ParticipantKind,
  RoomEvent,
  Track,
} from "livekit-client";
import { PARTICIPANT_LANG_ATTR } from "@/lib/config";
import { getLanguageByCode } from "@/lib/languages";
import { useTranslationRouting } from "./useTranslationRouting";
import LanguagePill from "./LanguagePill";
import CaptionsSidebar from "./CaptionsSidebar";
import SettingsMenu from "./SettingsMenu";
import InvitePhoneModal from "./InvitePhoneModal";
import ParticipantsPanel from "./ParticipantsPanel";
import PhoneParticipantTile from "./PhoneParticipantTile";
import { useBackgroundEffect } from "./useBackgroundEffect";
import { useIdleTimer } from "./useIdleTimer";
import { useUser } from "@clerk/nextjs";
import IdleWarningModal from "./IdleWarningModal";
import Image from "next/image";

// ─── Share / Invite button ────────────────────────────────────────────────────
function ShareButton() {
  const [copied, setCopied] = useState(false);
  const handleShare = useCallback(async () => {
    const url = window.location.href.replace(/\/room$/, "");
    try {
      if (navigator.share) {
        await navigator.share({ title: "Join my call on AiOnPhone", url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // user cancelled or clipboard blocked — ignore
    }
  }, []);

  return (
    <button className="chrome-icon-btn" onClick={handleShare} title="Copy invite link">
      {copied ? (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
          <rect x="1" y="5" width="9" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M6 4V2.5A1.5 1.5 0 0 1 7.5 1h5A1.5 1.5 0 0 1 14 2.5v6A1.5 1.5 0 0 1 12.5 10H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      <span className="chrome-icon-btn-label">{copied ? "Copied!" : "Invite"}</span>
    </button>
  );
}

// ─── End / Leave call button ─────────────────────────────────────────────────
// Host:  red "End call" — triggers onEnd which calls DELETE /api/session/close,
//        deleting the LiveKit room for ALL participants.
// Guest: grey "Leave" — disconnects only this participant via LiveKit's
//        useDisconnectButton. The room itself stays alive (DEPARTURE_TIMEOUT
//        handles server-side cleanup after the last human leaves).
function EndCallButton({ isHost, onEnd }: { isHost: boolean; onEnd: () => void }) {
  // useDisconnectButton wires up LiveKit disconnect; we use it for guests only.
  // For the host we call onEnd() directly which deletes the room via API first.
  const { buttonProps: lkDisconnect } = useDisconnectButton({});

  // On mobile there is no hover tooltip, and the label is hidden (icon-only).
  // A confirm dialog prevents accidental fat-finger taps from ending the call
  // for everyone. On desktop the full label "End call for everyone" is visible
  // so no confirm needed — clicking it once is intentional.
  const handleHostEnd = useCallback(() => {
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    if (isMobile) {
      if (!window.confirm("End the call for everyone?")) return;
    }
    onEnd();
  }, [onEnd]);

  // Shared phone-down SVG icon
  const PhoneIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1 .23l-2.2 2.2a15.097 15.097 0 0 1-6.53-6.53l2.2-2.21a.977.977 0 0 0 .23-1 11.36 11.36 0 0 1-.56-3.53c0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"
        fill="currentColor"
      />
      <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  if (isHost) {
    return (
      <button
        className="end-call-btn"
        onClick={handleHostEnd}
        title="End call for everyone"
      >
        <PhoneIcon />
        {/* Desktop: full label. Mobile ≤640px: shorter label still visible (not hidden)
            so the host knows this ends the call for everyone, not just themselves. */}
        <span className="end-call-label-full">End call for everyone</span>
        <span className="end-call-label-short">End all</span>
      </button>
    );
  }

  // Guest: just disconnect (leave this tab, room stays alive for others)
  return (
    <button
      {...lkDisconnect}
      className="leave-btn"
      title="Leave the call"
    >
      <PhoneIcon />
      <span className="chrome-icon-btn-label">Leave</span>
    </button>
  );
}

// ─── Inner component — inside LayoutContextProvider ─────────────────────────
function RoomContent({
  lang,
  setLang,
  captionsOpen,
  setCaptionsOpen,
  humanRemotes,
  peerLangs,
  isHost,
  onEnd,
  roomName,
  participantsOpen,
  setParticipantsOpen,
}: {
  lang: string;
  setLang: (l: string) => void;
  captionsOpen: boolean;
  setCaptionsOpen: (v: boolean) => void;
  humanRemotes: ReturnType<typeof useRemoteParticipants>;
  peerLangs: Map<string, string | undefined>;
  /** True when this participant is the signed-in host */
  isHost: boolean;
  /** Called to end/leave the call (host: deletes room; guest: disconnects) */
  onEnd: () => void;
  /** The LiveKit room name — needed for SIP invite and participant kick APIs */
  roomName: string;
  participantsOpen: boolean;
  setParticipantsOpen: (v: boolean) => void;
}) {
  const layoutContext = useCreateLayoutContext();

  // ── Phone invite modal ─────────────────────────────────────────────────
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);

  // ── Host passcode (SIP trunk) status ─────────────────────────────────────
  // Fetched once on mount. When false, the "Call in" button is visible but
  // disabled with a tooltip directing the host to configure their passcode.
  const [hasTrunk, setHasTrunk] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isHost) return;
    fetch("/api/user/sip-trunk")
      .then((r) => r.json())
      .then((data: { configured?: boolean }) => {
        setHasTrunk(data.configured ?? false);
      })
      .catch(() => {
        // On network error, assume not configured (safe default — button disabled)
        setHasTrunk(false);
      });
  }, [isHost]);

  // Called by SettingsMenu after the host saves a valid passcode.
  // Immediately enables the Call-in button without requiring a page reload.
  const handleTrunkSaved = useCallback(() => {
    setHasTrunk(true);
  }, []);

  // ── Mic permission prompt — shown once on join ───────────────────────────
  // Instead of a confusing "you're muted" nudge, we show a one-time modal
  // immediately on join asking the user if they want their mic on or off.
  // "Turn on mic" → triggers browser permission prompt + publishes track.
  // "Stay muted"  → dismisses; user can still toggle via ControlBar anytime.
  const { localParticipant } = useLocalParticipant();
  const allRemotes = useRemoteParticipants();
  const [micPromptDone, setMicPromptDone] = useState(false);
  const showMicPrompt = !micPromptDone;

  const handleTurnOnMic = useCallback(async () => {
    setMicPromptDone(true);
    try {
      await localParticipant.setMicrophoneEnabled(true);
    } catch {
      // User denied permission or device error — mic stays off, no crash
    }
  }, [localParticipant]);

  const handleStayMuted = useCallback(() => {
    setMicPromptDone(true);
  }, []);

  // ── Background effect ─────────────────────────────────────────────────
  const { effect: bgEffect, setEffect: setBgEffect, supported: bgSupported } = useBackgroundEffect();

  // ── Tracks — filter out agent ─────────────────────────────────────────────
  const allTracks = useTracks(
    [
      { source: Track.Source.Camera,      withPlaceholder: true  },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  // Filter out AGENT (AI translator) and SIP (phone) from the camera grid.
  // SIP participants never have a camera; passing them through causes
  // ParticipantTile to render a permanent "muted" placeholder.
  // We render them separately with <PhoneParticipantTile>.
  const tracks = useMemo(
    () => allTracks.filter(
      (t) =>
        t.participant.kind !== ParticipantKind.AGENT &&
        t.participant.kind !== ParticipantKind.SIP,
    ),
    [allTracks],
  );

  // Separate list of SIP participants for custom rendering
  const sipParticipants = useMemo(
    () => allRemotes.filter((p) => p.kind === ParticipantKind.SIP),
    [allRemotes],
  );

  // ── Stable grid layout ───────────────────────────────────────────────────
  // useGridLayout measures the grid container and returns maxTiles (the number
  // of tiles that fit on one page at the current container size).
  //
  // useVisualStableUpdate MUST receive the same maxTiles that GridLayout will
  // use internally — otherwise the two calls disagree on page boundaries and
  // the paginator throws "Element not part of the array" when a camera
  // placeholder transitions to a real track (the IDs change between renders).
  //
  // Pattern mirrors LiveKit's own GridLayout source:
  //   const ref = createRef();
  //   const { layout } = useGridLayout(ref, tracks.length);
  //   const paginated = usePagination(layout.maxTiles, tracks);
  // We expose the same ref on our wrapper div so both computations share the
  // same measured container dimensions.
  const gridWrapperRef = useRef<HTMLDivElement>(null);
  // React 19 tightened useRef<T>(null) to RefObject<T | null> but useGridLayout's
  // type declaration (from React 18 era) still expects RefObject<HTMLDivElement>.
  // The `as any` cast bridges the two — the runtime value is identical.
  const { layout: gridLayout } = useGridLayout(gridWrapperRef as any, tracks.length);
  const stableTracks = useVisualStableUpdate(tracks as any, gridLayout?.maxTiles ?? 1);

  // ── Screen-share auto-pin ────────────────────────────────────────────────
  const screenShareTracks = useMemo(
    () => tracks.filter(
      (t) => isTrackReference(t) && t.publication.source === Track.Source.ScreenShare,
    ),
    [tracks],
  );

  const lastPinnedSid = useRef<string | null>(null);
  useEffect(() => {
    const active = screenShareTracks.find(
      (t) => isTrackReference(t) && (t as any).publication.isSubscribed,
    );
    if (active && isTrackReference(active)) {
      const sid = (active as any).publication.trackSid as string;
      if (lastPinnedSid.current !== sid) {
        lastPinnedSid.current = sid;
        layoutContext.pin.dispatch?.({ msg: "set_pin", trackReference: active as any });
      }
    } else if (!active && lastPinnedSid.current) {
      lastPinnedSid.current = null;
      layoutContext.pin.dispatch?.({ msg: "clear_pin" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    screenShareTracks
      .map((t) =>
        isTrackReference(t)
          ? `${(t as any).publication.trackSid}_${(t as any).publication.isSubscribed}`
          : "ph"
      )
      .join(","),
  ]);

  const focusTrack = usePinnedTracks(layoutContext)?.[0];

  const carouselTracks = useMemo(
    () =>
      focusTrack
        ? tracks.filter(
            (t) =>
              !isTrackReference(t) ||
              (t as any).publication?.trackSid !== focusTrack.publication?.trackSid,
          )
        : tracks,
    [tracks, focusTrack],
  );

  // ── Widget state ──────────────────────────────────────────────────────────
  const widgetState  = layoutContext.widget.state;
  const showChat     = widgetState?.showChat     ?? false;
  const showSettings = widgetState?.showSettings ?? false;

  const closeSettings = useCallback(() => {
    layoutContext.widget.dispatch?.({ msg: "toggle_settings" });
  }, [layoutContext]);

  // ── Language / translation direction ─────────────────────────────────────
  const langInfo = getLanguageByCode(lang);

  const peerLangCodes = useMemo(() => {
    const seen = new Set<string>();
    for (const pLang of peerLangs.values()) {
      if (pLang && pLang !== lang) seen.add(pLang);
    }
    return [...seen];
  }, [peerLangs, lang]);

  const translationDirection = useMemo(() => {
    if (peerLangCodes.length === 0) return null;
    const fromLabels = peerLangCodes.map((c) => getLanguageByCode(c)?.name ?? c.toUpperCase());
    return `${fromLabels.join(", ")} → ${langInfo?.name ?? lang}`;
  }, [peerLangCodes, langInfo, lang]);

  const participantCount = humanRemotes.length + 1;

  return (
    <LayoutContextProvider value={layoutContext}>
      <div className="room">

        {/* ── Header chrome ─────────────────────────────────────────────── */}
        <header className="room-chrome">
          <div className="chrome-brand">
            <Image
              src="/logo.png"
              alt="AiOnPhone"
              width={28}
              height={28}
              style={{ borderRadius: "50%", flexShrink: 0 }}
            />
            <span className="chrome-brand-name">AiOnPhone</span>
          </div>

          <div className="chrome-meta">
            <span className="chrome-participants">
              {participantCount} {participantCount === 1 ? "person" : "people"}
            </span>
            {translationDirection ? (
              <>
                <span className="divider" aria-hidden>·</span>
                <span className="chrome-direction" title="Translation direction">
                  {translationDirection}
                </span>
              </>
            ) : (
              <>
                <span className="divider" aria-hidden>·</span>
                <span className="chrome-hearing">
                  Hearing in <strong>{langInfo?.name ?? lang}</strong>
                </span>
              </>
            )}
          </div>

          <div className="chrome-actions">
            <ShareButton />

            {/* ── Phone invite button (host only) ──────────────────────── */}
            {isHost && (
              <button
                className={`chrome-icon-btn${hasTrunk === false ? " chrome-icon-btn--disabled" : ""}`}
                onClick={() => hasTrunk && setPhoneModalOpen(true)}
                disabled={hasTrunk !== true}
                title={
                  hasTrunk === null
                    ? "Checking passcode…"
                    : hasTrunk
                    ? "Invite by phone"
                    : "Configure your passcode in Settings to enable phone calls"
                }
                aria-disabled={hasTrunk !== true}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M6.62 10.79a15.053 15.053 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
                    fill="currentColor"
                  />
                </svg>
                <span className="chrome-icon-btn-label">Call in</span>
              </button>
            )}

            {/* ── Participants panel button ─────────────────────────────── */}
            <button
              className={`chrome-icon-btn${participantsOpen ? " chrome-icon-btn--active" : ""}`}
              onClick={() => setParticipantsOpen(!participantsOpen)}
              title={participantsOpen ? "Hide participants" : "Show participants"}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.6" />
                <path d="M3 21v-1a6 6 0 0 1 12 0v1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M16 11a4 4 0 1 1 0-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M21 21v-1a6 6 0 0 0-5-5.92" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <span className="chrome-icon-btn-label">People</span>
            </button>

            <button
              className={`chrome-icon-btn${captionsOpen ? " chrome-icon-btn--active" : ""}`}
              onClick={() => setCaptionsOpen(!captionsOpen)}
              title={captionsOpen ? "Hide captions" : "Show captions"}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
                <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M4 7h3M4 10h5M9 7h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="chrome-icon-btn-label">
                {captionsOpen ? "Hide CC" : "CC"}
              </span>
            </button>
            <LanguagePill value={lang} onChange={setLang} />
          </div>
        </header>

        {/* ── Video stage + ControlBar ──────────────────────────────────── */}
        <div className="room-stage">
          {focusTrack ? (
            <div className="lk-focus-layout-wrapper">
              <FocusLayoutContainer>
                <div className="lk-carousel">
                  {carouselTracks.map((trackRef) => (
                    <ParticipantTile
                      key={
                        isTrackReference(trackRef)
                          ? (trackRef as any).publication.trackSid
                          : `${trackRef.participant.identity}-placeholder`
                      }
                      trackRef={trackRef as any}
                    />
                  ))}
                </div>
                <FocusLayout trackRef={focusTrack as any} />
              </FocusLayoutContainer>
            </div>
          ) : (
            <div className="lk-grid-layout-wrapper" ref={gridWrapperRef}>
              <GridLayout tracks={stableTracks as any}>
                <ParticipantTile />
              </GridLayout>
              {/* Phone (SIP) participants — rendered below the grid with a
                  custom tile that has no camera/mute UI. Audio is already
                  handled globally by <RoomAudioRenderer />. */}
              {sipParticipants.length > 0 && (
                <div className="ppt-row">
                  {sipParticipants.map((p) => (
                    <PhoneParticipantTile
                      key={p.identity}
                      participant={p}
                      isHost={isHost}
                      localParticipant={localParticipant}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/*
           * Bottom control row: LiveKit ControlBar + End/Leave button side-by-side.
           * ControlBar handles mic, camera, screenshare, chat, settings, leave.
           * EndCallButton sits at the end of the same row:
           *   Host  → red "End call for everyone" pill (deletes room via API)
           *   Guest → grey "Leave" pill (disconnects only this participant)
           */}
          <div className="control-row">
            <ControlBar controls={{ chat: true, settings: true, microphone: true }} />
            {/* ── End / Leave button ─────────────────────────────────────── */}
            {/* Host: red "End call for everyone" — deletes room for everyone. */}
            {/* Guest: grey "Leave" — disconnects only this participant.       */}
            <EndCallButton isHost={isHost} onEnd={onEnd} />
          </div>
        </div>

        {/*
         * ── Chat panel ────────────────────────────────────────────────────
         * Rendered identically to how VideoConference does it internally:
         *   display:grid when open, display:none when closed.
         * LK's own chat.css handles the layout (3-row grid: header / messages / form).
         * On mobile LK's own @media rule makes .lk-chat position:fixed — which is
         * actually what we want (it pops up over the video). We add our own
         * .room-chat-host wrapper so we can control the slide-in on desktop.
         */}
        <div
          className={`room-chat-host${showChat ? " room-chat-host--open" : ""}`}
          aria-hidden={!showChat}
        >
          {/* Always mounted so LK's internal message state is preserved.
              LK's own CSS sets width:clamp(200px,55ch,60ch) on .lk-chat */}
          <Chat />
        </div>

        {/*
         * ── Settings panel ────────────────────────────────────────────────
         * Use LK's own `lk-settings-menu-modal` class — its CSS sets:
         *   position:fixed; top:50%; left:50%; transform:translate(-50%,-50%);
         *   background:var(--lk-bg); border; border-radius; box-shadow; min-width:50vw
         * We control visibility with display:block / display:none.
         * A separate full-screen backdrop div lets users click-to-close.
         */}
        {showSettings && (
          /* Backdrop — click outside the modal to close */
          <div className="room-settings-backdrop" onClick={closeSettings}>
            {/* Stop click propagation so clicking the modal card itself doesn't close */}
            <div
              className="lk-settings-menu-modal room-settings-content"
              onClick={(e) => e.stopPropagation()}
            >
              <SettingsMenu
                lang={lang}
                peerLangs={peerLangs}
                translationDirection={translationDirection}
                onClose={closeSettings}
                bgEffect={bgEffect}
                onBgEffect={setBgEffect}
                bgSupported={bgSupported}
                isHost={isHost}
                onTrunkSaved={handleTrunkSaved}
              />
            </div>
          </div>
        )}

        {/* ── Phone invite modal (host only) ────────────────────────────── */}
        {phoneModalOpen && (
          <InvitePhoneModal
            roomName={roomName}
            onClose={() => setPhoneModalOpen(false)}
          />
        )}

      </div>

      {/* ── Mic permission prompt — one-time modal on join ──────────────────
       * Replaces the old "you're muted" nudge banner.
       * Shows immediately when the user enters the room and asks clearly
       * whether they want their mic on or off. No confusing passive banner.
       */}
      {showMicPrompt && (
        <div className="mic-prompt-overlay" role="dialog" aria-modal="true" aria-label="Microphone preference">
          <div className="mic-prompt-card">
            <h3 className="mic-prompt-title">Enable your microphone?</h3>
            <p className="mic-prompt-body">
              Others on this call cannot hear you until your microphone is enabled.
              You can change this at any time using the controls below.
            </p>
            <div className="mic-prompt-actions">
              <button
                className="mic-prompt-btn mic-prompt-btn--primary"
                onClick={handleTurnOnMic}
              >
                Enable microphone
              </button>
              <button
                className="mic-prompt-btn mic-prompt-btn--secondary"
                onClick={handleStayMuted}
              >
                Join muted
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Captions sidebar — outside .room, sibling in room-shell */}
      <CaptionsSidebar
        open={captionsOpen}
        onClose={() => setCaptionsOpen(false)}
        myLang={lang}
        peerLangs={peerLangs}
      />
    </LayoutContextProvider>
  );
}

// ─── Outer component ─────────────────────────────────────────────────────────
export default function InCall({
  initialLang,
  onLeave,
}: {
  initialLang: string;
  onLeave: () => void;
}) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const remotes = useRemoteParticipants();
  const [lang, setLang]                 = useState(initialLang);
  const [captionsOpen, setCaptionsOpen] = useState(false);

  // Determine if this participant is the host (signed-in Clerk user).
  // Only the host may call DELETE /api/session/close — guests get 401 from
  // the auth guard, which would silently leave the room alive on LiveKit and
  // keep the pre-flight lobby stuck showing "Session is live".
  const { user: clerkUser } = useUser();
  const isHost = !!clerkUser;

  // ── Idle session timeout — Google Meet style ──────────────────────────────
  // After 14 min of no activity → show warning modal
  // After 5 more minutes with no response → delete room & navigate away
  const CLOSE_SECS = 5 * 60;
  const {
    showWarning:   idleWarning,
    secondsLeft:   idleSecondsLeft,
    onContinue:    idleContinue,
    onEnd:         idleEnd,
  } = useIdleTimer({
    roomName:     room.name,   // the LiveKit room name (decoded from session ID)
    isHost,
    onClose:      onLeave,
  });

  // ── AudioContext autoplay unlock (Samsung Internet / Chrome Android) ─────
  // Android browsers start the AudioContext suspended until a user gesture.
  // LiveKit's lk-start-audio-button is the official fix, but as a belt-and-
  // suspenders measure we also try to resume any suspended AudioContext on
  // the first click/touch anywhere in the page.
  useEffect(() => {
    let done = false;
    const unlock = () => {
      if (done) return;
      done = true;
      try {
        const AudioCtx = window.AudioContext ?? (window as any).webkitAudioContext;
        if (AudioCtx) {
          // Find any existing AudioContext instances and resume them.
          // Also create-and-resume a scratch one to satisfy the gesture requirement.
          const ctx = new AudioCtx();
          if (ctx.state === "suspended") {
            ctx.resume().catch(() => {/* ignore */});
          }
        }
      } catch {
        // Ignore — not all browsers expose AudioContext in this way.
      }
    };
    document.addEventListener("click",     unlock, { once: true, capture: true });
    document.addEventListener("touchstart", unlock, { once: true, capture: true });
    document.addEventListener("keydown",   unlock, { once: true, capture: true });
    return () => {
      document.removeEventListener("click",     unlock, { capture: true });
      document.removeEventListener("touchstart", unlock, { capture: true });
      document.removeEventListener("keydown",   unlock, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (!localParticipant || !room) return;
    const apply = () => {
      if (room.state === ConnectionState.Connected) {
        localParticipant.setAttributes({ [PARTICIPANT_LANG_ATTR]: lang });
      }
    };
    apply();
    room.on(RoomEvent.Connected, apply);
    return () => { room.off(RoomEvent.Connected, apply); };
  }, [room, localParticipant, lang]);

  useTranslationRouting(lang);

  const humanRemotes = useMemo(
    () => remotes.filter((p) => p.kind !== ParticipantKind.AGENT),
    [remotes],
  );
  const peerLangs = useMemo(() => {
    const map = new Map<string, string | undefined>();
    for (const p of humanRemotes) {
      map.set(p.identity, p.attributes?.[PARTICIPANT_LANG_ATTR]);
    }
    return map;
  }, [humanRemotes]);

  // ── Participants panel state — lives here so it survives RoomContent re-renders
  const [participantsPanelOpen, setParticipantsPanelOpen] = useState(false);

  return (
    <div className={`room-shell${captionsOpen ? " room-shell--captions-open" : ""}`}>
      <RoomContent
        lang={lang}
        setLang={setLang}
        captionsOpen={captionsOpen}
        setCaptionsOpen={setCaptionsOpen}
        humanRemotes={humanRemotes}
        peerLangs={peerLangs}
        isHost={isHost}
        onEnd={idleEnd}
        roomName={room.name}
        participantsOpen={participantsPanelOpen}
        setParticipantsOpen={setParticipantsPanelOpen}
      />
      <RoomAudioRenderer />

      {/* ── Participants panel — slide-in from right, z-index above video ── */}
      <ParticipantsPanel
        open={participantsPanelOpen}
        onClose={() => setParticipantsPanelOpen(false)}
        localParticipant={localParticipant}
        remoteParticipants={remotes}
        isHost={isHost}
        roomName={room.name}
      />

      {/* ── Idle session timeout modal ──────────────────────────────────── */}
      {idleWarning && (
        <IdleWarningModal
          secondsLeft={idleSecondsLeft}
          totalSeconds={CLOSE_SECS}
          onContinue={idleContinue}
          onEnd={idleEnd}
        />
      )}
    </div>
  );
}
