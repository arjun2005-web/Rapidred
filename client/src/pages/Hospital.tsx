import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search, Droplets, Bell, Settings,
  LayoutDashboard, FileText, LogOut,
  AlertTriangle, CheckCircle, Clock,
  Plus, ClipboardList, PackageOpen,
  ShieldCheck, SendHorizonal, Loader2,
  TrendingUp, Zap, ChevronRight,
  MapPin, Phone, User, Target, Brain, Cpu,
} from "lucide-react";
import { useLocation } from "wouter";
import BloodInventory from "@/components/BloodInventory";
import DonorMap from "@/components/DonorMap";
import HospitalAI from "@/components/HospitalAI";
import SmartDonorMap from "@/components/SmartDonorMap";
import RealtimeNotifications from "@/components/realtimenotification";

// ── Types ─────────────────────────────────────────────────────────────────
interface BloodRequest {
  id: string;
  hospitalId: string;
  bloodType: string;
  units: number;
  urgency: string;
  status: string;
  department: string | null;
  patientId: string | null;
  requestedBy: string | null;
  createdAt: string;
}

interface HospitalProfile {
  id: string;
  name: string;
  location: string;
  phone: string;
}

// ── Nav ────────────────────────────────────────────────────────────────────
const navItems = [
  { id: "overview",  label: "Overview",       icon: LayoutDashboard },
  { id: "requests",  label: "Blood Requests", icon: ClipboardList, badge: true },
  { id: "inventory", label: "My Inventory",   icon: PackageOpen },
  { id: "alerts",    label: "Alerts",         icon: Bell },
  { id: "map",       label: "Live Map",       icon: MapPin },
  { id: "matching",  label: "Donor Matching", icon: Target },
  { id: "reports",   label: "Reports",        icon: FileText },
  { id: "settings",  label: "Settings",       icon: Settings },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const urgencyBadge: Record<string, string> = {
  Critical: "bg-red-500/10 text-red-600 border-red-200",
  High:     "bg-amber-500/10 text-amber-600 border-amber-200",
  Normal:   "bg-green-500/10 text-green-600 border-green-200",
};

const statusBadge: Record<string, string> = {
  Pending:    "bg-amber-500/10 text-amber-600 border-amber-200",
  Approved:   "bg-blue-500/10 text-blue-600 border-blue-200",
  Fulfilled:  "bg-green-500/10 text-green-600 border-green-200",
  Dispatched: "bg-purple-500/10 text-purple-600 border-purple-200",
};

const alertStyle: Record<string, { border: string; icon: React.ReactNode; bg: string }> = {
  urgent:  { border: "border-l-red-500",   bg: "bg-red-50",   icon: <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" /> },
  warning: { border: "border-l-amber-400", bg: "bg-amber-50", icon: <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" /> },
  info:    { border: "border-l-blue-400",  bg: "bg-blue-50",  icon: <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" /> },
};

// ── Sidebar ────────────────────────────────────────────────────────────────
function Sidebar({
  active, setActive, hospital, pendingCount
}: {
  active: string;
  setActive: (s: string) => void;
  hospital: HospitalProfile | null;
  pendingCount: number;
}) {
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    localStorage.clear();
    setLocation("/");
  };

  return (
    <aside className="w-64 min-h-screen flex flex-col border-r border-border/50 bg-background">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl blood-type-badge flex items-center justify-center">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Rapid<span className="text-gradient">Red</span>
            </h1>
            <p className="text-xs text-muted-foreground">AI Blood System</p>
          </div>
        </div>
      </div>

      {/* Hospital Info */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-xs font-semibold text-primary">Hospital Portal</span>
          </div>
          <p className="text-xs font-medium truncate">{hospital?.name || "Loading..."}</p>
          <p className="text-xs text-muted-foreground truncate">{hospital?.location || ""}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ id, label, icon: Icon, badge }) => (
          <button key={id} onClick={() => setActive(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
              ${active === id ? "blood-type-badge text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">{label}</span>
            {badge && pendingCount > 0 && (
              <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold
                ${active === id ? "bg-white/20 text-white" : "bg-primary text-white"}`}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-border/50">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full blood-type-badge flex items-center justify-center text-white text-xs font-bold">H</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{hospital?.name || "Hospital"}</p>
            <p className="text-xs text-muted-foreground truncate">{localStorage.getItem("userEmail") || ""}</p>
          </div>
          <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground" onClick={handleLogout}>
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

// ── Overview Page ──────────────────────────────────────────────────────────
function OverviewPage({ requests, hospital }: { requests: BloodRequest[]; hospital: HospitalProfile | null }) {
  const pending   = requests.filter(r => r.status === "Pending").length;
  const fulfilled = requests.filter(r => r.status === "Fulfilled").length;
  const critical  = requests.filter(r => r.urgency === "Critical").length;

  const statCards = [
    { label: "Pending Requests",  value: pending,              change: "Needs attention",   positive: pending === 0,  icon: ClipboardList },
    { label: "Fulfilled Today",   value: fulfilled,            change: "Completed requests", positive: true,           icon: CheckCircle   },
    { label: "Critical Requests", value: critical,             change: "Urgent action needed", positive: critical === 0, icon: AlertTriangle },
    { label: "Total Requests",    value: requests.length,      change: "All time",           positive: true,           icon: Zap           },
  ];

  const recentAlerts = [
    { type: "urgent",  message: "O- stock critically low — check inventory",  time: "Just now" },
    { type: "warning", message: "3 blood units expiring within 10 days",       time: "1 hr ago" },
    { type: "info",    message: "AI matched 2 donors for your O- request",     time: "2 hrs ago"},
  ];

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ label, value, change, positive, icon: Icon }) => (
          <Card key={label} className="p-5 hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm text-muted-foreground font-medium">{label}</p>
              <div className="w-8 h-8 rounded-lg blood-type-badge flex items-center justify-center">
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight mb-1">{value}</p>
            <p className={`text-xs font-medium flex items-center gap-1 ${positive ? "text-green-600" : "text-red-500"}`}>
              <TrendingUp className="w-3 h-3" />
              {change}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Requests */}
        <Card className="xl:col-span-2 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold">Recent Blood Requests</h2>
            </div>
          </div>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Droplets className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.slice(0, 5).map(r => (
                <div key={r.id}
                  className="flex items-center gap-4 p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/20 transition-all">
                  <div className="blood-type-badge w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xs">{r.bloodType}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{r.department || "General"} — {r.requestedBy || "Doctor"}</div>
                    <div className="text-xs text-muted-foreground">{r.units} units · {new Date(r.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className={urgencyBadge[r.urgency] || ""}>{r.urgency}</Badge>
                    <Badge variant="outline" className={statusBadge[r.status] || ""}>{r.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Alerts */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Alerts</h2>
          </div>
          <div className="space-y-3">
            {recentAlerts.map((a, i) => {
              const { border, bg, icon } = alertStyle[a.type];
              return (
                <div key={i} className={`rounded-xl p-3 border-l-4 ${border} ${bg}`}>
                  <div className="flex items-start gap-2">
                    {icon}
                    <div>
                      <p className="text-sm font-medium leading-snug">{a.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{a.time}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Requests Page ──────────────────────────────────────────────────────────
function RequestsPage({ requests, hospitalId, onRefresh }: { requests: BloodRequest[]; hospitalId: string; onRefresh: () => void }) {
  const [search, setSearch]       = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("All");
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [showDonorMap, setShowDonorMap] = useState(false);
  const [lastBloodType, setLastBloodType] = useState("All");
  const [form, setForm] = useState({
    bloodType: "O+", units: "", urgency: "Normal",
    department: "", patientId: "", requestedBy: "",
  });

  const filtered = useMemo(() => requests.filter(r => {
    const matchSearch =
      r.bloodType.toLowerCase().includes(search.toLowerCase()) ||
      (r.department || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.requestedBy || "").toLowerCase().includes(search.toLowerCase());
    return matchSearch && (urgencyFilter === "All" || r.urgency === urgencyFilter);
  }), [search, urgencyFilter, requests]);

  const handleCreate = async () => {
    if (!form.units) { alert("Please enter units"); return; }
    setSaving(true);
    try {
      await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, units: parseInt(form.units), hospitalId }),
      });
      setShowForm(false);
      setLastBloodType(form.bloodType);
      setShowDonorMap(true);
      setForm({ bloodType: "O+", units: "", urgency: "Normal", department: "", patientId: "", requestedBy: "" });
      onRefresh();
    } catch { alert("Failed to create request"); }
    finally { setSaving(false); }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    await fetch(`/api/requests/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onRefresh();
  };

  const BLOOD_TYPES = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} requests found</p>
        <Button className="blood-type-badge border-0 text-white gap-2 hover:opacity-90" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" /> New Blood Request
        </Button>
      </div>

      {/* Smart Donor Map — shows after request created */}
      {showDonorMap && (
        <Card className="p-5 border-2 border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="blood-type-badge w-8 h-8 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">{lastBloodType}</span>
              </div>
              <div>
                <h3 className="font-bold text-sm">Compatible Donors for {lastBloodType}</h3>
                <p className="text-xs text-muted-foreground">Call any available donor directly</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowDonorMap(false)}>
              Hide Map
            </Button>
          </div>
          <SmartDonorMap bloodTypeFilter={lastBloodType} />
        </Card>
      )}

      {/* New Request Form */}
      {showForm && (
        <Card className="p-6 border-2 border-primary/20">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" /> New Blood Request
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            {/* Blood Type */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Blood Type</label>
              <div className="flex flex-wrap gap-1.5">
                {BLOOD_TYPES.map(bt => (
                  <button key={bt} onClick={() => setForm({ ...form, bloodType: bt })}
                    className={`w-11 h-11 rounded-lg font-bold text-xs border-2 transition-all
                      ${form.bloodType === bt ? "blood-type-badge text-white border-transparent" : "border-border hover:border-primary/50"}`}>
                    {bt}
                  </button>
                ))}
              </div>
            </div>
            {/* Units */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Units needed</label>
              <Input type="number" placeholder="e.g. 3" value={form.units}
                onChange={e => setForm({ ...form, units: e.target.value })}
                className="rounded-xl border-2 focus:border-primary/50" />
            </div>
            {/* Urgency */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Urgency</label>
              <div className="flex gap-2">
                {["Normal", "High", "Critical"].map(u => (
                  <button key={u} onClick={() => setForm({ ...form, urgency: u })}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all
                      ${form.urgency === u ? "blood-type-badge text-white border-transparent" : "border-border hover:border-primary/50"}`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
            {/* Department */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Department</label>
              <Input placeholder="e.g. ICU" value={form.department}
                onChange={e => setForm({ ...form, department: e.target.value })}
                className="rounded-xl border-2 focus:border-primary/50" />
            </div>
            {/* Patient ID */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Patient ID</label>
              <Input placeholder="e.g. PT-1234" value={form.patientId}
                onChange={e => setForm({ ...form, patientId: e.target.value })}
                className="rounded-xl border-2 focus:border-primary/50" />
            </div>
            {/* Requested By */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Requested By</label>
              <Input placeholder="Doctor name" value={form.requestedBy}
                onChange={e => setForm({ ...form, requestedBy: e.target.value })}
                className="rounded-xl border-2 focus:border-primary/50" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="blood-type-badge border-0 text-white gap-1 hover:opacity-90" onClick={handleCreate} disabled={saving}>
              {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</> : "Submit Request"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by blood type, department, doctor…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="pl-10 rounded-xl border-2 border-border focus:border-primary/50" />
        </div>
        <div className="flex gap-2">
          {["All", "Critical", "High", "Normal"].map(f => (
            <Button key={f} size="sm"
              variant={urgencyFilter === f ? "default" : "outline"}
              onClick={() => setUrgencyFilter(f)}
              className={`rounded-full px-4 text-xs ${urgencyFilter === f ? "blood-type-badge border-0 text-white" : "hover:border-primary/50"}`}>
              {f}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {["Blood Type", "Units", "Department", "Requested By", "Patient ID", "Date", "Urgency", "Status", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">No requests found</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                  <td className="px-4 py-3">
                    <div className="blood-type-badge w-fit px-2.5 py-1 rounded-lg">
                      <span className="text-white font-bold text-sm">{r.bloodType}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold">{r.units}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{r.department || "—"}</td>
                  <td className="px-4 py-3 text-sm">{r.requestedBy || "—"}</td>
                  <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{r.patientId || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className={urgencyBadge[r.urgency] || ""}>{r.urgency}</Badge></td>
                  <td className="px-4 py-3"><Badge variant="outline" className={statusBadge[r.status] || ""}>{r.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {r.status === "Pending" && (
                        <Button size="sm" className="h-7 text-xs blood-type-badge border-0 text-white gap-1 hover:opacity-90"
                          onClick={() => handleStatusUpdate(r.id, "Approved")}>
                          <SendHorizonal className="w-3 h-3" /> Approve
                        </Button>
                      )}
                      {r.status === "Approved" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs hover:border-primary/50"
                          onClick={() => handleStatusUpdate(r.id, "Fulfilled")}>
                          Fulfill
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Donor Matching Page (Hospital) ────────────────────────────────────────
const COMPATIBLE_DONORS: Record<string, string[]> = {
  "O+":  ["O+","O-"],
  "O-":  ["O-"],
  "A+":  ["A+","A-","O+","O-"],
  "A-":  ["A-","O-"],
  "B+":  ["B+","B-","O+","O-"],
  "B-":  ["B-","O-"],
  "AB+": ["A+","A-","B+","B-","AB+","AB-","O+","O-"],
  "AB-": ["A-","B-","AB-","O-"],
};

function HospitalDonorMatching() {
  const [bloodType, setBloodType] = useState("O+");
  const [location, setLocation2]  = useState("");
  const [donors, setDonors]       = useState<any[]>([]);
  const [results, setResults]     = useState<any[]>([]);
  const [searched, setSearched]   = useState(false);
  const BLOOD_TYPES = ["O+","O-","A+","A-","B+","B-","AB+","AB-"];

  useEffect(() => {
    fetch("/api/donors").then(r => r.json()).then(setDonors).catch(() => {});
  }, []);

  const handleMatch = () => {
    const compatible = COMPATIBLE_DONORS[bloodType] || [bloodType];
    const matched = donors
      .filter(d => compatible.includes(d.bloodType) && d.available)
      .map(d => ({
        ...d,
        isExact: d.bloodType === bloodType,
        score: (d.bloodType === bloodType ? 30 : 10) +
               (d.available ? 40 : 0) +
               (d.totalDonations * 5) +
               (location && d.location.toLowerCase().includes(location.toLowerCase()) ? 50 : 0),
      }))
      .sort((a, b) => b.score - a.score);
    setResults(matched);
    setSearched(true);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" /> Find Matching Donors
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Blood Type Needed</label>
            <div className="flex flex-wrap gap-2">
              {BLOOD_TYPES.map(bt => (
                <button key={bt} onClick={() => setBloodType(bt)}
                  className={`w-14 h-12 rounded-xl font-bold text-sm border-2 transition-all
                    ${bloodType === bt ? "blood-type-badge text-white border-transparent scale-105" : "border-border hover:border-primary/50"}`}>
                  {bt}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Location (optional)</label>
            <input placeholder="e.g. Chennai, Tamil Nadu" value={location}
              onChange={e => setLocation2(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border-2 border-border focus:border-primary/50 outline-none text-sm bg-background" />
            <p className="text-xs text-muted-foreground mt-1">Donors in same location ranked higher</p>
          </div>
        </div>
        <Button className="blood-type-badge border-0 text-white gap-2 hover:opacity-90" onClick={handleMatch}>
          <Target className="w-4 h-4" /> Find Matching Donors
        </Button>
      </Card>

      {searched && (
        <div className="space-y-3">
          <div className="flex gap-3 text-sm">
            <span className="px-3 py-1 rounded-full blood-type-badge text-white text-xs font-bold">
              {results.filter(d => d.isExact).length} Exact ({bloodType})
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-200 text-xs font-bold">
              {results.filter(d => !d.isExact).length} Compatible
            </span>
          </div>

          {results.length === 0 ? (
            <Card className="p-8 text-center">
              <User className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold">No matching donors found</p>
              <p className="text-sm text-muted-foreground">No available donors for {bloodType}</p>
            </Card>
          ) : (
            <>
              {results.filter(d => d.isExact).length > 0 && (
                <p className="text-xs font-bold text-green-600 uppercase tracking-wider">✅ Exact Match — {bloodType}</p>
              )}
              {results.filter(d => d.isExact).map((d, i) => (
                <Card key={d.id} className="p-4 border-2 border-green-200 bg-green-500/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <span className="text-green-600 font-bold text-sm">#{i+1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{d.name}</p>
                        <div className="blood-type-badge px-2 py-0.5 rounded-lg">
                          <span className="text-white text-xs font-bold">{d.bloodType}</span>
                        </div>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>📍 {d.location}</span>
                        <span>📞 {d.phone.slice(0,5)}****{d.phone.slice(-2)}</span>
                      </div>
                    </div>
                    <Button size="sm" className="blood-type-badge border-0 text-white text-xs gap-1"
                      onClick={() => { if(window.confirm(`📞 Call ${d.name}?
${d.phone}`)) window.open(`tel:${d.phone}`); }}>
                      <Phone className="w-3 h-3" /> Call
                    </Button>
                  </div>
                </Card>
              ))}
              {results.filter(d => !d.isExact).length > 0 && (
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mt-2">🔄 Compatible Donors</p>
              )}
              {results.filter(d => !d.isExact).map((d, i) => (
                <Card key={d.id} className="p-4 border-2 border-amber-200 bg-amber-500/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <span className="text-amber-600 font-bold text-sm">#{i+1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{d.name}</p>
                        <div className="blood-type-badge px-2 py-0.5 rounded-lg">
                          <span className="text-white text-xs font-bold">{d.bloodType}</span>
                        </div>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>📍 {d.location}</span>
                        <span>📞 {d.phone.slice(0,5)}****{d.phone.slice(-2)}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs gap-1 hover:border-primary/50"
                      onClick={() => { if(window.confirm(`📞 Call ${d.name}?
${d.phone}`)) window.open(`tel:${d.phone}`); }}>
                      <Phone className="w-3 h-3" /> Call
                    </Button>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Reports Page (Hospital) ───────────────────────────────────────────────
function HospitalReportsPage({ requests }: { requests: BloodRequest[] }) {
  const statusCounts = requests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const urgencyCounts = requests.reduce((acc, r) => {
    acc[r.urgency] = (acc[r.urgency] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const bloodTypeCounts = requests.reduce((acc, r) => {
    acc[r.bloodType] = (acc[r.bloodType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Requests",  value: requests.length,                           color: "text-blue-600",   bg: "bg-blue-500/10"   },
          { label: "Pending",         value: statusCounts["Pending"]   || 0,            color: "text-amber-600",  bg: "bg-amber-500/10"  },
          { label: "Fulfilled",       value: statusCounts["Fulfilled"] || 0,            color: "text-green-600",  bg: "bg-green-500/10"  },
          { label: "Critical",        value: urgencyCounts["Critical"] || 0,            color: "text-red-600",    bg: "bg-red-500/10"    },
        ].map(s => (
          <Card key={s.label} className={`p-4 ${s.bg} border-0`}>
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Blood Type Usage */}
      <Card className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Droplets className="w-4 h-4 text-primary" /> Blood Type Request Distribution
        </h3>
        <div className="space-y-3">
          {Object.entries(bloodTypeCounts).sort((a,b) => b[1]-a[1]).map(([type, count]) => (
            <div key={type} className="flex items-center gap-3">
              <div className="blood-type-badge w-10 h-6 rounded-md flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">{type}</span>
              </div>
              <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                <div className="blood-type-badge h-full rounded-full"
                  style={{ width: `${(count / requests.length) * 100}%` }} />
              </div>
              <span className="text-sm font-bold w-6 text-right">{count}</span>
            </div>
          ))}
          {Object.keys(bloodTypeCounts).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No requests yet</p>
          )}
        </div>
      </Card>

      {/* Request Status */}
      <Card className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" /> Request Status Breakdown
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {["Pending","Approved","Fulfilled","Dispatched"].map(status => (
            <div key={status} className="p-4 rounded-xl border-2 border-border/50 text-center">
              <p className="text-2xl font-black">{statusCounts[status] || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">{status}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Urgency Breakdown */}
      <Card className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-primary" /> Urgency Breakdown
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Critical", color: "text-red-600",   bg: "bg-red-500/10",   border: "border-red-200"   },
            { label: "High",     color: "text-amber-600", bg: "bg-amber-500/10", border: "border-amber-200" },
            { label: "Normal",   color: "text-green-600", bg: "bg-green-500/10", border: "border-green-200" },
          ].map(u => (
            <div key={u.label} className={`p-4 rounded-xl border-2 ${u.border} ${u.bg} text-center`}>
              <p className={`text-2xl font-black ${u.color}`}>{urgencyCounts[u.label] || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">{u.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> Recent Requests
        </h3>
        <div className="space-y-2">
          {requests.slice(0, 8).map(r => (
            <div key={r.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
              <div className="blood-type-badge w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">{r.bloodType}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm">{r.units} units · {r.department || "General"} · {r.requestedBy || "Doctor"}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
              <Badge variant="outline" className={`${urgencyCounts[r.urgency] ? "bg-red-500/10 text-red-600 border-red-200" : ""} text-xs`}>
                {r.urgency}
              </Badge>
            </div>
          ))}
          {requests.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No requests yet</p>}
        </div>
      </Card>
    </div>
  );
}

// ── Settings Page (Hospital) ───────────────────────────────────────────────
function HospitalSettingsPage({ hospital }: { hospital: HospitalProfile | null }) {
  const [saved, setSaved] = useState(false);
  const [form, setForm]   = useState({
    name:          hospital?.name     || "",
    location:      hospital?.location || "",
    phone:         hospital?.phone    || "",
    notifications: true,
    autoAlert:     true,
  });

  useEffect(() => {
    if (hospital) setForm(f => ({ ...f, name: hospital.name, location: hospital.location, phone: hospital.phone }));
  }, [hospital]);

  const handleSave = async () => {
    if (!form.phone || form.phone.replace(/\D/g, "").length < 10) {
      alert("Phone number must be at least 10 digits");
      return;
    }
    try {
      const hospitalId = localStorage.getItem("hospitalId");
      if (!hospitalId) return;
      const res = await fetch(`/api/hospitals/${hospitalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, location: form.location, phone: form.phone }),
      });
      if (res.ok) {
        const updated = await res.json();
        // Update hospital state so sidebar refreshes
        if (typeof window !== "undefined") window.location.reload();
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Hospital Info */}
      <Card className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" /> Hospital Information
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Hospital Name</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border-2 border-border focus:border-primary/50 outline-none text-sm bg-background" />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Location</label>
            <input value={form.location} onChange={e => setForm({...form, location: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border-2 border-border focus:border-primary/50 outline-none text-sm bg-background" />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Phone</label>
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border-2 border-border focus:border-primary/50 outline-none text-sm bg-background" />
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" /> Notification Settings
        </h3>
        <div className="space-y-4">
          {[
            { key: "notifications", label: "Enable notifications",        desc: "Receive alerts for blood requests and inventory" },
            { key: "autoAlert",     label: "Auto-alert for critical needs", desc: "Automatically notify donors for critical requests" },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <button onClick={() => setForm({...form, [item.key]: !(form as any)[item.key]})}
                className={`w-12 h-6 rounded-full transition-colors ${(form as any)[item.key] ? "blood-type-badge" : "bg-muted"}`}>
                <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${(form as any)[item.key] ? "translate-x-6" : ""}`} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* System Info */}
      <Card className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> System Info
        </h3>
        <div className="space-y-2 text-sm">
          {[
            ["Portal",   "Hospital Portal"],
            ["Project",  "CSD 334 Mini Project · 2023–2027 Batch"],
            ["Version",  "1.0.0"],
            ["AI Model", "Llama 3.1 (Groq)"],
            ["Stack",    "React + TypeScript + Express"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2 border-b border-border/50 last:border-0">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
        </div>
      </Card>

      <Button className="blood-type-badge border-0 text-white hover:opacity-90 gap-2" onClick={handleSave}>
        {saved ? <><CheckCircle className="w-4 h-4" />Saved!</> : <><Settings className="w-4 h-4" />Save Settings</>}
      </Button>
    </div>
  );
}

// ── Alerts Page (Hospital) ────────────────────────────────────────────────
function HospitalAlertsPage({ requests }: { requests: BloodRequest[] }) {
  const critical = requests.filter(r => r.urgency === "Critical" && r.status === "Pending");
  const high     = requests.filter(r => r.urgency === "High" && r.status === "Pending");
  const recent   = requests.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Critical Alerts */}
      {critical.length > 0 && (
        <Card className="p-5 border-2 border-red-200 bg-red-500/5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-red-600">🚨 Critical Alerts ({critical.length})</h3>
          </div>
          <div className="space-y-3">
            {critical.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-200">
                <div className="blood-type-badge w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">{r.bloodType}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{r.units} units needed · {r.department || "General"}</p>
                  <p className="text-xs text-muted-foreground">{r.requestedBy || "Doctor"} · {new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500 text-white text-xs font-bold">
                  CRITICAL
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">📧 Email alerts automatically sent to compatible donors</p>
        </Card>
      )}

      {/* High Alerts */}
      {high.length > 0 && (
        <Card className="p-5 border-2 border-amber-200 bg-amber-500/5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-amber-600">⚠️ High Priority ({high.length})</h3>
          </div>
          <div className="space-y-3">
            {high.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-200">
                <div className="blood-type-badge w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">{r.bloodType}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{r.units} units needed · {r.department || "General"}</p>
                  <p className="text-xs text-muted-foreground">{r.requestedBy || "Doctor"} · {new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500 text-white text-xs font-bold">
                  HIGH
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">📧 Email alerts automatically sent to compatible donors</p>
        </Card>
      )}

      {/* No alerts */}
      {critical.length === 0 && high.length === 0 && (
        <Card className="p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="font-bold text-lg mb-1">All Clear!</h3>
          <p className="text-muted-foreground text-sm">No critical or high priority requests at the moment.</p>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-bold">Recent Request Activity</h3>
        </div>
        <div className="space-y-2">
          {recent.map(r => (
            <div key={r.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
              <div className="blood-type-badge w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">{r.bloodType}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm">{r.units} units · {r.department || "General"}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
              <Badge variant="outline" className={
                r.urgency === "Critical" ? "bg-red-500/10 text-red-600 border-red-200 text-xs" :
                r.urgency === "High" ? "bg-amber-500/10 text-amber-600 border-amber-200 text-xs" :
                "bg-green-500/10 text-green-600 border-green-200 text-xs"
              }>{r.urgency}</Badge>
            </div>
          ))}
          {recent.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>}
        </div>
      </Card>
    </div>
  );
}

// ── Placeholder ────────────────────────────────────────────────────────────
function PlaceholderPage({ title }: { title: string }) {
  return (
    <Card className="p-12 text-center">
      <div className="w-16 h-16 rounded-2xl blood-type-badge flex items-center justify-center mx-auto mb-4">
        <Settings className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">This section is under construction</p>
    </Card>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function Hospital() {
  const [activeNav, setActiveNav]     = useState("overview");
  const [hospital, setHospital]       = useState<HospitalProfile | null>(null);
  const [requests, setRequests]       = useState<BloodRequest[]>([]);
  const [loading, setLoading]         = useState(true);
  const [, setLocation]               = useLocation();

  const userId     = localStorage.getItem("userId") || "";
  const hospitalId = localStorage.getItem("hospitalId") || "";

  const fetchHospital = async () => {
    try {
      const res = await fetch(`/api/hospitals/me/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setHospital(data);
        localStorage.setItem("hospitalId", data.id);
      }
    } catch {}
  };

  const fetchRequests = async () => {
    try {
      const hId = localStorage.getItem("hospitalId");
      if (!hId) return;
      const res = await fetch(`/api/requests/${hId}`);
      if (res.ok) setRequests(await res.json());
    } catch {}
  };

  useEffect(() => {
    if (!userId) { setLocation("/"); return; }
    const load = async () => {
      setLoading(true);
      await fetchHospital();
      await fetchRequests();
      setLoading(false);
    };
    load();
  }, [userId]);

  const pendingCount = requests.filter(r => r.status === "Pending").length;

  const pageTitle: Record<string, string> = {
    overview:  "Hospital Overview",
    requests:  "Blood Requests",
    inventory: "My Inventory",
    alerts:    "Alerts",
    map:       "Live Donor Map",
    matching:  "Donor Matching",
    ai:        "AI Engine",
    reports:   "Reports",
    settings:  "Settings",
  };

  const renderPage = () => {
    if (loading) return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
    switch (activeNav) {
      case "overview":  return <OverviewPage requests={requests} hospital={hospital} />;
      case "requests":  return <RequestsPage requests={requests} hospitalId={localStorage.getItem("hospitalId") || ""} onRefresh={fetchRequests} />;
      case "inventory": return <BloodInventory hospitalId={localStorage.getItem("hospitalId") || ""} />;
      case "map":       return <DonorMap />;
      case "matching":  return <HospitalDonorMatching />;
      case "alerts":    return <HospitalAlertsPage requests={requests} />;
      case "reports":   return <HospitalReportsPage requests={requests} />;
      case "settings":  return <HospitalSettingsPage hospital={hospital} />;
      default:          return <PlaceholderPage title={pageTitle[activeNav]} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active={activeNav} setActive={setActiveNav} hospital={hospital} pendingCount={pendingCount} />

      <div className="flex-1 flex flex-col overflow-auto">
        {/* Top Bar */}
        <header className="sticky top-0 z-50 glass-card border-b border-border/50 px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">{pageTitle[activeNav]}</h2>
            <p className="text-xs text-muted-foreground">
              {hospital?.name || "Hospital"} · Rapid<span className="text-gradient font-semibold">Red</span> Portal
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-200">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-600 text-xs font-semibold">Connected</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted border border-border text-xs text-muted-foreground">
              <ShieldCheck className="w-3 h-3" /> RAAC Compliant
            </div>
            <RealtimeNotifications />
          </div>
        </header>

        {/* Compliance Bar */}
        <div className="mx-8 mt-4 px-4 py-2 rounded-xl bg-muted/50 border border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span>Security & Compliance</span>
          <span className="text-border">·</span>
          <span>HIPAA Protected</span>
          <span className="text-border">·</span>
          <span>RAAC</span>
          <span className="text-border">·</span>
          <span>ESR Verified</span>
          <span className="ml-auto">CSD 334 Mini Project · 2023–2027 Batch</span>
        </div>

        <main className="flex-1 px-8 py-6">{renderPage()}</main>
      </div>
    </div>
  );
}
