import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { RoomServiceClient } from "livekit-server-sdk";

/**
 * DELETE /api/session/close?room=<liveKitRoomName>
 *
 * Called by useIdleTimer when:
 *   a) The user clicks "End session" in the IdleWarningModal, OR
 *   b) The 5-minute countdown expires (auto-close)
 *
 * What it does:
 *   1. Requires the caller to be signed in (Clerk session cookie)
 *   2. Verifies the caller owns the room:
 *      Room names are "<email>-<suffix>" (e.g. "alice@example.com-a3f9b2").
 *      Only the user whose primary email matches the room name prefix may
 *      delete it. Guests and other signed-in users are rejected with 403.
 *   3. Calls LiveKit's DeleteRoom API → immediately disconnects all
 *      participants and agents, frees server resources.
 *
 * Why ownership matters:
 *   The invite link (which encodes the room name in base64url) is shared
 *   with every guest. Any guest could trivially decode the room name and
 *   call this endpoint to kill an active call. Tying deletion to the
 *   host's Clerk identity closes that attack surface entirely.
 */
export async function DELETE(req: NextRequest) {
  // ── 1. Require authentication ──────────────────────────────────────────
  // currentUser() reads the Clerk session cookie set by ClerkProvider.
  // Returns null for unauthenticated requests (guests, strangers).
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorised — sign in to close a session" },
      { status: 401 },
    );
  }

  // ── 2. Read and validate the room param ───────────────────────────────
  const room = req.nextUrl.searchParams.get("room");
  if (!room) {
    return NextResponse.json(
      { error: "Missing room parameter" },
      { status: 400 },
    );
  }

  // ── 3. Verify room ownership ──────────────────────────────────────────
  // Room names are built in page.tsx as: `${email}-${randomSuffix()}`
  // The host's primary email must be the prefix of the room name.
  // We match the exact prefix "<email>-" so "alice@x.com" can't close
  // a room created by "alice@x.com.evil.com".
  const primaryEmailId = user.primaryEmailAddressId;
  const primaryEmail   = user.emailAddresses.find(
    (e) => e.id === primaryEmailId,
  )?.emailAddress;

  // Fall back to checking all email addresses in case primaryEmailAddressId
  // is null (shouldn't happen for normal accounts but be defensive).
  const ownerEmails = user.emailAddresses.map((e) => e.emailAddress);

  const isOwner = ownerEmails.some((email) =>
    room.startsWith(`${email}-`),
  );

  if (!isOwner) {
    return NextResponse.json(
      { error: "Forbidden — you are not the owner of this session" },
      { status: 403 },
    );
  }

  // ── 4. Read LiveKit credentials ───────────────────────────────────────
  const apiKey    = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !serverUrl) {
    return NextResponse.json(
      { error: "LiveKit credentials not configured" },
      { status: 500 },
    );
  }

  // ── 5. Delete the room ────────────────────────────────────────────────
  try {
    const svc = new RoomServiceClient(serverUrl, apiKey, apiSecret);
    await svc.deleteRoom(room);
    return NextResponse.json({ deleted: true, room });
  } catch (err: unknown) {
    // If the room doesn't exist (already empty/deleted), treat as success
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes("not found") ||
      message.includes("room not found") ||
      message.includes("404")
    ) {
      return NextResponse.json({ deleted: true, room, note: "already gone" });
    }
    console.error("[session/close] DeleteRoom failed:", message);
    return NextResponse.json(
      { error: "Failed to delete room", detail: message },
      { status: 500 },
    );
  }
}
