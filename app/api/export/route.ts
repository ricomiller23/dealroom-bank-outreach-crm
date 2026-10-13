import { NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export async function GET() {
  try {
    const contacts = crmStore.getContacts();
    const headers = [
      "ID",
      "Name",
      "First Name",
      "Bank",
      "City",
      "State",
      "Title",
      "Role Group",
      "Email",
      "Email Status",
      "Phone",
      "Wave",
      "Status",
      "Sent Count",
      "Last Sent At",
      "Open Count",
      "Last Opened At",
      "Click Count",
      "Last Clicked At",
      "30-Day Cooldown Active",
      "Eligible Date",
      "Demo Link"
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = contacts.map(c => {
      const cooldown = crmStore.checkCooldown(c);
      return [
        escapeCsv(c.id),
        escapeCsv(c.name),
        escapeCsv(c.firstName),
        escapeCsv(c.bank),
        escapeCsv(c.city),
        escapeCsv(c.state),
        escapeCsv(c.title),
        escapeCsv(c.roleGroup),
        escapeCsv(c.email),
        escapeCsv(c.emailStatus),
        escapeCsv(c.phone),
        escapeCsv(c.wave),
        escapeCsv(c.status),
        c.sentCount || 0,
        escapeCsv(c.sentAt || ""),
        c.openCount || 0,
        escapeCsv(c.lastOpenedAt || ""),
        c.clickCount || 0,
        escapeCsv(c.lastClickedAt || ""),
        cooldown.inCooldown ? "YES" : "NO",
        escapeCsv(cooldown.eligibleDate || ""),
        escapeCsv(c.demoLink)
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="dealroom_bank_outreach_telemetry_${new Date().toISOString().slice(0, 10)}.csv"`
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
