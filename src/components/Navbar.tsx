import { Link, useLocation, useNavigate } from "react-router-dom";
import { Heart, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState } from "react";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/donors", label: "Find Donors" },
  { to: "/request", label: "Request Blood" },
  { to: "/dashboard", label: "Dashboard", auth: true },
  { to: "/admin", label: "Admin", admin: true },
];

export const Navbar = () => {
  const { user, isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const visible = navItems.filter(
    (i) => (!i.auth || user) && (!i.admin || isAdmin),
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero shadow-medical">
            <Heart className="h-5 w-5 fill-primary-foreground text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-bold tracking-tight">RaktSetu</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Blood Network
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {visible.map((i) => (
            <Link
              key={i.to}
              to={i.to}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname === i.to
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {i.label}
            </Link>
          ))}
          {user ? (
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </nav>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-1">
              {visible.map((i) => (
                <Link
                  key={i.to}
                  to={i.to}
                  onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-2.5 text-sm font-medium ${
                    location.pathname === i.to
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  }`}
                >
                  {i.label}
                </Link>
              ))}
              <div className="mt-3 border-t pt-3">
                {user ? (
                  <Button variant="outline" className="w-full" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" /> Sign out
                  </Button>
                ) : (
                  <Button asChild className="w-full">
                    <Link to="/auth" onClick={() => setOpen(false)}>
                      Sign in
                    </Link>
                  </Button>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};
