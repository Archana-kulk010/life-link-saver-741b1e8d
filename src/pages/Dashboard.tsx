import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MapPin, Heart, Calendar, Phone, Sparkles, ToggleRight } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BLOOD_TYPES, BloodType, daysUntilEligible, isEligible, isRare } from "@/lib/blood";
import { getBrowserLocation } from "@/lib/geo";
import { toast } from "sonner";

type Donor = {
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

type Match = {
  id: string;
  request_id: string;
  response: "pending" | "accepted" | "declined";
  notified_at: string;
  emergency_requests: {
    patient_name: string;
    blood_type_needed: string;
    hospital_name: string;
    hospital_location: string;
    urgency: string;
    contact_phone: string | null;
    status: string;
  } | null;
};

const DashboardInner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [donor, setDonor] = useState<Donor | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bloodType, setBloodType] = useState<BloodType | "">("");
  const [city, setCity] = useState("");
  const [lastDonation, setLastDonation] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    loadProfile();
    loadMatches();

    // Realtime: refresh matches when donor's matches change
    const channel = supabase
      .channel("donor-matches")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "request_matches", filter: `donor_user_id=eq.${user.id}` },
        () => loadMatches(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("donors")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) toast.error(error.message);
    if (data) {
      setDonor(data as Donor);
      setName(data.name);
      setPhone(data.phone);
      setBloodType(data.blood_type as BloodType);
      setCity(data.city);
      setLastDonation(data.last_donation_date ?? "");
      if (data.latitude && data.longitude) setCoords({ lat: data.latitude, lng: data.longitude });
    }
    setLoading(false);
  };

  const loadMatches = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("request_matches")
      .select(
        `id, request_id, response, notified_at,
         emergency_requests ( patient_name, blood_type_needed, hospital_name, hospital_location, urgency, contact_phone, status )`,
      )
      .eq("donor_user_id", user.id)
      .order("notified_at", { ascending: false });
    if (data) setMatches(data as unknown as Match[]);
  };

  const useMyLocation = async () => {
    try {
      const c = await getBrowserLocation();
      setCoords(c);
      toast.success("Location captured");
    } catch {
      toast.error("Could not get location. Please allow access.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !bloodType) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        name,
        phone,
        blood_type: bloodType,
        city,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        last_donation_date: lastDonation || null,
        is_rare: isRare(bloodType),
      };
      if (donor) {
        const { error } = await supabase.from("donors").update(payload).eq("id", donor.id);
        if (error) throw error;
        toast.success("Profile updated");
      } else {
        const { error } = await supabase.from("donors").insert(payload);
        if (error) throw error;
        toast.success("Welcome to RaktSetu! You're registered as a donor.");
      }
      await loadProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async () => {
    if (!donor) return;
    const next = !donor.is_available;
    const { error } = await supabase.from("donors").update({ is_available: next }).eq("id", donor.id);
    if (error) toast.error(error.message);
    else {
      setDonor({ ...donor, is_available: next });
      toast.success(next ? "You're now available" : "Marked unavailable");
    }
  };

  const respondMatch = async (matchId: string, response: "accepted" | "declined") => {
    const { error } = await supabase
      .from("request_matches")
      .update({ response, responded_at: new Date().toISOString() })
      .eq("id", matchId);
    if (error) toast.error(error.message);
    else {
      toast.success(response === "accepted" ? "Thank you! Hospital notified." : "Response recorded");
      // If accepted, mark request as matched
      if (response === "accepted") {
        const m = matches.find((x) => x.id === matchId);
        if (m) {
          await supabase
            .from("emergency_requests")
            .update({ status: "matched" })
            .eq("id", m.request_id);
        }
      }
      loadMatches();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const eligibleDays = daysUntilEligible(donor?.last_donation_date ?? null);
  const eligible = isEligible(donor?.last_donation_date ?? null);
  const pendingMatches = matches.filter((m) => m.response === "pending" && m.emergency_requests?.status === "pending");

  return (
    <div className="container px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Donor Dashboard</h1>
        <p className="text-muted-foreground">Manage your profile and respond to emergency requests.</p>
      </div>

      {donor && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Card className="p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Your blood type</div>
                <div className="text-2xl font-bold">{donor.blood_type}</div>
              </div>
            </div>
            {donor.is_rare && (
              <Badge className="mt-3 bg-gradient-hero text-primary-foreground">
                <Sparkles className="h-3 w-3" /> Rare type hero
              </Badge>
            )}
          </Card>
          <Card className="p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Eligibility</div>
                <div className={`text-lg font-bold ${eligible ? "text-success" : "text-warning"}`}>
                  {eligible ? "Ready to donate" : `${eligibleDays} days left`}
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent">
                <ToggleRight className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-xs uppercase text-muted-foreground">Availability</div>
                <div className="mt-1 flex items-center gap-2">
                  <Switch checked={donor.is_available} onCheckedChange={toggleAvailability} />
                  <span className="text-sm font-medium">
                    {donor.is_available ? "Available" : "Unavailable"}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Active matches */}
      {pendingMatches.length > 0 && (
        <Card className="mb-6 border-2 border-primary/30 bg-accent/40 p-6 shadow-medical">
          <h2 className="mb-4 text-xl font-bold text-primary">
            🩸 {pendingMatches.length} active emergency request{pendingMatches.length > 1 ? "s" : ""} for you
          </h2>
          <div className="space-y-3">
            {pendingMatches.map((m) => (
              <div key={m.id} className="rounded-lg border bg-background p-4">
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{m.emergency_requests?.patient_name}</div>
                    <div className="text-sm text-muted-foreground">
                      Needs <strong>{m.emergency_requests?.blood_type_needed}</strong> at{" "}
                      {m.emergency_requests?.hospital_name}, {m.emergency_requests?.hospital_location}
                    </div>
                  </div>
                  <Badge className={
                    m.emergency_requests?.urgency === "critical"
                      ? "bg-critical text-white"
                      : m.emergency_requests?.urgency === "urgent"
                      ? "bg-urgent text-white"
                      : "bg-normal text-white"
                  }>
                    {m.emergency_requests?.urgency}
                  </Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => respondMatch(m.id, "accepted")}>
                    I can donate
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => respondMatch(m.id, "declined")}>
                    Can't help
                  </Button>
                  {m.emergency_requests?.contact_phone && (
                    <Button size="sm" variant="ghost" asChild>
                      <a href={`tel:${m.emergency_requests.contact_phone}`}>
                        <Phone className="h-4 w-4" /> Call
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Profile form */}
      <Card className="p-6 shadow-card md:p-8">
        <h2 className="mb-1 text-xl font-bold">{donor ? "Your donor profile" : "Complete your registration"}</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          {donor
            ? "Keep your details up to date so we can reach you fast."
            : "Just a few details — you'll be ready to save lives."}
        </p>
        <form onSubmit={handleSave} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+91 9XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Blood type</Label>
            <Select value={bloodType} onValueChange={(v) => setBloodType(v as BloodType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your blood type" />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_TYPES.map((bt) => (
                  <SelectItem key={bt} value={bt}>
                    {bt === "Bombay" ? "Bombay (HH)" : bt} {isRare(bt as BloodType) && "✨ Rare"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City / Location</Label>
            <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastDonation">Last donation date (optional)</Label>
            <Input
              id="lastDonation"
              type="date"
              max={format(new Date(), "yyyy-MM-dd")}
              value={lastDonation}
              onChange={(e) => setLastDonation(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Location coordinates</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={useMyLocation}>
                <MapPin className="h-4 w-4" /> Use my location
              </Button>
              {coords && (
                <span className="text-xs text-muted-foreground">
                  {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </span>
              )}
            </div>
          </div>

          <div className="md:col-span-2">
            <Button type="submit" className="h-11 w-full md:w-auto" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {donor ? "Save changes" : "Register as donor"}
            </Button>
            {donor && (
              <Button
                type="button"
                variant="ghost"
                className="ml-2"
                onClick={() => navigate("/donors")}
              >
                View all donors
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
};

const Dashboard = () => (
  <>
    <Navbar />
    <ProtectedRoute>
      <DashboardInner />
    </ProtectedRoute>
  </>
);

export default Dashboard;
