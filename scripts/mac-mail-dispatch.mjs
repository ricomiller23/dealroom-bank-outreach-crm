import fs from "fs";
import path from "path";
import { execSync, spawnSync } from "child_process";

const STORE_PATH = path.join(process.cwd(), "data", "crm-store.json");
const TMP_PATH = "/tmp/dealroom-crm-store.json";
const SEED_PATH = path.join(process.cwd(), "lib", "data", "seed-contacts.json");
const VERCEL_API = process.env.VERCEL_API || "https://dealroom-bank-outreach-crm.vercel.app";

// Read contacts
let contacts = [];
if (fs.existsSync(STORE_PATH)) {
  try {
    const raw = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    if (raw && Array.isArray(raw.contacts)) contacts = raw.contacts;
  } catch {}
}
if (!contacts.length && fs.existsSync(TMP_PATH)) {
  try {
    const raw = JSON.parse(fs.readFileSync(TMP_PATH, "utf8"));
    if (raw && Array.isArray(raw.contacts)) contacts = raw.contacts;
  } catch {}
}
if (!contacts.length && fs.existsSync(SEED_PATH)) {
  contacts = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));
}

console.log(`======================================================================`);
console.log(`DEALROOM OS — BANK OUTREACH DISPATCH ENGINE (MACOS APPLE MAIL)`);
console.log(`======================================================================`);
console.log(`Loaded ${contacts.length} total universe contacts.`);

const now = Date.now();
const COOLDOWN_MS = 30 * 86400000;

// Filter for eligible verified emails
const eligible = contacts.filter(c => {
  if (!c.email || !c.email.includes("@")) return false;
  if (c.status === "unsubscribed" || c.emailStatus === "do_not_contact") return false;
  if (c.sentAt) {
    const diff = now - new Date(c.sentAt).getTime();
    if (diff < COOLDOWN_MS) return false; // 30-day cooldown active
  }
  return true;
});

// Sort Wave 1 first
eligible.sort((a, b) => {
  if (a.wave === "Wave 1" && b.wave !== "Wave 1") return -1;
  if (b.wave === "Wave 1" && a.wave !== "Wave 1") return 1;
  return 0;
});

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "5", 10);
const batch = eligible.slice(0, BATCH_SIZE);

console.log(`Eligible recipients (strictly past 30-day cooldown): ${eligible.length}`);
console.log(`Selected batch size: ${batch.length}`);
console.log(`Live Send Mode: ${process.env.LIVE_SEND === "1" ? "ENABLED (transmitting via Apple Mail)" : "DRY RUN (preview only)"}`);
console.log(`----------------------------------------------------------------------\n`);

function sendViaAppleMail(to, subject, body) {
  const script = `
tell application "Mail"
  set newMessage to make new outgoing message with properties {subject:${JSON.stringify(subject)}, content:${JSON.stringify(body)}, visible:false}
  tell newMessage
    set sender to "Eric Miller <ricomiller@gmail.com>"
    make new to recipient at end of to recipients with properties {address:${JSON.stringify(to)}}
  end tell
  send newMessage
end tell
`;

  const res = spawnSync("osascript", ["-"], { input: script, encoding: "utf8" });
  if (res.error || res.status !== 0) {
    throw new Error(res.stderr || res.error?.message || "AppleScript dispatch failed");
  }
  return true;
}

function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
}

const results = [];
let sentCount = 0;
let failedCount = 0;

for (let i = 0; i < batch.length; i++) {
  const contact = batch[i];
  const targetUrl = `https://dealroom-banks-v2.vercel.app/?ref=${contact.id}&fn=${encodeURIComponent(contact.firstName)}&bk=${encodeURIComponent(contact.bank)}`;
  const trackUrl = `${VERCEL_API}/api/track/click?c=${contact.id}&u=${encodeURIComponent(targetUrl)}`;
  
  // Format body with trackable click URL
  const personalizedBody = contact.body.replace(contact.demoLink, trackUrl);

  process.stdout.write(`[${i + 1}/${batch.length}] Dispatching to ${contact.name} (${contact.bank}) <${contact.email}>... `);

  if (process.env.LIVE_SEND === "1") {
    try {
      sendViaAppleMail(contact.email, contact.subject, personalizedBody);
      console.log(`✓ SENT via ricomiller@gmail.com`);
      sentCount++;

      const nowIso = new Date().toISOString();
      contact.sentAt = nowIso;
      contact.sentCount = (contact.sentCount || 0) + 1;
      contact.status = "sent";
      contact.history = contact.history || [];
      contact.history.unshift({
        id: "cli-" + Math.random().toString(36).slice(2, 9),
        type: "email_sent",
        subject: contact.subject,
        timestamp: nowIso,
        details: `Dispatched via macOS Apple Mail CLI from ricomiller@gmail.com`
      });

      results.push({
        id: contact.id,
        name: contact.name,
        bank: contact.bank,
        email: contact.email,
        status: "SENT",
        timestamp: nowIso
      });
    } catch (err) {
      console.log(`✗ FAILED: ${err.message}`);
      failedCount++;
      results.push({
        id: contact.id,
        name: contact.name,
        bank: contact.bank,
        email: contact.email,
        status: "FAILED",
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }

    if (i < batch.length - 1) {
      sleep(2000); // 2 second pause between sends
    }
  } else {
    console.log(`[DRY RUN - PREVIEW ONLY]`);
    results.push({
      id: contact.id,
      name: contact.name,
      bank: contact.bank,
      email: contact.email,
      status: "PREVIEW",
      timestamp: new Date().toISOString()
    });
  }
}

// Persist updated records locally
const payload = {
  contacts,
  updatedAt: new Date().toISOString()
};
try {
  fs.writeFileSync(STORE_PATH, JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(TMP_PATH, JSON.stringify(payload, null, 2), "utf8");
} catch {}

console.log(`\n======================================================================`);
console.log(`DISPATCH SUMMARY: ${sentCount} sent, ${failedCount} failed, ${batch.length} processed.`);
console.log(`30-day anti-fatigue rule is now locked for all sent contacts.`);
console.log(`======================================================================\n`);

// Export summary report to ~/Downloads
const reportPath = path.join("/Users/ericmiller/Downloads", `DealRoom_Bank_Outreach_Dispatch_${new Date().toISOString().slice(0, 10)}.md`);
let reportMd = `# DealRoom OS — Bank Executive Outbound Dispatch Report

**Date:** ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}  
**Sender Identity:** Eric Miller \`<ricomiller@gmail.com>\`  
**Channel:** Apple Mail (Mail.app) macOS Native Client  
**Execution Mode:** ${process.env.LIVE_SEND === "1" ? "LIVE TRANSMISSION" : "DRY RUN PREVIEW"}  
**Total Targets in Batch:** ${batch.length}  
**Successful Transmissions:** ${sentCount}  
**Failed Transmissions:** ${failedCount}  

---

## Dispatched Executive Roster

| # | ID | Bank Name | Executive Contact | Email Address | Status | Timestamp |
| :-: | :-: | :--- | :--- | :--- | :---: | :--- |
`;

results.forEach((r, idx) => {
  const badge = r.status === "SENT" ? "🟢 **SENT**" : r.status === "FAILED" ? "🔴 **FAILED**" : "🟡 **PREVIEW**";
  reportMd += `| ${idx + 1} | \`${r.id}\` | **${r.bank}** | ${r.name} | \`${r.email}\` | ${badge} | \`${r.timestamp}\` |\n`;
});

reportMd += `\n---\n*Enforced strict 30-day anti-fatigue cooldown rule across all de novo bank targets.*\n`;

try {
  fs.writeFileSync(reportPath, reportMd, "utf8");
  console.log(`✓ Executive dispatch report exported to: ${reportPath}`);
} catch (e) {
  console.error("Could not write report to Downloads:", e.message);
}
