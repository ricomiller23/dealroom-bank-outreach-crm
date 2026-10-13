"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Send,
  Mail,
  ExternalLink,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Settings,
  Sparkles,
  Eye,
  MousePointerClick,
  Copy,
  Check,
  RefreshCw,
  Building2,
  User,
  Phone,
  Flame,
  ArrowRight,
  ShieldAlert,
  Info,
  Calendar,
  Layers,
  ChevronRight,
  X
} from "lucide-react";

export default function OutreachCRMPage() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedWave, setSelectedWave] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(true);

  // Selected contact for detail drawer
  const [activeContact, setActiveContact] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<"day0" | "day4" | "day10">("day0");
  const [customSubject, setCustomSubject] = useState("");
  const [customBody, setCustomBody] = useState("");
  const [overrideCooldown, setOverrideCooldown] = useState(false);
  const [sendingSingle, setSendingSingle] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  // Batch modal
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchSending, setBatchSending] = useState(false);
  const [batchResults, setBatchResults] = useState<any | null>(null);

  // Settings modal
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    senderEmail: "ricomiller@gmail.com",
    senderName: "Eric Miller",
    dailySendLimit: 25,
    cooldownDays: 30,
    senderAddress: "DealRoom OS Capital Formation • 7135 E Camelback Rd, Scottsdale, AZ 85251"
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/contacts");
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
        setStats(data.stats || null);
      }
      const sRes = await fetch("/api/settings");
      if (sRes.ok) {
        const sData = await sRes.json();
        if (sData.settings) setSettingsForm(sData.settings);
      }
    } catch (err) {
      console.error("Failed to load contacts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      if (verifiedOnly && !c.email) return false;
      if (selectedWave !== "all" && c.wave.toLowerCase() !== selectedWave.toLowerCase()) return false;
      if (selectedStatus !== "all") {
        if (selectedStatus === "cooldown") {
          const sentTime = c.sentAt ? new Date(c.sentAt).getTime() : 0;
          if (!sentTime || Date.now() - sentTime >= 30 * 86400000) return false;
        } else if (c.status !== selectedStatus) {
          return false;
        }
      }
      if (search) {
        const q = search.toLowerCase();
        const matches =
          c.name.toLowerCase().includes(q) ||
          c.bank.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.title.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [contacts, search, selectedWave, selectedStatus, verifiedOnly]);

  const openDrawer = (c: any) => {
    setActiveContact(c);
    setActiveStep("day0");
    setCustomSubject(c.subject || "");
    setCustomBody(c.body || "");
    setOverrideCooldown(false);
    setDrawerOpen(true);
  };

  const handleStepChange = (step: "day0" | "day4" | "day10") => {
    if (!activeContact) return;
    setActiveStep(step);
    if (step === "day0") {
      setCustomSubject(activeContact.subject || "");
      setCustomBody(activeContact.body || "");
    } else if (step === "day4") {
      setCustomSubject(`Follow-up: A capital-raise room for ${activeContact.bank}`);
      setCustomBody(activeContact.followUp1 || activeContact.body);
    } else if (step === "day10") {
      setCustomSubject(`Final note: ${activeContact.bank}'s capital raise room`);
      setCustomBody(activeContact.followUp2 || activeContact.body);
    }
  };

  const handleSendSingle = async (dispatchMethod: "api" | "gmail") => {
    if (!activeContact) return;
    setSendingSingle(true);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: activeContact.id,
          sequenceStep: activeStep,
          customSubject,
          customBody,
          forceOverride: overrideCooldown
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to dispatch email");
      }

      if (dispatchMethod === "gmail" && data.result?.gmailUrl) {
        window.open(data.result.gmailUrl, "_blank");
      }

      await loadData();
      if (data.result?.contact) {
        setActiveContact(data.result.contact);
      }
    } catch (err: any) {
      alert("Dispatch error: " + err.message);
    } finally {
      setSendingSingle(false);
    }
  };

  // Batch send for Wave 1
  const wave1Eligible = useMemo(() => {
    return contacts.filter((c) => {
      if (!c.email) return false;
      if (c.wave !== "Wave 1") return false;
      const sentTime = c.sentAt ? new Date(c.sentAt).getTime() : 0;
      if (sentTime && Date.now() - sentTime < 30 * 86400000) return false;
      return true;
    });
  }, [contacts]);

  const handleBatchSend = async (count = 10) => {
    setBatchSending(true);
    const toSend = wave1Eligible.slice(0, count).map((c) => c.id);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: toSend,
          sequenceStep: "day0"
        })
      });
      const data = await res.json();
      setBatchResults(data);
      await loadData();
    } catch (err: any) {
      alert("Batch send failed: " + err.message);
    } finally {
      setBatchSending(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm)
      });
      if (res.ok) {
        alert("Settings saved successfully");
        setSettingsOpen(false);
        await loadData();
      }
    } catch (err: any) {
      alert("Failed to save settings: " + err.message);
    }
  };

  const copyToClipboard = (text: string, isLink: boolean) => {
    navigator.clipboard.writeText(text);
    if (isLink) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedBody(true);
      setTimeout(() => setCopiedBody(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-400/30">
                DealRoom OS • Bank Edition Version 2
              </span>
              <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                Live Campaign Command Center
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              De Novo Bank Outreach Engine &amp; CRM
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
              Personalized C-suite outreach for 319 bank executives across 76 de novo institutions. Featuring automated 30-day anti-fatigue cooldowns, CAN-SPAM compliant footers, open/click telemetry, and dynamic links to{" "}
              <a
                href="https://dealroom-banks-v2.vercel.app"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 font-bold hover:underline"
              >
                dealroom-banks-v2.vercel.app
              </a>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href="/api/export"
              download
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              Export CSV Telemetry
            </a>
            <button
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all shadow-xs"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              Campaign Rules
            </button>
            <button
              onClick={() => setBatchModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/20"
            >
              <Send className="w-3.5 h-3.5" />
              Dispatch Wave 1 Batch
            </button>
          </div>
        </div>

        {/* KPI Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Universe
            </span>
            <div className="text-2xl font-black text-white">{stats?.totalUniverse || 319}</div>
            <span className="text-[10px] text-slate-500 font-medium">76 De Novo Banks</span>
          </div>

          <div className="bg-slate-900/60 border border-blue-900/40 rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
              Verified Emails
            </span>
            <div className="text-2xl font-black text-blue-300">{stats?.verifiedEmails || 39}</div>
            <span className="text-[10px] text-blue-400/80 font-medium">Ready to Dispatch</span>
          </div>

          <div className="bg-slate-900/60 border border-amber-900/40 rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
              Dispatched Today
            </span>
            <div className="text-2xl font-black text-amber-300">
              {stats?.sentToday || 0}{" "}
              <span className="text-sm font-normal text-slate-500">/ {stats?.dailySendLimit || 25}</span>
            </div>
            <span className="text-[10px] text-amber-500/80 font-medium">Daily Throttle Gate</span>
          </div>

          <div className="bg-slate-900/60 border border-emerald-900/40 rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
              Unique Opens
            </span>
            <div className="text-2xl font-black text-emerald-300">
              {stats?.openedTotal || 0}
              <span className="text-xs font-normal text-emerald-400 ml-1.5">({stats?.openRate || 0}%)</span>
            </div>
            <span className="text-[10px] text-emerald-500/80 font-medium">Open Telemetry</span>
          </div>

          <div className="bg-slate-900/60 border border-purple-900/40 rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">
              Demo Clicks
            </span>
            <div className="text-2xl font-black text-purple-300">
              {stats?.clickedTotal || 0}
              <span className="text-xs font-normal text-purple-400 ml-1.5">({stats?.clickRate || 0}%)</span>
            </div>
            <span className="text-[10px] text-purple-400/80 font-medium">Click-Through Rate</span>
          </div>

          <div className="bg-slate-900/60 border border-rose-900/40 rounded-xl p-4 space-y-1">
            <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
              30-Day Cooldown
            </span>
            <div className="text-2xl font-black text-rose-300">{stats?.cooldownCount || 0}</div>
            <span className="text-[10px] text-rose-400/80 font-medium">Anti-Fatigue Guard</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search executive, bank, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={selectedWave}
              onChange={(e) => setSelectedWave(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 px-3 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="all">All Waves ({contacts.length})</option>
              <option value="Wave 1">Wave 1 — Priority (55)</option>
              <option value="Wave 2">Wave 2 — Growth (123)</option>
              <option value="Wave 3">Wave 3 — Standard (121)</option>
              <option value="HOLD">HOLD (20)</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 px-3 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="ready">Ready to Send</option>
              <option value="sent">Sent</option>
              <option value="opened">Opened</option>
              <option value="clicked">Demo Clicked</option>
              <option value="cooldown">⛔ In 30-Day Cooldown</option>
            </select>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="rounded border-slate-700 text-blue-600 focus:ring-0 bg-slate-950"
              />
              <span>Verified Public Emails Only ({stats?.verifiedEmails || 39})</span>
            </label>

            <button
              onClick={loadData}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Contacts Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              Executive Outreach Roster ({filteredContacts.length} displayed)
            </h2>
            <span className="text-[11px] font-mono text-slate-500">
              Cooldown Threshold: 30 Days • Target: dealroom-banks-v2
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/70 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                  <th className="py-3 px-4">Contact &amp; Role</th>
                  <th className="py-3 px-4">Bank &amp; Headquarters</th>
                  <th className="py-3 px-4">Wave</th>
                  <th className="py-3 px-4">Outreach Channel</th>
                  <th className="py-3 px-4">Status &amp; Telemetry</th>
                  <th className="py-3 px-4">30-Day Anti-Fatigue Rule</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredContacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No contacts match your active filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredContacts.map((c) => {
                    const sentTime = c.sentAt ? new Date(c.sentAt).getTime() : 0;
                    const diffDays = sentTime ? (Date.now() - sentTime) / 86400000 : 999;
                    const inCooldown = diffDays < 30;
                    const daysRemaining = inCooldown ? Math.ceil(30 - diffDays) : 0;

                    return (
                      <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {c.name}
                            <span className="text-[10px] font-mono text-slate-400">({c.id})</span>
                          </div>
                          <div className="text-[11px] text-slate-400 line-clamp-1">{c.title}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-200">{c.bank}</div>
                          <div className="text-[11px] text-slate-500">
                            {c.city}, {c.state}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.wave === "Wave 1"
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                : c.wave === "Wave 2"
                                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            {c.wave}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {c.email ? (
                            <div>
                              <div className="text-blue-400 font-mono text-[11px] truncate max-w-[190px]">
                                {c.email}
                              </div>
                              <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Verified Public Email
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="text-[11px] text-slate-400 italic">No public email</span>
                              <div className="text-[10px] text-slate-500">{c.howToReach || "Phone / Web form"}</div>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1">
                            {c.clickCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 w-fit">
                                <MousePointerClick className="w-3 h-3 text-purple-400" />
                                Clicked Demo ({c.clickCount}x)
                              </span>
                            ) : c.openCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 w-fit">
                                <Eye className="w-3 h-3 text-emerald-400" />
                                Opened Email ({c.openCount}x)
                              </span>
                            ) : c.sentCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 w-fit">
                                <Send className="w-3 h-3 text-blue-400" />
                                Dispatched ({new Date(c.sentAt).toLocaleDateString()})
                              </span>
                            ) : c.email ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 w-fit">
                                Ready for Dispatch
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800/60 text-slate-500 border border-slate-800 w-fit">
                                Phone / Web Channel
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {inCooldown ? (
                            <div className="flex items-center gap-1.5 text-[11px] text-rose-400 font-semibold bg-rose-950/40 border border-rose-900/60 px-2 py-1 rounded-md w-fit">
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span>⛔ Cooldown: {daysRemaining}d left</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium bg-emerald-950/30 border border-emerald-900/40 px-2 py-1 rounded-md w-fit">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>✓ Eligible to Send</span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openDrawer(c)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors"
                            >
                              Inspect &amp; Send
                            </button>
                            <a
                              href={c.demoLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                              title="Test Live Demo Link"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail / Dispatch Drawer */}
      {drawerOpen && activeContact && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-2xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-blue-400 tracking-wider">
                  Outreach Dossier &bull; {activeContact.id} &bull; {activeContact.wave}
                </span>
                <h3 className="text-lg font-bold text-white">
                  {activeContact.name} &bull; {activeContact.bank}
                </h3>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* Executive Contact Metadata */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Role &amp; Title</span>
                  <span className="font-semibold text-slate-200">{activeContact.title}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Public Email</span>
                  <span className="font-mono text-blue-400">{activeContact.email || "No direct email"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Bank Headquarters</span>
                  <span className="text-slate-300">
                    {activeContact.city}, {activeContact.state}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Phone Number</span>
                  <span className="text-slate-300">{activeContact.phone || "—"}</span>
                </div>
              </div>

              {/* 30-Day Cooldown Protection Banner */}
              {(() => {
                const sentTime = activeContact.sentAt ? new Date(activeContact.sentAt).getTime() : 0;
                const diffDays = sentTime ? (Date.now() - sentTime) / 86400000 : 999;
                const inCooldown = diffDays < 30;
                const daysRemaining = inCooldown ? Math.ceil(30 - diffDays) : 0;

                if (inCooldown) {
                  return (
                    <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 space-y-2">
                      <div className="flex items-center gap-1.5 font-bold">
                        <ShieldAlert className="w-4 h-4 text-rose-400" />
                        <span>30-DAY ANTI-FATIGUE COOLDOWN ACTIVE</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-rose-300/90">
                        An email was dispatched to {activeContact.email} on{" "}
                        <strong>{new Date(activeContact.sentAt).toLocaleDateString()}</strong>. Per your campaign
                        rules, re-contacting within 30 days is blocked for <strong>{daysRemaining} more days</strong> to
                        protect your sender reputation.
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer pt-1 font-bold text-white text-xs">
                        <input
                          type="checkbox"
                          checked={overrideCooldown}
                          onChange={(e) => setOverrideCooldown(e.target.checked)}
                          className="rounded text-rose-600 bg-slate-900 border-rose-700"
                        />
                        <span>Emergency Override Cooldown Rule</span>
                      </label>
                    </div>
                  );
                }
                return (
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-emerald-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Eligible for initial dispatch. No emails sent within the past 30 days.</span>
                  </div>
                );
              })()}

              {/* Unique Demo Link */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">Personalized Demo Link (v2 Sandbox)</span>
                  <a
                    href={activeContact.demoLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    Open Live Demo <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={activeContact.demoLink}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-300 select-all"
                  />
                  <button
                    onClick={() => copyToClipboard(activeContact.demoLink, true)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 shrink-0"
                    title="Copy Link"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Sequence Step Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 block">Outreach Sequence Step</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleStepChange("day0")}
                    className={`p-2 rounded-lg text-center font-bold border transition-all ${
                      activeStep === "day0"
                        ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    Email 1 (Day 0)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStepChange("day4")}
                    className={`p-2 rounded-lg text-center font-bold border transition-all ${
                      activeStep === "day4"
                        ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    Follow-Up 1 (Day 4)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStepChange("day10")}
                    className={`p-2 rounded-lg text-center font-bold border transition-all ${
                      activeStep === "day10"
                        ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    Break-Up (Day 10)
                  </button>
                </div>
              </div>

              {/* Subject Editor */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300 block">Subject Line</label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              {/* Body Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-300 block">Personalized Body Content</label>
                  <button
                    onClick={() => copyToClipboard(customBody, false)}
                    className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                  >
                    {copiedBody ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedBody ? "Copied" : "Copy Body"}
                  </button>
                </div>
                <textarea
                  rows={13}
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-sans leading-relaxed focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Audit & Engagement History */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="font-bold text-slate-300 block">Contact Telemetry &amp; Audit Log</span>
                {activeContact.history && activeContact.history.length > 0 ? (
                  <div className="space-y-1.5">
                    {activeContact.history.map((h: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px]">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="font-bold text-slate-300 capitalize">{h.type.replace("_", " ")}</span>
                          <span className="font-mono text-[10px]">{new Date(h.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="text-slate-400 mt-0.5">{h.details}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-slate-950 border border-dashed border-slate-800 text-center text-slate-500 text-[11px]">
                    No outreach dispatches or telemetry events recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Close
              </button>

              <button
                type="button"
                disabled={sendingSingle || !activeContact.email}
                onClick={() => handleSendSingle("gmail")}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm"
              >
                <Mail className="w-3.5 h-3.5" />
                Dispatch via Gmail (Web)
              </button>

              <button
                type="button"
                disabled={sendingSingle || !activeContact.email}
                onClick={() => handleSendSingle("api")}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md shadow-blue-600/30"
              >
                <Send className="w-3.5 h-3.5" />
                {sendingSingle ? "Recording..." : "Record Live Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Dispatch Modal */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-blue-400">Batch Safety Gate</span>
                <h3 className="font-bold text-base text-white">Dispatch Wave 1 Campaign Batch</h3>
              </div>
              <button onClick={() => setBatchModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Per your campaign rules, outreach should be dispatched in controlled waves of 10–15 to monitor replies,
              respect Gmail rate limits, and automatically enforce the <strong>30-day anti-fatigue cooldown</strong>.
            </p>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Wave 1 Eligible Contacts:</span>
                <span className="font-bold text-white">{wave1Eligible.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Daily Send Limit Remaining:</span>
                <span className="font-bold text-amber-400">
                  {Math.max(0, (stats?.dailySendLimit || 25) - (stats?.sentToday || 0))} sends left
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">30-Day Cooldown Protection:</span>
                <span className="font-bold text-emerald-400">Active &bull; Duplicate Recipients Blocked</span>
              </div>
            </div>

            {batchResults && (
              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-800 text-xs text-blue-300 space-y-1">
                <div className="font-bold">Batch Complete!</div>
                <div>Dispatched: {batchResults.dispatchedCount} emails</div>
                {batchResults.errorCount > 0 && <div>Errors / Cooldown Blocked: {batchResults.errorCount}</div>}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setBatchModalOpen(false);
                  setBatchResults(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                Close
              </button>
              <button
                type="button"
                disabled={batchSending || wave1Eligible.length === 0}
                onClick={() => handleBatchSend(10)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {batchSending ? "Dispatching Batch..." : "Send Next 10 (Wave 1)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-blue-400">Campaign Policy</span>
                <h3 className="font-bold text-base text-white">Outreach &amp; Compliance Settings</h3>
              </div>
              <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Sender Email (Gmail Account)</label>
                <input
                  type="email"
                  value={settingsForm.senderEmail}
                  onChange={(e) => setSettingsForm({ ...settingsForm, senderEmail: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Sender Name</label>
                <input
                  type="text"
                  value={settingsForm.senderName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, senderName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Daily Send Throttle</label>
                  <input
                    type="number"
                    value={settingsForm.dailySendLimit}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, dailySendLimit: Number(e.target.value) || 25 })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                  <span className="text-[10px] text-slate-500">Max sends per 24 hours</span>
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Anti-Fatigue Cooldown</label>
                  <input
                    type="number"
                    value={settingsForm.cooldownDays}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, cooldownDays: Number(e.target.value) || 30 })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                  <span className="text-[10px] text-slate-500">Days before re-contacting</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">CAN-SPAM Physical Postal Address</label>
                <input
                  type="text"
                  value={settingsForm.senderAddress}
                  onChange={(e) => setSettingsForm({ ...settingsForm, senderAddress: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
