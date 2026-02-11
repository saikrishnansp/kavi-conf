import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

interface AuthFormProps {
  mode: "login" | "register";
  onSubmit: (data: AuthFormData) => Promise<void>;
  isLoading?: boolean;
}

export interface AuthFormData {
  email: string;
  password: string;
  employee_id?: string;
  full_name?: string;
   position?: string;
}

export function AuthForm({ mode, onSubmit, isLoading = false }: AuthFormProps) {
  const [formData, setFormData] = useState<AuthFormData>({
    email: "",
    password: "",
    employee_id: "",
    full_name: "",
    position: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (mode === "register") {
      const employeeIdPattern = /^(DATS-|TEST[-_])\d+$|^ADMIN\d+$/;
      if (!formData.employee_id) {
        newErrors.employee_id = "Employee ID is required";
      } else if (!employeeIdPattern.test(formData.employee_id)) {
        newErrors.employee_id = "Format: DATS-123, TEST-123, TEST_123, or ADMIN123";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      await onSubmit(formData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <Card className="w-full max-w-md mx-auto neon-box">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-xl sm:text-2xl">
          {mode === "login" ? "ACCESS TERMINAL" : "NEW USER INIT"}
        </CardTitle>
        <CardDescription className="font-retro text-xl text-muted-foreground">
          {mode === "login"
            ? "Enter your credentials to access the system"
            : "Create your account to start booking rooms"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="full_name" className="font-retro text-lg">
                  FULL NAME
                </Label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.full_name}
                  onChange={handleChange}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee_id" className="font-retro text-lg">
                  EMPLOYEE ID *
                </Label>
                <Input
                  id="employee_id"
                  name="employee_id"
                  type="text"
                  value={formData.employee_id}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className={errors.employee_id ? "border-destructive" : ""}
                />
                {errors.employee_id && (
                  <p className="text-xs text-destructive mt-1 font-retro italic">
                    {errors.employee_id}
                  </p>
                )}
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="font-retro text-lg">
              EMAIL ADDRESS *
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="user@company.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="position" className="font-retro text-lg">
                POSITION / JOB TITLE *
              </Label>
              <Input
                id="position"
                name="position"
                type="text"
                placeholder="Software Engineer, Manager..."
                value={formData.position}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password" className="font-retro text-lg">
              PASSWORD *
            </Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                disabled={isLoading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
            {mode === "register" && (
              <p className="text-xs text-muted-foreground font-retro">
                MIN 8 CHARACTERS
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="neon"
            size="lg"
            className="w-full mt-6"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                PROCESSING...
              </>
            ) : mode === "login" ? (
              "LOGIN"
            ) : (
              "CREATE ACCOUNT"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="font-retro text-lg text-muted-foreground">
            {mode === "login" ? (
              <>
                NEW USER?{" "}
                <Link
                  to="/register"
                  className="text-primary hover:text-primary/80 underline underline-offset-4"
                >
                  REGISTER HERE
                </Link>
              </>
            ) : (
              <>
                ALREADY REGISTERED?{" "}
                <Link
                  to="/login"
                  className="text-primary hover:text-primary/80 underline underline-offset-4"
                >
                  LOGIN HERE
                </Link>
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
