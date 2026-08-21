import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  AccessToken,
  RoomConfiguration,
  RoomAgentDispatch,
  RoomServiceClient,
} from "livekit-server-sdk";

const SESSION_TTL_SECONDS = 4 * 60 * 60; // 4h hard cap
const EMPTY_ROOM_TIMEOUT  = 600;          // close empty rooms after 10 min (gives host time to join)
const DEPARTURE_TIMEOUT   = 120;          // close room 2 min after last person leaves — caps "ghost agent"
                                          // cost window. Link stays reusable: host can re-join the same
                                          // room name at any time and LiveKit will re-create it fresh.
const MAX_PARTICIPANTS    = 8;            // room cap

const TRANSLATOR_AGENT_NAME = "gemini-translator";

export async function GET(req: NextRequest) {
  // ── 1. Identify the caller ───────────────────────────────────────────────
  // Signed-in users  → Clerk userId is the source of truth for identity.
  // Guests           → no Clerk session; identity comes from the client
  //                    as "guest-XXXXXXXX" (generated in RoomClient.tsx).
  const { userId } = await auth();

  // ── 2. Read params ────────────────────────────────────────────────────────
  const room        = req.nextUrl.searchParams.get("room");
  const identity    = req.nextUrl.searchParams.get("identity");
  const displayName =
    req.nextUrl.searchParams.get("name")?.trim() || identity || "";

  if (!room || !identity) {
    return NextResponse.json(
      { error: "Missing room or identity parameter" },
      { status: 400 },
    );
  }

  // ── 3. Identity validation ────────────────────────────────────────────────
  // Signed-in users must pass their own Clerk userId as identity.
  if (userId && identity !== userId) {
    return NextResponse.json(
      { error: "Identity mismatch" },
      { status: 403 },
    );
  }

  // Guests may not claim a Clerk-style "user_*" identity.
  if (!userId && identity.startsWith("user_")) {
    return NextResponse.json(
      { error: "Invalid guest identity" },
      { status: 403 },
    );
  }

  // ── 4. Read LiveKit credentials ──────────────────────────────────────────
  const apiKey    = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !serverUrl) {
    return NextResponse.json(
      { error: "LiveKit credentials not configured" },
      { status: 500 },
    );
  }

  // ── 5. Guest room-existence check (server-side guard) ────────────────────
  // Guests are not allowed to create new rooms — only signed-in users (hosts)
  // can open a fresh LiveKit room (via the RoomConfiguration below).
  //
  // If the caller is a guest AND the room does NOT yet exist on LiveKit,
  // reject the token request. This prevents a guest from typing a random URL
  // and accidentally (or maliciously) spawning a new paid agent session.
  if (!userId) {
    try {
      const svc = new RoomServiceClient(serverUrl, apiKey, apiSecret);
      const rooms = await svc.listRooms([room]);
      if (rooms.length === 0) {
        return NextResponse.json(
          { error: "Session not found or not yet started. Ask the host to start the call first." },
          { status: 404 },
        );
      }
    } catch (err: unknown) {
      // If the liveness check itself fails (network, config) → fail closed
      // for guests so we never silently spin up a rogue room.
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[token] guest room-check failed:", msg);
      return NextResponse.json(
        { error: "Could not verify session. Please try again." },
        { status: 503 },
      );
    }
  }

  // ── 6. Mint the LiveKit access token ─────────────────────────────────────
  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: displayName,
    ttl: SESSION_TTL_SECONDS,
  });

  at.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
    canUpdateOwnMetadata: true,
  });

  // Dispatch the translator agent on first creation (idempotent on subsequent mints).
  // For guests the room already exists, so this config is ignored by LiveKit —
  // the agent was already dispatched when the host joined.
  at.roomConfig = new RoomConfiguration({
    agents: [
      new RoomAgentDispatch({
        agentName: TRANSLATOR_AGENT_NAME,
        metadata: JSON.stringify({ sessionId: room }),
      }),
    ],
    emptyTimeout: EMPTY_ROOM_TIMEOUT,
    departureTimeout: DEPARTURE_TIMEOUT,
    maxParticipants: MAX_PARTICIPANTS,
  });

  const token = await at.toJwt();
  return NextResponse.json({ token, serverUrl });
}
