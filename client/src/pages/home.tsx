import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Heart, Droplets, MapPin, Phone, User, Filter } from "lucide-react";

interface Donor {
  id: number;
  name: string;
  bloodType: string;
  location: string;
  phone: string;
  lastDonation: string;
  available: boolean;
}

const mockDonors: Donor[] = [
  { id: 1, name: "Sarah Johnson", bloodType: "A+", location: "New York, NY", phone: "(555) 123-4567", lastDonation: "2 months ago", available: true },
  { id: 2, name: "Michael Chen", bloodType: "O-", location: "Los Angeles, CA", phone: "(555) 234-5678", lastDonation: "3 months ago", available: true },
  { id: 3, name: "Emily Davis", bloodType: "B+", location: "Chicago, IL", phone: "(555) 345-6789", lastDonation: "1 month ago", available: false },
  { id: 4, name: "James Wilson", bloodType: "AB+", location: "Houston, TX", phone: "(555) 456-7890", lastDonation: "4 months ago", available: true },
  { id: 5, name: "Maria Garcia", bloodType: "O+", location: "Phoenix, AZ", phone: "(555) 567-8901", lastDonation: "2 weeks ago", available: true },
  { id: 6, name: "David Brown", bloodType: "A-", location: "Philadelphia, PA", phone: "(555) 678-9012", lastDonation: "5 months ago", available: true },
  { id: 7, name: "Lisa Anderson", bloodType: "B-", location: "San Antonio, TX", phone: "(555) 789-0123", lastDonation: "3 months ago", available: false },
  { id: 8, name: "Robert Martinez", bloodType: "AB-", location: "San Diego, CA", phone: "(555) 890-1234", lastDonation: "1 month ago", available: true },
  { id: 9, name: "Jennifer Taylor", bloodType: "O+", location: "Dallas, TX", phone: "(555) 901-2345", lastDonation: "6 weeks ago", available: true },
  { id: 10, name: "William Thomas", bloodType: "A+", location: "San Jose, CA", phone: "(555) 012-3456", lastDonation: "2 months ago", available: true },
  { id: 11, name: "Amanda White", bloodType: "O-", location: "Austin, TX", phone: "(555) 111-2222", lastDonation: "4 weeks ago", available: true },
  { id: 12, name: "Christopher Lee", bloodType: "B+", location: "Jacksonville, FL", phone: "(555) 222-3333", lastDonation: "3 months ago", available: true },
];

const bloodTypes = ["All", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBloodType, setSelectedBloodType] = useState("All");

  const filteredDonors = useMemo(() => {
    return mockDonors.filter((donor) => {
      const matchesSearch = 
        donor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        donor.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesBloodType = selectedBloodType === "All" || donor.bloodType === selectedBloodType;
      return matchesSearch && matchesBloodType;
    });
  }, [searchQuery, selectedBloodType]);

  const donorsByBloodType = useMemo(() => {
    const grouped: Record<string, Donor[]> = {};
    filteredDonors.forEach((donor) => {
      if (!grouped[donor.bloodType]) {
        grouped[donor.bloodType] = [];
      }
      grouped[donor.bloodType].push(donor);
    });
    return grouped;
  }, [filteredDonors]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl blood-type-badge flex items-center justify-center">
                <Droplets className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight" data-testid="text-app-title">
                Blood<span className="text-gradient">Link</span>
              </h1>
            </div>
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-become-donor">
              <Heart className="w-4 h-4" />
              Become a Donor
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Find <span className="text-gradient">Blood Donors</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Connect with generous donors in your community. Every drop counts in saving lives.
          </p>
        </section>

        <section className="mb-10">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 text-lg rounded-2xl border-2 border-border focus:border-primary/50 transition-colors"
                data-testid="input-search"
              />
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Filter by Blood Type</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {bloodTypes.map((type) => (
              <Button
                key={type}
                variant={selectedBloodType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedBloodType(type)}
                className={`rounded-full px-4 transition-all ${
                  selectedBloodType === type 
                    ? "blood-type-badge border-0" 
                    : "hover:border-primary/50"
                }`}
                data-testid={`button-filter-${type.toLowerCase().replace('+', 'pos').replace('-', 'neg')}`}
              >
                {type}
              </Button>
            ))}
          </div>
        </section>

        {selectedBloodType === "All" ? (
          Object.entries(donorsByBloodType).map(([bloodType, donors]) => (
            <section key={bloodType} className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl blood-type-badge flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{bloodType}</span>
                </div>
                <h3 className="text-xl font-semibold" data-testid={`text-blood-type-${bloodType.toLowerCase().replace('+', 'pos').replace('-', 'neg')}`}>
                  Blood Type {bloodType}
                </h3>
                <Badge variant="secondary" className="ml-auto">
                  {donors.length} donor{donors.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {donors.map((donor) => (
                  <DonorCard key={donor.id} donor={donor} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl blood-type-badge flex items-center justify-center">
                <span className="text-white font-bold">{selectedBloodType}</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold">Blood Type {selectedBloodType}</h3>
                <p className="text-muted-foreground">
                  {filteredDonors.length} donor{filteredDonors.length !== 1 ? "s" : ""} available
                </p>
              </div>
            </div>
            {filteredDonors.length === 0 ? (
              <Card className="p-12 text-center">
                <Droplets className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-semibold mb-2">No donors found</h4>
                <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDonors.map((donor) => (
                  <DonorCard key={donor.id} donor={donor} />
                ))}
              </div>
            )}
          </section>
        )}

        {Object.keys(donorsByBloodType).length === 0 && selectedBloodType === "All" && (
          <Card className="p-12 text-center">
            <Droplets className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-semibold mb-2">No donors found</h4>
            <p className="text-muted-foreground">Try adjusting your search criteria</p>
          </Card>
        )}
      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-primary" />
              <span className="font-semibold">BloodLink</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Connecting donors with those in need. Every donation saves lives.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function DonorCard({ donor }: { donor: Donor }) {
  return (
    <Card 
      className="p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-primary/20"
      data-testid={`card-donor-${donor.id}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold" data-testid={`text-donor-name-${donor.id}`}>{donor.name}</h4>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span data-testid={`text-donor-location-${donor.id}`}>{donor.location}</span>
            </div>
          </div>
        </div>
        <div className="blood-type-badge px-3 py-1.5 rounded-lg">
          <span className="text-white font-bold text-sm" data-testid={`text-donor-blood-type-${donor.id}`}>{donor.bloodType}</span>
        </div>
      </div>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Phone className="w-4 h-4 text-muted-foreground" />
          <span data-testid={`text-donor-phone-${donor.id}`}>{donor.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Droplets className="w-4 h-4" />
          <span>Last donation: {donor.lastDonation}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <Badge 
          variant={donor.available ? "default" : "secondary"}
          className={donor.available ? "bg-green-500/10 text-green-600 border-green-200" : ""}
          data-testid={`badge-donor-status-${donor.id}`}
        >
          {donor.available ? "Available" : "Unavailable"}
        </Badge>
        <Button 
          size="sm" 
          variant="outline" 
          className="gap-1"
          disabled={!donor.available}
          data-testid={`button-contact-${donor.id}`}
        >
          <Phone className="w-3 h-3" />
          Contact
        </Button>
      </div>
    </Card>
  );
}
