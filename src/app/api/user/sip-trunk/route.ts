import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * GET /api/user/sip-trunk
 * Returns whether the signed-in user has a passcode (SIP trunk ID) configured.
 * Never exposes the raw trunk ID — only { configured: boolean }.
 *
 * POST /api/user/sip-trunk
 * Body: { trunkId: string }
 * Saves the trunk ID to the user's Clerk privateMetadata as `sipTrunkId`.
 * This should only be called after /api/user/verify-sip-trunk confirms it is valid.
 */

// ── GET — check whether passcode is configured ────────────────────────────────

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorised — sign in required" },
      { status: 401 },
    );
  }

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const meta = user.privateMetadata as Record<string, unknown>;
    const configured = typeof meta.sipTrunkId === "string" && meta.sipTrunkId.trim().length > 0;
    return NextResponse.json({ configured });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[user/sip-trunk GET] Clerk error:", message);
    return NextResponse.json(
      { error: "Failed to read passcode status", detail: message },
      { status: 500 },
    );
  }
}

// ── POST — save trunk ID to Clerk privateMetadata ────────────────────────────

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorised — sign in required" },
      { status: 401 },
    );
  }

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

  try {
    const client = await clerkClient();
    // Merge into existing privateMetadata so other fields are preserved
    const user = await client.users.getUser(userId);
    const existing = (user.privateMetadata as Record<string, unknown>) ?? {};
    await client.users.updateUserMetadata(userId, {
      privateMetadata: {
        ...existing,
        sipTrunkId: trunkId.trim(),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[user/sip-trunk POST] Clerk error:", message);
    return NextResponse.json(
      { error: "Failed to save passcode", detail: message },
      { status: 500 },
    );
  }
}
