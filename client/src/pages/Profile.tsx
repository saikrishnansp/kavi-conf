import { useState, useEffect } from "react";
import { RetroBackground } from "@/components/RetroBackground";
import { RetroHeader } from "@/components/RetroHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, Save, Loader2, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api/auth";

const Profile = () => {
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState({
    email: "",
    full_name: "",
    position: "",
    employee_id: "",
  });

  useEffect(() => {
    if (user) {
      setProfile({
        email: user.email,
        full_name: user.full_name || "",
        position: user.position || "",
        employee_id: user.employee_id,
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authApi.updateMe({
        email: profile.email,
        full_name: profile.full_name,
        position: profile.position,
      });
      await refreshUser();
      toast({ title: "PROFILE UPDATED", description: "Your changes have been saved" });
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "UPDATE FAILED",
        description: error.response?.data?.detail || "Could not update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => setIsEditing(true);

  return (
    <RetroBackground>
      <RetroHeader userName={user?.full_name || user?.email || ""} />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <User className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="font-pixel text-base">USER PROFILE</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-retro text-lg">EMPLOYEE ID</Label>
                  <Input name="employee_id" value={profile.employee_id} onChange={handleChange} disabled className="opacity-70" />
                  <p className="text-xs text-muted-foreground font-retro">CANNOT BE CHANGED</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-retro text-lg">EMAIL *</Label>
                  <Input name="email" type="email" value={profile.email} onChange={handleChange} required disabled={!isEditing} className={!isEditing ? "opacity-90" : ""} />
                </div>
                <div className="space-y-2">
                  <Label className="font-retro text-lg">FULL NAME</Label>
                  <Input name="full_name" value={profile.full_name} onChange={handleChange} placeholder="Your name" disabled={!isEditing} className={!isEditing ? "opacity-90" : ""} />
                </div>
                <div className="space-y-2">
                  <Label className="font-retro text-lg">POSITION</Label>
                  <Input name="position" value={profile.position} onChange={handleChange} placeholder="Your job title" disabled={!isEditing} className={!isEditing ? "opacity-90" : ""} />
                </div>
                {isEditing ? (
                  <Button type="submit" variant="neon" size="lg" className="w-full mt-6" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />SAVING...</> : <><Save className="h-4 w-4 mr-2" />SAVE PROFILE</>}
                  </Button>
                ) : (
                  <Button type="button" variant="neon" size="lg" className="w-full mt-6" onClick={handleEdit}>
                    <Pencil className="h-4 w-4 mr-2" />EDIT PROFILE
                  </Button>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </RetroBackground>
  );
};

export default Profile;
