import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { RoomServiceClient } from "livekit-server-sdk";

/**
 * POST /api/participants/mute
 * Body: {
 *   room:     "alice@x.com-a3f9b2",
 *   identity: "guest-abc123",
 *   trackSid: "TR_xxxx",          ← from participant.getTrackPublication(source)?.trackSid
 *   muted:    true | false,
 * }
 *
 * Host-only: requires a signed-in Clerk session that owns the room.
 * Ownership check: room names are "<email>-<suffix>".
 *
 * Calls RoomServiceClient.mutePublishedTrack() — this is a server-side force-mute;
 * the participant cannot un-mute themselves unless the host unmutes them or they
 * publish a new track (LiveKit Cloud enforces the muted flag server-side).
 */
export async function POST(req: NextRequest) {
  // 1. Require signed-in user
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorised — sign in to mute participants" },
      { status: 401 },
    );
  }

  // 2. Parse body
  let body: { room?: string; identity?: string; trackSid?: string; muted?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { room, identity, trackSid, muted } = body;

  if (!room || !identity || !trackSid || typeof muted !== "boolean") {
    return NextResponse.json(
      { error: "Missing required fields: room, identity, trackSid, muted" },
      { status: 400 },
    );
  }

  // 3. Verify room ownership (same pattern as /api/session/close)
  const ownerEmails = user.emailAddresses.map((e) => e.emailAddress);
  const isOwner = ownerEmails.some((email) => room.startsWith(`${email}-`));

  if (!isOwner) {
    return NextResponse.json(
      { error: "Forbidden — you are not the owner of this session" },
      { status: 403 },
    );
  }

  // 4. Prevent host from muting themselves via this endpoint
  if (identity === user.id) {
    return NextResponse.json(
      { error: "Use local controls to mute yourself" },
      { status: 400 },
    );
  }

  // 5. Call mutePublishedTrack
  const apiKey    = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !serverUrl) {
    return NextResponse.json(
      { error: "LiveKit credentials not configured" },
      { status: 500 },
    );
  }

  try {
    const svc = new RoomServiceClient(serverUrl, apiKey, apiSecret);
    await svc.mutePublishedTrack(room, identity, trackSid, muted);
    return NextResponse.json({ ok: true, identity, trackSid, muted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // 404 means participant or track already gone — treat as success
    if (message.includes("not found") || message.includes("404")) {
      return NextResponse.json({ ok: true, identity, trackSid, muted, note: "already gone" });
    }
    console.error("[participants/mute] mutePublishedTrack failed:", message);
    return NextResponse.json(
      { error: "Failed to mute track", detail: message },
      { status: 500 },
    );
  }
}
