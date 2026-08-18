import { NextRequest, NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";

/**
 * GET /api/session/exists?room=<liveKitRoomName>
 *
 * Returns { exists: true/false }
 *
 * Used by the pre-flight page to block guests from joining rooms that
 * don't exist yet. Only signed-in users (the room creator) can open a
 * fresh room — everyone else must wait for an active room.
 *
 * A room "exists" means LiveKit has it in memory with ≥1 participant OR
 * it was recently created (even if empty). We use listRooms() filtered by
 * name — if LiveKit returns the room, it's real and joinable.
 */
export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room");

  if (!room) {
    return NextResponse.json(
      { error: "Missing room parameter" },
      { status: 400 },
    );
  }

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
    // listRooms([name]) returns only rooms matching that name.
    // Empty array = room doesn't exist on the LiveKit server.
    const rooms = await svc.listRooms([room]);
    const exists = rooms.length > 0;

    return NextResponse.json({ exists, room });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[session/exists] listRooms failed:", message);
    return NextResponse.json(
      { error: "Failed to check room", detail: message },
      { status: 500 },
    );
  }
}
