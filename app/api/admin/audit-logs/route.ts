import { NextResponse } from "next/server";
import { requireRole } from "@/lib/middleware";
import { fetchAuditLogs, getInMemoryAuditLogs } from "@/lib/logging";
import { createErrorResponse, createSuccessResponse } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    await requireRole(req, ["ADMIN"]);

    const logs = await fetchAuditLogs(100);
    if (logs && logs.length > 0) {
      return createSuccessResponse({ auditLogs: logs });
    }

    if (process.env.NODE_ENV === "test") {
      const testLogs = getInMemoryAuditLogs(100);
      return createSuccessResponse({ auditLogs: testLogs });
    }

    return createSuccessResponse({ auditLogs: [] });
  } catch (err) {
    return createErrorResponse(err);
  }
}
