import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Users, RefreshCw, Loader2, Navigation } from "lucide-react";

interface Donor {
  id: string; name: string; bloodType: string;
  location: string; phone: string; available: boolean;
  latitude: number | null; longitude: number | null;
}

const COMPATIBLE: Record<string, string[]> = {
  "A+":  ["A+", "A-", "O+", "O-"],
  "A-":  ["A-", "O-"],
  "B+":  ["B+", "B-", "O+", "O-"],
  "B-":  ["B-", "O-"],
  "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  "AB-": ["AB-", "A-", "B-", "O-"],
  "O+":  ["O+", "O-"],
  "O-":  ["O-"],
};

const COLORS: Record<string, string> = {
  "O+": "#ef4444","O-": "#dc2626","A+": "#f97316","A-": "#ea580c",
  "B+": "#8b5cf6","B-": "#7c3aed","AB+": "#06b6d4","AB-": "#0891b2",
};

export default function SmartDonorMap({ bloodTypeFilter = "All" }: { bloodTypeFilter?: string }) {
  const mapRef  = useRef<HTMLDivElement>(null);
  const mapObj  = useRef<any>(null);
  const [donors, setDonors]     = useState<Donor[]>([]);
  const [loading, setLoading]   = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [selected, setSelected] = useState<Donor | null>(null);

  const fetchDonors = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/donors");
      if (res.ok) setDonors(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchDonors(); }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css"; link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if (!(window as any).L) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => setMapReady(true);
      document.head.appendChild(script);
    } else { setMapReady(true); }
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || loading) return;
    const L = (window as any).L;
    if (!L) return;
    if (mapObj.current) { mapObj.current.remove(); mapObj.current = null; }

    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
    mapObj.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);

    // Filter donors based on blood type
    const filtered = bloodTypeFilter === "All"
      ? donors.filter(d => d.available)
      : donors.filter(d => d.available && (COMPATIBLE[bloodTypeFilter] || [bloodTypeFilter]).includes(d.bloodType));

    const withGPS = filtered.filter(d => d.latitude && d.longitude);

    withGPS.forEach(donor => {
      const isExact = donor.bloodType === bloodTypeFilter;
      const color = COLORS[donor.bloodType] || "#ef4444";
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          background:${color};color:white;
          border-radius:50% 50% 50% 0;transform:rotate(-45deg);
          width:${isExact ? "44px" : "36px"};height:${isExact ? "44px" : "36px"};
          display:flex;align-items:center;justify-content:center;
          font-weight:bold;font-size:${isExact ? "11px" : "9px"};
          box-shadow:0 2px ${isExact ? "12px" : "8px"} rgba(0,0,0,${isExact ? "0.4" : "0.3"});
          border:${isExact ? "3px" : "2px"} solid white;">
          <span style="transform:rotate(45deg)">${donor.bloodType}</span>
        </div>`,
        iconSize: [isExact ? 44 : 36, isExact ? 44 : 36],
        iconAnchor: [isExact ? 22 : 18, isExact ? 44 : 36],
        popupAnchor: [0, isExact ? -44 : -36],
      });

      L.marker([donor.latitude!, donor.longitude!], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:system-ui;min-width:180px;">
            <div style="background:${color};color:white;padding:10px 12px;margin:-12px -12px 10px;border-radius:4px 4px 0 0;">
              <strong style="font-size:14px;">${donor.name}</strong>
              <span style="float:right;background:rgba(255,255,255,0.3);padding:2px 8px;border-radius:10px;font-size:11px;">${donor.bloodType}</span>
            </div>
            <div style="padding:0 4px;">
              ${isExact ? `<p style="background:#dcfce7;color:#16a34a;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:bold;margin:0 0 8px;">✅ Exact Match</p>` : `<p style="background:#fef3c7;color:#d97706;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:bold;margin:0 0 8px;">🔄 Compatible</p>`}
              <p style="margin:4px 0;font-size:12px;color:#666;">📍 ${donor.location}</p>
              <p style="margin:4px 0;font-size:12px;">📞 <a href="tel:${donor.phone}" style="color:${color};font-weight:bold;">${donor.phone.slice(0,5)}****${donor.phone.slice(-2)}</a></p>
              <button onclick="window.open('tel:${donor.phone}')" style="
                background:${color};color:white;border:none;padding:6px 16px;
                border-radius:8px;font-size:12px;cursor:pointer;width:100%;margin-top:8px;">
                📞 Call Now
              </button>
            </div>
          </div>
        `);
    });

    if (withGPS.length > 0) {
      const group = L.featureGroup(withGPS.map(d => L.marker([d.latitude!, d.longitude!])));
      map.fitBounds(group.getBounds().pad(0.3));
    }

    return () => { if (mapObj.current) { mapObj.current.remove(); mapObj.current = null; } };
  }, [mapReady, donors, loading, bloodTypeFilter]);

  const filtered = bloodTypeFilter === "All"
    ? donors.filter(d => d.available)
    : donors.filter(d => d.available && (COMPATIBLE[bloodTypeFilter] || [bloodTypeFilter]).includes(d.bloodType));

  const exact      = filtered.filter(d => d.bloodType === bloodTypeFilter);
  const compatible = filtered.filter(d => d.bloodType !== bloodTypeFilter);
  const withGPS    = filtered.filter(d => d.latitude && d.longitude);
  const noGPS      = filtered.filter(d => !d.latitude || !d.longitude);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3 text-center bg-green-500/5 border-green-200">
          <p className="text-xl font-black text-green-600">{exact.length}</p>
          <p className="text-xs text-muted-foreground">Exact Match</p>
        </Card>
        <Card className="p-3 text-center bg-amber-500/5 border-amber-200">
          <p className="text-xl font-black text-amber-600">{compatible.length}</p>
          <p className="text-xs text-muted-foreground">Compatible</p>
        </Card>
        <Card className="p-3 text-center bg-blue-500/5 border-blue-200">
          <p className="text-xl font-black text-blue-600">{withGPS.length}</p>
          <p className="text-xs text-muted-foreground">On Map</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-black">{filtered.length}</p>
          <p className="text-xs text-muted-foreground">Total Found</p>
        </Card>
      </div>

      {/* Map */}
      <Card className="overflow-hidden border-2 border-primary/20">
        <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">
              {bloodTypeFilter !== "All" ? `Donors compatible with ${bloodTypeFilter}` : "All Available Donors"}
            </span>
            <Badge className="bg-green-500/10 text-green-600 border-green-200 gap-1 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />Live
            </Badge>
          </div>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={fetchDonors}>
            <RefreshCw className="w-3 h-3" /> Refresh
          </Button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-80">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <div ref={mapRef} style={{ height: "400px", width: "100%" }} />
        )}
      </Card>

      {/* Donor List */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {exact.length > 0 && (
            <p className="text-xs font-bold text-green-600 uppercase tracking-wider">✅ Exact Match — {bloodTypeFilter}</p>
          )}
          {exact.map(d => (
            <Card key={d.id} className="p-4 border-2 border-green-200 bg-green-500/5">
              <div className="flex items-center gap-3">
                <div className="blood-type-badge w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">{d.bloodType}</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{d.name}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>📍 {d.location}</span>
                    {d.latitude && <span className="text-green-600">📡 GPS Available</span>}
                  </div>
                </div>
                <Button size="sm" className="blood-type-badge border-0 text-white text-xs gap-1"
                  onClick={() => { if(window.confirm(`📞 Call ${d.name}?\n${d.phone}`)) window.open(`tel:${d.phone}`); }}>
                  <Phone className="w-3 h-3" /> Call
                </Button>
              </div>
            </Card>
          ))}

          {compatible.length > 0 && (
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mt-2">🔄 Compatible Donors</p>
          )}
          {compatible.map(d => (
            <Card key={d.id} className="p-4 border-2 border-amber-200 bg-amber-500/5">
              <div className="flex items-center gap-3">
                <div className="blood-type-badge w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">{d.bloodType}</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{d.name}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>📍 {d.location}</span>
                    {d.latitude && <span className="text-green-600">📡 GPS Available</span>}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="text-xs gap-1 hover:border-primary/50"
                  onClick={() => { if(window.confirm(`📞 Call ${d.name}?\n${d.phone}`)) window.open(`tel:${d.phone}`); }}>
                  <Phone className="w-3 h-3" /> Call
                </Button>
              </div>
            </Card>
          ))}

          {noGPS.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              ⚠️ {noGPS.length} donor(s) not shown on map (no GPS location saved)
            </p>
          )}
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <Card className="p-8 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold">No compatible donors found</p>
          <p className="text-sm text-muted-foreground">No available donors for {bloodTypeFilter}</p>
        </Card>
      )}
    </div>
  );
}
