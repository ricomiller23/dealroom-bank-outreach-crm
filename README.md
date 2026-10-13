# DealRoom OS — Bank Outreach Command Center & CRM

An institutional outreach automation engine and live executive CRM designed to monitor and manage personalized capital raise dispatches to 319 bank executives across 76 U.S. de novo banks.

---

## Key Features

1. **Personalized Link Generation**:
   - Deep-links each executive to the live sandbox at `https://dealroom-banks-v2.vercel.app/?ref={id}&fn={firstName}&bk={bank}`.
   - Greets bank leadership dynamically and provides a one-click profile population sandbox.

2. **30-Day Anti-Fatigue Cooldown Rule**:
   - Prevents recipient fatigue and protects domain reputation.
   - Once dispatched, a contact is locked on a 30-day cooldown timer.
   - Re-contacting within 30 days is blocked on both client UI and server API unless explicitly overridden.

3. **Multi-Channel Dispatch Options**:
   - **One-Click Gmail Web Compose**: Generates pre-filled `https://mail.google.com/mail/?view=cm&...` with recipient, subject, CAN-SPAM compliant body, and tracking tags.
   - **Direct Background API**: Dispatches via serverless API and logs audit timestamps.
   - **macOS Native Mail CLI**: `npm run dispatch:mac` dispatches via Apple Mail (`ricomiller@gmail.com`) directly on macOS.

4. **Live Telemetry & Engagement Tracking**:
   - Invisible tracking pixel (`/api/track/open?id={contactId}`) records open counts and timestamps.
   - Tracked link redirect (`/api/track/click?id={contactId}&url={targetUrl}`) monitors click-through rates.
   - Real-time KPI counters: Universe (319), Verified Emails (39), Sent Today, Open Rate %, Click Rate %.

5. **CAN-SPAM Compliance Built-In**:
   - Every email carries a clear unsubscribe opt-out and a physical postal mailing address.
   - One-click "Do Not Contact / Unsubscribe" status updates.

---

## Local Development & CLI

```bash
# Install dependencies
pnpm install

# Run automated assertion tests
pnpm test

# Run development server
pnpm run dev

# Run production build
pnpm run build

# Dispatch next Wave 1 batch via macOS Apple Mail CLI (dry run)
npm run dispatch:mac

# Execute live macOS dispatch
LIVE_SEND=1 BATCH_SIZE=10 npm run dispatch:mac
```
