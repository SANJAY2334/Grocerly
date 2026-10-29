import { NextResponse } from "next/server";
import { checkDbHealth, connectToDatabase } from "@/lib/db/connection";
import { checkEmailHealth } from "@/lib/services/email";
import { getRazorpayConfigStatus } from "@/lib/payments";
import { ProductModel } from "@/lib/models/Product";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();

  try {
    await connectToDatabase();
  } catch {
    // If connecting fails, checkDbHealth reports disconnected below
  }

  const dbHealth = await checkDbHealth();
  const emailHealth = await checkEmailHealth();
  const paymentStatus = getRazorpayConfigStatus();

  let totalProducts = 0;
  if (dbHealth.status === "connected") {
    try {
      totalProducts = await ProductModel.countDocuments();
    } catch {
      // ignore
    }
  }

  const memory = process.memoryUsage();

  return NextResponse.json(
    {
      status: dbHealth.status === "connected" ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || "development",
      services: {
        database: {
          status: dbHealth.status,
          dbName: dbHealth.dbName,
          pingMs: dbHealth.pingMs,
        },
        email: {
          status: emailHealth.status,
          provider: emailHealth.provider,
          configured: emailHealth.configured,
        },
        paymentGateway: {
          configured: paymentStatus.configured,
          mode: paymentStatus.mode,
          webhookConfigured: paymentStatus.webhookConfigured,
        },
      },
      catalog: {
        totalProducts,
      },
      system: {
        heapUsedMB: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
        responseTimeMs: Date.now() - startTime,
      },
    },
    { status: 200 }
  );
}
