import {
  BookingActions,
  CancelBookingDialog,
  EditBookingDialog,
  TransferBookingDialog,
  type Booking as UIBooking,
} from "@/components/BookingManagementDialogs";
import { RetroBackground } from "@/components/RetroBackground";
import { RetroHeader } from "@/components/RetroHeader";
import { RoomCard } from "@/components/RoomCard";
import { EditRoomDialog } from "@/components/RoomDialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RoomCardAdmin } from "@/components/ui/RoomCardAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { bookingsApi } from "@/lib/api/bookings";
import { roomsApi } from "@/lib/api/rooms";
import { timeSlots } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { type Room } from "@/types/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { endOfDay, format, startOfDay } from "date-fns";
import {
  BookOpen,
  Calendar as CalendarIcon,
  Clock,
  Grid,
  List,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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

  const deleteRoomMutation = useMutation({
    mutationFn: roomsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.error("ROOM DELETED", {
        description: "The room has been removed.",
      });
    },
    onError: (err: any) => {
      toast.error("Error", {
        description: err.message || "Failed to delete room",
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
    // Helper to convert grid "HH:mm" to minutes from start of day
    const toMinutes = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    const slotStartMin = toMinutes(time);

    // Find next slot to determine duration, default to 60 mins
    const currentIndex = timeSlots.indexOf(time);
    const nextSlot = timeSlots[currentIndex + 1];
    const slotEndMin = nextSlot ? toMinutes(nextSlot) : slotStartMin + 60;

    return room.bookedSlots.find((slot) => {
      // Parse database ISO strings or Date objects
      const startDate = new Date(slot.start);
      const endDate = new Date(slot.end);

      // Convert to minutes from midnight for the booking
      const bookingStartMin =
        startDate.getHours() * 60 + startDate.getMinutes();
      const bookingEndMin = endDate.getHours() * 60 + endDate.getMinutes();

      // Overlap logic: booking starts before slot ends AND booking ends after slot starts
      return bookingStartMin < slotEndMin && bookingEndMin > slotStartMin;
    });
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
    updateState({ selectedRoom: room, isEditRoomOpen: true });
  };

  const handleSaveRoom = (roomId: string, data: any) => {
    updateRoomMutation.mutate({ roomId, data });
    updateState({ isEditRoomOpen: false });
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
    // TODO: Implement Transfer mutation
    toast("NOT IMPLEMENTED", {
      description: "Transfer booking coming soon",
    });
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
  const processedRooms: RoomWithBookings[] = useMemo(() => {
    if (!roomsList?.items) return [];

    return roomsList.items.map((room) => {
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
  }, [roomsList, publicBookings]);

  const rooms = processedRooms;

  const bookings: UIBooking[] = useMemo(() => {
    if (!userBookings?.items || !roomsList?.items) return [];

    return userBookings.items.map((b) => {
      const room = roomsList.items.find((r) => r.room_id === b.room_id);
      return {
        id: b.id,
        room_id: b.room_id,
        roomName: room?.name || "Unknown Room",
        roomNumber: room?.room_number || 0,
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
    return (
      <RetroBackground>
        <RetroHeader />
        <div className='flex items-center justify-center min-h-[60vh]'>
          <div className='font-pixel text-xl text-primary animate-pulse'>
            LOADING ROOMS...
          </div>
        </div>
      </RetroBackground>
    );
  }

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
              rooms.filter(
                (r) => r.is_active && getRoomStatus(r).status === "AVAILABLE",
              ).length
            }{" "}
            / {rooms.filter((r) => r.is_active).length} AVAILABLE NOW
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

          {/* Grid View - Real-time availability */}
          <TabsContent value='grid' className='space-y-4'>
            <Card>
              <CardHeader className='pb-2'>
                <div className='flex items-center justify-between'>
                  <CardTitle className='text-base flex items-center gap-2'>
                    <Clock className='h-5 w-5 text-primary' />
                    {format(selectedDate, "yyyy-MM-dd") ===
                    format(new Date(), "yyyy-MM-dd")
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
                        {selectedDate ? (
                          format(selectedDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-auto p-0' align='end'>
                      <Calendar
                        mode='single'
                        selected={selectedDate}
                        onSelect={(date) =>
                          date && updateState({ selectedDate: date })
                        }
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
                    onBook={() =>
                      navigate("/book", {
                        state: { preselectedRoomId: room.room_id },
                      })
                    }
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
                        {activeBookings.map((booking, index) => (
                          <div
                            key={`${booking.id}-${index}`}
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
