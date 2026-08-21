import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { SipClient, RoomServiceClient } from "livekit-server-sdk";
import { PARTICIPANT_LANG_ATTR } from "@/lib/config";

/**
 * POST /api/sip/invite
 * Body: { phone: "+14155551234", lang: "es", room: "alice@x.com-a3f9b2" }
 *
 * Dials a phone number into the given LiveKit room via SIP.
 * Host-only: requires a signed-in Clerk session.
 *
 * DELETE /api/sip/invite
 * Body: { identity: "sip_+14155551234", room: "alice@x.com-a3f9b2" }
 *
 * Hangs up (removes) a SIP participant from the room.
 * Host-only: requires a signed-in Clerk session.
 */

function getCredentials() {
  const apiKey    = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = process.env.LIVEKIT_URL;
  if (!apiKey || !apiSecret || !serverUrl) {
    throw new Error("LiveKit credentials not configured");
  }
  return { apiKey, apiSecret, serverUrl };
}

// ── POST — dial a phone number into the room ─────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Require signed-in host
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorised — sign in to invite participants" },
      { status: 401 },
    );
  }

  // 2. Parse body
  let body: { phone?: string; lang?: string; room?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { phone, lang = "en", room } = body;

  if (!phone || !room) {
    return NextResponse.json(
      { error: "Missing phone or room parameter" },
      { status: 400 },
    );
  }

  // 3. Validate E.164 phone format: starts with +, then digits only, 7–15 digits total
  const e164 = /^\+[1-9]\d{6,14}$/.test(phone);
  if (!e164) {
    return NextResponse.json(
      { error: "Phone number must be in E.164 format, e.g. +14155551234" },
      { status: 400 },
    );
  }

  // 4. Load SIP trunk ID from Clerk privateMetadata (per-user passcode)
  let trunkId: string | undefined;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const meta = user.privateMetadata as Record<string, unknown>;
    trunkId = typeof meta.sipTrunkId === "string" && meta.sipTrunkId.trim()
      ? meta.sipTrunkId.trim()
      : undefined;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sip/invite] Clerk metadata read failed:", message);
    return NextResponse.json(
      { error: "Failed to read passcode configuration" },
      { status: 500 },
    );
  }

  if (!trunkId) {
    return NextResponse.json(
      { error: "Phone calls not configured. Please add your passcode in Settings." },
      { status: 400 },
    );
  }

  // 5. Dial out via SIP
  try {
    const { apiKey, apiSecret, serverUrl } = getCredentials();
    const sipClient  = new SipClient(serverUrl, apiKey, apiSecret);
    const sipIdentity = `sip_${phone.replace(/[^0-9+]/g, "")}`;

    await sipClient.createSipParticipant(trunkId, phone, room, {
      participantIdentity:    sipIdentity,
      participantName:        phone,
      participantAttributes:  { [PARTICIPANT_LANG_ATTR]: lang },
      playDialtone:           true,
      waitUntilAnswered:      false,  // don't block the HTTP response waiting for pickup
    });

    return NextResponse.json({ ok: true, identity: sipIdentity, phone });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sip/invite] createSipParticipant failed:", message);
    return NextResponse.json(
      { error: "Failed to dial phone number", detail: message },
      { status: 500 },
    );
  }
}

// ── DELETE — hang up / remove a SIP participant ──────────────────────────────

export async function DELETE(req: NextRequest) {
  // 1. Require signed-in host
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorised — sign in to remove participants" },
      { status: 401 },
    );
  }

  // 2. Parse body
  let body: { identity?: string; room?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { identity, room } = body;
  if (!identity || !room) {
    return NextResponse.json(
      { error: "Missing identity or room parameter" },
      { status: 400 },
    );
  }

  // 3. Remove participant via RoomServiceClient
  try {
    const { apiKey, apiSecret, serverUrl } = getCredentials();
    const svc = new RoomServiceClient(serverUrl, apiKey, apiSecret);
    await svc.removeParticipant(room, identity);
    return NextResponse.json({ ok: true, identity, room });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // If already gone, treat as success
    if (message.includes("not found") || message.includes("404")) {
      return NextResponse.json({ ok: true, identity, room, note: "already gone" });
    }
    console.error("[sip/invite DELETE] removeParticipant failed:", message);
    return NextResponse.json(
      { error: "Failed to remove participant", detail: message },
      { status: 500 },
    );
  }
}
