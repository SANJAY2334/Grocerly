import { NextResponse } from "next/server";
import { buildSessionCookieHeader } from "@/lib/auth";
import { revokeSession } from "@/lib/services/auth";
import { createSuccessResponse } from "@/lib/errors";

export async function POST(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/grocerly_session=([^;]+)/);
  if (match && match[1]) {
    const rawVal = decodeURIComponent(match[1]);
    const [sessionId] = rawVal.split(".");
    if (sessionId) {
      await revokeSession(sessionId).catch(() => {});
    }
  }

  const response = createSuccessResponse({ message: "Successfully signed out." });
  response.headers.set("Set-Cookie", buildSessionCookieHeader("", 0));
  return response;
}
