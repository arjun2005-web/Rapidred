import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, RefreshCw, Users, Navigation } from "lucide-react";

interface Donor {
  id: string; name: string; bloodType: string;
  location: string; phone: string; available: boolean;
  latitude: number | null; longitude: number | null;
}

const BLOOD_TYPE_COLORS: Record<string, string> = {
  "O+": "#ef4444", "O-": "#dc2626", "A+": "#f97316", "A-": "#ea580c",
  "B+": "#8b5cf6", "B-": "#7c3aed", "AB+": "#06b6d4", "AB-": "#0891b2",
};

export default function DonorMap() {
  const mapRef    = useRef<HTMLDivElement>(null);
  const mapObj    = useRef<any>(null);
  const [donors, setDonors]   = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("All");
  const [mapReady, setMapReady] = useState(false);

  const BLOOD_TYPES = ["All", "O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

  const fetchDonors = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/donors");
      if (res.ok) setDonors(await res.json());
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDonors(); }, []);

  // Load Leaflet dynamically
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Add Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id   = "leaflet-css";
      link.rel  = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    if (!(window as any).L) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => setMapReady(true);
      document.head.appendChild(script);
    } else {
      setMapReady(true);
    }
  }, []);

  // Init map
  useEffect(() => {
    if (!mapReady || !mapRef.current || loading) return;
    const L = (window as any).L;
    if (!L) return;

    // Destroy existing map
    if (mapObj.current) {
      mapObj.current.remove();
      mapObj.current = null;
    }

    // Create map centered on India
    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
    mapObj.current = map;

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    // Filter donors
    const filtered = filter === "All" ? donors : donors.filter(d => d.bloodType === filter);
    const withGPS  = filtered.filter(d => d.latitude && d.longitude);
    const withoutGPS = filtered.filter(d => !d.latitude || !d.longitude);

    // Add markers for donors with GPS
    withGPS.forEach(donor => {
      const color = BLOOD_TYPE_COLORS[donor.bloodType] || "#ef4444";
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          background: ${color};
          color: white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          font-weight: bold; font-size: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border: 2px solid white;
        ">
          <span style="transform: rotate(45deg)">${donor.bloodType}</span>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36],
      });

      L.marker([donor.latitude!, donor.longitude!], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: system-ui; min-width: 160px;">
            <div style="background: ${color}; color: white; padding: 8px 12px; margin: -12px -12px 8px; border-radius: 4px 4px 0 0;">
              <strong style="font-size: 14px;">${donor.name}</strong>
              <span style="float:right; background: rgba(255,255,255,0.3); padding: 1px 6px; border-radius: 10px; font-size: 11px;">${donor.bloodType}</span>
            </div>
            <div style="padding: 0 4px;">
              <p style="margin: 4px 0; font-size: 12px; color: #666;">📍 ${donor.location}</p>
              <p style="margin: 4px 0; font-size: 12px;">📞 <a href="tel:${donor.phone}" style="color: ${color}; font-weight: bold;">${donor.phone}</a></p>
              <p style="margin: 6px 0 2px; font-size: 11px;">
                <span style="background: ${donor.available ? "#dcfce7" : "#f3f4f6"}; color: ${donor.available ? "#16a34a" : "#6b7280"}; padding: 2px 8px; border-radius: 10px; font-weight: bold;">
                  ${donor.available ? "✅ Available" : "❌ Unavailable"}
                </span>
              </p>
            </div>
          </div>
        `);
    });

    // Fit bounds if markers exist
    if (withGPS.length > 0) {
      const group = L.featureGroup(
        withGPS.map(d => L.marker([d.latitude!, d.longitude!]))
      );
      map.fitBounds(group.getBounds().pad(0.2));
    }

    return () => {
      if (mapObj.current) {
        mapObj.current.remove();
        mapObj.current = null;
      }
    };
  }, [mapReady, donors, filter, loading]);

  const withGPS    = donors.filter(d => d.latitude && d.longitude);
  const withoutGPS = donors.filter(d => !d.latitude || !d.longitude);
  const filtered   = filter === "All" ? donors : donors.filter(d => d.bloodType === filter);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Live Donor Map</h2>
          <Badge className="bg-green-500/10 text-green-600 border-green-200 gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            Live
          </Badge>
        </div>
        <Button variant="outline" size="sm" className="gap-1 hover:border-primary/50" onClick={fetchDonors}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-black">{donors.length}</p>
          <p className="text-xs text-muted-foreground">Total Donors</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-black text-green-600">{withGPS.length}</p>
          <p className="text-xs text-muted-foreground">On Map</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-black text-amber-600">{withoutGPS.length}</p>
          <p className="text-xs text-muted-foreground">No GPS</p>
        </Card>
      </div>

      {/* Blood Type Filter */}
      <div className="flex flex-wrap gap-2">
        {BLOOD_TYPES.map(bt => (
          <Button key={bt} size="sm"
            variant={filter === bt ? "default" : "outline"}
            onClick={() => setFilter(bt)}
            className={`rounded-full px-3 text-xs transition-all
              ${filter === bt ? "blood-type-badge border-0 text-white" : "hover:border-primary/50"}`}>
            {bt !== "All" && (
              <span className="w-2 h-2 rounded-full mr-1 inline-block"
                style={{ background: BLOOD_TYPE_COLORS[bt] }} />
            )}
            {bt}
          </Button>
        ))}
      </div>

      {/* Map */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Loading map...</p>
            </div>
          </div>
        ) : (
          <div ref={mapRef} style={{ height: "500px", width: "100%" }} />
        )}
      </Card>

      {/* Donors without GPS */}
      {withoutGPS.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Navigation className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-sm">Donors without GPS ({withoutGPS.length})</h3>
            <p className="text-xs text-muted-foreground ml-auto">Ask them to enable GPS in their profile</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {withoutGPS.map(d => (
              <div key={d.id} className="flex items-center gap-3 p-2 rounded-xl border border-border/50 hover:border-primary/30">
                <div className="blood-type-badge w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xs">{d.bloodType}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.location}</p>
                </div>
                <Badge variant="outline" className={d.available ? "bg-green-500/10 text-green-600 border-green-200 text-xs" : "text-xs"}>
                  {d.available ? "Available" : "Unavailable"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}