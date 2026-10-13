import fs from "fs";
import path from "path";
import seedData from "./data/seed-contacts.json";

export interface OutreachHistoryItem {
  id: string;
  type: "email_sent" | "opened" | "clicked" | "replied" | "unsubscribed" | "cooldown_blocked";
  subject?: string;
  sequenceStep?: "day0" | "day4" | "day10" | "custom";
  messageId?: string;
  timestamp: string;
  details?: string;
  ip?: string;
  userAgent?: string;
}

export interface OutreachContact {
  id: string;
  name: string;
  firstName: string;
  bank: string;
  city: string;
  state: string;
  title: string;
  roleGroup: string;
  email: string;
  emailStatus: "verified" | "needs_research" | "unverified" | "do_not_contact";
  phone: string;
  linkedin: string;
  howToReach: string;
  wave: string;
  status: "ready" | "sent" | "opened" | "clicked" | "replied" | "cooldown" | "unsubscribed" | "needs_email";
  demoLink: string;
  subject: string;
  body: string;
  followUp1: string;
  followUp2: string;
  openCount: number;
  lastOpenedAt: string | null;
  clickCount: number;
  lastClickedAt: string | null;
  sentAt: string | null;
  sentCount: number;
  history: OutreachHistoryItem[];
}

export interface CampaignSettings {
  senderEmail: string;
  senderName: string;
  senderCompany: string;
  senderAddress: string;
  dailySendLimit: number;
  cooldownDays: number;
  delayBetweenEmailsMs: number;
  trackingBaseUrl: string;
}

const DEFAULT_SETTINGS: CampaignSettings = {
  senderEmail: "ricomiller@gmail.com",
  senderName: "Eric Miller",
  senderCompany: "DealRoom OS",
  senderAddress: "DealRoom OS Capital Formation • 7135 E Camelback Rd, Scottsdale, AZ 85251",
  dailySendLimit: 25,
  cooldownDays: 30,
  delayBetweenEmailsMs: 2000,
  trackingBaseUrl: process.env.NEXT_PUBLIC_APP_URL || "https://dealroom-bank-outreach-crm.vercel.app"
};

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "crm-store.json");
const TMP_FILE = "/tmp/dealroom-crm-store.json";

class OutreachCRMStore {
  private contacts: Map<string, OutreachContact> = new Map();
  private settings: CampaignSettings = { ...DEFAULT_SETTINGS };
  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.initialized) return;
    this.initialized = true;

    // Try reading persistent file from data/ or /tmp
    let loaded = false;
    for (const f of [STORE_FILE, TMP_FILE]) {
      if (fs.existsSync(f)) {
        try {
          const raw = fs.readFileSync(f, "utf8");
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.contacts)) {
            for (const c of parsed.contacts) {
              this.contacts.set(c.id, c);
            }
            if (parsed.settings) {
              this.settings = { ...this.settings, ...parsed.settings };
            }
            loaded = true;
            break;
          }
        } catch {}
      }
    }

    if (!loaded) {
      // Seed from JSON file
      for (const item of (seedData as OutreachContact[])) {
        this.contacts.set(item.id, {
          ...item,
          openCount: item.openCount || 0,
          clickCount: item.clickCount || 0,
          sentCount: item.sentCount || 0,
          history: item.history || []
        });
      }
      this.persist();
    }
  }

  private persist() {
    const payload = {
      contacts: Array.from(this.contacts.values()),
      settings: this.settings,
      updatedAt: new Date().toISOString()
    };
    const jsonStr = JSON.stringify(payload, null, 2);

    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_FILE, jsonStr, "utf8");
    } catch {}

    try {
      fs.writeFileSync(TMP_FILE, jsonStr, "utf8");
    } catch {}
  }

  public getContacts(filter?: { wave?: string; status?: string; search?: string; hasEmail?: boolean }): OutreachContact[] {
    this.init();
    let list = Array.from(this.contacts.values());

    if (filter?.wave && filter.wave !== "all") {
      list = list.filter(c => c.wave.toLowerCase() === filter.wave?.toLowerCase());
    }

    if (filter?.status && filter.status !== "all") {
      list = list.filter(c => {
        if (filter.status === "cooldown") {
          return this.checkCooldown(c).inCooldown;
        }
        return c.status === filter.status;
      });
    }

    if (filter?.hasEmail === true) {
      list = list.filter(c => !!c.email);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) ||
        c.bank.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q)
      );
    }

    return list;
  }

  public getContact(id: string): OutreachContact | undefined {
    this.init();
    return this.contacts.get(id);
  }

  public checkCooldown(contact: OutreachContact, days = this.settings.cooldownDays) {
    if (!contact.sentAt) {
      return { inCooldown: false, daysRemaining: 0, lastSentDate: null, eligibleDate: null };
    }

    const sentTime = new Date(contact.sentAt).getTime();
    const cooldownMs = days * 86400000;
    const now = Date.now();
    const diff = now - sentTime;

    if (diff < cooldownMs) {
      const remainingMs = cooldownMs - diff;
      const daysRemaining = Math.ceil(remainingMs / 86400000);
      const eligibleDate = new Date(sentTime + cooldownMs).toISOString();
      return {
        inCooldown: true,
        daysRemaining,
        lastSentDate: contact.sentAt,
        eligibleDate
      };
    }

    return { inCooldown: false, daysRemaining: 0, lastSentDate: contact.sentAt, eligibleDate: null };
  }

  public getSentTodayCount(): number {
    this.init();
    const oneDayAgo = Date.now() - 86400000;
    let count = 0;
    for (const c of this.contacts.values()) {
      if (c.sentAt && new Date(c.sentAt).getTime() >= oneDayAgo) {
        count++;
      }
    }
    return count;
  }

  public dispatchEmail(opts: {
    contactId: string;
    sequenceStep?: "day0" | "day4" | "day10" | "custom";
    customSubject?: string;
    customBody?: string;
    forceOverride?: boolean;
    ip?: string;
    userAgent?: string;
  }) {
    this.init();
    const contact = this.contacts.get(opts.contactId);
    if (!contact) throw new Error("Contact not found");
    if (!contact.email) throw new Error("Contact does not have a verified public email address");

    const cooldown = this.checkCooldown(contact);
    if (cooldown.inCooldown && !opts.forceOverride) {
      const err = new Error(`30-DAY COOLDOWN ACTIVE: Sent ${contact.sentAt ? new Date(contact.sentAt).toLocaleDateString() : "recently"}. Blocked for ${cooldown.daysRemaining} more days until ${cooldown.eligibleDate ? new Date(cooldown.eligibleDate).toLocaleDateString() : "next month"} to prevent recipient fatigue.`);
      (err as any).cooldown = cooldown;
      throw err;
    }

    const sentToday = this.getSentTodayCount();
    if (sentToday >= this.settings.dailySendLimit && !opts.forceOverride) {
      throw new Error(`DAILY SEND LIMIT REACHED: Already sent ${sentToday} of ${this.settings.dailySendLimit} emails today. Use override or wait for next window to protect domain reputation.`);
    }

    let subject = opts.customSubject || contact.subject;
    let body = opts.customBody;

    if (!body) {
      if (opts.sequenceStep === "day4") body = contact.followUp1 || contact.body;
      else if (opts.sequenceStep === "day10") body = contact.followUp2 || contact.body;
      else body = contact.body;
    }

    const nowIso = new Date().toISOString();
    const eventId = "evt-" + Math.random().toString(36).slice(2, 9);

    const historyItem: OutreachHistoryItem = {
      id: eventId,
      type: "email_sent",
      subject,
      sequenceStep: opts.sequenceStep || "day0",
      timestamp: nowIso,
      details: `Dispatched to ${contact.email} (${opts.sequenceStep || "Day 0 Initial"})`,
      ip: opts.ip,
      userAgent: opts.userAgent
    };

    contact.status = "sent";
    contact.sentAt = nowIso;
    contact.sentCount = (contact.sentCount || 0) + 1;
    contact.history.unshift(historyItem);

    this.contacts.set(contact.id, contact);
    this.persist();

    // Prepare Gmail URLs
    const encodedTo = encodeURIComponent(contact.email);
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodedTo}&su=${encodedSubject}&body=${encodedBody}`;
    const mailtoUrl = `mailto:${contact.email}?subject=${encodedSubject}&body=${encodedBody}`;

    return {
      success: true,
      contact,
      sentAt: nowIso,
      gmailUrl,
      mailtoUrl,
      sequenceStep: opts.sequenceStep || "day0"
    };
  }

  public recordOpen(opts: { contactId: string; ip?: string; userAgent?: string }) {
    this.init();
    const contact = this.contacts.get(opts.contactId);
    if (!contact) return null;

    const nowIso = new Date().toISOString();
    contact.openCount = (contact.openCount || 0) + 1;
    contact.lastOpenedAt = nowIso;
    if (contact.status === "sent") {
      contact.status = "opened";
    }

    contact.history.unshift({
      id: "evt-op-" + Math.random().toString(36).slice(2, 9),
      type: "opened",
      timestamp: nowIso,
      details: `Email opened by recipient (${contact.openCount} opens total)`,
      ip: opts.ip,
      userAgent: opts.userAgent
    });

    this.contacts.set(contact.id, contact);
    this.persist();
    return contact;
  }

  public recordClick(opts: { contactId: string; targetUrl?: string; ip?: string; userAgent?: string }) {
    this.init();
    const contact = this.contacts.get(opts.contactId);
    if (!contact) return null;

    const nowIso = new Date().toISOString();
    contact.clickCount = (contact.clickCount || 0) + 1;
    contact.lastClickedAt = nowIso;
    contact.status = "clicked";

    contact.history.unshift({
      id: "evt-cl-" + Math.random().toString(36).slice(2, 9),
      type: "clicked",
      timestamp: nowIso,
      details: `Clicked personalized demo link: ${opts.targetUrl || contact.demoLink}`,
      ip: opts.ip,
      userAgent: opts.userAgent
    });

    this.contacts.set(contact.id, contact);
    this.persist();
    return contact;
  }

  public updateContact(id: string, updates: Partial<OutreachContact>) {
    this.init();
    const contact = this.contacts.get(id);
    if (!contact) return null;

    Object.assign(contact, updates);
    this.contacts.set(id, contact);
    this.persist();
    return contact;
  }

  public getSettings(): CampaignSettings {
    this.init();
    return { ...this.settings };
  }

  public updateSettings(updates: Partial<CampaignSettings>) {
    this.init();
    this.settings = { ...this.settings, ...updates };
    this.persist();
    return this.settings;
  }

  public getStats() {
    this.init();
    const all = Array.from(this.contacts.values());
    const verified = all.filter(c => !!c.email);
    const sent = all.filter(c => c.sentCount > 0);
    const opened = all.filter(c => c.openCount > 0);
    const clicked = all.filter(c => c.clickCount > 0);
    const cooldowns = all.filter(c => this.checkCooldown(c).inCooldown);
    const sentToday = this.getSentTodayCount();

    const openRate = sent.length > 0 ? (opened.length / sent.length) * 100 : 0;
    const clickRate = opened.length > 0 ? (clicked.length / opened.length) * 100 : 0;

    return {
      totalUniverse: all.length,
      verifiedEmails: verified.length,
      sentTotal: sent.length,
      sentToday,
      dailySendLimit: this.settings.dailySendLimit,
      openedTotal: opened.length,
      clickedTotal: clicked.length,
      cooldownCount: cooldowns.length,
      openRate: Math.round(openRate * 10) / 10,
      clickRate: Math.round(clickRate * 10) / 10,
      waves: {
        wave1: all.filter(c => c.wave === "Wave 1").length,
        wave2: all.filter(c => c.wave === "Wave 2").length,
        wave3: all.filter(c => c.wave === "Wave 3").length,
        hold: all.filter(c => c.wave === "HOLD").length
      }
    };
  }
}

export const crmStore = new OutreachCRMStore();
