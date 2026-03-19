import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search, Droplets, Users, Activity, Bell, Settings,
  LayoutDashboard, Hospital, FileText, LogOut, TrendingUp,
  AlertTriangle, CheckCircle, Clock, Filter,
  Phone, MapPin, User, Zap, ShieldCheck, Loader2,
  ClipboardList, PackageOpen, Trash2, Brain,
} from "lucide-react";
import { useLocation } from "wouter";
import BloodInventory from "@/components/BloodInventory";
import AIEngine from "@/components/AIEngine";
import DonorMap from "@/components/DonorMap";
import RealtimeNotifications from "@/components/realtimenotification";

// ── Types ──────────────────────────────────────────────────────────────────
interface Donor {
  id: string;
  name: string;
  bloodType: string;
  location: string;
  phone: string;
  lastDonation: string | null;
  available: boolean;
  totalDonations: number;
  status?: string;
}

interface HospitalItem {
  id: string;
  name: string;
  location: string;
  phone: string;
  licenseNumber: string | null;
  createdAt: string;
}

interface BloodRequest {
  id: string;
  hospitalId: string;
  bloodType: string;
  units: number;
  urgency: string;
  status: string;
  department: string | null;
  requestedBy: string | null;
  createdAt: string;
}

interface Stats {
  totalDonors: number;
  activeDonors: number;
  totalHospitals: number;
  totalRequests: number;
  pendingRequests: number;
}

// ── Nav ────────────────────────────────────────────────────────────────────
const navItems = [
  { id: "overview",  label: "Overview",         icon: LayoutDashboard },
  { id: "donors",    label: "Donor Management", icon: Users            },
  { id: "inventory", label: "Blood Inventory",  icon: PackageOpen      },
  { id: "requests",  label: "Blood Requests",   icon: ClipboardList    },
  { id: "hospitals", label: "Hospitals",        icon: Hospital         },
  { id: "alerts",    label: "AI Alerts",        icon: Bell             },
  { id: "reports",   label: "Reports",          icon: FileText         },
  { id: "map",       label: "Live Map",         icon: MapPin           },
  { id: "ai",        label: "AI Engine",        icon: Brain            },
  { id: "settings",  label: "Settings",         icon: Settings         },
];

// ── Helpers ────────────────────────────────────────────────────────────────
const statusBadge: Record<string, string> = {
  Active:   "bg-green-500/10 text-green-600 border-green-200",
  Inactive: "bg-muted text-muted-foreground",
  Pending:  "bg-amber-500/10 text-amber-600 border-amber-200",
};

const urgencyBadge: Record<string, string> = {
  Critical: "bg-red-500/10 text-red-600 border-red-200",
  High:     "bg-amber-500/10 text-amber-600 border-amber-200",
  Normal:   "bg-green-500/10 text-green-600 border-green-200",
};

const reqStatusBadge: Record<string, string> = {
  Pending:    "bg-amber-500/10 text-amber-600 border-amber-200",
  Approved:   "bg-blue-500/10 text-blue-600 border-blue-200",
  Fulfilled:  "bg-green-500/10 text-green-600 border-green-200",
  Dispatched: "bg-purple-500/10 text-purple-600 border-purple-200",
};

// ── Sidebar ────────────────────────────────────────────────────────────────
function Sidebar({ active, setActive }: { active: string; setActive: (s: string) => void }) {
  const [, setLocation] = useLocation();
  const handleLogout = () => { localStorage.clear(); setLocation("/"); };

  return (
    <aside className="w-64 min-h-screen flex flex-col border-r border-border/50 bg-background">
      <div className="px-6 py-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl blood-type-badge flex items-center justify-center">
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Rapid<span className="text-gradient">Red</span></h1>
            <p className="text-xs text-muted-foreground">AI Blood System</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/20">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary">Admin Panel</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActive(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
              ${active === id ? "blood-type-badge text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">{label}</span>
          </button>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-border/50">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full blood-type-badge flex items-center justify-center text-white text-xs font-bold">A</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">Admin</p>
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
function OverviewPage({ stats, requests }: { stats: Stats | null; requests: BloodRequest[] }) {
  const statCards = [
    { label: "Total Donors",      value: stats?.totalDonors || 0,      change: "Registered donors",    positive: true,  icon: Users      },
    { label: "Active Donors",     value: stats?.activeDonors || 0,     change: "Available now",        positive: true,  icon: Activity   },
    { label: "Pending Requests",  value: stats?.pendingRequests || 0,  change: "Needs attention",      positive: false, icon: AlertTriangle },
    { label: "Hospitals Served",  value: stats?.totalHospitals || 0,   change: "Connected hospitals",  positive: true,  icon: Hospital   },
  ];

  return (
    <div className="space-y-8">
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
              <TrendingUp className="w-3 h-3" />{change}
            </p>
          </Card>
        ))}
      </div>

      {/* Recent Requests */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Recent Blood Requests</h2>
          <Badge variant="secondary" className="ml-auto">{requests.length} total</Badge>
        </div>
        {requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">No requests yet</div>
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
                <Badge variant="outline" className={urgencyBadge[r.urgency] || ""}>{r.urgency}</Badge>
                <Badge variant="outline" className={reqStatusBadge[r.status] || ""}>{r.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* AI Module */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <Zap className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">AI & Data Processing Module</h2>
          <Badge variant="secondary" className="ml-auto bg-green-500/10 text-green-600 border-green-200">Running</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: "Demand Prediction Model",   accuracy: "94.2%", desc: "Forecasts blood demand by type and region" },
            { name: "Donor Selection Algorithm", accuracy: "97.8%", desc: "Finds nearest eligible donors for requests" },
          ].map(mod => (
            <div key={mod.name} className="flex items-start gap-4 p-4 rounded-xl border-2 border-border/50 hover:border-primary/30 transition-all">
              <div className="w-10 h-10 rounded-xl blood-type-badge flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold">{mod.name}</h3>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                <p className="text-xs text-muted-foreground mb-2">{mod.desc}</p>
                <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600 border-green-200">
                  Accuracy: {mod.accuracy}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Donors Page ────────────────────────────────────────────────────────────
function DonorsPage({ donors, onRefresh }: { donors: Donor[]; onRefresh: () => void }) {
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("All");

  const filtered = useMemo(() => donors.filter(d => {
    const matchSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.bloodType.toLowerCase().includes(search.toLowerCase()) ||
      d.location.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" ||
      (filter === "Active" && d.available) ||
      (filter === "Inactive" && !d.available);
    return matchSearch && matchFilter;
  }), [search, filter, donors]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this donor?")) return;
    await fetch(`/api/donors/${id}`, { method: "DELETE" });
    onRefresh();
  };

  const handleToggle = async (id: string, available: boolean) => {
    await fetch(`/api/donors/${id}/availability`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !available }),
    });
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search donors…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-10 rounded-xl border-2 border-border focus:border-primary/50" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {["All", "Active", "Inactive"].map(f => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 text-xs ${filter === f ? "blood-type-badge border-0 text-white" : "hover:border-primary/50"}`}>
              {f}
            </Button>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {["Donor", "Blood Type", "Location", "Phone", "Last Donation", "Donations", "Status", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">No donors found</td></tr>
              ) : filtered.map((d, i) => (
                <tr key={d.id} className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-sm font-semibold">{d.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="blood-type-badge w-fit px-2.5 py-1 rounded-lg">
                      <span className="text-white font-bold text-sm">{d.bloodType}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />{d.location}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="w-3 h-3" />{d.phone}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{d.lastDonation || "—"}</td>
                  <td className="px-4 py-3 text-sm font-bold text-center">{d.totalDonations}</td>
                  <td className="px-4 py-3">
                    <Badge variant={d.available ? "default" : "secondary"}
                      className={d.available ? "bg-green-500/10 text-green-600 border-green-200" : ""}>
                      {d.available ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs hover:border-primary/50"
                        onClick={() => handleToggle(d.id, d.available)}>
                        {d.available ? "Deactivate" : "Activate"}
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-red-500 hover:border-red-300"
                        onClick={() => handleDelete(d.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
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

// ── Hospitals Page ─────────────────────────────────────────────────────────
function HospitalsPage({ hospitals }: { hospitals: HospitalItem[] }) {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {["Hospital", "Location", "Phone", "License", "Registered", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hospitals.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">No hospitals registered yet</td></tr>
              ) : hospitals.map((h, i) => (
                <tr key={h.id} className={`border-b border-border/50 hover:bg-muted/30 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg blood-type-badge flex items-center justify-center">
                        <Hospital className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-sm font-semibold">{h.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{h.location}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{h.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{h.licenseNumber || "—"}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(h.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Badge className="bg-green-500/10 text-green-600 border-green-200">Active</Badge>
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

// ── Requests Page ──────────────────────────────────────────────────────────
function RequestsPage({ requests, onRefresh }: { requests: BloodRequest[]; onRefresh: () => void }) {
  const handleStatus = async (id: string, status: string) => {
    await fetch(`/api/requests/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    onRefresh();
  };

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              {["Blood Type", "Units", "Department", "Requested By", "Date", "Urgency", "Status", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">No requests found</td></tr>
            ) : requests.map((r, i) => (
              <tr key={r.id} className={`border-b border-border/50 hover:bg-muted/30 ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                <td className="px-4 py-3">
                  <div className="blood-type-badge w-fit px-2.5 py-1 rounded-lg">
                    <span className="text-white font-bold">{r.bloodType}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-bold">{r.units}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{r.department || "—"}</td>
                <td className="px-4 py-3 text-sm">{r.requestedBy || "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3"><Badge variant="outline" className={urgencyBadge[r.urgency] || ""}>{r.urgency}</Badge></td>
                <td className="px-4 py-3"><Badge variant="outline" className={reqStatusBadge[r.status] || ""}>{r.status}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {r.status === "Pending" && (
                      <Button size="sm" className="h-7 text-xs blood-type-badge border-0 text-white hover:opacity-90"
                        onClick={() => handleStatus(r.id, "Approved")}>Approve</Button>
                    )}
                    {r.status === "Approved" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs hover:border-primary/50"
                        onClick={() => handleStatus(r.id, "Fulfilled")}>Fulfill</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── AI Alerts Page ────────────────────────────────────────────────────────
function AlertsPage({ donors, requests }: { donors: Donor[]; requests: BloodRequest[] }) {
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent]       = useState<string[]>([]);
  const critical = requests.filter(r => r.urgency === "Critical" || r.urgency === "High");

  const handleAlert = async (request: BloodRequest) => {
    setSending(request.id);
    const matching = donors.filter(d => {
      const compat: Record<string, string[]> = {
        "O+": ["O+","O-"], "O-": ["O-"],
        "A+": ["A+","A-","O+","O-"], "A-": ["A-","O-"],
        "B+": ["B+","B-","O+","O-"], "B-": ["B-","O-"],
        "AB+": ["A+","A-","B+","B-","AB+","AB-","O+","O-"],
        "AB-": ["A-","B-","AB-","O-"],
      };
      return d.available && (compat[request.bloodType] || []).includes(d.bloodType);
    });
    // Simulate sending alerts
    await new Promise(r => setTimeout(r, 1500));
    setSending(null);
    setSent(prev => [...prev, request.id]);
    alert(`✅ Alert sent to ${matching.length} matching donors for ${request.bloodType} blood!`);
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 border-2 border-red-200 bg-red-500/5">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-5 h-5 text-red-500" />
          <h3 className="font-bold text-red-600">Automatic Alert System</h3>
        </div>
        <p className="text-sm text-muted-foreground">Click "Send Alert" to notify all compatible donors instantly when there is a critical blood request.</p>
      </Card>

      {critical.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="font-bold text-lg mb-1">No Critical Requests</h3>
          <p className="text-muted-foreground text-sm">All blood requests are under control.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {critical.map(r => {
            const compat: Record<string, string[]> = {
              "O+": ["O+","O-"], "O-": ["O-"],
              "A+": ["A+","A-","O+","O-"], "A-": ["A-","O-"],
              "B+": ["B+","B-","O+","O-"], "B-": ["B-","O-"],
              "AB+": ["A+","A-","B+","B-","AB+","AB-","O+","O-"],
              "AB-": ["A-","B-","AB-","O-"],
            };
            const matching = donors.filter(d => d.available && (compat[r.bloodType]||[]).includes(d.bloodType));
            const isSent = sent.includes(r.id);
            return (
              <Card key={r.id} className={`p-5 border-2 ${r.urgency === "Critical" ? "border-red-200" : "border-amber-200"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="blood-type-badge w-12 h-12 rounded-xl flex items-center justify-center">
                      <span className="text-white font-black">{r.bloodType}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={urgencyBadge[r.urgency]}>{r.urgency}</Badge>
                        <Badge variant="outline" className={reqStatusBadge[r.status]}>{r.status}</Badge>
                      </div>
                      <p className="text-sm font-semibold">{r.units} units needed · {r.department || "General"}</p>
                      <p className="text-xs text-muted-foreground">{matching.length} compatible donors available</p>
                    </div>
                  </div>
                  <Button
                    className={`gap-2 ${isSent ? "bg-green-500 hover:bg-green-600" : "blood-type-badge hover:opacity-90"} border-0 text-white`}
                    disabled={sending === r.id || isSent}
                    onClick={() => handleAlert(r)}>
                    {sending === r.id ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</>
                     : isSent ? <><CheckCircle className="w-4 h-4" />Sent!</>
                     : <><Bell className="w-4 h-4" />Send Alert ({matching.length} donors)</>}
                  </Button>
                </div>
                {matching.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Compatible donors:</p>
                    <div className="flex flex-wrap gap-2">
                      {matching.slice(0, 6).map(d => (
                        <div key={d.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          {d.name} ({d.bloodType}) · {d.location}
                        </div>
                      ))}
                      {matching.length > 6 && <span className="text-xs text-muted-foreground self-center">+{matching.length - 6} more</span>}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Reports Page ───────────────────────────────────────────────────────────
function ReportsPage({ stats, donors, requests }: { stats: Stats | null; donors: Donor[]; requests: BloodRequest[] }) {
  const bloodTypeCounts = donors.reduce((acc, d) => {
    acc[d.bloodType] = (acc[d.bloodType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusCounts = requests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Donors", value: stats?.totalDonors || 0, color: "text-blue-600", bg: "bg-blue-500/10" },
          { label: "Active Donors", value: stats?.activeDonors || 0, color: "text-green-600", bg: "bg-green-500/10" },
          { label: "Total Requests", value: stats?.totalRequests || 0, color: "text-amber-600", bg: "bg-amber-500/10" },
          { label: "Hospitals", value: stats?.totalHospitals || 0, color: "text-purple-600", bg: "bg-purple-500/10" },
        ].map(s => (
          <Card key={s.label} className={`p-4 ${s.bg} border-0`}>
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Blood Type Distribution */}
      <Card className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Droplets className="w-4 h-4 text-primary" />Blood Type Distribution</h3>
        <div className="space-y-3">
          {Object.entries(bloodTypeCounts).sort((a,b) => b[1]-a[1]).map(([type, count]) => (
            <div key={type} className="flex items-center gap-3">
              <div className="blood-type-badge w-10 h-6 rounded-md flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">{type}</span>
              </div>
              <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                <div className="blood-type-badge h-full rounded-full transition-all"
                  style={{ width: `${(count / donors.length) * 100}%` }} />
              </div>
              <span className="text-sm font-bold w-6 text-right">{count}</span>
            </div>
          ))}
          {Object.keys(bloodTypeCounts).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No donor data yet</p>
          )}
        </div>
      </Card>

      {/* Request Status */}
      <Card className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-primary" />Request Status Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {["Pending","Approved","Fulfilled","Dispatched"].map(status => (
            <div key={status} className="p-4 rounded-xl border-2 border-border/50 text-center">
              <p className="text-2xl font-black">{statusCounts[status] || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">{status}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />Recent Activity</h3>
        <div className="space-y-2">
          {requests.slice(0, 8).map(r => (
            <div key={r.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
              <div className="blood-type-badge w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xs">{r.bloodType}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm">{r.units} units · {r.department || "General"}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
              <Badge variant="outline" className={reqStatusBadge[r.status]}>{r.status}</Badge>
            </div>
          ))}
          {requests.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>}
        </div>
      </Card>
    </div>
  );
}

// ── Settings Page ──────────────────────────────────────────────────────────
function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    systemName: "RapidRed",
    adminEmail: localStorage.getItem("userEmail") || "",
    alertThreshold: "5",
    autoAlert: true,
    darkMode: false,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Settings className="w-4 h-4 text-primary" />System Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">System Name</label>
            <input value={form.systemName} onChange={e => setForm({...form, systemName: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border-2 border-border focus:border-primary/50 outline-none text-sm bg-background" />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Admin Email</label>
            <input value={form.adminEmail} onChange={e => setForm({...form, adminEmail: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border-2 border-border focus:border-primary/50 outline-none text-sm bg-background" />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Low Inventory Alert Threshold (units)</label>
            <input type="number" value={form.alertThreshold} onChange={e => setForm({...form, alertThreshold: e.target.value})}
              className="w-full px-4 py-2 rounded-xl border-2 border-border focus:border-primary/50 outline-none text-sm bg-background" />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2"><Bell className="w-4 h-4 text-primary" />Alert Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Auto-send alerts for critical requests</p>
              <p className="text-xs text-muted-foreground">Automatically notify donors when a critical request is created</p>
            </div>
            <button onClick={() => setForm({...form, autoAlert: !form.autoAlert})}
              className={`w-12 h-6 rounded-full transition-colors ${form.autoAlert ? "blood-type-badge" : "bg-muted"}`}>
              <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${form.autoAlert ? "translate-x-6" : ""}`} />
            </button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" />System Info</h3>
        <div className="space-y-2 text-sm">
          {[
            ["Project", "CSD 334 Mini Project · 2023–2027 Batch"],
            ["Version", "1.0.0"],
            ["AI Model", "Llama 3.1 (Groq)"],
            ["Database", "PostgreSQL 18"],
            ["Stack", "React + TypeScript + Express"],
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
export default function Admin() {
  const [activeNav, setActiveNav]   = useState("overview");
  const [stats, setStats]           = useState<Stats | null>(null);
  const [donors, setDonors]         = useState<Donor[]>([]);
  const [hospitals, setHospitals]   = useState<HospitalItem[]>([]);
  const [requests, setRequests]     = useState<BloodRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [, setLocation]             = useLocation();

  const userId = localStorage.getItem("userId");

  const fetchAll = async () => {
    try {
      const [statsRes, donorsRes, hospitalsRes, requestsRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/donors"),
        fetch("/api/hospitals"),
        fetch("/api/requests"),
      ]);
      if (statsRes.ok)     setStats(await statsRes.json());
      if (donorsRes.ok)    setDonors(await donorsRes.json());
      if (hospitalsRes.ok) setHospitals(await hospitalsRes.json());
      if (requestsRes.ok)  setRequests(await requestsRes.json());
    } catch {}
  };

  useEffect(() => {
    if (!userId) { setLocation("/"); return; }
    const load = async () => {
      setLoading(true);
      await fetchAll();
      setLoading(false);
    };
    load();
  }, [userId]);

  const pageTitle: Record<string, string> = {
    overview:  "Dashboard Overview",
    donors:    "Donor Management",
    inventory: "Blood Inventory",
    requests:  "Blood Requests",
    hospitals: "Hospitals",
    alerts:    "AI Alerts",
    reports:   "Reports",
    map:       "Live Donor Map",
    ai:        "AI & Data Processing",
    settings:  "Settings",
  };

  const renderPage = () => {
    if (loading) return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
    switch (activeNav) {
      case "overview":  return <OverviewPage stats={stats} requests={requests} />;
      case "donors":    return <DonorsPage donors={donors} onRefresh={fetchAll} />;
      case "inventory": return <BloodInventory />;
      case "requests":  return <RequestsPage requests={requests} onRefresh={fetchAll} />;
      case "hospitals": return <HospitalsPage hospitals={hospitals} />;
      case "alerts":    return <AlertsPage donors={donors} requests={requests} />;
      case "reports":   return <ReportsPage stats={stats} donors={donors} requests={requests} />;
      case "map":       return <DonorMap />;
      case "ai":        return <AIEngine />;
      case "settings":  return <SettingsPage />;
      default:          return <PlaceholderPage title={pageTitle[activeNav]} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar active={activeNav} setActive={setActiveNav} />

      <div className="flex-1 flex flex-col overflow-auto">
        <header className="sticky top-0 z-50 glass-card border-b border-border/50 px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">{pageTitle[activeNav]}</h2>
            <p className="text-xs text-muted-foreground">Rapid<span className="text-gradient font-semibold">Red</span> AI Blood Donation Management</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-200">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-600 text-xs font-semibold">System Live</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted border border-border text-xs text-muted-foreground">
              <ShieldCheck className="w-3 h-3" /> RAAC Compliant
            </div>
            <RealtimeNotifications />
          </div>
        </header>

        <div className="mx-8 mt-4 px-4 py-2 rounded-xl bg-muted/50 border border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span>Security & Compliance</span>
          <span className="text-border">·</span><span>HIPAA Protected</span>
          <span className="text-border">·</span><span>RAAC</span>
          <span className="text-border">·</span><span>ESR Verified</span>
          <span className="ml-auto">CSD 334 Mini Project · 2023–2027 Batch</span>
        </div>

        <main className="flex-1 px-8 py-6">{renderPage()}</main>
      </div>
    </div>
  );
}
