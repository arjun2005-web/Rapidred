import { useState, useMemo, useEffect } from "react";
import { useSocket } from "@/hooks/usesocket";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search, Heart, Droplets, MapPin, Phone,
  User, Filter, Loader2, Plus, X, CheckCircle
} from "lucide-react";

interface Donor {
  id: string; name: string; bloodType: string;
  location: string; phone: string; lastDonation: string | null;
  available: boolean; totalDonations: number; age: number | null;
}

const bloodTypes     = ["All","A+","A-","B+","B-","AB+","AB-","O+","O-"];
const bloodTypesForm = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];

function maskPhone(phone: string) {
  if (!phone || phone.length < 6) return phone;
  return `${phone.slice(0,5)}****${phone.slice(-2)}`;
}

function getDonorEligibility(lastDonation: string | null): { eligible: boolean; daysLeft: number } {
  if (!lastDonation) return { eligible: true, daysLeft: 0 };
  const last = new Date(lastDonation);
  const diffDays = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 56) return { eligible: false, daysLeft: Math.ceil(56 - diffDays) };
  return { eligible: true, daysLeft: 0 };
}

function DonorCard({ donor }: { donor: Donor }) {
  const eligibility = getDonorEligibility(donor.lastDonation);
  return (
    <Card className="p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-primary/20">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold">{donor.name}</h4>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-3 h-3" /><span>{donor.location}</span>
            </div>
          </div>
        </div>
        <div className="blood-type-badge px-3 py-1.5 rounded-lg">
          <span className="text-white font-bold text-sm">{donor.bloodType}</span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Phone className="w-4 h-4 text-muted-foreground" />
          <span className="font-mono tracking-wide">{maskPhone(donor.phone)}</span>
          <span className="text-xs text-muted-foreground">(masked for privacy)</span>
        </div>
        {donor.lastDonation && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Droplets className="w-4 h-4" />
            <span>Last donation: {donor.lastDonation}</span>
          </div>
        )}
        {donor.totalDonations > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Heart className="w-4 h-4" />
            <span>{donor.totalDonations} total donations</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <Badge variant={donor.available ? "default" : "secondary"}
            className={donor.available && eligibility.eligible ? "bg-green-500/10 text-green-600 border-green-200" : "bg-amber-500/10 text-amber-600 border-amber-200"}>
            {!donor.available ? "Unavailable" : eligibility.eligible ? "Available" : `Eligible in ${eligibility.daysLeft} days`}
          </Badge>
        </div>
        {donor.available && eligibility.eligible ? (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" className="gap-1 hover:border-primary/50 text-xs"
              onClick={() => { if(window.confirm(`📞 Call ${donor.name}?\n${donor.phone}\n\nClick OK to call now.`)) window.open(`tel:${donor.phone}`); }}>
              <Phone className="w-3 h-3" /> Call
            </Button>
            <Button size="sm" className="gap-1 blood-type-badge border-0 text-white text-xs"
              onClick={() => window.open(`https://wa.me/91${donor.phone}?text=Hi ${donor.name}, I need ${donor.bloodType} blood urgently. Can you help?`, "_blank")}>
              WhatsApp
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" disabled className="text-xs opacity-50">Unavailable</Button>
        )}
      </div>
    </Card>
  );
}

export default function Home() {
  const [, setLocation]                       = useLocation();
  const [searchQuery, setSearchQuery]         = useState("");
  const [selectedBloodType, setSelectedBloodType] = useState("All");
  const [donors, setDonors]                   = useState<Donor[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState("");
  const [showForm, setShowForm]               = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [saved, setSaved]                     = useState(false);
  const [formError, setFormError]             = useState("");

  const emptyForm = {
    name: "", bloodType: "O+", phone: "", email: "",
    location: "", dob: "", weight: "", lastDonation: "", available: true,
  };
  const [form, setForm] = useState(emptyForm);

  const { on } = useSocket();
  useEffect(() => {
    const off = on("donor:new", () => { fetchDonors(); });
    return () => { off(); };
  }, [on]);

  const fetchDonors = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/donors");
      if (!res.ok) throw new Error("Failed");
      setDonors(await res.json());
    } catch { setError("Could not load donors. Please try again."); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchDonors(); }, []);

  const filteredDonors = useMemo(() => donors.filter(d => {
    const matchSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchBlood = selectedBloodType === "All" || d.bloodType === selectedBloodType;
    return matchSearch && matchBlood;
  }), [searchQuery, selectedBloodType, donors]);

  const donorsByBloodType = useMemo(() => {
    const grouped: Record<string, Donor[]> = {};
    filteredDonors.forEach(d => {
      if (!grouped[d.bloodType]) grouped[d.bloodType] = [];
      grouped[d.bloodType].push(d);
    });
    return grouped;
  }, [filteredDonors]);

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError("Please enter your full name"); return; }
    if (!/^\d{10}$/.test(form.phone)) { setFormError("Phone must be exactly 10 digits"); return; }
    if (!form.location.trim()) { setFormError("Please enter your location"); return; }
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) { setFormError("Please enter a valid email"); return; }
    if (!form.dob) { setFormError("Date of birth is required"); return; }
    const birth = new Date(form.dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    if (age < 18) { setFormError("You must be at least 18 years old"); return; }
    if (age > 65) { setFormError("Donors must be 65 years or younger"); return; }
    if (!form.weight || parseInt(form.weight) < 45) { setFormError("Minimum weight to donate is 45kg"); return; }

    setFormError("");
    setSaving(true);
    try {
      const res = await fetch("/api/donors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, bloodType: form.bloodType,
          phone: form.phone, email: form.email,
          location: form.location, dob: form.dob,
          age, weight: parseInt(form.weight),
          lastDonation: form.lastDonation || null,
          available: form.available,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setSaved(true);
      setForm(emptyForm);
      await fetchDonors();
      setTimeout(() => { setSaved(false); setShowForm(false); }, 2000);
    } catch { setFormError("Failed to register. Please try again."); }
    finally { setSaving(false); }
  };

  const isLoggedIn = !!localStorage.getItem("userId");
  const userRole   = localStorage.getItem("userRole");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl blood-type-badge flex items-center justify-center">
                <Droplets className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Rapid<span className="text-gradient">Red</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {isLoggedIn && userRole === "donor" && (
                <Button variant="outline" size="sm" onClick={() => setLocation("/profile")}>
                  My Profile
                </Button>
              )}
              {isLoggedIn && (
                <Button variant="outline" size="sm"
                  onClick={() => { localStorage.clear(); setLocation("/"); }}>
                  Logout
                </Button>
              )}
              <Button className="blood-type-badge border-0 text-white gap-2 hover:opacity-90"
                onClick={() => { setForm(emptyForm); setFormError(""); setShowForm(true); }}>
                <Plus className="w-4 h-4" /> Become a Donor
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <section className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Rapid <span className="text-gradient">Response</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4">
            Connecting donors instantly during emergencies. Fast. Reliable. Life-saving.
          </p>
          {!loading && (
            <p className="text-sm text-muted-foreground">
              <span className="text-gradient font-bold text-lg">{donors.length}</span> registered donors ready to help
            </p>
          )}
        </section>

        {/* Register Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <Card className="w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl blood-type-badge flex items-center justify-center">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Register as Donor</h3>
                    <p className="text-xs text-muted-foreground">Your info will appear on the donor list</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setForm(emptyForm); setFormError(""); }}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Eligibility notice */}
              <div className="mb-4 p-3 rounded-xl bg-blue-500/5 border border-blue-200 text-xs text-blue-700">
                ✅ Eligibility: Age 18–65 · Weight ≥ 45kg · Valid 10-digit phone
              </div>

              {saved ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <h4 className="text-lg font-bold">Registered Successfully!</h4>
                  <p className="text-muted-foreground text-sm">You now appear on the donor list 🎉</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Name */}
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Full Name *</label>
                      <Input placeholder="e.g. Arjun Kumar" value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        className="rounded-xl border-2 focus:border-primary/50" />
                    </div>

                    {/* Blood Type */}
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Blood Type *</label>
                      <div className="flex flex-wrap gap-2">
                        {bloodTypesForm.map(bt => (
                          <button key={bt} onClick={() => setForm({ ...form, bloodType: bt })}
                            className={`w-14 h-14 rounded-xl font-bold text-sm transition-all border-2
                              ${form.bloodType === bt ? "blood-type-badge text-white border-transparent shadow-md scale-105" : "border-border hover:border-primary/50"}`}>
                            {bt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Phone Number * <span className="text-xs">(10 digits)</span></label>
                      <Input placeholder="e.g. 9876543210" value={form.phone} maxLength={10}
                        onChange={e => setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, "").slice(0,10) })}
                        className="rounded-xl border-2 focus:border-primary/50" />
                      <p className="text-xs text-muted-foreground mt-1">{form.phone.length}/10 digits</p>
                    </div>

                    {/* Location */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Location *</label>
                      <Input placeholder="e.g. Chennai, Tamil Nadu" value={form.location}
                        onChange={e => setForm({ ...form, location: e.target.value })}
                        className="rounded-xl border-2 focus:border-primary/50" />
                    </div>

                    {/* Email */}
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Email Address * <span className="text-xs">(for urgent alerts)</span></label>
                      <Input type="email" placeholder="you@gmail.com" value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        className="rounded-xl border-2 focus:border-primary/50" />
                    </div>

                    {/* DOB */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Date of Birth * <span className="text-xs">(18–65 yrs)</span></label>
                      <Input type="date"
                        max={new Date(new Date().setFullYear(new Date().getFullYear()-18)).toISOString().split("T")[0]}
                        min={new Date(new Date().setFullYear(new Date().getFullYear()-65)).toISOString().split("T")[0]}
                        value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })}
                        className="rounded-xl border-2 focus:border-primary/50" />
                    </div>

                    {/* Weight */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Weight (kg) * <span className="text-xs">(min 45kg)</span></label>
                      <Input type="number" placeholder="e.g. 65" min="45" value={form.weight}
                        onChange={e => setForm({ ...form, weight: e.target.value })}
                        className="rounded-xl border-2 focus:border-primary/50" />
                    </div>

                    {/* Last Donation */}
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Last Donation Date <span className="text-xs">(optional)</span></label>
                      <Input type="date" value={form.lastDonation}
                        max={new Date().toISOString().split("T")[0]}
                        onChange={e => setForm({ ...form, lastDonation: e.target.value })}
                        className="rounded-xl border-2 focus:border-primary/50" />
                    </div>

                    {/* Availability */}
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Availability</label>
                      <div className="flex gap-2">
                        <Button size="sm" className={`flex-1 ${form.available ? "blood-type-badge border-0 text-white" : ""}`}
                          variant={form.available ? "default" : "outline"}
                          onClick={() => setForm({ ...form, available: true })}>Available</Button>
                        <Button size="sm" className="flex-1"
                          variant={!form.available ? "default" : "outline"}
                          onClick={() => setForm({ ...form, available: false })}>Unavailable</Button>
                      </div>
                    </div>
                  </div>

                  {formError && <p className="text-red-500 text-sm mb-4 font-medium">⚠️ {formError}</p>}

                  <Button className="w-full h-12 blood-type-badge border-0 text-white text-base font-semibold hover:opacity-90 gap-2"
                    onClick={handleSave} disabled={saving}>
                    {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Registering...</>
                     : <><Heart className="w-4 h-4" />Register as Donor</>}
                  </Button>
                </>
              )}
            </Card>
          </div>
        )}

        {/* Search */}
        <section className="mb-8">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input type="search" placeholder="Search by name or location..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg rounded-2xl border-2 border-border focus:border-primary/50" />
            </div>
          </div>
        </section>

        {/* Blood Type Filter */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Filter by Blood Type</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {bloodTypes.map(type => (
              <Button key={type} size="sm" variant={selectedBloodType === type ? "default" : "outline"}
                onClick={() => setSelectedBloodType(type)}
                className={`rounded-full px-4 transition-all ${selectedBloodType === type ? "blood-type-badge border-0 text-white" : "hover:border-primary/50"}`}>
                {type}
              </Button>
            ))}
          </div>
        </section>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-muted-foreground text-sm">Loading donors...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <Card className="p-12 text-center">
            <Droplets className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-semibold mb-2">Something went wrong</h4>
            <p className="text-muted-foreground">{error}</p>
            <Button className="mt-4 blood-type-badge border-0 text-white" onClick={fetchDonors}>Try Again</Button>
          </Card>
        )}

        {/* Donors List */}
        {!loading && !error && (
          <>
            {selectedBloodType === "All" ? (
              Object.keys(donorsByBloodType).length === 0 ? (
                <Card className="p-12 text-center">
                  <Droplets className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-lg font-semibold mb-2">No donors registered yet</h4>
                  <p className="text-muted-foreground mb-4">Be the first to register as a donor!</p>
                  <Button className="blood-type-badge border-0 text-white gap-2" onClick={() => setShowForm(true)}>
                    <Heart className="w-4 h-4" /> Register as Donor
                  </Button>
                </Card>
              ) : (
                Object.entries(donorsByBloodType).map(([bloodType, groupDonors]) => (
                  <section key={bloodType} className="mb-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl blood-type-badge flex items-center justify-center">
                        <span className="text-white font-bold text-sm">{bloodType}</span>
                      </div>
                      <h3 className="text-xl font-semibold">Blood Type {bloodType}</h3>
                      <Badge variant="secondary" className="ml-auto">
                        {groupDonors.length} donor{groupDonors.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {groupDonors.map(donor => <DonorCard key={donor.id} donor={donor} />)}
                    </div>
                  </section>
                ))
              )
            ) : (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl blood-type-badge flex items-center justify-center">
                    <span className="text-white font-bold">{selectedBloodType}</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Blood Type {selectedBloodType}</h3>
                    <p className="text-muted-foreground">{filteredDonors.length} donor{filteredDonors.length !== 1 ? "s" : ""} found</p>
                  </div>
                </div>
                {filteredDonors.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Droplets className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h4 className="text-lg font-semibold mb-2">No donors found</h4>
                    <p className="text-muted-foreground">No {selectedBloodType} donors registered yet</p>
                    <Button className="mt-4 blood-type-badge border-0 text-white gap-2" onClick={() => setShowForm(true)}>
                      <Heart className="w-4 h-4" /> Be the first!
                    </Button>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredDonors.map(donor => <DonorCard key={donor.id} donor={donor} />)}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-primary" />
            <span className="font-semibold">RapidRed</span>
          </div>
          <p className="text-sm text-muted-foreground">Connecting donors with those in need. Every donation saves lives.</p>
        </div>
      </footer>
    </div>
  );
}