import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { decryptOptional } from "@/lib/fieldEncryption";

/** GET: List session reports (admin only). */
export async function GET(req: NextRequest) {
  const auth = requireRole(req, "admin");
  if (auth instanceof NextResponse) return auth;

  const reports = await prisma.sessionReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      reporter: {
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
        },
      },
    },
  });

  const list = reports.map((r) => ({
    id: r.id,
    reportType: r.reportType,
    referenceId: r.referenceId,
    reason: decryptOptional(r.reason),
    createdAt: r.createdAt,
    reporter: {
      id: r.reporter.id,
      email: r.reporter.email,
      displayName: r.reporter.displayName,
      role: r.reporter.role,
    },
  }));

  return NextResponse.json({ reports: list });
}
