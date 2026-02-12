import { bookingsApi } from "@/lib/api/bookings";
import { roomsApi } from "@/lib/api/rooms";
import { timeSlots } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { RoomCard } from "@/components/RoomCard";
import { RoomCardAdmin } from "@/components/ui/RoomCardAdmin";
import { EditRoomDialog } from "@/components/RoomDialogs";
import {
  BookingActions,
  CancelBookingDialog,
  EditBookingDialog,
  TransferBookingDialog,
  type Booking as UIBooking,
} from "@/components/BookingManagementDialogs";
import { RetroBackground } from "@/components/RetroBackground";
import { RetroHeader } from "@/components/RetroHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { type Room } from "@/types/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endOfDay, format, startOfDay } from "date-fns";
import {
  ArrowRight,
  BookOpen,
  Calendar as CalendarIcon,
  CheckCircle,
  Clock,
  Grid,
  List,
  Pencil,
  Power,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// Extended room type with booking info
interface BookedSlot {
  start: string;
  end: string;
  subject: string;
  bookedBy: string;
}

interface RoomWithBookings extends Room {
  bookedSlots: BookedSlot[];
}

const Rooms = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth(); // Get current user
  const isAdmin = user?.is_admin || false;
  const [activeTab, setActiveTab] = useState(location.state?.defaultTab || "grid");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const queryClient = useQueryClient();

  useEffect(() => {
    if (location.state?.defaultTab) {
      setActiveTab(location.state.defaultTab);
      // Clear state after reading it
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // 1. Fetch Rooms
  const { data: roomsList, isLoading: isLoadingRooms } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => roomsApi.getAll(),
  });

  // 2. Fetch My Bookings
  const { data: myBookingsData, isLoading: isLoadingBookings } = useQuery({
    queryKey: ["bookings"],
    queryFn: () => bookingsApi.getAll(),
  });

  // 3. Fetch Public Bookings for selected date (for grid)
  const start = startOfDay(selectedDate).toISOString();
  const end = endOfDay(selectedDate).toISOString();

  const { data: publicBookings } = useQuery({
    queryKey: ["publicBookings", start, end],
    queryFn: () => bookingsApi.getRange(start, end),
  });

  // Map public bookings to rooms
  const rooms: RoomWithBookings[] = (roomsList?.items || []).map((room) => {
    const roomBookings = (publicBookings || []).filter(
      (b) => b.room_id === room.room_id,
    ); // room_id matches
    const bookedSlots: BookedSlot[] = roomBookings.map((b) => ({
      start: format(new Date(b.start_time), "HH:mm"),
      end: format(new Date(b.end_time), "HH:mm"),
      subject: b.subject,
      bookedBy: b.user_id, // or resolve name if available
    }));
    return { ...room, bookedSlots };
  });

  // Map my bookings to UI format
  // UIBooking interface likely needs: id, roomName, roomNumber, subject, bookedBy, date, startTime, endTime, attendees, status
  const bookings: UIBooking[] = (myBookingsData?.items || []).map((b) => {
    // Find room details if possible from roomsList
    const room = roomsList?.items.find((r) => r.room_id == b.room_id); // Ensure string/number compare works
    return {
      id: b.id,
      room_id: b.room_id,
      roomName: room?.name || "Unknown Room",
      roomNumber: room?.room_number || 0,
      subject: b.subject,
      description: b.description,
      bookedBy: user?.full_name || user?.email || "Me",
      date: format(new Date(b.start_time), "yyyy-MM-dd"),
      startTime: format(new Date(b.start_time), "HH:mm"),
      endTime: format(new Date(b.end_time), "HH:mm"),
      attendees: b.attendee_count,
      attendees_list: b.attendees,
      status: b.status as any,
    };
  });

  // Booking management state
  const [selectedBooking, setSelectedBooking] = useState<UIBooking | null>(
    null,
  );
  const [isEditBookingOpen, setIsEditBookingOpen] = useState(false);
  const [isCancelBookingOpen, setIsCancelBookingOpen] = useState(false);
  const [isTransferBookingOpen, setIsTransferBookingOpen] = useState(false);

  // Room management state
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);

  // Mutations
  const cancelMutation = useMutation({
    mutationFn: bookingsApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["publicBookings"] });
      toast({
        title: "BOOKING CANCELLED",
        description: "Your booking has been cancelled.",
        variant: "destructive",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: ({ roomId, data }: { roomId: string; data: Partial<Room> }) =>
      roomsApi.update(roomId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({
        title: "ROOM UPDATED",
        description: "The room has been updated successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to update room",
        variant: "destructive",
      });
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: roomsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast({
        title: "ROOM DELETED",
        description: "The room has been removed.",
        variant: "destructive",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to delete room",
        variant: "destructive",
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
    return room.bookedSlots.find(
      (slot) => time >= slot.start && time < slot.end,
    );
  };

  const getNextAvailableSlot = (room: RoomWithBookings) => {
    for (const time of timeSlots) {
      if (time >= currentTime && !isSlotBooked(room, time)) {
        return time;
      }
    }
    return "Tomorrow";
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
    setSelectedRoom(room);
    setIsEditRoomOpen(true);
  };

  const handleSaveRoom = (roomId: string, data: any) => {
    updateRoomMutation.mutate({ roomId, data });
    setIsEditRoomOpen(false);
  };

  const handleToggleActive = (room: RoomWithBookings) => {
    updateRoomMutation.mutate({
      roomId: room.room_id,
      data: { is_active: !room.is_active },
    });
  };

  const handleDeleteRoom = (room: RoomWithBookings) => {
    if (window.confirm(`Are you sure you want to delete ${room.name}?`)) {
      deleteRoomMutation.mutate(room.room_id);
    }
  };

  // Booking management handlers
  const handleEditBooking = (booking: UIBooking) => {
    setSelectedBooking(booking);
    setIsEditBookingOpen(true);
  };

  const updateMutation = useMutation({
    mutationFn: ({ bookingId, data }: { bookingId: number; data: any }) =>
      bookingsApi.update(bookingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["publicBookings"] });
      toast({
        title: "BOOKING UPDATED",
        description: "Your booking has been updated successfully.",
      });
      setIsEditBookingOpen(false);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message || "Failed to update booking",
        variant: "destructive",
      });
    },
  });

  const handleSaveBooking = (updatedBooking: UIBooking) => {
    const apiData = {
      subject: updatedBooking.subject,
      description: updatedBooking.description,
      start_time: `${updatedBooking.date}T${updatedBooking.startTime}:00`,
      end_time: `${updatedBooking.date}T${updatedBooking.endTime}:00`,
      attendees: updatedBooking.attendees_list.map(a => a.email),
    };
    updateMutation.mutate({ bookingId: updatedBooking.id, data: apiData });
  };

  const handleCancelBookingPrompt = (booking: UIBooking) => {
    setSelectedBooking(booking);
    setIsCancelBookingOpen(true);
  };

  const handleCancelBooking = (booking: UIBooking) => {
    cancelMutation.mutate(booking.id);
    setIsCancelBookingOpen(false);
  };

  const handleTransferBookingPrompt = (booking: UIBooking) => {
    setSelectedBooking(booking);
    setIsTransferBookingOpen(true);
  };

  const handleTransferBooking = (booking: UIBooking, newRoomId: string) => {
    // TODO: Implement Transfer mutation
    toast({
      title: "NOT IMPLEMENTED",
      description: "Transfer booking coming soon",
    });
  };

  const activeBookings = bookings.filter((b) => b.status === "confirmed");
  const pastBookings = bookings.filter((b) => b.status !== "confirmed");

  return (
    <RetroBackground>
      <RetroHeader />

      <main className='container mx-auto px-4 py-6 lg:py-10'>
        {/* Current Time Indicator */}
        <div className='flex items-center justify-between mb-6'>
          <div className='inline-block px-4 py-2 border-2 border-primary/30 rounded-sm'>
            <span className='font-retro text-xl text-primary'>
              CURRENT TIME:{" "}
              {new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <Badge variant='outline' className='font-retro text-lg'>
            {
              rooms.filter((r) => getRoomStatus(r).status === "AVAILABLE")
                .length
            }{" "}
            / {rooms.length} AVAILABLE NOW
          </Badge>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
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

          {/* Grid View - Real-time availability */}
          <TabsContent value='grid' className='space-y-4'>
            <Card>
              <CardHeader className='pb-2'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-base flex items-center gap-2'>
                    <Clock className='h-5 w-5 text-primary' />
                    {format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
                      ? "TODAY'S SCHEDULE"
                      : `SCHEDULE FOR ${format(selectedDate, "MMM d, yyyy")}`}
                  </CardTitle>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className='mr-2 h-4 w-4' />
                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-auto p-0' align='end'>
                      <Calendar
                        mode='single'
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </CardHeader>
              <CardContent className='overflow-x-auto'>
                <div className='min-w-[800px]'>
                  {/* Time header */}
                  <div className='flex border-b-2 border-border'>
                    <div className='w-36 shrink-0 p-2 font-retro text-lg text-muted-foreground'>
                      ROOM
                    </div>
                    {timeSlots.map((time) => (
                      <div
                        key={time}
                        className={cn(
                          "flex-1 p-2 text-center font-retro text-sm border-l border-border",
                          time === currentTime && "bg-primary/10",
                        )}
                      >
                        {time}
                      </div>
                    ))}
                  </div>

                  {/* Room rows */}
                  {rooms.map((room) => (
                    <div
                      key={room.room_id}
                      className='flex border-b border-border hover:bg-muted/5'
                    >
                      <div className='w-36 shrink-0 p-3'>
                        <p className='font-pixel text-xs truncate'>
                          {room.name}
                        </p>
                        <p className='font-retro text-sm text-muted-foreground'>
                          #{room.room_number} • {room.capacity} seats
                        </p>
                      </div>
                      {timeSlots.map((time) => {
                        const booking = isSlotBooked(room, time);
                        const isCurrent = time === currentTime;

                        return (
                          <div
                            key={time}
                            className={cn(
                              "flex-1 p-1 border-l border-border relative",
                              isCurrent && "bg-primary/5",
                            )}
                          >
                            {booking ? (
                              <div
                                className='h-full min-h-[40px] rounded-sm bg-destructive/20 border border-destructive/30 p-1 cursor-help'
                                title={`${booking.subject} - Booked by: ${booking.bookedBy}`}
                              >
                                <span className='font-retro text-xs text-destructive truncate block'>
                                  {booking.subject}
                                </span>
                              </div>
                            ) : (
                              <div className='h-full min-h-[40px] rounded-sm bg-primary/10 border border-primary/20' />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className='flex items-center gap-6 mt-4 pt-4 border-t border-border'>
                  <div className='flex items-center gap-2'>
                    <div className='w-4 h-4 rounded-sm bg-primary/20 border border-primary/30' />
                    <span className='font-retro text-sm text-muted-foreground'>
                      Available
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <div className='w-4 h-4 rounded-sm bg-destructive/20 border border-destructive/30' />
                    <span className='font-retro text-sm text-muted-foreground'>
                      Booked
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <div className='w-4 h-4 rounded-sm bg-primary/10 border-2 border-primary' />
                    <span className='font-retro text-sm text-muted-foreground'>
                      Current Hour
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rooms List View */}
          <TabsContent value='list' className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {rooms.map((room) => {
                if (isAdmin) {
                  return (
                    <RoomCardAdmin
                      key={room.room_id}
                      room={room}
                      onEdit={handleEditRoom}
                    />
                  );
                }

                return (
                  <RoomCard
                    key={room.room_id}
                    room={room}
                    onBook={() => navigate("/book", { state: { preselectedRoomId: room.room_id } })}
                  />
                );
              })}
            </div>
          </TabsContent>

          {/* My Bookings View */}
          <TabsContent value='bookings' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle className='font-pixel text-base flex items-center gap-2'>
                  <CalendarIcon className='h-5 w-5 text-primary' />
                  MY BOOKINGS
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                {activeBookings.length === 0 && pastBookings.length === 0 ? (
                  <p className='text-muted-foreground font-retro text-lg text-center py-8'>
                    NO BOOKINGS YET
                  </p>
                ) : (
                  <>
                    {activeBookings.length > 0 && (
                      <div className='space-y-3'>
                        <h3 className='font-retro text-sm text-muted-foreground'>
                          UPCOMING
                        </h3>
                        {activeBookings.map((booking) => (
                          <div
                            key={booking.id}
                            className='p-3 rounded-sm border border-border bg-card/50 space-y-2'
                          >
                            <div className='flex items-start justify-between gap-2'>
                              <div>
                                <p className='font-pixel text-xs text-primary'>
                                  {booking.roomName}
                                </p>
                                <p className='font-retro text-lg text-foreground'>
                                  {booking.subject}
                                </p>
                              </div>
                              <Badge
                                variant='default'
                                className='font-retro text-xs shrink-0'
                              >
                                ACTIVE
                              </Badge>
                            </div>
                            <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                              <span className='flex items-center gap-1'>
                                <CalendarIcon className='h-3 w-3' />
                                {booking.date}
                              </span>
                              <span className='flex items-center gap-1'>
                                <Clock className='h-3 w-3' />
                                {booking.startTime} - {booking.endTime}
                              </span>
                            </div>
                            <BookingActions
                              booking={booking}
                              onEdit={handleEditBooking}
                              onCancel={handleCancelBookingPrompt}
                              onTransfer={handleTransferBookingPrompt}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {pastBookings.length > 0 && (
                      <div className='space-y-3'>
                        <h3 className='font-retro text-sm text-muted-foreground'>
                          PAST
                        </h3>
                        {pastBookings.map((booking) => (
                          <div
                            key={booking.id}
                            className='p-3 rounded-sm border border-border bg-muted/10 space-y-2 opacity-70'
                          >
                            <div className='flex items-start justify-between gap-2'>
                              <div>
                                <p className='font-pixel text-xs text-muted-foreground'>
                                  {booking.roomName}
                                </p>
                                <p className='font-retro text-lg text-foreground'>
                                  {booking.subject}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  booking.status === "completed"
                                    ? "secondary"
                                    : "destructive"
                                }
                                className='font-retro text-xs shrink-0'
                              >
                                {booking.status.toUpperCase()}
                              </Badge>
                            </div>
                            <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                              <span className='flex items-center gap-1'>
                                <CalendarIcon className='h-3 w-3' />
                                {booking.date}
                              </span>
                              <span className='flex items-center gap-1'>
                                <Clock className='h-3 w-3' />
                                {booking.startTime} - {booking.endTime}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Booking Management Dialogs */}
        <EditBookingDialog
          booking={selectedBooking}
          isOpen={isEditBookingOpen}
          onClose={() => {
            setIsEditBookingOpen(false);
            setSelectedBooking(null);
          }}
          onSave={handleSaveBooking}
        />
        <CancelBookingDialog
          booking={selectedBooking}
          isOpen={isCancelBookingOpen}
          onClose={() => {
            setIsCancelBookingOpen(false);
            setSelectedBooking(null);
          }}
          onConfirm={handleCancelBooking}
        />
        <TransferBookingDialog
          booking={selectedBooking}
          rooms={roomsList?.items || []}
          isOpen={isTransferBookingOpen}
          onClose={() => {
            setIsTransferBookingOpen(false);
            setSelectedBooking(null);
          }}
          onTransfer={handleTransferBooking}
        />

        <EditRoomDialog
          room={selectedRoom}
          isOpen={isEditRoomOpen}
          onClose={() => {
            setIsEditRoomOpen(false);
            setSelectedRoom(null);
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
