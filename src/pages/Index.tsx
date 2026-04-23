import { Link } from "react-router-dom";
import { Heart, AlertCircle, MapPin, Users, Clock, Shield, ChevronRight, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [stats, setStats] = useState({ donors: 0, requests: 0, rare: 0 });

  useEffect(() => {
    (async () => {
      const [d, r, rare] = await Promise.all([
        supabase.from("donors").select("*", { count: "exact", head: true }),
        supabase.from("emergency_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("donors").select("*", { count: "exact", head: true }).eq("is_rare", true),
      ]);
      setStats({
        donors: d.count ?? 0,
        requests: r.count ?? 0,
        rare: rare.count ?? 0,
      });
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-soft">
        <div className="container px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
              <Activity className="h-3.5 w-3.5" />
              Real-time emergency blood network
            </div>
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight md:text-6xl">
              Every drop counts.
              <br />
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                Every minute matters.
              </span>
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
              RaktSetu connects patients in critical need with nearby blood donors —
              instantly. Register today, or request blood for an emergency in under 60 seconds.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-14 w-full px-8 text-base shadow-medical pulse-ring sm:w-auto">
                <Link to="/request">
                  <AlertCircle className="h-5 w-5" />
                  Emergency Blood Request
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-14 w-full px-8 text-base sm:w-auto">
                <Link to="/auth?mode=signup">
                  <Heart className="h-5 w-5" />
                  Become a Donor
                </Link>
              </Button>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-4 border-t border-border pt-8">
              <div>
                <div className="text-2xl font-bold text-primary md:text-3xl">{stats.donors}</div>
                <div className="text-xs text-muted-foreground md:text-sm">Registered Donors</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary md:text-3xl">{stats.requests}</div>
                <div className="text-xs text-muted-foreground md:text-sm">Active Requests</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary md:text-3xl">{stats.rare}</div>
                <div className="text-xs text-muted-foreground md:text-sm">Rare Type Heroes</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container px-4 py-16">
        <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">How RaktSetu works</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Heart,
              title: "Register",
              text: "Sign up as a donor in seconds. Add your blood type, city, and last donation date.",
            },
            {
              icon: MapPin,
              title: "We Match",
              text: "When someone needs blood, we instantly find compatible donors within 10 km.",
            },
            {
              icon: Clock,
              title: "Auto-Expand",
              text: "If no donor responds in 15 minutes, the search radius automatically widens to 25 km.",
            },
          ].map((s, i) => (
            <Card key={i} className="p-6 shadow-card transition-shadow hover:shadow-medical">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
                <s.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* RARE BLOOD CALLOUT */}
      <section className="container px-4 pb-16">
        <Card className="overflow-hidden border-primary/20 bg-gradient-hero p-8 text-primary-foreground shadow-medical md:p-12">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                <Shield className="h-3.5 w-3.5" /> RARE BLOOD REGISTRY
              </div>
              <h3 className="mb-3 text-2xl font-bold md:text-3xl">Bombay blood group?</h3>
              <p className="mb-4 max-w-xl text-primary-foreground/90">
                Less than 1 in 10,000 people have it. Your registration could be the only hope
                for someone in crisis. Join our rare blood registry today.
              </p>
            </div>
            <Button asChild size="lg" variant="secondary" className="h-12">
              <Link to="/auth?mode=signup">
                Register now <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-secondary/30">
        <div className="container px-4 py-8 text-center text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2 font-semibold text-foreground">
            <Heart className="h-4 w-4 fill-primary text-primary" /> RaktSetu
          </div>
          <p className="mt-2">A bridge between donors and lives. Built with care.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
