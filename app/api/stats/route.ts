import { NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export async function GET() {
  try {
    const stats = crmStore.getStats();
    return NextResponse.json({ success: true, stats });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
