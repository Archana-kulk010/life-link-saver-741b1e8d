import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Users, AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Navbar } from "@/components/Navbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { URGENCY_STYLES } from "@/lib/blood";
import { toast } from "sonner";

type ReqRow = {
  id: string;
  patient_name: string;
  blood_type_needed: string;
  hospital_name: string;
  urgency: "critical" | "urgent" | "normal";
  status: "pending" | "matched" | "completed" | "cancelled";
  created_at: string;
  search_radius_km: number;
};

type DonorRow = {
  id: string;
  name: string;
  phone: string;
  blood_type: string;
  city: string;
  is_available: boolean;
  is_rare: boolean;
  created_at: string;
};

const AdminInner = () => {
  const [requests, setRequests] = useState<ReqRow[]>([]);
  const [donors, setDonors] = useState<DonorRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [r, d] = await Promise.all([
        supabase.from("emergency_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("donors").select("*").order("created_at", { ascending: false }),
      ]);
      if (r.data) setRequests(r.data as ReqRow[]);
      if (d.data) setDonors(d.data as DonorRow[]);
      setLoading(false);
    })();
  }, []);

  const setStatus = async (id: string, status: ReqRow["status"]) => {
    const { error } = await supabase.from("emergency_requests").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
      toast.success(`Marked ${status}`);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = {
    pending: requests.filter((r) => r.status === "pending").length,
    matched: requests.filter((r) => r.status === "matched").length,
    completed: requests.filter((r) => r.status === "completed").length,
    rare: donors.filter((d) => d.is_rare).length,
  };

  return (
    <div className="container px-4 py-8">
      <h1 className="mb-1 text-3xl font-bold">Admin Dashboard</h1>
      <p className="mb-6 text-muted-foreground">Oversee all donors and emergency requests.</p>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {[
          { label: "Pending", value: stats.pending, icon: AlertCircle, cls: "text-warning" },
          { label: "Matched", value: stats.matched, icon: Users, cls: "text-primary" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, cls: "text-success" },
          { label: "Rare donors", value: stats.rare, icon: Sparkles, cls: "text-primary" },
        ].map((s) => (
          <Card key={s.label} className="p-5 shadow-card">
            <div className="flex items-center gap-3">
              <s.icon className={`h-5 w-5 ${s.cls}`} />
              <div className="text-xs uppercase text-muted-foreground">{s.label}</div>
            </div>
            <div className="mt-2 text-3xl font-bold">{s.value}</div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Requests ({requests.length})</TabsTrigger>
          <TabsTrigger value="donors">Donors ({donors.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4">
          <Card className="overflow-hidden shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Blood</TableHead>
                  <TableHead className="hidden md:table-cell">Hospital</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link to={`/request/${r.id}`} className="hover:underline">
                        {r.patient_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-bold text-primary">{r.blood_type_needed}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {r.hospital_name}
                    </TableCell>
                    <TableCell>
                      <Badge className={URGENCY_STYLES[r.urgency].cls}>{URGENCY_STYLES[r.urgency].label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === "completed" ? "default" : "outline"}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      {r.status !== "completed" && r.status !== "cancelled" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "completed")}>
                            ✓
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "cancelled")}>
                            ✕
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {requests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No requests yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="donors" className="mt-4">
          <Card className="overflow-hidden shadow-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Blood</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {donors.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      {d.name}
                      {d.is_rare && <Sparkles className="ml-2 inline h-3 w-3 text-primary" />}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-bold text-primary">{d.blood_type}</Badge>
                    </TableCell>
                    <TableCell>{d.city}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{d.phone}</TableCell>
                    <TableCell>
                      <Badge variant={d.is_available ? "default" : "secondary"}>
                        {d.is_available ? "Available" : "Unavailable"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
                {donors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No donors yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const Admin = () => (
  <>
    <Navbar />
    <ProtectedRoute adminOnly>
      <AdminInner />
    </ProtectedRoute>
  </>
);

export default Admin;
