"use client";
/**
 * useIdleTimer — Google Meet-style idle session management.
 *
 * Timeline (all durations configurable):
 *   0 ─────────────────────── 14 min ── warn ─── 19 min ── auto-close
 *
 * "Activity" = any mouse move, click, keydown, scroll, or touchstart.
 * The timer resets on every activity event while the warning is NOT shown.
 * Once the warning appears, activity does NOT reset the clock — the user
 * must explicitly click "Continue" to stay.
 *
 * `isHost` — when true, auto-close calls DELETE /api/session/close which
 * destroys the LiveKit room for everyone. When false (guests), we just
 * navigate away and let the server-side DEPARTURE_TIMEOUT clean up.
 * This prevents guests from getting a 401 and silently failing to close
 * the room, which would leave guests on the pre-flight page stuck on
 * "Session is live".
 *
 * Usage:
 *   const { showWarning, secondsLeft, onContinue } = useIdleTimer({
 *     roomName,
 *     isHost,
 *     onClose: () => router.push("/"),
 *   });
 */

import { useCallback, useEffect, useRef, useState } from "react";

const WARN_AFTER_MS  = 14 * 60 * 1000; // 14 minutes idle → show warning
const CLOSE_AFTER_MS =  5 * 60 * 1000; // 5 more minutes → auto close
const TICK_MS        = 1_000;           // countdown tick interval

interface UseIdleTimerOptions {
  /** LiveKit room name — passed to the close API */
  roomName: string;
  /**
   * True when the current participant is the room owner (signed-in host).
   * Only the host calls DELETE /api/session/close — guests just navigate
   * away and let LiveKit's DEPARTURE_TIMEOUT clean up the room server-side.
   */
  isHost: boolean;
  /** Called after the room is closed (navigate away) */
  onClose: () => void;
  /** Override idle-before-warn ms (for testing) */
  warnAfterMs?: number;
  /** Override warn-before-close ms (for testing) */
  closeAfterMs?: number;
}

interface UseIdleTimerResult {
  /** True when the "Still there?" modal should be rendered */
  showWarning: boolean;
  /** Countdown seconds remaining until auto-close (only valid when showWarning) */
  secondsLeft: number;
  /** Call when the user clicks "Continue" — dismisses warning, resets timer */
  onContinue: () => void;
  /** Call when the user clicks "End session" */
  onEnd: () => void;
}

export function useIdleTimer({
  roomName,
  isHost,
  onClose,
  warnAfterMs  = WARN_AFTER_MS,
  closeAfterMs = CLOSE_AFTER_MS,
}: UseIdleTimerOptions): UseIdleTimerResult {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.round(closeAfterMs / 1000));

  // Refs — avoid stale closures in event listeners
  const warnTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const showWarningRef  = useRef(false); // mirrors state without closure issues
  const roomNameRef     = useRef(roomName);
  const isHostRef       = useRef(isHost);
  const onCloseRef      = useRef(onClose);

  // Keep refs in sync with latest props
  useEffect(() => { roomNameRef.current = roomName; }, [roomName]);
  useEffect(() => { isHostRef.current   = isHost;   }, [isHost]);
  useEffect(() => { onCloseRef.current  = onClose;  }, [onClose]);

  // ── Close the room via API (host only) or just navigate away (guests) ────
  const closeRoom = useCallback(async () => {
    if (isHostRef.current) {
      // Host: delete the room on LiveKit so all guests are kicked out
      // and the pre-flight polling sees exists:false immediately.
      try {
        await fetch(
          `/api/session/close?room=${encodeURIComponent(roomNameRef.current)}`,
          { method: "DELETE" },
        );
      } catch {
        // Best-effort — even if the API call fails, navigate away
      }
    }
    // Guests: skip the API call entirely. They cannot authenticate
    // (no Clerk session) so the call would fail with 401 and silently
    // leave the room alive on LiveKit. DEPARTURE_TIMEOUT handles cleanup.
    onCloseRef.current();
  }, []);

  // ── Clear all timers ──────────────────────────────────────────────────────
  const clearAllTimers = useCallback(() => {
    if (warnTimerRef.current)    clearTimeout(warnTimerRef.current);
    if (closeTimerRef.current)   clearTimeout(closeTimerRef.current);
    if (countdownRef.current)    clearInterval(countdownRef.current);
    warnTimerRef.current  = null;
    closeTimerRef.current = null;
    countdownRef.current  = null;
  }, []);

  // ── Start the countdown display (fires every second) ─────────────────────
  const startCountdown = useCallback(() => {
    const endAt = Date.now() + closeAfterMs;
    setSecondsLeft(Math.round(closeAfterMs / 1000));

    countdownRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      setSecondsLeft(remaining);
    }, TICK_MS);
  }, [closeAfterMs]);

  // ── Show the warning modal + start auto-close timer ──────────────────────
  const showWarnModal = useCallback(() => {
    showWarningRef.current = true;
    setShowWarning(true);
    startCountdown();

    closeTimerRef.current = setTimeout(() => {
      closeRoom();
    }, closeAfterMs);
  }, [closeAfterMs, closeRoom, startCountdown]);

  // ── Schedule the warn timer from now ─────────────────────────────────────
  const scheduleWarn = useCallback(() => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    warnTimerRef.current = setTimeout(() => {
      showWarnModal();
    }, warnAfterMs);
  }, [warnAfterMs, showWarnModal]);

  // ── Handle any user activity ──────────────────────────────────────────────
  const onActivity = useCallback(() => {
    // Ignore activity while the warning is visible —
    // user must click "Continue" explicitly
    if (showWarningRef.current) return;
    scheduleWarn();
  }, [scheduleWarn]);

  // ── Mount: attach activity listeners, start initial warn timer ───────────
  useEffect(() => {
    const events: (keyof DocumentEventMap)[] = [
      "mousemove", "mousedown", "keydown", "scroll", "touchstart", "pointerdown",
    ];

    events.forEach((ev) =>
      document.addEventListener(ev, onActivity, { passive: true }),
    );

    scheduleWarn(); // start the first idle timer

    return () => {
      events.forEach((ev) => document.removeEventListener(ev, onActivity));
      clearAllTimers();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — stable callbacks via useCallback

  // ── "Continue" button handler ─────────────────────────────────────────────
  const onContinue = useCallback(() => {
    clearAllTimers();
    showWarningRef.current = false;
    setShowWarning(false);
    setSecondsLeft(Math.round(closeAfterMs / 1000));
    scheduleWarn(); // restart idle timer from now
  }, [clearAllTimers, closeAfterMs, scheduleWarn]);

  // ── "End session" button handler ─────────────────────────────────────────
  const onEnd = useCallback(() => {
    clearAllTimers();
    closeRoom();
  }, [clearAllTimers, closeRoom]);

  return { showWarning, secondsLeft, onContinue, onEnd };
}
