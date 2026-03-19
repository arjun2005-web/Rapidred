import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  User, Droplets, MapPin, Phone, Calendar,
  Save, Loader2, CheckCircle, Navigation,
  AlertTriangle, Mail, Scale
} from "lucide-react";
import { useLocation } from "wouter";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function calculateAge(dob: string): number {
  if (!dob) return 0;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getMaxDob(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().split("T")[0];
}

function getMinDob(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 65);
  return d.toISOString().split("T")[0];
}

export default function DonorProfile() {
  const [, setLocation] = useLocation();
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [locating, setLocating] = useState(false);
  const [errors, setErrors]     = useState<Record<string, string>>({});

  const userId    = localStorage.getItem("userId") || "";
  const userEmail = localStorage.getItem("userEmail") || "";

  const [form, setForm] = useState({
    name: "", bloodType: "A+", phone: "",
    email: userEmail, location: "", dob: "",
    weight: "", lastDonation: "", available: true,
    latitude: null as number | null,
    longitude: null as number | null,
  });

  useEffect(() => {
    if (!userId) { setLocation("/"); return; }
    const load = async () => {
      try {
        const res = await fetch(`/api/donors/me/${userId}`);
        if (res.ok) {
          const d = await res.json();
          setForm({
            name: d.name || "", bloodType: d.bloodType || "A+",
            phone: d.phone || "", email: d.email || userEmail,
            location: d.location || "", dob: d.dob || "",
            weight: d.weight?.toString() || "",
            lastDonation: d.lastDonation || "",
            available: d.available ?? true,
            latitude: d.latitude || null, longitude: d.longitude || null,
          });
        }
      } catch {}
    };
    load();
  }, [userId]);

  const getGPS = () => {
    if (!navigator.geolocation) { setErrors(e => ({...e, location: "Geolocation not supported"})); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm(f => ({ ...f, latitude, longitude }));
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          const city  = data.address?.city || data.address?.town || data.address?.village || "";
          const state = data.address?.state || "";
          const loc   = [city, state].filter(Boolean).join(", ");
          if (loc) setForm(f => ({ ...f, location: loc, latitude, longitude }));
        } catch {}
        setLocating(false);
      },
      () => { setErrors(e => ({...e, location: "Could not get location. Enter manually."})); setLocating(false); },
      { timeout: 10000 }
    );
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = "Enter a valid email";
    if (!form.phone.trim()) newErrors.phone = "Phone is required";
    else if (!/^\d{10}$/.test(form.phone)) newErrors.phone = "Phone must be exactly 10 digits";
    if (!form.location.trim()) newErrors.location = "Location is required";
    if (!form.dob) newErrors.dob = "Date of birth is required";
    else {
      const age = calculateAge(form.dob);
      if (age < 18) newErrors.dob = "You must be at least 18 years old to donate";
      else if (age > 65) newErrors.dob = "Donors must be 65 years or younger";
    }
    if (!form.weight) newErrors.weight = "Weight is required";
    else if (parseInt(form.weight) < 45) newErrors.weight = "Minimum weight to donate is 45kg";
    else if (parseInt(form.weight) > 200) newErrors.weight = "Please enter a valid weight";
    return newErrors;
  };

  const handleSave = async () => {
    const newErrors = validate();
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setSaving(true);
    try {
      const age = calculateAge(form.dob);
      const res = await fetch("/api/donors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId, name: form.name, bloodType: form.bloodType,
          phone: form.phone, email: form.email,
          location: form.location, age,
          weight: parseInt(form.weight),
          dob: form.dob,
          lastDonation: form.lastDonation || null,
          available: form.available,
          latitude: form.latitude, longitude: form.longitude,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSaved(true);
      // Clear form and redirect to home
      setForm({
        name: "", bloodType: "A+", phone: "",
        email: userEmail, location: "", dob: "",
        weight: "", lastDonation: "", available: true,
        latitude: null, longitude: null,
      });
      setTimeout(() => setLocation("/home"), 1000);
    } catch { setErrors({ general: "Failed to save. Please try again." }); }
    finally { setSaving(false); }
  };

  const age = form.dob ? calculateAge(form.dob) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl blood-type-badge flex items-center justify-center">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">Rapid<span className="text-gradient">Red</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{userEmail}</span>
            <Button variant="outline" size="sm" onClick={() => setLocation("/home")}>View Donors</Button>
            <Button variant="outline" size="sm" onClick={() => { localStorage.clear(); setLocation("/"); }}>Logout</Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">My Donor <span className="text-gradient">Profile</span></h2>
          <p className="text-muted-foreground">Fill in your details to appear on the donor list and help save lives.</p>
        </div>

        {/* Eligibility Banner */}
        <Card className="p-4 mb-6 bg-blue-500/5 border-blue-200">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span><strong>Eligibility Requirements:</strong> Age 18–65 years · Weight ≥ 45kg · Valid phone number (10 digits)</span>
          </div>
        </Card>

        {errors.general && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-200 flex items-center gap-2 text-red-600 text-sm">
            <AlertTriangle className="w-4 h-4" />{errors.general}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* Personal Info */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <User className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">Personal Information</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Full Name *</label>
                  <Input placeholder="e.g. Arjun Kumar" value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className={`rounded-xl border-2 ${errors.name ? "border-red-300" : "focus:border-primary/50"}`} />
                  {errors.name && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.name}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Date of Birth * <span className="text-xs">(Must be 18–65 years)</span></label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Input type="date" value={form.dob}
                      min={getMinDob()} max={getMaxDob()}
                      onChange={e => setForm({ ...form, dob: e.target.value })}
                      className={`rounded-xl border-2 ${errors.dob ? "border-red-300" : "focus:border-primary/50"}`} />
                    {age && age >= 18 && age <= 65 && (
                      <span className="text-sm text-green-600 font-medium whitespace-nowrap">{age} years ✅</span>
                    )}
                  </div>
                  {errors.dob && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.dob}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Weight (kg) * <span className="text-xs">(Minimum 45kg)</span></label>
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Input type="number" placeholder="e.g. 60" value={form.weight}
                      onChange={e => setForm({ ...form, weight: e.target.value })}
                      className={`rounded-xl border-2 ${errors.weight ? "border-red-300" : "focus:border-primary/50"}`} />
                    {form.weight && parseInt(form.weight) >= 45 && (
                      <span className="text-sm text-green-600 font-medium whitespace-nowrap">{form.weight}kg ✅</span>
                    )}
                  </div>
                  {errors.weight && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.weight}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Phone Number * <span className="text-xs">(10 digits)</span></label>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Input placeholder="9876543210" value={form.phone} maxLength={10}
                      onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                      className={`rounded-xl border-2 ${errors.phone ? "border-red-300" : "focus:border-primary/50"}`} />
                    <span className={`text-xs font-medium whitespace-nowrap ${form.phone.length === 10 ? "text-green-600" : "text-muted-foreground"}`}>
                      {form.phone.length}/10 {form.phone.length === 10 ? "✅" : ""}
                    </span>
                  </div>
                  {errors.phone && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.phone}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Email Address * <span className="text-xs">(For urgent blood alerts)</span></label>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Input type="email" placeholder="you@gmail.com" value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      className={`rounded-xl border-2 ${errors.email ? "border-red-300" : "focus:border-primary/50"}`} />
                  </div>
                  {errors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.email}</p>}
                  <p className="text-xs text-muted-foreground mt-1">You'll receive email alerts when your blood type is urgently needed 🩸</p>
                </div>
              </div>
            </Card>

            {/* Blood & Donation */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <Droplets className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">Blood & Donation Info</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Blood Type *</label>
                  <div className="flex flex-wrap gap-2">
                    {BLOOD_TYPES.map(bt => (
                      <button key={bt} onClick={() => setForm({ ...form, bloodType: bt })}
                        className={`w-14 h-14 rounded-xl font-bold text-sm border-2 transition-all
                          ${form.bloodType === bt ? "blood-type-badge text-white border-transparent shadow-md scale-105" : "border-border hover:border-primary/50"}`}>
                        {bt}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Last Donation Date</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Input type="date" value={form.lastDonation}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={e => setForm({ ...form, lastDonation: e.target.value })}
                      className="rounded-xl border-2 focus:border-primary/50" />
                  </div>
                </div>
              </div>
            </Card>

            {/* Location */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <MapPin className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">Location</h3>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Your Location *</label>
                <div className="flex gap-2">
                  <Input placeholder="e.g. Chennai, Tamil Nadu" value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    className={`rounded-xl border-2 flex-1 ${errors.location ? "border-red-300" : "focus:border-primary/50"}`} />
                  <Button variant="outline" className="gap-2 rounded-xl hover:border-primary/50 flex-shrink-0"
                    onClick={getGPS} disabled={locating}>
                    {locating ? <><Loader2 className="w-4 h-4 animate-spin" />Locating...</> : <><Navigation className="w-4 h-4" />Use GPS</>}
                  </Button>
                </div>
                {form.latitude && form.longitude && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />GPS: {form.latitude.toFixed(4)}, {form.longitude.toFixed(4)}
                  </p>
                )}
                {errors.location && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{errors.location}</p>}
              </div>
            </Card>

            {/* Save */}
            <Button className="w-full h-12 blood-type-badge border-0 text-white text-base font-semibold hover:opacity-90 gap-2"
              onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
               : saved  ? <><CheckCircle className="w-4 h-4" />Saved Successfully!</>
               : <><Save className="w-4 h-4" />Save Profile</>}
            </Button>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <Card className="p-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-4">Preview</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold">{form.name || "Your Name"}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{form.location || "Your location"}</span>
                  </div>
                </div>
                <div className="blood-type-badge px-2.5 py-1.5 rounded-lg ml-auto">
                  <span className="text-white font-bold text-sm">{form.bloodType}</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{form.phone ? `${form.phone.slice(0,5)}****${form.phone.slice(-2)}` : "Phone number"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{form.email || "Email address"}</span>
                </div>
                {age && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Age: {age} years</span>
                  </div>
                )}
                {form.weight && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Scale className="w-3.5 h-3.5" />
                    <span>Weight: {form.weight}kg</span>
                  </div>
                )}
                {form.latitude && (
                  <div className="flex items-center gap-2 text-green-600">
                    <Navigation className="w-3.5 h-3.5" />
                    <span>GPS location saved ✅</span>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <Badge className={form.available ? "bg-green-500/10 text-green-600 border-green-200" : ""}>
                  {form.available ? "Available" : "Unavailable"}
                </Badge>
              </div>
            </Card>

            {/* Eligibility Check */}
            <Card className="p-5">
              <p className="text-sm font-semibold mb-3">Eligibility Check</p>
              <div className="space-y-2">
                {[
                  { label: "Age 18–65", ok: age !== null && age >= 18 && age <= 65, value: age ? `${age} years` : "Not set" },
                  { label: "Weight ≥ 45kg", ok: !!form.weight && parseInt(form.weight) >= 45, value: form.weight ? `${form.weight}kg` : "Not set" },
                  { label: "Phone 10 digits", ok: form.phone.length === 10, value: `${form.phone.length}/10` },
                  { label: "Email provided", ok: !!form.email && /\S+@\S+\.\S+/.test(form.email), value: form.email ? "✓" : "Not set" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className={`font-medium ${item.ok ? "text-green-600" : "text-red-500"}`}>
                      {item.ok ? "✅" : "❌"} {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Availability */}
            <Card className="p-5">
              <p className="text-sm font-semibold mb-3">Availability</p>
              <div className="flex gap-2">
                <Button size="sm" className={`flex-1 ${form.available ? "blood-type-badge border-0 text-white" : ""}`}
                  variant={form.available ? "default" : "outline"}
                  onClick={() => setForm({ ...form, available: true })}>Available</Button>
                <Button size="sm" className="flex-1"
                  variant={!form.available ? "default" : "outline"}
                  onClick={() => setForm({ ...form, available: false })}>Unavailable</Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
