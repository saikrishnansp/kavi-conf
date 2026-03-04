import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RetroBackground } from "@/components/RetroBackground";
import { RetroHeader } from "@/components/RetroHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Users,
  Settings,
  User,
  CheckCircle,
} from "lucide-react";
import { roomsApi } from "@/lib/api/rooms";
import { bookingsApi } from "@/lib/api/bookings";
import { usersApi } from "@/lib/api/users";
import { useAuth } from "@/contexts/AuthContext";
import { UsersTab } from "./components/UsersTab";
import { RoomsTab } from "./components/RoomsTab";
import { BookingsTab } from "./components/BookingsTab";

const Admin = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("bookings");

  const getLocalDateString = (date: Date) => {
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const todaysDateStr = getLocalDateString(new Date());

  // Stats Queries
  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.getAll(false)
  });

  const { data: todaysBookingsData } = useQuery({
    queryKey: ['bookings', { all_bookings: true, date: todaysDateStr }],
    queryFn: () => bookingsApi.getAll({ 
      all_bookings: true, 
      date: todaysDateStr,
      limit: 1
    })
  });

  const { data: usersCountData } = useQuery({
    queryKey: ['usersCount'],
    queryFn: () => usersApi.getCount()
  });

  if (!user?.is_admin) {
    return (
      <RetroBackground>
        <RetroHeader />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-pixel text-2xl text-destructive mb-4">ACCESS DENIED</h1>
          <p className="font-retro text-lg">You do not have administrative privileges to access this dashboard.</p>
        </div>
      </RetroBackground>
    );
  }

  const rooms = roomsData?.items || [];
  const activeRooms = rooms.filter(r => r.is_active);
  const totalEmployees = usersCountData?.total_employees || 0;

  return (
    <RetroBackground>
      <RetroHeader />

      <main className="container mx-auto px-4 py-6 lg:py-10">
        {/* Admin Dashboard Header */}
        <div className="mb-8">
          <h1 className="font-pixel text-xl sm:text-2xl text-primary neon-glow mb-2">
            ADMIN DASHBOARD
          </h1>
          <p className="font-retro text-lg text-muted-foreground">
            Manage rooms, bookings, and system settings
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-sm bg-primary/20">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-retro text-2xl text-foreground">{todaysBookingsData?.total || 0}</p>
                <p className="font-retro text-sm text-muted-foreground">TODAY'S BOOKINGS</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-sm bg-secondary/20">
                <Users className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="font-retro text-2xl text-foreground">{totalEmployees}</p>
                <p className="font-retro text-sm text-muted-foreground">TOTAL EMPLOYEES</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-sm bg-accent/20">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-retro text-2xl text-foreground">{rooms.length}</p>
                <p className="font-retro text-sm text-muted-foreground">TOTAL ROOMS</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-sm bg-primary/20">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-retro text-2xl text-foreground">{activeRooms.length}</p>
                <p className="font-retro text-sm text-muted-foreground">ROOMS ONLINE</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-xl grid-cols-3">
            <TabsTrigger value="bookings" className="gap-2">
              <Calendar className="h-4 w-4" />
              ALL BOOKINGS
            </TabsTrigger>
            <TabsTrigger value="rooms" className="gap-2">
              <Settings className="h-4 w-4" />
              ROOM SETTINGS
            </TabsTrigger>
            <TabsTrigger value="employees" className="gap-2">
              <User className="h-4 w-4" />
              EMPLOYEES
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <BookingsTab />
          </TabsContent>

          <TabsContent value="rooms">
            <RoomsTab />
          </TabsContent>

          <TabsContent value="employees">
            <UsersTab />
          </TabsContent>
        </Tabs>
      </main>
    </RetroBackground>
  );
};

export default Admin;