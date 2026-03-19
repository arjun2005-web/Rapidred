import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain, Zap, AlertTriangle, TrendingUp,
  PackageOpen, ClipboardList, Loader2,
  CheckCircle, Target, FileText
} from "lucide-react";

interface BloodRequest {
  id: string; bloodType: string; units: number;
  urgency: string; status: string; department: string | null;
  requestedBy: string | null; createdAt: string;
}

interface InventoryItem {
  id: string; bloodType: string; units: number;
  urgencyLevel: string; expiryDate: string | null;
}

const urgencyBadge: Record<string, string> = {
  Critical: "bg-red-500/10 text-red-600 border-red-200",
  High:     "bg-amber-500/10 text-amber-600 border-amber-200",
  Normal:   "bg-green-500/10 text-green-600 border-green-200",
};

export default function HospitalAI({ hospitalId }: { hospitalId: string }) {
  const [activeTab, setActiveTab] = useState("emergency");
  const [requests, setRequests]   = useState<BloodRequest[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult]   = useState("");
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [r, i] = await Promise.all([
          fetch(`/api/requests/${hospitalId}`).then(r => r.json()),
          fetch(`/api/inventory/${hospitalId}`).then(r => r.json()),
        ]);
        setRequests(Array.isArray(r) ? r : []);
        setInventory(Array.isArray(i) ? i : []);
      } catch {} finally { setLoading(false); }
    };
    if (hospitalId) fetchData();
  }, [hospitalId]);

  const callAI = async (prompt: string) => {
    setAiLoading(true);
    setAiResult("");
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: "You are RapidRed AI assistant for a hospital blood management system. Be concise and actionable.",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      setAiResult(data.content?.[0]?.text || "Could not generate response.");
    } catch { setAiResult("AI service unavailable."); }
    finally { setAiLoading(false); }
  };

  // Emergency Classification
  const classified = requests.map(r => ({
    ...r,
    classification: r.urgency === "Critical" ? "EMERGENCY" : r.urgency === "High" ? "URGENT" : "NON-EMERGENCY",
    priority: r.urgency === "Critical" ? 1 : r.urgency === "High" ? 2 : 3,
  })).sort((a, b) => a.priority - b.priority);

  // Shortage Detection
  const shortages = inventory.filter(i => i.units < 5 || i.urgencyLevel === "CRITICAL" || i.urgencyLevel === "WARNING");

  // Priority Allocation
  const prioritized = [...requests]
    .filter(r => r.status === "Pending")
    .sort((a, b) => {
      const p: Record<string, number> = { Critical: 1, High: 2, Normal: 3 };
      return (p[a.urgency] || 3) - (p[b.urgency] || 3);
    });

  const tabs = [
    { id: "emergency", label: "Emergency Class",    icon: AlertTriangle },
    { id: "shortage",  label: "Shortage Monitor",   icon: PackageOpen   },
    { id: "priority",  label: "Priority Allocation",icon: Target        },
    { id: "demand",    label: "Demand Prediction",  icon: TrendingUp    },
    { id: "report",    label: "AI Report",          icon: FileText      },
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl blood-type-badge flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold">Hospital AI Engine</h3>
            <p className="text-xs text-muted-foreground">Powered by Llama 3.1 · Groq API</p>
          </div>
          <Badge className="ml-auto bg-green-500/10 text-green-600 border-green-200 gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            Active
          </Badge>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <Button key={id} size="sm" variant={activeTab === id ? "default" : "outline"}
            onClick={() => { setActiveTab(id); setAiResult(""); }}
            className={`gap-1.5 text-xs ${activeTab === id ? "blood-type-badge border-0 text-white" : "hover:border-primary/50"}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </Button>
        ))}
      </div>

      {/* Emergency Classification */}
      {activeTab === "emergency" && (
        <div className="space-y-4">
          <Card className="p-5 border-red-200 bg-red-500/5">
            <h3 className="font-bold mb-1 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" />Emergency Classification</h3>
            <p className="text-sm text-muted-foreground">Your requests sorted by emergency level</p>
          </Card>
          {classified.length === 0 ? (
            <Card className="p-8 text-center"><CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" /><p className="font-semibold">No requests to classify</p></Card>
          ) : classified.map(r => (
            <Card key={r.id} className={`p-4 border-2 ${r.classification === "EMERGENCY" ? "border-red-200 bg-red-500/5" : r.classification === "URGENT" ? "border-amber-200 bg-amber-500/5" : "border-border/50"}`}>
              <div className="flex items-center gap-3">
                <div className="blood-type-badge w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">{r.bloodType}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`text-xs ${r.classification === "EMERGENCY" ? "bg-red-500 text-white border-0" : r.classification === "URGENT" ? "bg-amber-500 text-white border-0" : "bg-green-500 text-white border-0"}`}>
                      {r.classification}
                    </Badge>
                    <Badge variant="outline" className={urgencyBadge[r.urgency]}>{r.urgency}</Badge>
                  </div>
                  <p className="text-sm">{r.units} units · {r.department || "General"} · {r.requestedBy || "Doctor"}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Shortage Monitor */}
      {activeTab === "shortage" && (
        <div className="space-y-4">
          <Card className="p-5 border-amber-200 bg-amber-500/5">
            <h3 className="font-bold mb-1 flex items-center gap-2"><PackageOpen className="w-4 h-4 text-amber-500" />Shortage Monitor</h3>
            <p className="text-sm text-muted-foreground">Blood types that need immediate attention</p>
          </Card>
          {shortages.length === 0 ? (
            <Card className="p-8 text-center"><CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" /><p className="font-semibold">All inventory levels are healthy!</p></Card>
          ) : shortages.map(item => (
            <Card key={item.id} className={`p-4 border-2 ${item.urgencyLevel === "CRITICAL" ? "border-red-200 bg-red-500/5" : "border-amber-200 bg-amber-500/5"}`}>
              <div className="flex items-center gap-4">
                <div className="blood-type-badge w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-black">{item.bloodType}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={item.urgencyLevel === "CRITICAL" ? "bg-red-500 text-white border-0 text-xs" : "bg-amber-500 text-white border-0 text-xs"}>
                      {item.urgencyLevel}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold">{item.units} units remaining</p>
                  {item.expiryDate && <p className="text-xs text-muted-foreground">Expires: {item.expiryDate}</p>}
                </div>
                <AlertTriangle className={`w-6 h-6 ${item.urgencyLevel === "CRITICAL" ? "text-red-500" : "text-amber-500"}`} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Priority Allocation */}
      {activeTab === "priority" && (
        <div className="space-y-4">
          <Card className="p-5 border-blue-200 bg-blue-500/5">
            <h3 className="font-bold mb-1 flex items-center gap-2"><Target className="w-4 h-4 text-blue-500" />Priority Allocation</h3>
            <p className="text-sm text-muted-foreground">Pending requests ordered by priority</p>
          </Card>
          {prioritized.length === 0 ? (
            <Card className="p-8 text-center"><CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" /><p className="font-semibold">No pending requests!</p></Card>
          ) : prioritized.map((r, i) => (
            <Card key={r.id} className={`p-4 border-2 ${i === 0 ? "border-red-200 bg-red-500/5" : "border-border/50"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${i === 0 ? "blood-type-badge text-white" : "bg-muted"}`}>
                  #{i + 1}
                </div>
                <div className="blood-type-badge w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">{r.bloodType}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{r.units} units · {r.department || "General"}</p>
                  <p className="text-xs text-muted-foreground">{r.requestedBy || "Doctor"} · {new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <Badge variant="outline" className={urgencyBadge[r.urgency]}>{r.urgency}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Demand Prediction */}
      {activeTab === "demand" && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-bold mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Blood Demand Prediction</h3>
            <p className="text-sm text-muted-foreground mb-4">AI analysis of your blood demand patterns</p>
            <Button className="blood-type-badge border-0 text-white gap-2 hover:opacity-90" disabled={aiLoading}
              onClick={() => callAI(`Analyze this hospital's blood demand based on these requests: ${JSON.stringify(requests.slice(0,10))}. Predict which blood types will be needed most in the next 7 days. Give specific recommendations. Be concise.`)}>
              {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</> : <><Zap className="w-4 h-4" />Predict Demand</>}
            </Button>
          </Card>
          {aiResult && (
            <Card className="p-5 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-primary" />
                <p className="font-semibold text-sm">AI Analysis</p>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{aiResult}</p>
            </Card>
          )}
        </div>
      )}

      {/* AI Report */}
      {activeTab === "report" && (
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-bold mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />AI Report Generation</h3>
            <p className="text-sm text-muted-foreground mb-4">Generate a comprehensive blood management report</p>
            <Button className="blood-type-badge border-0 text-white gap-2 hover:opacity-90" disabled={aiLoading}
              onClick={() => callAI(`Generate a hospital blood management report based on:
Requests: ${JSON.stringify(requests.slice(0,10))}
Inventory: ${JSON.stringify(inventory.slice(0,10))}
Include: Executive Summary, Key Findings, Critical Issues, Recommendations. Be detailed but concise.`)}>
              {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Generating Report...</> : <><FileText className="w-4 h-4" />Generate AI Report</>}
            </Button>
          </Card>
          {aiResult && (
            <Card className="p-5 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-primary" />
                <p className="font-semibold text-sm">AI Generated Report</p>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{aiResult}</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
