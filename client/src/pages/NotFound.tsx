import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RetroBackground } from "@/components/RetroBackground";
import { RetroHeader } from "@/components/RetroHeader";
import { Home, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <RetroBackground>
      <RetroHeader />
      
      <main className="container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          {/* Glitchy 404 */}
          <div className="relative">
            <h1 className="font-pixel text-6xl sm:text-8xl text-primary neon-glow animate-pixel-shift">
              404
            </h1>
            <div className="absolute inset-0 font-pixel text-6xl sm:text-8xl text-secondary neon-glow-pink opacity-50 blur-sm animate-pixel-shift" style={{ animationDelay: "0.1s" }}>
              404
            </div>
          </div>

          {/* Error message */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-destructive/50 rounded-sm bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="font-retro text-xl text-destructive">
                ERROR: PAGE_NOT_FOUND
              </span>
            </div>
            
            <h2 className="font-pixel text-lg sm:text-xl text-foreground">
              SYSTEM MALFUNCTION
            </h2>
            
            <p className="font-retro text-2xl text-muted-foreground max-w-md mx-auto">
              The requested resource could not be located in the system database.
              Please verify your coordinates and try again.
            </p>
          </div>

          {/* Action button */}
          <Button variant="neon" size="xl" asChild>
            <Link to="/">
              <Home className="h-5 w-5 mr-2" />
              RETURN TO MAIN
            </Link>
          </Button>

          {/* Terminal-style decoration */}
          <div className="mt-12 p-4 border-2 border-border rounded-sm bg-card/50 text-left max-w-md mx-auto">
            <p className="font-retro text-lg text-muted-foreground">
              <span className="text-primary">&gt;</span> Attempting to resolve route...
            </p>
            <p className="font-retro text-lg text-muted-foreground">
              <span className="text-primary">&gt;</span> Route not found in registry
            </p>
            <p className="font-retro text-lg text-destructive">
              <span className="text-primary">&gt;</span> ERR_ROUTE_NOT_FOUND
            </p>
            <p className="font-retro text-lg text-muted-foreground animate-glow-pulse">
              <span className="text-primary">&gt;</span> _
            </p>
          </div>
        </div>
      </main>
    </RetroBackground>
  );
};

export default NotFound;
