import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { RoomServiceClient } from "livekit-server-sdk";

/**
 * DELETE /api/participants/remove
 * Body: { room: "alice@x.com-a3f9b2", identity: "guest-abc123" }
 *
 * Removes any participant (web guest OR SIP) from the room.
 * Host-only: requires a signed-in Clerk session that owns the room.
 *
 * Ownership check: room names are "<email>-<suffix>", so the signed-in user's
 * email must be the prefix — same guard as /api/session/close.
 */
export async function DELETE(req: NextRequest) {
  // 1. Require signed-in user
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorised — sign in to remove participants" },
      { status: 401 },
    );
  }

  // 2. Parse body
  let body: { room?: string; identity?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { room, identity } = body;

  if (!room || !identity) {
    return NextResponse.json(
      { error: "Missing room or identity parameter" },
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

  // 4. Prevent host from removing themselves
  if (identity === user.id) {
    return NextResponse.json(
      { error: "You cannot remove yourself from the room" },
      { status: 400 },
    );
  }

  // 5. Remove the participant
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
    await svc.removeParticipant(room, identity);
    return NextResponse.json({ ok: true, identity, room });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("not found") || message.includes("404")) {
      return NextResponse.json({ ok: true, identity, room, note: "already gone" });
    }
    console.error("[participants/remove] removeParticipant failed:", message);
    return NextResponse.json(
      { error: "Failed to remove participant", detail: message },
      { status: 500 },
    );
  }
}
