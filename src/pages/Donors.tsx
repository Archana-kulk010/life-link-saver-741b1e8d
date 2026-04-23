import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MapPin, Search, Heart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Navbar } from "@/components/Navbar";
import { DonorMap, MapDonor } from "@/components/DonorMap";
import { supabase } from "@/integrations/supabase/client";
import { BLOOD_TYPES, BloodType, daysUntilEligible, isEligible } from "@/lib/blood";
import { getBrowserLocation } from "@/lib/geo";
import { toast } from "sonner";

type DonorRow = {
  id: string;
  name: string;
  phone: string;
  blood_type: BloodType;
  city: string;
  latitude: number | null;
  longitude: number | null;
  last_donation_date: string | null;
  is_available: boolean;
  is_rare: boolean;
};

const Donors = () => {
  const [donors, setDonors] = useState<DonorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bloodFilter, setBloodFilter] = useState<string>("all");
  const [city, setCity] = useState("");
  const [showRareOnly, setShowRareOnly] = useState(false);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("donors")
        .select("*")
        .eq("is_available", true)
        .order("created_at", { ascending: false });
      if (data) setDonors(data as DonorRow[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return donors.filter((d) => {
      if (bloodFilter !== "all" && d.blood_type !== bloodFilter) return false;
      if (showRareOnly && !d.is_rare) return false;
      if (city && !d.city.toLowerCase().includes(city.toLowerCase())) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!d.name.toLowerCase().includes(q) && !d.city.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [donors, search, bloodFilter, city, showRareOnly]);

  const mapDonors: MapDonor[] = filtered
    .filter((d) => d.latitude != null && d.longitude != null)
    .map((d) => ({
      id: d.id,
      name: d.name,
      blood_type: d.blood_type,
      city: d.city,
      latitude: d.latitude!,
      longitude: d.longitude!,
    }));

  const useMyLocation = async () => {
    try {
      const c = await getBrowserLocation();
      setCenter(c);
    } catch {
      toast.error("Could not get location");
    }
  };

  // Default map center: India centroid if no location
  const mapCenter = center ?? (mapDonors[0] ? { lat: mapDonors[0].latitude, lng: mapDonors[0].longitude } : { lat: 20.5937, lng: 78.9629 });

  return (
    <>
      <Navbar />
      <div className="container px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Find donors near you</h1>
          <p className="text-muted-foreground">
            Browse {donors.length} registered donor{donors.length !== 1 ? "s" : ""}.
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6 p-4 shadow-card">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or city"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={bloodFilter} onValueChange={setBloodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Blood type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All blood types</SelectItem>
                {BLOOD_TYPES.map((bt) => (
                  <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
            <Button
              variant={showRareOnly ? "default" : "outline"}
              onClick={() => setShowRareOnly((s) => !s)}
            >
              <Sparkles className="h-4 w-4" /> Rare only
            </Button>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* Map */}
          <Card className="overflow-hidden p-2 shadow-card">
            <div className="mb-2 flex items-center justify-between px-2 pt-2">
              <span className="text-sm font-semibold">Donor map</span>
              <Button size="sm" variant="ghost" onClick={useMyLocation}>
                <MapPin className="h-4 w-4" /> Center on me
              </Button>
            </div>
            <DonorMap center={mapCenter} donors={mapDonors} height="500px" />
          </Card>

          {/* List */}
          <div>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <Card className="p-8 text-center shadow-card">
                <Heart className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">No donors match your filters.</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link to="/auth?mode=signup">Be the first donor</Link>
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered.map((d) => {
                  const eligible = isEligible(d.last_donation_date);
                  const days = daysUntilEligible(d.last_donation_date);
                  return (
                    <Card key={d.id} className="p-4 shadow-card transition-shadow hover:shadow-medical">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{d.name}</span>
                            {d.is_rare && (
                              <Badge className="bg-gradient-hero text-primary-foreground">
                                <Sparkles className="h-3 w-3" /> Rare
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {d.city}
                            </span>
                            <span className={eligible ? "text-success" : "text-warning"}>
                              {eligible ? "Eligible now" : `Eligible in ${days}d`}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">{d.blood_type}</div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Donors;
