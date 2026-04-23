import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Auth = () => {
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialMode = params.get("mode") === "signup" ? "signup" : "signin";
  const [tab, setTab] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate("/dashboard", { replace: true });
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "signup") {
        if (password.length < 8) {
          toast.error("Password must be at least 8 characters.");
          return;
        }
        const { error } = await signUp(email, password);
        if (error) throw error;
        toast.success("Account created! Complete your donor profile.");
        navigate("/dashboard");
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/dashboard");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
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

            <TabsContent value="signin" className="mt-6">
              <h1 className="mb-2 text-2xl font-bold">Welcome back</h1>
              <p className="mb-6 text-sm text-muted-foreground">
                Sign in to manage your donor profile and respond to requests.
              </p>
            </TabsContent>
            <TabsContent value="signup" className="mt-6">
              <h1 className="mb-2 text-2xl font-bold">Create account</h1>
              <p className="mb-6 text-sm text-muted-foreground">
                Join thousands of donors saving lives every day.
              </p>
            </TabsContent>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={tab === "signup" ? "new-password" : "current-password"}
                />
                {tab === "signup" && (
                  <p className="text-xs text-muted-foreground">At least 8 characters.</p>
                )}
              </div>
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {tab === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>
          </Tabs>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Need to request blood? You can{" "}
          <Link to="/request" className="font-medium text-primary hover:underline">
            create a request without an account
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

export default Auth;
