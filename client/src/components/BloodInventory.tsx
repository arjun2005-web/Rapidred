import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Droplets, AlertTriangle, Clock, CheckCircle,
  Plus, Loader2, RefreshCw, Trash2
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────
interface InventoryItem {
  id: string;
  hospitalId: string;
  bloodType: string;
  units: number;
  dateAdded: string | null;
  expiryDate: string | null;
  urgencyLevel: string | null;
  updatedAt: string;
}

const BLOOD_TYPES = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

// ── Helpers ────────────────────────────────────────────────────────────────
function getDaysRemaining(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function getUrgencyLevel(days: number | null): "SAFE" | "WARNING" | "CRITICAL" | "EXPIRED" {
  if (days === null) return "SAFE";
  if (days <= 0) return "EXPIRED";
  if (days <= 10) return "CRITICAL";
  if (days <= 20) return "WARNING";
  return "SAFE";
}

function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split("T")[0];
}

const urgencyConfig = {
  SAFE:     { color: "bg-green-500/10 text-green-600 border-green-200",  icon: <CheckCircle className="w-4 h-4 text-green-500" />,  bar: "bg-green-500",  label: "Safe"     },
  WARNING:  { color: "bg-amber-500/10 text-amber-600 border-amber-200",  icon: <Clock className="w-4 h-4 text-amber-500" />,        bar: "bg-amber-500",  label: "Warning"  },
  CRITICAL: { color: "bg-red-500/10 text-red-600 border-red-200",        icon: <AlertTriangle className="w-4 h-4 text-red-500" />,  bar: "bg-red-500",    label: "Critical" },
  EXPIRED:  { color: "bg-gray-500/10 text-gray-500 border-gray-200",     icon: <AlertTriangle className="w-4 h-4 text-gray-400" />, bar: "bg-gray-400",   label: "Expired"  },
};

// ── Main Component ─────────────────────────────────────────────────────────
export default function BloodInventory({ hospitalId }: { hospitalId?: string }) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterLevel, setFilterLevel] = useState<"ALL" | "SAFE" | "WARNING" | "CRITICAL" | "EXPIRED">("ALL");

  const [form, setForm] = useState({
    bloodType: "O+",
    units: "",
    dateAdded: new Date().toISOString().split("T")[0],
  });

  const hId = hospitalId || localStorage.getItem("hospitalId") || "";

  // Fetch inventory
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const url = hId ? `/api/inventory/${hId}` : "/api/inventory";
      const res = await fetch(url);
      const data = await res.json();
      setInventory(data);
    } catch {
      console.error("Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    // Auto refresh every 60 seconds
    const interval = setInterval(fetchInventory, 60000);
    return () => clearInterval(interval);
  }, [hId]);

  // Add or update inventory
  const handleSave = async () => {
    if (!form.units || parseInt(form.units) <= 0) {
      alert("Please enter valid units");
      return;
    }
    setSaving(true);
    try {
      const dateAdded = form.dateAdded;
      const expiryDate = addDays(new Date(dateAdded), 35);
      const days = getDaysRemaining(expiryDate);
      const urgencyLevel = getUrgencyLevel(days);

      // Check if blood type already exists
      const existing = inventory.find(i => i.bloodType === form.bloodType);

      if (existing) {
        // Update existing
        await fetch(`/api/inventory/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            units: parseInt(form.units),
            dateAdded,
            expiryDate,
            urgencyLevel,
          }),
        });
      } else {
        // Create new
        await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hospitalId: hId,
            bloodType: form.bloodType,
            units: parseInt(form.units),
            dateAdded,
            expiryDate,
            urgencyLevel,
          }),
        });
      }

      await fetchInventory();
      setShowAddForm(false);
      setForm({ bloodType: "O+", units: "", dateAdded: new Date().toISOString().split("T")[0] });
    } catch {
      alert("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  // Delete / mark expired
  const handleDelete = async (id: string) => {
    if (!confirm("Remove this blood unit from inventory?")) return;
    await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    await fetchInventory();
  };

  // Filter inventory
  const filtered = inventory.filter(item => {
    const days = getDaysRemaining(item.expiryDate);
    const level = getUrgencyLevel(days);
    return filterLevel === "ALL" || level === filterLevel;
  });

  // Summary counts
  const counts = {
    SAFE:     inventory.filter(i => getUrgencyLevel(getDaysRemaining(i.expiryDate)) === "SAFE").length,
    WARNING:  inventory.filter(i => getUrgencyLevel(getDaysRemaining(i.expiryDate)) === "WARNING").length,
    CRITICAL: inventory.filter(i => getUrgencyLevel(getDaysRemaining(i.expiryDate)) === "CRITICAL").length,
    EXPIRED:  inventory.filter(i => getUrgencyLevel(getDaysRemaining(i.expiryDate)) === "EXPIRED").length,
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Blood Inventory & Expiry Tracker</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1 hover:border-primary/50" onClick={fetchInventory}>
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            className="gap-1 blood-type-badge border-0 text-white hover:opacity-90"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Blood Units
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["SAFE", "WARNING", "CRITICAL", "EXPIRED"] as const).map(level => {
          const cfg = urgencyConfig[level];
          return (
            <Card
              key={level}
              className={`p-4 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md border-2
                ${filterLevel === level ? "border-primary/40" : "border-transparent"}`}
              onClick={() => setFilterLevel(filterLevel === level ? "ALL" : level)}
            >
              <div className="flex items-center gap-2 mb-1">
                {cfg.icon}
                <span className="text-xs font-semibold text-muted-foreground uppercase">{cfg.label}</span>
              </div>
              <p className="text-2xl font-black">{counts[level]}</p>
              <p className="text-xs text-muted-foreground">blood types</p>
            </Card>
          );
        })}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card className="p-5 border-2 border-primary/20">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" />
            Add / Update Blood Units
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Blood Type */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Blood Type</label>
              <div className="flex flex-wrap gap-2">
                {BLOOD_TYPES.map(bt => (
                  <button
                    key={bt}
                    onClick={() => setForm({ ...form, bloodType: bt })}
                    className={`w-12 h-12 rounded-xl font-bold text-sm transition-all border-2
                      ${form.bloodType === bt
                        ? "blood-type-badge text-white border-transparent"
                        : "border-border hover:border-primary/50"}`}
                  >
                    {bt}
                  </button>
                ))}
              </div>
            </div>

            {/* Units */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Units (bags)</label>
              <Input
                type="number"
                placeholder="e.g. 10"
                value={form.units}
                onChange={e => setForm({ ...form, units: e.target.value })}
                className="rounded-xl border-2 focus:border-primary/50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Expiry: {form.dateAdded ? addDays(new Date(form.dateAdded), 35) : "—"}
              </p>
            </div>

            {/* Date Added */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Date Added</label>
              <Input
                type="date"
                value={form.dateAdded}
                onChange={e => setForm({ ...form, dateAdded: e.target.value })}
                className="rounded-xl border-2 focus:border-primary/50"
              />
            </div>
          </div>

          {/* Urgency Preview */}
          {form.dateAdded && (
            <div className="mb-4 p-3 rounded-xl bg-muted/50">
              <p className="text-sm font-medium mb-1">Urgency Preview:</p>
              {(() => {
                const expiry = addDays(new Date(form.dateAdded), 35);
                const days = getDaysRemaining(expiry);
                const level = getUrgencyLevel(days);
                const cfg = urgencyConfig[level];
                return (
                  <div className="flex items-center gap-2">
                    {cfg.icon}
                    <Badge variant="outline" className={cfg.color}>{cfg.label}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {days !== null ? `${days} days until expiry` : "—"}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              className="blood-type-badge border-0 text-white hover:opacity-90 gap-1"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</> : "Save"}
            </Button>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["ALL", "SAFE", "WARNING", "CRITICAL", "EXPIRED"] as const).map(f => (
          <Button
            key={f}
            size="sm"
            variant={filterLevel === f ? "default" : "outline"}
            onClick={() => setFilterLevel(f)}
            className={`rounded-full px-4 text-xs transition-all
              ${filterLevel === f ? "blood-type-badge border-0 text-white" : "hover:border-primary/50"}`}
          >
            {f} {f !== "ALL" && `(${counts[f as keyof typeof counts]})`}
          </Button>
        ))}
      </div>

      {/* Inventory Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Droplets className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No inventory found</h3>
          <p className="text-muted-foreground text-sm mb-4">Add blood units to start tracking expiry</p>
          <Button
            className="blood-type-badge border-0 text-white gap-1"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="w-4 h-4" /> Add Blood Units
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {["Blood Type", "Units", "Date Added", "Expiry Date", "Days Left", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => {
                  const days = getDaysRemaining(item.expiryDate);
                  const level = getUrgencyLevel(days);
                  const cfg = urgencyConfig[level];
                  const pct = days !== null ? Math.min(Math.max((days / 35) * 100, 0), 100) : 100;

                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-border/50 transition-colors hover:bg-muted/30
                        ${level === "CRITICAL" || level === "EXPIRED" ? "bg-red-50/50" : ""}
                        ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                    >
                      {/* Blood Type */}
                      <td className="px-4 py-3">
                        <div className="blood-type-badge w-fit px-3 py-1.5 rounded-lg">
                          <span className="text-white font-bold">{item.bloodType}</span>
                        </div>
                      </td>

                      {/* Units */}
                      <td className="px-4 py-3">
                        <span className="text-lg font-black">{item.units}</span>
                        <span className="text-xs text-muted-foreground ml-1">bags</span>
                      </td>

                      {/* Date Added */}
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {item.dateAdded || "—"}
                      </td>

                      {/* Expiry Date */}
                      <td className="px-4 py-3 text-sm font-medium">
                        {item.expiryDate || "—"}
                      </td>

                      {/* Days Left + Progress Bar */}
                      <td className="px-4 py-3">
                        <div className="space-y-1.5 min-w-[100px]">
                          <span className={`text-sm font-bold ${level === "EXPIRED" ? "text-gray-400" : level === "CRITICAL" ? "text-red-600" : level === "WARNING" ? "text-amber-600" : "text-green-600"}`}>
                            {days === null ? "—" : days <= 0 ? "Expired" : `${days} days`}
                          </span>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden w-24">
                            <div
                              className={`h-full rounded-full transition-all ${cfg.bar}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`${cfg.color} gap-1`}>
                          {cfg.icon}
                          {cfg.label}
                        </Badge>
                        {(level === "CRITICAL" || level === "WARNING") && (
                          <p className="text-xs text-muted-foreground mt-1 animate-pulse">
                            ⚠ Alert sent
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs hover:border-primary/50"
                            onClick={() => {
                              setForm({
                                bloodType: item.bloodType,
                                units: item.units.toString(),
                                dateAdded: item.dateAdded || new Date().toISOString().split("T")[0],
                              });
                              setShowAddForm(true);
                            }}
                          >
                            Update
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-red-500 hover:border-red-300"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Legend */}
      <Card className="p-4">
        <p className="text-sm font-semibold mb-3">Expiry Level Guide:</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["SAFE", "WARNING", "CRITICAL", "EXPIRED"] as const).map(level => {
            const cfg = urgencyConfig[level];
            const desc = {
              SAFE: "More than 20 days left",
              WARNING: "10 to 20 days left — monitor closely",
              CRITICAL: "Less than 10 days — act immediately",
              EXPIRED: "Past 35 days — discard immediately",
            };
            return (
              <div key={level} className={`p-3 rounded-xl border ${cfg.color}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  {cfg.icon}
                  <span className="text-xs font-bold uppercase">{cfg.label}</span>
                </div>
                <p className="text-xs">{desc[level]}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}