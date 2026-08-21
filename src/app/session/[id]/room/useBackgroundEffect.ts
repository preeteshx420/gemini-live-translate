"use client";
/**
 * useBackgroundEffect
 *
 * Exactly mirrors livekit-examples/meet CameraSettings.tsx:
 * - State change (setEffect) triggers a useEffect that calls setProcessor / stopProcessor
 * - No async on-click handler — state is set synchronously, effect applies processor
 * - BackgroundBlur() / VirtualBackground(path) called fresh each time (same as Meet)
 */
import { useEffect, useRef, useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { isLocalTrack, LocalTrackPublication } from "livekit-client";

export type BgEffect = "none" | "blur" | "desk" | "nature";

const BG_PATHS: Record<string, string> = {
  desk:   "/backgrounds/desk.jpg",
  nature: "/backgrounds/nature.jpg",
};

interface BackgroundEffectHook {
  effect: BgEffect;
  setEffect: (e: BgEffect) => void;
  supported: boolean | null; // null = still loading module
}

export function useBackgroundEffect(): BackgroundEffectHook {
  const { cameraTrack } = useLocalParticipant();
  const [effect, setEffect] = useState<BgEffect>("none");
  const [supported, setSupported] = useState<boolean | null>(null);
  // Hold the loaded module so we never dynamically import more than once
  const modRef = useRef<{ BackgroundBlur: any; VirtualBackground: any } | null>(null);

  // Load @livekit/track-processors once on mount
  useEffect(() => {
    import("@livekit/track-processors")
      .then((mod) => {
        modRef.current = mod as any;
        setSupported(true);
      })
      .catch(() => setSupported(false));
  }, []);

  // Apply processor whenever `effect` or `cameraTrack` changes — same as Meet's useEffect
  useEffect(() => {
    if (!modRef.current) return;
    if (!isLocalTrack((cameraTrack as LocalTrackPublication)?.track)) return;

    const track = (cameraTrack as LocalTrackPublication).track!;
    const { BackgroundBlur, VirtualBackground } = modRef.current;

    if (effect === "blur") {
      track.setProcessor(BackgroundBlur());
    } else if (effect === "desk" || effect === "nature") {
      track.setProcessor(VirtualBackground(BG_PATHS[effect]));
    } else {
      track.stopProcessor();
    }
  }, [effect, cameraTrack]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const track = (cameraTrack as LocalTrackPublication)?.track;
      if (isLocalTrack(track)) {
        track.stopProcessor().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { effect, setEffect, supported };
}
