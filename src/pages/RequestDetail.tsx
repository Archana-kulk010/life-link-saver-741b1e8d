import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, MapPin, Phone, Heart, Clock, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/Navbar";
import { DonorMap, MapDonor } from "@/components/DonorMap";
import { supabase } from "@/integrations/supabase/client";
import { compatibleDonorTypes, distanceKm, URGENCY_STYLES, BloodType } from "@/lib/blood";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type RequestRow = {
  id: string;
  patient_name: string;
  blood_type_needed: BloodType;
  hospital_name: string;
  hospital_location: string;
  latitude: number | null;
  longitude: number | null;
  urgency: "critical" | "urgent" | "normal";
  search_radius_km: number;
  status: "pending" | "matched" | "completed" | "cancelled";
  contact_phone: string | null;
  units_needed: number;
  notes: string | null;
  created_at: string;
  requester_user_id: string | null;
};

const RequestDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [req, setReq] = useState<RequestRow | null>(null);
  const [donors, setDonors] = useState<MapDonor[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanding, setExpanding] = useState(false);
  const [secondsUntilExpand, setSecondsUntilExpand] = useState<number | null>(null);

  const compatibleTypes = useMemo(
    () => (req ? compatibleDonorTypes(req.blood_type_needed) : []),
    [req],
  );

  useEffect(() => {
    if (!id) return;
    load();
    const channel = supabase
      .channel(`req-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "emergency_requests", filter: `id=eq.${id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const load = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from("emergency_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) toast.error(error.message);
    if (data) setReq(data as RequestRow);
    setLoading(false);
  };

  // Load matching donors within current radius
  useEffect(() => {
    if (!req || compatibleTypes.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("donors")
        .select("id, name, blood_type, city, latitude, longitude, last_donation_date")
        .in("blood_type", compatibleTypes)
        .eq("is_available", true);
      if (!data) return;
      const eligible = data.filter((d) => {
        if (!d.last_donation_date) return true;
        return Date.now() - new Date(d.last_donation_date).getTime() >= 90 * 24 * 60 * 60 * 1000;
      });
      const within =
        req.latitude != null && req.longitude != null
          ? eligible.filter(
              (d) =>
                d.latitude != null &&
                d.longitude != null &&
                distanceKm(req.latitude!, req.longitude!, d.latitude, d.longitude) <= req.search_radius_km,
            )
          : eligible;
      setDonors(
        within
          .filter((d) => d.latitude != null && d.longitude != null)
          .map((d) => ({
            id: d.id,
            name: d.name,
            blood_type: d.blood_type as string,
            city: d.city,
            latitude: d.latitude as number,
            longitude: d.longitude as number,
          })),
      );
    })();
  }, [req, compatibleTypes]);

  // Auto-expand timer (15 min from creation, then 25km)
  useEffect(() => {
    if (!req || req.status !== "pending" || req.search_radius_km >= 25) {
      setSecondsUntilExpand(null);
      return;
    }
    const expandAt = new Date(req.created_at).getTime() + 15 * 60 * 1000;

    const tick = async () => {
      const remaining = Math.max(0, Math.floor((expandAt - Date.now()) / 1000));
      setSecondsUntilExpand(remaining);
      if (remaining === 0 && !expanding) {
        setExpanding(true);
        const { error } = await supabase
          .from("emergency_requests")
          .update({ search_radius_km: 25 })
          .eq("id", req.id);
        if (!error) toast.info("Search radius auto-expanded to 25 km");
        setExpanding(false);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [req, expanding]);

  const markCompleted = async () => {
    if (!req) return;
    const { error } = await supabase
      .from("emergency_requests")
      .update({ status: "completed" })
      .eq("id", req.id);
    if (error) toast.error(error.message);
    else toast.success("Marked as fulfilled. Thank you!");
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (!req) {
    return (
      <>
        <Navbar />
        <div className="container px-4 py-12 text-center">
          <h1 className="text-2xl font-bold">Request not found</h1>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </>
    );
  }

  const isOwner = user?.id === req.requester_user_id;
  const urgency = URGENCY_STYLES[req.urgency];

  return (
    <>
      <Navbar />
      <div className="container px-4 py-8">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <Card className="p-6 shadow-card md:p-8">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge className={urgency.cls}>{urgency.label}</Badge>
                    {req.status === "pending" && (
                      <Badge variant="outline" className="border-warning text-warning">
                        Pending
                      </Badge>
                    )}
                    {req.status === "matched" && (
                      <Badge className="bg-success text-success-foreground">Matched</Badge>
                    )}
                    {req.status === "completed" && (
                      <Badge className="bg-success text-success-foreground">
                        <CheckCircle2 className="h-3 w-3" /> Completed
                      </Badge>
                    )}
                    {req.status === "cancelled" && <Badge variant="destructive">Cancelled</Badge>}
                  </div>
                  <h1 className="text-2xl font-bold md:text-3xl">{req.patient_name}</h1>
                  <p className="text-sm text-muted-foreground">
                    Posted {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase text-muted-foreground">Blood needed</div>
                  <div className="text-3xl font-extrabold text-primary">{req.blood_type_needed}</div>
                  <div className="text-xs text-muted-foreground">{req.units_needed} unit(s)</div>
                </div>
              </div>

              <div className="grid gap-4 border-t pt-4 md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <div className="font-semibold">{req.hospital_name}</div>
                    <div className="text-sm text-muted-foreground">{req.hospital_location}</div>
                  </div>
                </div>
                {req.contact_phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <div className="font-semibold">Contact</div>
                      <a href={`tel:${req.contact_phone}`} className="text-sm text-primary hover:underline">
                        {req.contact_phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {req.notes && (
                <div className="mt-4 rounded-lg bg-secondary p-4 text-sm">
                  <strong>Notes:</strong> {req.notes}
                </div>
              )}

              {isOwner && req.status !== "completed" && req.status !== "cancelled" && (
                <div className="mt-6 flex gap-2 border-t pt-4">
                  <Button onClick={markCompleted}>
                    <CheckCircle2 className="h-4 w-4" /> Mark fulfilled
                  </Button>
                </div>
              )}
            </Card>

            {req.latitude != null && req.longitude != null && (
              <Card className="mt-6 overflow-hidden p-2 shadow-card">
                <DonorMap
                  center={{ lat: req.latitude, lng: req.longitude }}
                  donors={donors}
                  radiusKm={req.search_radius_km}
                  hospital={{ lat: req.latitude, lng: req.longitude, label: req.hospital_name }}
                  height="420px"
                />
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card className="p-5 shadow-card">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Heart className="h-4 w-4 text-primary" /> Matching donors
              </div>
              <div className="text-3xl font-bold">{donors.length}</div>
              <p className="text-xs text-muted-foreground">
                Available within {req.search_radius_km} km
              </p>
            </Card>

            {req.status === "pending" && secondsUntilExpand !== null && req.search_radius_km < 25 && (
              <Card className="border-warning/30 bg-warning/5 p-5 shadow-card">
                <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-warning">
                  <Clock className="h-4 w-4" /> Auto-expand in
                </div>
                <div className="text-2xl font-bold">
                  {Math.floor(secondsUntilExpand / 60)}:{String(secondsUntilExpand % 60).padStart(2, "0")}
                </div>
                <p className="text-xs text-muted-foreground">
                  If unmatched, search will expand to 25 km automatically.
                </p>
              </Card>
            )}

            <Card className="bg-gradient-soft p-5 shadow-card">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <AlertCircle className="h-4 w-4 text-primary" /> Compatible donor types
              </div>
              <div className="flex flex-wrap gap-1.5">
                {compatibleTypes.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default RequestDetail;
