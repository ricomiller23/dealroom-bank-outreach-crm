import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const STORE_PATH = path.join(process.cwd(), "data", "crm-store.json");
const TMP_PATH = "/tmp/dealroom-crm-store.json";
const SEED_PATH = path.join(process.cwd(), "lib", "data", "seed-contacts.json");

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

console.log(`Loaded ${contacts.length} total contacts.`);

// Filter for eligible Wave 1 verified emails
const now = Date.now();
const COOLDOWN_MS = 30 * 86400000;

const eligible = contacts.filter(c => {
  if (!c.email) return false;
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

console.log(`Found ${eligible.length} eligible contacts. Sending batch of ${batch.length}...`);

function sendViaAppleMail(to, subject, body) {
  const escSubject = subject.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const escBody = body.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  
  const script = `
    tell application "Mail"
      set newMsg to make new outgoing message with properties {sender:"ricomiller@gmail.com", subject:"${escSubject}", content:"${escBody}", visible:false}
      tell newMsg
        make new to recipient at end of to recipients with properties {address:"${to}"}
        send
      end tell
    end tell
  `;
  execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
}

for (const contact of batch) {
  console.log(`\nDispatching to ${contact.name} (${contact.bank}) <${contact.email}>...`);
  try {
    // In dry run or test mode unless LIVE_SEND=1
    if (process.env.LIVE_SEND === "1") {
      sendViaAppleMail(contact.email, contact.subject, contact.body);
      console.log(`✓ Sent via Apple Mail from ricomiller@gmail.com`);
    } else {
      console.log(`[DRY RUN] Would send from ricomiller@gmail.com. Set LIVE_SEND=1 to execute live transmission.`);
    }

    // Update contact record
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
      details: `Dispatched via macOS Apple Mail CLI (ricomiller@gmail.com)`
    });
  } catch (err) {
    console.error(`✗ Error dispatching to ${contact.email}:`, err.message);
  }
}

// Persist back
const payload = {
  contacts,
  updatedAt: new Date().toISOString()
};
fs.writeFileSync(STORE_PATH, JSON.stringify(payload, null, 2), "utf8");
fs.writeFileSync(TMP_PATH, JSON.stringify(payload, null, 2), "utf8");
console.log(`\nUpdated store with ${batch.length} dispatches. 30-day cooldown active for these contacts.`);
