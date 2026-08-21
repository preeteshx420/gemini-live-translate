import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { SipClient } from "livekit-server-sdk";

/**
 * POST /api/user/verify-sip-trunk
 * Body: { trunkId: string }
 *
 * Validates a SIP trunk ID by calling sipClient.getSipTrunk(trunkId).
 * Returns { valid: boolean, name?: string } — never exposes the raw trunk details.
 *
 * Host-only: requires a signed-in Clerk session.
 * Call this BEFORE saving the trunk ID via POST /api/user/sip-trunk.
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

export async function POST(req: NextRequest) {
  // 1. Require signed-in user
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorised — sign in required" },
      { status: 401 },
    );
  }

  // 2. Parse body
  let body: { trunkId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { trunkId } = body;
  if (!trunkId || typeof trunkId !== "string" || !trunkId.trim()) {
    return NextResponse.json(
      { error: "Missing or invalid trunkId" },
      { status: 400 },
    );
  }

  // 3. Validate via LiveKit SIP API
  try {
    const { apiKey, apiSecret, serverUrl } = getCredentials();
    const sipClient = new SipClient(serverUrl, apiKey, apiSecret);
    const trunk = await sipClient.getSipOutboundTrunk(trunkId.trim());

    // If getSipOutboundTrunk didn't throw, the trunk exists
    return NextResponse.json({
      valid: true,
      name: trunk.name ?? undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    // 404-class errors mean the trunk ID doesn't exist or isn't accessible
    if (
      message.includes("not found") ||
      message.includes("404") ||
      message.includes("does not exist")
    ) {
      return NextResponse.json({ valid: false });
    }

    // Unexpected server/network error
    console.error("[user/verify-sip-trunk] getSipOutboundTrunk error:", message);
    return NextResponse.json(
      { error: "Verification failed — please try again", detail: message },
      { status: 500 },
    );
  }
}
