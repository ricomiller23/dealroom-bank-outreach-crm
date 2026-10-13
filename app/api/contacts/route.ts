import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const wave = url.searchParams.get("wave") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const search = url.searchParams.get("search") || undefined;
    const hasEmail = url.searchParams.get("hasEmail") === "true";

    const contacts = crmStore.getContacts({ wave, status, search, hasEmail });
    const stats = crmStore.getStats();

    return NextResponse.json({ contacts, stats });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, updates } = body;
    if (!id) return NextResponse.json({ error: "Contact id required" }, { status: 400 });

    const contact = crmStore.updateContact(id, updates);
    if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

    return NextResponse.json({ success: true, contact });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
