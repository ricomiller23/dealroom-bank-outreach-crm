import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export async function GET() {
  try {
    const settings = crmStore.getSettings();
    return NextResponse.json({ success: true, settings });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const settings = crmStore.updateSettings(body);
    return NextResponse.json({ success: true, settings });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
