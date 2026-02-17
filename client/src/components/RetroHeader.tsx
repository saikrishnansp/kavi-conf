import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, User, LogIn, Menu, X, Shield, LogOut, Zap } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface RetroHeaderProps {
  userName?: string;
}

export function RetroHeader({ userName }: RetroHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated, logout } = useAuth();
  const isAdmin = user?.is_admin || false;

  const handleLogout = () => {
    logout();
    toast({
      title: "SESSION ENDED",
      description: "You have been logged out successfully.",
    });
    navigate("/login");
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b-4 border-primary bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to={isAuthenticated ? "/agenda" : "/"} className="flex items-center gap-3 group">
            <div className="relative">
              <Zap className="h-8 w-8 text-primary animate-glow-pulse" />
              <div className="absolute inset-0 blur-md bg-primary/30 rounded-full" />
            </div>
            <span className="font-pixel text-3xl sm:text-2xl text-primary neon-glow hidden sm:block">
              Kavi Conf
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {isAuthenticated && (
              <>
                <Link
                  to="/agenda"
                  className="font-retro text-xl text-foreground hover:text-primary transition-colors relative group"
                >
                  AGENDA
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                </Link>
                <Link
                  to="/book"
                  className="font-retro text-xl text-foreground hover:text-primary transition-colors relative group"
                >
                  BOOK
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                </Link>
                <Link
                  to="/rooms"
                  className="font-retro text-xl text-foreground hover:text-primary transition-colors relative group"
                >
                  ROOMS
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                </Link>
              </>
            )}
          </nav>

          {/* Auth Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <Button variant="neon-pink" size="sm" asChild>
                    <Link to="/admin">
                      <Shield className="h-4 w-4 mr-2" />
                      ADMIN
                    </Link>
                  </Button>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link to="/profile">
                    <User className="h-4 w-4 mr-2" />
                    PROFILE
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  EXIT
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">
                    <LogIn className="h-4 w-4 mr-2" />
                    LOGIN
                  </Link>
                </Button>
                <Button variant="neon" size="sm" asChild>
                  <Link to="/register">REGISTER</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <nav className="flex flex-col gap-4">
              {isAuthenticated && (
                <>
                  <Link
                    to="/agenda"
                    className="font-retro text-xl text-foreground hover:text-primary transition-colors py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    AGENDA
                  </Link>
                  <Link
                    to="/book"
                    className="font-retro text-xl text-foreground hover:text-primary transition-colors py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    BOOK
                  </Link>
                  <Link
                    to="/rooms"
                    className="font-retro text-xl text-foreground hover:text-primary transition-colors py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    ROOMS
                  </Link>
                </>
              )}
              <div className="flex flex-col gap-2 pt-4 border-t border-border">
                {isAuthenticated ? (
                  <>
                    {isAdmin && (
                      <Button variant="neon-pink" asChild>
                        <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                          <Shield className="h-4 w-4 mr-2" />
                          ADMIN
                        </Link>
                      </Button>
                    )}
                    <Button variant="outline" asChild>
                      <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                        <User className="h-4 w-4 mr-2" />
                        PROFILE
                      </Link>
                    </Button>
                    <Button variant="ghost" onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      EXIT
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" asChild>
                      <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                        <LogIn className="h-4 w-4 mr-2" />
                        LOGIN
                      </Link>
                    </Button>
                    <Button variant="neon" asChild>
                      <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                        REGISTER
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
