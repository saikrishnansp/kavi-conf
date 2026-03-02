import { RetroBackground } from "@/components/RetroBackground";
import { RetroHeader } from "@/components/RetroHeader";
import { BookingSuccessDialog } from "@/components/BookingSuccessDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useBookingForm } from "@/contexts/BookingContext";
import { useToast } from "@/hooks/use-toast";
import { bookingsApi } from "@/lib/api/bookings";
import { roomsApi } from "@/lib/api/rooms";
import { bookingSuccessQuote } from "@/lib/constants";
import { type BookingCreate, type BookingResponse } from "@/types/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { endOfDay, startOfDay } from "date-fns";
import { useMemo, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BookingDetailsForm from "@/components/book/BookingDetailsForm";
import RoomSuggestions from "@/components/book/RoomSuggestions";
import BookingConfirmation from "@/components/book/BookingConfirmation";
import BookingHeader from "@/components/book/BookingHeader";

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
      const start = setDateTime(date, startTime);
      const end = setDateTime(date, endTime);

      const hasOverlap = room.bookedSlots.some((slot) => {
        const slotStart = new Date(slot.start);
        const slotEnd = new Date(slot.end);
        return start < slotEnd && end > slotStart;
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

    const formatDateWithOffset = (date: Date) => {
      const pad = (num: number) => String(num).padStart(2, '0');
      const offset = -date.getTimezoneOffset();
      const sign = offset >= 0 ? '+' : '-';
      const offH = pad(Math.floor(Math.abs(offset) / 60));
      const offM = pad(Math.abs(offset) % 60);
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${offH}:${offM}`;
    };

    const start = formatDateWithOffset(setDateTime(firstDate, startTime));
    const end = formatDateWithOffset(setDateTime(firstDate, endTime));

    const bookingData: BookingCreate = {
      room_id: selectedRoom.room_id,
      start_time: start,
      end_time: end,
      subject: subject,
      description: description,
      attendees: attendees,
      additional_dates: otherDates.map(d => formatDateWithOffset(d)),
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
          <BookingHeader googleToken={googleToken} />

          {/* Step 1: Booking Details */}
          <BookingDetailsForm 
            subject={subject}
            dates={dates}
            attendees={attendees}
            startTime={startTime}
            endTime={endTime}
            description={description}
            setForm={setForm}
          />

          {/* Step 2: Room Suggestions */}
          <RoomSuggestions 
            attendeeCount={attendeeCount}
            suggestedRooms={suggestedRooms}
            selectedRoom={selectedRoom}
            isRoomAvailable={isRoomAvailable}
            setForm={setForm}
          />

          {/* Step 3: Confirm */}
          <BookingConfirmation 
            selectedRoom={selectedRoom}
            dates={dates}
            startTime={startTime}
            endTime={endTime}
            subject={subject}
            attendeeCount={attendeeCount}
            handleBook={handleBook}
            isBooking={isBooking}
            loadingText={loadingText}
          />
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
