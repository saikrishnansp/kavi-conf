import { RetroBackground } from "@/components/RetroBackground";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authApi } from "@/lib/api/auth";
import { Eye, EyeOff, LogIn, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { verifyOtp, isLoading: authLoading, isAuthenticated } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/agenda");
    }
  }, [isAuthenticated, navigate]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "MISSING EMAIL",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await authApi.requestOtp(email);
      setStep("otp");
      toast({
        title: "OTP SENT",
        description: "Check the server console (mock email) for your 6-digit code.",
      });
    } catch (error: any) {
      toast({
        title: "REQUEST FAILED",
        description: error.response?.data?.detail || "Could not send OTP",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      toast({
        title: "MISSING OTP",
        description: "Please enter the 6-digit code",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await verifyOtp(email, otp);
      // AuthContext will handle redirect via useEffect
    } catch (error) {
      // Error handled in verifyOtp
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- NEW: Handle Google Login ---
  const handleGoogleLogin = () => {
    const googleLoginUrl = `${import.meta.env.VITE_API_URL}/auth/login/google?access_type=offline&prompt=consent`;
    window.location.href = googleLoginUrl;
  };

  const isLoading = isSubmitting || authLoading;

  return (
    <RetroBackground>
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <Zap className="h-8 w-8 text-primary animate-glow-pulse" />
              <span className="font-pixel text-3xl text-primary neon-glow">Kavi Conf</span>
            </div>
            <CardTitle className="font-pixel text-base">SYSTEM LOGIN</CardTitle>
          </CardHeader>
          <CardContent>
            {step === "email" ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-retro text-lg">EMAIL ADDRESS</Label>
                  <Input 
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                
                <Button 
                  type="submit" 
                  variant="neon" 
                  size="lg" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "SENDING..." : (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      SEND OTP
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-retro text-lg">ENTER 6-DIGIT OTP</Label>
                  <Input 
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    required
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground font-retro text-center">
                    Sent to {email}
                  </p>
                </div>
                
                <Button 
                  type="submit" 
                  variant="neon" 
                  size="lg" 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "VERIFYING..." : "VERIFY & LOGIN"}
                </Button>
                
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-xs font-retro"
                  onClick={() => setStep("email")}
                  disabled={isLoading}
                >
                  USE DIFFERENT EMAIL
                </Button>
              </form>
            )}

            <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground font-retro">OR</span>
              </div>
            </div>

            {/* --- UPDATED BUTTON --- */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full mt-4"
              onClick={handleGoogleLogin} 
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              SIGN IN WITH GOOGLE
            </Button>

            <div className="mt-4 text-center">
              <p className="font-retro text-lg text-muted-foreground">
                NEW USER?{" "}
                <a
                  href="/register"
                  className="text-primary hover:text-primary/80 underline underline-offset-4"
                >
                  REGISTER HERE
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </RetroBackground>
  );
};

export default Login;


