import AttendeeSelect from "@/components/AttendeeSelect";
import { RetroBackground } from "@/components/RetroBackground";
import { RetroHeader } from "@/components/RetroHeader";
import { BookingSuccessDialog } from "@/components/BookingSuccessDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useBookingForm } from "@/contexts/BookingContext";
import { useToast } from "@/hooks/use-toast";
import { bookingsApi } from "@/lib/api/bookings";
import { roomsApi } from "@/lib/api/rooms";
import { bookingSuccessQuote, timeSlots } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { type BookingCreate, type BookingResponse } from "@/types/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { endOfDay, format, startOfDay } from "date-fns";
import {
  ArrowRight,
  Calendar as CalendarIcon,
  CheckCircle,
  Clock,
  Sparkles,
  Users,
  AlertTriangle,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// Helper to parse time string "HH:mm" to Date object on a specific date
const setDateTime = (date: Date, timeStr: string) => {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
};

const MOTIVATIONAL_PHRASES = [
  "Locking in your productivity...",
  "Securing your space...",
  "Making it official...",
];

const Book = () => {
  const { toast } = useToast();
  const { user, googleToken } = useAuth();
  const { form, setForm, resetForm } = useBookingForm();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    dates,
    startTime,
    endTime,
    attendees,
    subject,
    description,
    selectedRoom,
    googleEventId,
    meetLink,
  } = form;
  const [isBooking, setIsBooking] = useState(false);
  const [loadingText, setLoadingText] = useState("CONFIRM BOOKING");
  const [lastCreatedBooking, setLastCreatedBooking] = useState<BookingResponse | null>(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);

  // Pre-fill form from location state (e.g., from Agenda page)
  useEffect(() => {
    if (location.state?.prefill) {
      const { prefill } = location.state;
      setForm({
        ...form,
        subject: prefill.subject || subject,
        dates: prefill.dates || dates,
        startTime: prefill.startTime || startTime,
        endTime: prefill.endTime || endTime,
        attendees: prefill.attendees || attendees,
        googleEventId: prefill.googleEventId,
        meetLink: prefill.meetLink,
      });
      // Clear state after pre-filling
      window.history.replaceState({}, document.title);
    }
  }, [location.state, setForm]);

  // 1. Fetch Rooms
  const { data: roomsList } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => roomsApi.getAll(),
  });

  // 2. Fetch Public Bookings for selected dates
  const dateRange = useMemo(() => {
    if (dates.length === 0)
      return { start: new Date().toISOString(), end: new Date().toISOString() };
    const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
    const start = startOfDay(sortedDates[0]).toISOString();
    const end = endOfDay(sortedDates[sortedDates.length - 1]).toISOString();
    return { start, end };
  }, [dates]);

  const { data: publicBookings } = useQuery({
    queryKey: ["publicBookings", dateRange.start, dateRange.end],
    queryFn: () => bookingsApi.getRange(dateRange.start, dateRange.end),
    enabled: dates.length > 0,
  });

  const attendeeCount = attendees.length;

  // Process rooms with availability
  const processedRooms = useMemo(() => {
    if (!roomsList?.items) return [];

    return roomsList.items.map((room) => {
      const roomBookings = (publicBookings || []).filter(
        (b) => b.room_id === room.room_id,
      );

      const bookedSlots = roomBookings.map((b) => ({
        start: b.start_time,
        end: b.end_time,
      }));

      return { ...room, bookedSlots };
    });
  }, [roomsList, publicBookings]);

  // Filter and sort rooms
  const suggestedRooms = useMemo(() => {
    if (attendeeCount === 0) return [];

    return processedRooms
      .filter((room) => room.is_active && room.capacity >= attendeeCount)
      .sort((a, b) => a.capacity - attendeeCount - (b.capacity - attendeeCount))
      .slice(0, 4);
  }, [attendeeCount, processedRooms]);

  // Check availability
  const isRoomAvailable = (room: (typeof processedRooms)[0]) => {
    if (!startTime || !endTime || dates.length === 0) return true;

    for (const date of dates) {
      const start = setDateTime(date, startTime).toISOString();
      const end = setDateTime(date, endTime).toISOString();

      const hasOverlap = room.bookedSlots.some((slot) => {
        return start < slot.end && end > slot.start;
      });

      if (hasOverlap) return false;
    }
    return true;
  };

  const createBookingMutation = useMutation({
    mutationFn: (data: BookingCreate) =>
      bookingsApi.create(data, googleToken || undefined),
    onSuccess: (data) => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      setLastCreatedBooking(data);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["publicBookings"] });
      queryClient.invalidateQueries({ queryKey: ["agenda"] });
    },
  });

  const handleBook = async () => {
    if (
      !selectedRoom ||
      dates.length === 0 ||
      !startTime ||
      !endTime ||
      !subject
    ) {
      toast({
        title: "MISSING DATA",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsBooking(true);
    setLoadingText(MOTIVATIONAL_PHRASES[Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length)]);
    
    // Sort dates to ensure the first one is indeed the start
    const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());
    const firstDate = sortedDates[0];
    const otherDates = sortedDates.slice(1);

    const start = setDateTime(firstDate, startTime).toISOString();
    const end = setDateTime(firstDate, endTime).toISOString();

    const bookingData: BookingCreate = {
      room_id: selectedRoom.room_id,
      start_time: start,
      end_time: end,
      subject: subject,
      description: description,
      attendees: attendees,
      additional_dates: otherDates.map(d => d.toISOString()),
      google_event_id: googleEventId,
      meet_link: meetLink,
    };

    try {
      const result = await createBookingMutation.mutateAsync(bookingData);
      
      const randomQuote =
        bookingSuccessQuote[
          Math.floor(Math.random() * bookingSuccessQuote.length)
        ];

      toast({
        title: "Booking Confirmed",
        description: `${randomQuote} Successfully created ${dates.length} booking(s).`,
      });
      
      setLastCreatedBooking(result);
      setIsSuccessDialogOpen(true);
      // Invalidate queries to refresh availability
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["publicBookings"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      resetForm();

    } catch (error: any) {
      console.error("Booking failed", error);
      toast({
        title: "Booking Failed",
        description: error.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
      setLoadingText("CONFIRM BOOKING");
    }
  };

  return (
    <RetroBackground>
      <RetroHeader />

      <main className='container mx-auto px-4 py-6 lg:py-10' onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          handleBook();
        }
      }}>
        <div className='max-w-4xl mx-auto'>
          {!googleToken && (
            <Alert variant="destructive" className="mb-6 border-2 border-destructive bg-destructive/10 animate-pulse">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="font-pixel text-xs">GOOGLE CALENDAR DISCONNECTED</AlertTitle>
              <AlertDescription className="font-retro text-sm">
                You are not signed in with Google. Calendar invites and Meet links will NOT be generated.
              </AlertDescription>
            </Alert>
          )}

          {/* Step 1: Booking Details */}
          <Card className='mb-6'>
            <CardHeader className='pb-4'>
              <div className='flex items-center gap-3'>
                <div className='flex items-center justify-center w-8 h-8 rounded-sm bg-primary text-primary-foreground font-pixel text-sm'>
                  1
                </div>
                <CardTitle className='text-lg'>ENTER BOOKING DETAILS</CardTitle>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2 md:col-span-2'>
                  <Label className='font-retro text-lg'>
                    MEETING SUBJECT *
                  </Label>
                  <Input
                    placeholder='e.g., Sprint Planning, Client Demo...'
                    value={subject}
                    onChange={(e) => setForm({ subject: e.target.value })}
                  />
                </div>

                <div className='space-y-2'>
                  <Label className='font-retro text-lg'>
                    DATE(S) *{" "}
                    <span className='text-muted-foreground text-xs'>
                      (select multiple for recurring)
                    </span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant='outline'
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          dates.length === 0 && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className='mr-2 h-4 w-4' />
                        {dates.length === 0
                          ? "Select date(s)"
                          : dates.length === 1
                            ? format(dates[0], "PPP")
                            : `${dates.length} dates selected`}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className='w-auto p-0' align='start'>
                      <Calendar
                        mode='multiple'
                        selected={dates}
                        onSelect={(selected) =>
                          setForm({ dates: selected || [] })
                        }
                        disabled={(d) =>
                          d < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  {dates.length > 1 && (
                    <div className='flex flex-wrap gap-1'>
                      {dates
                        .sort((a, b) => a.getTime() - b.getTime())
                        .map((d, i) => (
                          <Badge
                            key={i}
                            variant='secondary'
                            className='text-xs'
                          >
                            {format(d, "MMM d")}
                          </Badge>
                        ))}
                    </div>
                  )}
                </div>

                <div className='space-y-2'>
                  <Label className='font-retro text-lg'>ATTENDEES *</Label>
                  <AttendeeSelect
                    selectedEmails={attendees}
                    onChange={(updated) => setForm({ attendees: updated })}
                  />
                </div>

                <div className='space-y-2'>
                  <Label className='font-retro text-lg'>START TIME *</Label>
                  <div className='relative'>
                    <Clock className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                    <Input
                      type='time'
                      value={startTime}
                      onChange={(e) => setForm({ startTime: e.target.value })}
                      className='pl-10 font-mono'
                    />
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label className='font-retro text-lg'>END TIME *</Label>
                  <div className='relative'>
                    <Clock className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                    <Input
                      type='time'
                      value={endTime}
                      onChange={(e) => setForm({ endTime: e.target.value })}
                      className='pl-10 font-mono'
                    />
                  </div>
                </div>

                <div className='space-y-2 md:col-span-2'>
                  <Label className='font-retro text-lg'>
                    DESCRIPTION (OPTIONAL)
                  </Label>
                  <Textarea
                    placeholder='Additional notes...'
                    value={description}
                    onChange={(e) => setForm({ description: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Room Suggestions */}
          <Card className='mb-6'>
            <CardHeader className='pb-4'>
              <div className='flex items-center gap-3'>
                <div className='flex items-center justify-center w-8 h-8 rounded-sm bg-secondary text-secondary-foreground font-pixel text-sm'>
                  2
                </div>
                <CardTitle className='text-lg'>SELECT A ROOM</CardTitle>
                {suggestedRooms.length > 0 && (
                  <Badge variant='outline' className='ml-auto'>
                    <Sparkles className='h-3 w-3 mr-1' />
                    SUGGESTED FOR {attendeeCount} PEOPLE
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {attendeeCount > 0 ? (
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {suggestedRooms.map((room) => {
                    const available = isRoomAvailable(room);
                    const isSelected = selectedRoom?.room_id === room.room_id;

                    return (
                      <button
                        key={room.room_id}
                        onClick={() =>
                          available && setForm({ selectedRoom: room })
                        }
                        disabled={!available}
                        className={cn(
                          "p-4 rounded-sm border-2 text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/10 neon-box"
                            : available
                              ? "border-border hover:border-primary/50 bg-card"
                              : "border-border/50 bg-muted/20 opacity-60 cursor-not-allowed",
                        )}
                      >
                        <div className='flex items-start justify-between mb-2'>
                          <span className='font-pixel text-sm'>
                            {room.name}
                          </span>
                          {isSelected && (
                            <CheckCircle className='h-5 w-5 text-primary' />
                          )}
                        </div>
                        <p className='font-retro text-lg text-muted-foreground mb-2'>
                          Room #{room.room_id}
                        </p>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-2'>
                            <Users className='h-4 w-4 text-primary' />
                            <span className='font-retro text-lg'>
                              {room.capacity} seats
                            </span>
                          </div>
                          <Badge
                            variant={available ? "default" : "secondary"}
                            className='text-xs'
                          >
                            {available ? "AVAILABLE" : "BOOKED"}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className='text-center py-8 text-muted-foreground'>
                  <Users className='h-8 w-8 mx-auto mb-2 opacity-50' />
                  <p className='font-retro text-xl'>
                    Add attendees to see room suggestions
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Confirm */}
          <Card>
            <CardHeader className='pb-4'>
              <div className='flex items-center gap-3'>
                <div className='flex items-center justify-center w-8 h-8 rounded-sm bg-accent text-accent-foreground font-pixel text-sm'>
                  3
                </div>
                <CardTitle className='text-lg'>CONFIRM BOOKING</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {selectedRoom &&
              dates.length > 0 &&
              startTime &&
              endTime &&
              subject ? (
                <div className='space-y-4'>
                  <div className='p-4 rounded-sm border-2 border-primary/30 bg-primary/5'>
                    <div className='grid grid-cols-2 gap-4 font-retro text-lg'>
                      <div>
                        <span className='text-muted-foreground'>Room:</span>
                        <p className='text-foreground font-pixel text-sm mt-1'>
                          {selectedRoom.name}
                        </p>
                      </div>
                      <div>
                        <span className='text-muted-foreground'>Date(s):</span>
                        {dates.length === 1 ? (
                          <p className='text-foreground mt-1'>
                            {format(dates[0], "PPP")}
                          </p>
                        ) : (
                          <div className='flex flex-wrap gap-1 mt-1'>
                            {dates
                              .sort((a, b) => a.getTime() - b.getTime())
                              .map((d, i) => (
                                <Badge
                                  key={i}
                                  variant='outline'
                                  className='text-xs'
                                >
                                  {format(d, "MMM d")}
                                </Badge>
                              ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <span className='text-muted-foreground'>Time:</span>
                        <p className='text-foreground mt-1'>
                          {startTime} - {endTime}
                        </p>
                      </div>
                      <div>
                        <span className='text-muted-foreground'>
                          Attendees:
                        </span>
                        <p className='text-foreground mt-1'>
                          {attendeeCount} people
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant='neon'
                    size='lg'
                    className='w-full'
                    onClick={handleBook}
                    disabled={isBooking}
                  >
                    {isBooking ? loadingText.toUpperCase() : "CONFIRM BOOKING"}
                    <ArrowRight className='h-4 w-4 ml-2' />
                  </Button>
                </div>
              ) : (
                <div className='text-center py-6 text-muted-foreground'>
                  <p className='font-retro text-xl'>
                    Complete the form above to confirm your booking
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <BookingSuccessDialog 
        booking={lastCreatedBooking} 
        isOpen={isSuccessDialogOpen} 
        onClose={() => {
          setIsSuccessDialogOpen(false);
          navigate("/rooms", { state: { defaultTab: "bookings" } });
        }} 
      />
    </RetroBackground>
  );
};

export default Book;