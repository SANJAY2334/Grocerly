import { NextResponse } from "next/server";
import { checkDbHealth } from "@/lib/db/connection";
import { checkEmailHealth } from "@/lib/services/email";

export async function GET(req: Request) {
  // Validate readiness of core storage and dependencies
  const dbHealth = await checkDbHealth();
  const emailHealth = await checkEmailHealth();

  // If running in production with MONGODB_URI, ensure DB is connected
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && dbHealth.status !== "connected") {
    return NextResponse.json(
      {
        ready: false,
        timestamp: new Date().toISOString(),
        reason: `Primary database dependency is not ready (status: ${dbHealth.status})`,
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      ready: true,
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbHealth.status,
        email: emailHealth.status,
      },
    },
    { status: 200 }
  );
}
