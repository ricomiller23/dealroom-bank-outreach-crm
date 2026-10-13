import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const contactId = url.searchParams.get("id");
  const targetUrl = url.searchParams.get("url") || "https://dealroom-banks-v2.vercel.app";

  if (contactId) {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    try {
      crmStore.recordClick({ contactId, targetUrl, ip, userAgent });
    } catch (err) {
      console.error("Failed to record click:", err);
    }
  }

  // Redirect to target URL
  return NextResponse.redirect(targetUrl, 302);
}
