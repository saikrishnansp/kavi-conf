import { useMemo, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  Download, 
  Clock, 
  Calendar, 
  Building,
  TrendingUp
} from "lucide-react";
import { roomsApi } from "@/lib/api/rooms";
import { bookingsApi } from "@/lib/api/bookings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageLoader from "@/components/ui/PageLoader";

const RoomUtilizationChart = lazy(() => import("./RoomUtilizationChart"));

const DashboardTab = () => {
  // Fetch Rooms
  const { data: roomsData, isLoading: isLoadingRooms } = useQuery({
    queryKey: ['rooms-all'],
    queryFn: () => roomsApi.getAll(false)
  });

  // Fetch All Bookings
  const { data: bookingsData, isLoading: isLoadingBookings } = useQuery({
    queryKey: ['bookings-all'],
    queryFn: () => bookingsApi.getAll({ all_bookings: true, limit: 1000 })
  });

  const metrics = useMemo(() => {
    const rooms = roomsData?.items || [];
    const bookings = bookingsData?.items || [];

    if (!rooms.length) return null;

    const utilization = rooms.map(room => {
      const roomBookings = bookings.filter(b => b.room_id === room.room_id);
      const totalHours = roomBookings.reduce((sum, b) => {
        const duration = (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / (1000 * 60 * 60);
        return sum + Math.max(0, duration);
      }, 0);

      return {
        room_id: room.room_id,
        capacity: room.capacity,
        totalBookings: roomBookings.length,
        totalHours: Number(totalHours.toFixed(1)),
        avgDuration: roomBookings.length > 0 ? Number((totalHours / roomBookings.length).toFixed(1)) : 0
      };
    });

    const mostPopularRoom = [...utilization].sort((a, b) => b.totalBookings - a.totalBookings)[0];
    const totalHoursBooked = utilization.reduce((sum, u) => sum + u.totalHours, 0);

    return {
      utilization,
      totalRooms: rooms.length,
      totalBookings: bookings.length,
      totalHoursBooked: Number(totalHoursBooked.toFixed(1)),
      mostPopularRoom
    };
  }, [roomsData, bookingsData]);

  const handleExportCSV = () => {
    if (!metrics) return;

    const headers = ["Room ID", "Capacity", "Total Bookings", "Total Hours Booked", "Avg Duration (Hrs)"];
    const rows = metrics.utilization.map(u => [
      u.room_id,
      u.capacity,
      u.totalBookings,
      u.totalHours,
      u.avgDuration
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `room_utilization_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoadingRooms || isLoadingBookings) {
    return <PageLoader />;
  }

  if (!metrics) {
    return (
      <div className="text-center py-10">
        <p className="font-retro text-muted-foreground">No data available to display dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-pixel text-lg text-primary flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            UTILIZATION ANALYTICS
          </h2>
          <p className="font-retro text-sm text-muted-foreground">
            Overview of room performance and booking trends
          </p>
        </div>
        <Button 
          variant="outline" 
          className="font-retro gap-2 border-primary/50 hover:bg-primary/10"
          onClick={handleExportCSV}
        >
          <Download className="h-4 w-4" />
          EXPORT CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="font-retro text-xs text-muted-foreground flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" />
              TOTAL ROOMS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-pixel text-2xl text-foreground">{metrics.totalRooms}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-secondary/20">
          <CardHeader className="pb-2">
            <CardTitle className="font-retro text-xs text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-secondary" />
              TOTAL BOOKINGS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-pixel text-2xl text-foreground">{metrics.totalBookings}</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-accent/20">
          <CardHeader className="pb-2">
            <CardTitle className="font-retro text-xs text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              TOTAL HOURS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-pixel text-2xl text-foreground">{metrics.totalHoursBooked}h</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="font-retro text-xs text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              MOST POPULAR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-pixel text-lg text-foreground truncate" title={metrics.mostPopularRoom?.room_id}>
              {metrics.mostPopularRoom?.room_id || "N/A"}
            </p>
            <p className="font-retro text-[10px] text-muted-foreground">
              {metrics.mostPopularRoom?.totalBookings || 0} BOOKINGS
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Utilization Bar Chart */}
      <Card className="border-primary/20 bg-card/30">
        <CardHeader>
          <CardTitle className="font-pixel text-sm text-primary">BOOKINGS PER ROOM</CardTitle>
        </CardHeader>
        <CardContent className="h-[350px] min-h-[350px] w-full">
          <div className="h-full w-full mt-4 font-retro">
            <Suspense fallback={<div className="h-full w-full flex items-center justify-center font-retro text-muted-foreground animate-pulse">Loading utilization chart...</div>}>
              <RoomUtilizationChart data={metrics.utilization} />
            </Suspense>
          </div>
        </CardContent>
      </Card>

      {/* Utilization Table */}
      <Card className="border-primary/20 bg-card/30">
        <CardHeader>
          <CardTitle className="font-pixel text-sm text-primary">ROOM UTILIZATION DETAILS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-retro border-collapse">
              <thead>
                <tr className="border-b border-primary/20 text-muted-foreground text-xs uppercase">
                  <th className="py-3 px-4">Room ID</th>
                  <th className="py-3 px-4">Capacity</th>
                  <th className="py-3 px-4">Bookings</th>
                  <th className="py-3 px-4">Total Hours</th>
                  <th className="py-3 px-4">Avg Duration</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {metrics.utilization.map((row) => (
                  <tr key={row.room_id} className="border-b border-primary/10 hover:bg-primary/5 transition-colors">
                    <td className="py-3 px-4 font-pixel text-xs">{row.room_id}</td>
                    <td className="py-3 px-4">{row.capacity} PAX</td>
                    <td className="py-3 px-4">{row.totalBookings}</td>
                    <td className="py-3 px-4">{row.totalHours}h</td>
                    <td className="py-3 px-4">{row.avgDuration}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardTab;
