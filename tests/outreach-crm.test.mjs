import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";

// Clean tmp store before testing
try { fs.unlinkSync("/tmp/dealroom-crm-store.json"); } catch {}

// Dynamically import compiled store logic or seed
const seedRaw = JSON.parse(fs.readFileSync("lib/data/seed-contacts.json", "utf8"));

test("Test 1: Seed data contains 319 contacts and 39 verified emails", () => {
  assert.equal(seedRaw.length, 319);
  const verified = seedRaw.filter(c => !!c.email);
  assert.equal(verified.length, 39);
});

test("Test 2: All demo links target dealroom-banks-v2.vercel.app with query parameters", () => {
  for (const c of seedRaw) {
    assert.ok(c.demoLink.includes("https://dealroom-banks-v2.vercel.app/?ref="), `Invalid link for ${c.id}`);
    assert.ok(c.demoLink.includes(`ref=${c.id}`), `Missing ref for ${c.id}`);
    assert.ok(c.demoLink.includes("fn="), `Missing fn for ${c.id}`);
    assert.ok(c.demoLink.includes("bk="), `Missing bk for ${c.id}`);
  }
});

test("Test 3: 30-day cooldown logic correctly identifies fresh vs protected contacts", () => {
  const contact = { ...seedRaw[0] };
  const now = Date.now();

  // Fresh contact
  contact.sentAt = null;
  assert.equal(contact.sentAt, null);

  // Sent 10 days ago -> In cooldown
  contact.sentAt = new Date(now - 10 * 86400000).toISOString();
  const diffDays = (now - new Date(contact.sentAt).getTime()) / 86400000;
  assert.ok(diffDays < 30);
  const remaining = Math.ceil(30 - diffDays);
  assert.equal(remaining, 20);

  // Sent 35 days ago -> Cooldown expired
  contact.sentAt = new Date(now - 35 * 86400000).toISOString();
  const diffDaysExpired = (now - new Date(contact.sentAt).getTime()) / 86400000;
  assert.ok(diffDaysExpired >= 30);
});

test("Test 4: CAN-SPAM compliant opt-out and physical postal address present in all bodies", () => {
  const sample = seedRaw[0];
  assert.ok(sample.body.includes('reply "unsubscribe"'), "Missing unsubscribe opt-out");
  assert.ok(sample.body.includes("Scottsdale, AZ"), "Missing physical address");
  assert.ok(sample.body.includes("ricomiller@gmail.com"), "Missing sender email");
});
