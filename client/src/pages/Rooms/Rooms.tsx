import {
  CancelBookingDialog,
  EditBookingDialog,
  TransferBookingDialog,
  type Booking as UIBooking,
} from "@/components/BookingManagementDialogs";
import { RetroBackground } from "@/components/RetroBackground";
import { RetroHeader } from "@/components/RetroHeader";
import { EditRoomDialog } from "@/components/RoomDialogs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { bookingsApi } from "@/lib/api/bookings";
import { roomsApi } from "@/lib/api/rooms";
import { timeSlots } from "@/lib/constants";
import { type Room } from "@/types/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endOfDay, startOfDay } from "date-fns";
import {
  BookOpen,
  Grid,
  List,
  Search,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageLoader from "@/components/ui/PageLoader";

// Import new split components
import { GridTab } from "./components/GridTab";
import { RoomsListTab } from "./components/RoomsListTab";
import { MyBookingsTab } from "./components/MyBookingsTab";
import { RoomWithBookings } from "./types";

const Rooms = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(); // Get current user
  const isAdmin = user?.is_admin || false;
  const queryClient = useQueryClient();

  const [state, setState] = useState(() => ({
    activeTab: location.state?.defaultTab || "grid",
    selectedDate: new Date(),
    selectedBooking: null as UIBooking | null,
    isEditBookingOpen: false,
    isCancelBookingOpen: false,
    isTransferBookingOpen: false,
    selectedRoom: null as Room | null,
    isEditRoomOpen: false,
    searchQuery: "",
    minCapacity: 0,
  }));

  const updateState = (updates: Partial<typeof state>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const {
    activeTab,
    selectedDate,
    selectedBooking,
    isEditBookingOpen,
    isCancelBookingOpen,
    isTransferBookingOpen,
    selectedRoom,
    isEditRoomOpen,
    searchQuery,
    minCapacity,
  } = state;

  useEffect(() => {
    if (location.state?.defaultTab) {
      updateState({ activeTab: location.state.defaultTab });
      // Clear state after reading it
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Mutations
  const cancelMutation = useMutation({
    mutationFn: bookingsApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["publicBookings"] });
      toast.error("BOOKING CANCELLED", {
        description: "Your booking has been cancelled.",
      });
    },
    onError: (err: any) => {
      toast.error("Error", {
        description: err.message,
      });
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: ({ roomId, data }: { roomId: string; data: Partial<Room> }) =>
      roomsApi.update(roomId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("ROOM UPDATED", {
        description: "The room has been updated successfully.",
      });
    },
    onError: (err: any) => {
      toast.error("Error", {
        description: err.message || "Failed to update room",
      });
    },
  });

  const getCurrentTimeSlot = () => {
    const now = new Date();
    const hours = now.getHours();
    return `${hours.toString().padStart(2, "0")}:00`;
  };

  const currentTime = getCurrentTimeSlot();

  const isSlotBooked = (room: RoomWithBookings, time: string) => {
    const toMinutes = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    const slotStartMin = toMinutes(time);
    const currentIndex = timeSlots.indexOf(time);
    const nextSlot = timeSlots[currentIndex + 1];
    const slotEndMin = nextSlot ? toMinutes(nextSlot) : slotStartMin + 60;

    return room.bookedSlots.find((slot) => {
      const startDate = new Date(slot.start);
      const endDate = new Date(slot.end);
      const bookingStartMin =
        startDate.getHours() * 60 + startDate.getMinutes();
      const bookingEndMin = endDate.getHours() * 60 + endDate.getMinutes();
      return bookingStartMin < slotEndMin && bookingEndMin > slotStartMin;
    });
  };

  const getRoomStatus = (room: RoomWithBookings) => {
    const currentBooking = isSlotBooked(room, currentTime);
    if (currentBooking) {
      return {
        status: "BOOKED",
        booking: currentBooking,
        color: "destructive" as const,
      };
    }
    return { status: "AVAILABLE", booking: null, color: "default" as const };
  };

  // Admin actions
  const handleEditRoom = (room: Room) => {
    updateState({ selectedRoom: room, isEditRoomOpen: true });
  };

  const handleSaveRoom = (roomId: string, data: any) => {
    updateRoomMutation.mutate({ roomId, data });
    updateState({ isEditRoomOpen: false });
  };

  // Booking management handlers
  const handleEditBooking = (booking: UIBooking) => {
    updateState({ selectedBooking: booking, isEditBookingOpen: true });
  };

  const updateMutation = useMutation({
    mutationFn: ({ bookingId, data }: { bookingId: number; data: any }) =>
      bookingsApi.update(bookingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["publicBookings"] });
      toast.success("BOOKING UPDATED", {
        description: "Your booking has been updated successfully.",
      });
      updateState({ isEditBookingOpen: false });
    },
    onError: (err: any) => {
      toast.error("Error", {
        description: err.message || "Failed to update booking",
      });
    },
  });

  const handleSaveBooking = (updatedBooking: UIBooking) => {
    const apiData = {
      subject: updatedBooking.subject,
      description: updatedBooking.description,
      start_time: `${updatedBooking.date}T${updatedBooking.startTime}:00`,
      end_time: `${updatedBooking.date}T${updatedBooking.endTime}:00`,
      attendees: updatedBooking.attendees_list.map((a) => a.email),
    };
    updateMutation.mutate({ bookingId: updatedBooking.id, data: apiData });
  };

  const handleCancelBookingPrompt = (booking: UIBooking) => {
    updateState({ selectedBooking: booking, isCancelBookingOpen: true });
  };

  const handleCancelBooking = (booking: UIBooking) => {
    cancelMutation.mutate(booking.id);
    updateState({ isCancelBookingOpen: false });
  };

  const handleTransferBookingPrompt = (booking: UIBooking) => {
    updateState({ selectedBooking: booking, isTransferBookingOpen: true });
  };

  const handleTransferBooking = (booking: UIBooking, newRoomId: string) => {
    updateMutation.mutate({ 
      bookingId: booking.id, 
      data: { room_id: newRoomId } 
    });
    updateState({ isTransferBookingOpen: false });
  };

  // Queries
  const { data: roomsList, isLoading: loadingRooms } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => roomsApi.getAll(),
  });

  const { data: publicBookings, isLoading: loadingPublic } = useQuery({
    queryKey: ["publicBookings", selectedDate.toISOString()],
    queryFn: () =>
      bookingsApi.getRange(
        startOfDay(selectedDate).toISOString(),
        endOfDay(selectedDate).toISOString(),
      ),
  });

  const { data: userBookings, isLoading: loadingUserBookings } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => bookingsApi.getAll({}),
  });

  // Data processing
  const filteredRooms = useMemo(() => {
    if (!roomsList?.items) return [];

    return roomsList.items.filter((room) => {
      const matchesSearch = 
        room.room_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (room.amenities || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCapacity = minCapacity === 0 || room.capacity === minCapacity;
      return matchesSearch && matchesCapacity;
    }).map((room) => {
      const roomBookings = (publicBookings || []).filter(
        (b) => b.room_id === room.room_id && b.status === "confirmed",
      );

      const bookedSlots = roomBookings.map((b) => ({
        start: b.start_time,
        end: b.end_time,
        subject: b.subject,
        bookedBy: b.user_id,
      }));

      return { ...room, bookedSlots };
    });
  }, [roomsList, publicBookings, searchQuery, minCapacity]);

  const bookings: UIBooking[] = useMemo(() => {
    if (!userBookings?.items || !roomsList?.items) return [];

    return userBookings.items.map((b) => {
      const room = roomsList.items.find((r) => r.room_id === b.room_id);
      return {
        id: b.id,
        room_id: b.room_id,
        subject: b.subject,
        description: b.description || "",
        bookedBy: b.user_id,
        date: b.start_time.split("T")[0],
        startTime: b.start_time.split("T")[1].substring(0, 5),
        endTime: b.end_time.split("T")[1].substring(0, 5),
        attendees: b.attendee_count,
        attendees_list: b.attendees || [],
        status: b.status,
      };
    });
  }, [userBookings, roomsList]);

  const activeBookings = bookings.filter((b) => b.status === "confirmed");
  const pastBookings = bookings.filter((b) => b.status !== "confirmed");

  if (loadingRooms || loadingPublic || loadingUserBookings) {
    return <PageLoader />;
  }

  return (
    <RetroBackground>
      <RetroHeader />

      <main className='container mx-auto px-4 py-6 lg:py-10'>
        {/* Current Time Indicator */}
        <div className='flex flex-col md:flex-row items-center justify-between gap-4 mb-6'>
          <div className='inline-block px-4 py-2 border-2 border-primary/30 rounded-sm'>
            <span className='font-retro text-xl text-primary'>
              CURRENT TIME:{" "}
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search ID or amenities..." 
                value={searchQuery}
                onChange={(e) => updateState({ searchQuery: e.target.value })}
                className="pl-10 font-retro"
              />
            </div>
            <div className="relative w-32">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                type="number"
                placeholder="Seats" 
                value={minCapacity || ""}
                onChange={(e) => updateState({ minCapacity: parseInt(e.target.value) || 0 })}
                className="pl-10 font-retro"
              />
            </div>
          </div>

          <Badge variant='outline' className='font-retro text-lg shrink-0'>
            {
              filteredRooms.filter(
                (r) => r.is_active && getRoomStatus(r).status === "AVAILABLE",
              ).length
            }{" "}
            / {filteredRooms.filter((r) => r.is_active).length} AVAILABLE NOW
          </Badge>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(val) => updateState({ activeTab: val })}
          className='space-y-6'
        >
          <TabsList className='grid w-full max-w-2xl grid-cols-3'>
            <TabsTrigger value='grid' className='gap-2'>
              <Grid className='h-4 w-4' />
              AVAILABILITY GRID
            </TabsTrigger>
            <TabsTrigger value='list' className='gap-2'>
              <List className='h-4 w-4' />
              ROOMS LIST
            </TabsTrigger>
            <TabsTrigger value='bookings' className='gap-2'>
              <BookOpen className='h-4 w-4' />
              MY BOOKINGS
            </TabsTrigger>
          </TabsList>

          <TabsContent value='grid' className='space-y-4'>
            <GridTab 
              selectedDate={selectedDate}
              onDateChange={(date) => updateState({ selectedDate: date })}
              rooms={filteredRooms}
              currentTime={currentTime}
              isSlotBooked={isSlotBooked}
            />
          </TabsContent>

          <TabsContent value='list' className='space-y-4'>
            <RoomsListTab 
              rooms={filteredRooms}
              isAdmin={isAdmin}
              onEditRoom={handleEditRoom}
              onBookRoom={(room) => navigate("/book", { state: { preselectedRoomId: room.room_id } })}
            />
          </TabsContent>

          <TabsContent value='bookings' className='space-y-4'>
            <MyBookingsTab 
              activeBookings={activeBookings}
              pastBookings={pastBookings}
              onEditBooking={handleEditBooking}
              onCancelBooking={handleCancelBookingPrompt}
              onTransferBooking={handleTransferBookingPrompt}
            />
          </TabsContent>
        </Tabs>

        {/* Booking Management Dialogs */}
        <EditBookingDialog
          booking={selectedBooking}
          isOpen={isEditBookingOpen}
          onClose={() => {
            updateState({ isEditBookingOpen: false, selectedBooking: null });
          }}
          onSave={handleSaveBooking}
        />
        <CancelBookingDialog
          booking={selectedBooking}
          isOpen={isCancelBookingOpen}
          onClose={() => {
            updateState({ isCancelBookingOpen: false, selectedBooking: null });
          }}
          onConfirm={handleCancelBooking}
        />
        <TransferBookingDialog
          booking={selectedBooking}
          rooms={roomsList?.items || []}
          isOpen={isTransferBookingOpen}
          onClose={() => {
            updateState({
              isTransferBookingOpen: false,
              selectedBooking: null,
            });
          }}
          onTransfer={handleTransferBooking}
        />

        <EditRoomDialog
          room={selectedRoom}
          isOpen={isEditRoomOpen}
          onClose={() => {
            updateState({ isEditRoomOpen: false, selectedRoom: null });
          }}
          onSave={handleSaveRoom}
          isPending={updateRoomMutation.isPending}
          allRooms={roomsList?.items || []}
        />
      </main>
    </RetroBackground>
  );
};

export default Rooms;
