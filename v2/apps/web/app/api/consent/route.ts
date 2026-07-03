import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { cacheSet } from "@/lib/cache";

// Same retention as v1: two years (typical statute of limitations).
const TWO_YEARS_S = 60 * 60 * 24 * 365 * 2;

/** Log a consent record — proof the user accepted the EUA + Privacy Policy. */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    date?: string;
    agreedToTerms?: boolean;
    agreedToPrivacy?: boolean;
  };
  if (!body.date || !body.agreedToTerms || !body.agreedToPrivacy) {
    return NextResponse.json({ error: "invalid consent data" }, { status: 400 });
  }

  const consentId = randomUUID();
  await cacheSet(
    `v2:consent:${consentId}`,
    {
      id: consentId,
      date: body.date,
      ip: request.headers.get("x-forwarded-for") ?? "unknown",
      userAgent: request.headers.get("user-agent") ?? "unknown",
      agreedToTerms: true,
      agreedToPrivacy: true,
      termsVersion: "1.0",
      privacyVersion: "1.0",
    },
    TWO_YEARS_S
  );

  return NextResponse.json({ success: true, consentId });
}
