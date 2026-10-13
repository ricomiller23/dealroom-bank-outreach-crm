import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contactId, contactIds, sequenceStep, customSubject, customBody, forceOverride } = body;

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Batch send mode
    if (Array.isArray(contactIds) && contactIds.length > 0) {
      const results: any[] = [];
      const errors: any[] = [];

      for (const id of contactIds) {
        try {
          const res = crmStore.dispatchEmail({
            contactId: id,
            sequenceStep,
            forceOverride,
            ip,
            userAgent
          });
          results.push(res);
        } catch (err: any) {
          errors.push({ id, error: err.message, cooldown: err.cooldown });
        }
      }

      return NextResponse.json({
        success: true,
        dispatchedCount: results.length,
        errorCount: errors.length,
        results,
        errors,
        sentToday: crmStore.getSentTodayCount()
      });
    }

    // Single send mode
    if (!contactId) {
      return NextResponse.json({ error: "Missing contactId" }, { status: 400 });
    }

    const res = crmStore.dispatchEmail({
      contactId,
      sequenceStep,
      customSubject,
      customBody,
      forceOverride,
      ip,
      userAgent
    });

    return NextResponse.json({
      success: true,
      result: res,
      sentToday: crmStore.getSentTodayCount()
    });
  } catch (e: any) {
    return NextResponse.json({
      error: e.message,
      cooldown: e.cooldown,
      sentToday: crmStore.getSentTodayCount()
    }, { status: 400 });
  }
}
