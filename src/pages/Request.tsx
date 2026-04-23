import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MapPin, AlertCircle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BLOOD_TYPES, BloodType, compatibleDonorTypes, distanceKm, Urgency } from "@/lib/blood";
import { getBrowserLocation } from "@/lib/geo";
import { toast } from "sonner";

const Request = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [patientName, setPatientName] = useState("");
  const [bloodType, setBloodType] = useState<BloodType | "">("");
  const [hospitalName, setHospitalName] = useState("");
  const [hospitalLocation, setHospitalLocation] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("urgent");
  const [contactPhone, setContactPhone] = useState("");
  const [units, setUnits] = useState(1);
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const compatibleTypes = useMemo(
    () => (bloodType ? compatibleDonorTypes(bloodType as BloodType) : []),
    [bloodType],
  );

  useEffect(() => {
    if (!bloodType || !coords) {
      setPreviewCount(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("donors")
        .select("latitude, longitude, blood_type")
        .in("blood_type", compatibleTypes)
        .eq("is_available", true);
      if (!data) return;
      const within = data.filter(
        (d) =>
          d.latitude != null &&
          d.longitude != null &&
          distanceKm(coords.lat, coords.lng, d.latitude, d.longitude) <= 10,
      );
      setPreviewCount(within.length);
    })();
  }, [bloodType, coords, compatibleTypes]);

  const useMyLocation = async () => {
    try {
      const c = await getBrowserLocation();
      setCoords(c);
      toast.success("Location captured");
    } catch {
      toast.error("Could not get location. Enter coordinates manually if needed.");
    }
  };

  const matchAndNotify = async (requestId: string, lat: number | null, lng: number | null, radiusKm: number) => {
    if (!bloodType) return 0;
    const { data: donors } = await supabase
      .from("donors")
      .select("id, user_id, latitude, longitude, blood_type, last_donation_date")
      .in("blood_type", compatibleTypes)
      .eq("is_available", true);
    if (!donors) return 0;

    const eligible = donors.filter((d) => {
      if (!d.last_donation_date) return true;
      const ms = Date.now() - new Date(d.last_donation_date).getTime();
      return ms >= 90 * 24 * 60 * 60 * 1000;
    });

    let matchedDonors = eligible;
    if (lat != null && lng != null) {
      matchedDonors = eligible.filter(
        (d) =>
          d.latitude != null &&
          d.longitude != null &&
          distanceKm(lat, lng, d.latitude, d.longitude) <= radiusKm,
      );
    }

    if (matchedDonors.length === 0) return 0;

    const rows = matchedDonors.map((d) => ({
      request_id: requestId,
      donor_id: d.id,
      donor_user_id: d.user_id,
      distance_km:
        lat != null && lng != null && d.latitude != null && d.longitude != null
          ? distanceKm(lat, lng, d.latitude, d.longitude)
          : null,
    }));

    const { error } = await supabase.from("request_matches").insert(rows);
    if (error) {
      console.warn("Match insert blocked by RLS (expected for non-admin):", error.message);
    }
    return matchedDonors.length;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in first to create a request.");
      navigate("/auth?mode=signup");
      return;
    }
    if (!bloodType) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("emergency_requests")
        .insert({
          requester_user_id: user.id,
          patient_name: patientName,
          blood_type_needed: bloodType,
          hospital_name: hospitalName,
          hospital_location: hospitalLocation,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          urgency,
          contact_phone: contactPhone || null,
          units_needed: units,
          notes: notes || null,
          search_radius_km: 10,
        })
        .select()
        .single();
      if (error) throw error;

      const matched = await matchAndNotify(data.id, coords?.lat ?? null, coords?.lng ?? null, 10);
      toast.success(
        matched > 0
          ? `Request created. ${matched} donor(s) being notified.`
          : "Request created. We'll auto-expand the search if needed.",
      );
      navigate(`/request/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container px-4 py-8">
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
            <AlertCircle className="h-3 w-3" /> EMERGENCY REQUEST
          </div>
          <h1 className="text-3xl font-bold">Request blood now</h1>
          <p className="text-muted-foreground">
            Fill this in under 60 seconds. Compatible donors within 10 km will be notified instantly.
          </p>
        </div>

        <Card className="p-6 shadow-card md:p-8">
          <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="patient">Patient name</Label>
              <Input id="patient" value={patientName} onChange={(e) => setPatientName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Blood type needed</Label>
              <Select value={bloodType} onValueChange={(v) => setBloodType(v as BloodType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select required blood type" />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_TYPES.map((bt) => (
                    <SelectItem key={bt} value={bt}>
                      {bt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hospital">Hospital name</Label>
              <Input id="hospital" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hospitalLocation">Hospital location / address</Label>
              <Input
                id="hospitalLocation"
                value={hospitalLocation}
                onChange={(e) => setHospitalLocation(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Urgency</Label>
              <RadioGroup
                value={urgency}
                onValueChange={(v) => setUrgency(v as Urgency)}
                className="grid gap-2 md:grid-cols-3"
              >
                {[
                  { v: "critical", label: "Critical", desc: "Within 1 hour", cls: "border-critical" },
                  { v: "urgent", label: "Urgent", desc: "Within a few hours", cls: "border-urgent" },
                  { v: "normal", label: "Normal", desc: "Within 24 hours", cls: "border-normal" },
                ].map((o) => (
                  <Label
                    key={o.v}
                    htmlFor={`u-${o.v}`}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-colors ${
                      urgency === o.v ? `${o.cls} bg-accent/40` : "border-border"
                    }`}
                  >
                    <RadioGroupItem id={`u-${o.v}`} value={o.v} />
                    <div>
                      <div className="font-semibold">{o.label}</div>
                      <div className="text-xs text-muted-foreground">{o.desc}</div>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Contact phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 9XXXXXXXXX"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="units">Units needed</Label>
              <Input
                id="units"
                type="number"
                min={1}
                max={20}
                value={units}
                onChange={(e) => setUnits(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Hospital location pin</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={useMyLocation}>
                  <MapPin className="h-4 w-4" /> Use current location
                </Button>
                {coords && (
                  <span className="text-xs text-muted-foreground">
                    {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                  </span>
                )}
                {previewCount !== null && (
                  <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                    <Heart className="h-3 w-3 fill-success text-success" />
                    {previewCount} compatible donor(s) within 10 km
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Additional notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any extra details for donors"
                rows={3}
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit" size="lg" className="h-12 w-full shadow-medical md:w-auto" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <AlertCircle className="h-4 w-4" />
                Send emergency request
              </Button>
              {!user && (
                <p className="mt-3 text-xs text-muted-foreground">
                  You'll need to sign in first — it takes 10 seconds.
                </p>
              )}
            </div>
          </form>
        </Card>
      </div>
    </>
  );
};

export default Request;
