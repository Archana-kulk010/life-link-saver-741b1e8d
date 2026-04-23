import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BLOOD_TYPES, BloodType, isRare } from "@/lib/blood";
import { getBrowserLocation } from "@/lib/geo";
import { toast } from "sonner";

const Auth = () => {
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialMode = params.get("mode") === "signup" ? "signup" : "signin";
  const [tab, setTab] = useState<"signin" | "signup">(initialMode);

  // Shared
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Sign-up extras
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bloodType, setBloodType] = useState<BloodType | "">("");
  const [city, setCity] = useState("");
  const [lastDonationDate, setLastDonationDate] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Silently fetch geolocation in the background for donor sign-up
  useEffect(() => {
    getBrowserLocation()
      .then((c) => setCoords(c))
      .catch(() => {
        /* silent — user provides city as fallback */
      });
  }, []);

  // Redirect signed-in users to dashboard ONLY when they're on the sign-in tab.
  // We allow signed-in users to remain on the sign-up tab so they can register
  // additional donors from the same device.
  useEffect(() => {
    if (!authLoading && user && tab === "signin") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate, tab]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (!bloodType) {
      toast.error("Please select a blood type.");
      return;
    }
    setLoading(true);
    try {
      // Try signup. If the email is already registered, fall back to sign-in
      // so multiple donor profiles can be created against the same account.
      let userId: string | null = null;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });

      if (signUpError) {
        // Email already used → try signing in with provided password
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signUpError;
        userId = signInData.user?.id ?? null;
      } else {
        userId = signUpData.user?.id ?? null;
      }

      if (!userId) throw new Error("Could not establish a user session.");

      // Insert donor profile (allows multiple donors per device/account)
      const { error: donorError } = await supabase.from("donors").insert({
        user_id: userId,
        name: fullName,
        phone,
        blood_type: bloodType,
        city,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        last_donation_date: lastDonationDate || null,
        is_available: true,
        is_rare: isRare(bloodType as BloodType),
      });
      if (donorError) throw donorError;

      toast.success(`${fullName} registered as a donor!`);

      // Reset sign-up form so another donor can be added immediately
      setFullName("");
      setPhone("");
      setBloodType("");
      setCity("");
      setLastDonationDate("");
      setEmail("");
      setPassword("");

      navigate("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-soft px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-hero shadow-medical">
            <Heart className="h-5 w-5 fill-primary-foreground text-primary-foreground" />
          </div>
          <div>
            <div className="text-lg font-bold">RaktSetu</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Blood Network
            </div>
          </div>
        </Link>

        <Card className="p-6 shadow-card md:p-8">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* SIGN IN */}
            <TabsContent value="signin" className="mt-6">
              <h1 className="mb-2 text-2xl font-bold">Welcome back</h1>
              <p className="mb-6 text-sm text-muted-foreground">
                Sign in to manage your donor profile and respond to requests.
              </p>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="h-11 w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Sign in
                </Button>
              </form>
            </TabsContent>

            {/* SIGN UP */}
            <TabsContent value="signup" className="mt-6">
              <h1 className="mb-2 text-2xl font-bold">Become a donor</h1>
              <p className="mb-6 text-sm text-muted-foreground">
                Join thousands of donors saving lives every day.
              </p>
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full name</Label>
                  <Input
                    id="signup-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone number</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="+91 9XXXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    maxLength={20}
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
                          {bt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-city">City / Location</Label>
                  <Input
                    id="signup-city"
                    placeholder="e.g. Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-last">Last donation date (optional)</Label>
                  <Input
                    id="signup-last"
                    type="date"
                    value={lastDonationDate}
                    onChange={(e) => setLastDonationDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <Button type="submit" className="h-11 w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Register as donor
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Need to request blood urgently?{" "}
          <Link to="/request" className="font-medium text-primary hover:underline">
            Submit a request without an account
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default Auth;
