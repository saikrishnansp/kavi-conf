import { useState, useMemo, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { roomsApi } from "@/lib/api/rooms";
import { bookingsApi } from "@/lib/api/bookings";
import PageLoader from "@/components/ui/PageLoader";
import {
  EditBookingDialog,
  CancelBookingDialog,
  TransferBookingDialog,
  BookingActions,
  type Booking,
} from "@/components/BookingManagementDialogs";

export const BookingsTab = () => {
  const queryClient = useQueryClient();

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isEditBookingOpen, setIsEditBookingOpen] = useState(false);
  const [isCancelBookingOpen, setIsCancelBookingOpen] = useState(false);
  const [isTransferBookingOpen, setIsTransferBookingOpen] = useState(false);

  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.getAll(false)
  });

  const { data: bookingsData, isLoading: loadingBookings } = useQuery({
    queryKey: ['bookings', { all_bookings: true }],
    queryFn: () => bookingsApi.getAll({ all_bookings: true })
  });

  const rooms = useMemo(() => roomsData?.items || [], [roomsData]);
  const rawBookings = useMemo(() => bookingsData?.items || [], [bookingsData]);

  const bookings: Booking[] = useMemo(() => {
    return rawBookings.map(b => {
      const room = rooms.find(r => r.room_id === b.room_id);
      return {
        id: b.id,
        room_id: b.room_id,
        subject: b.subject,
        description: b.description,
        bookedBy: b.user_id,
        date: b.start_time.split('T')[0],
        startTime: b.start_time.split('T')[1].substring(0, 5),
        endTime: b.end_time.split('T')[1].substring(0, 5),
        attendees: b.attendee_count,
        attendees_list: b.attendees,
        status: b.status,
      };
    });
  }, [rawBookings, rooms]);

  const cancelBookingMutation = useMutation({
    mutationFn: (bookingId: number) => bookingsApi.cancel(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success("BOOKING CANCELLED", { description: "The booking has been removed." });
    },
    onError: (error: any) => {
      toast.error("ERROR", { description: error.response?.data?.detail || "Failed to cancel booking" });
    }
  });

  const updateBookingMutation = useMutation({
    mutationFn: ({ bookingId, data }: { bookingId: number; data: unknown }) =>
      bookingsApi.update(bookingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success("BOOKING UPDATED", { description: "Changes saved successfully." });
    },
    onError: (error: any) => {
      toast.error("ERROR", { description: error.response?.data?.detail || "Failed to update booking" });
    }
  });

  const handleEditBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsEditBookingOpen(true);
  };

  const handleSaveBooking = (updatedBooking: Booking) => {
    const apiData = {
      subject: updatedBooking.subject,
      description: updatedBooking.description,
      start_time: `${updatedBooking.date}T${updatedBooking.startTime}:00`,
      end_time: `${updatedBooking.date}T${updatedBooking.endTime}:00`,
      attendees: updatedBooking.attendees_list.map(a => a.email),
    };
    updateBookingMutation.mutate({ bookingId: updatedBooking.id, data: apiData });
    setIsEditBookingOpen(false);
  };

  const handleCancelBookingPrompt = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsCancelBookingOpen(true);
  };

  const handleCancelBooking = (booking: Booking) => {
    cancelBookingMutation.mutate(booking.id);
  };

  const handleTransferBookingPrompt = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsTransferBookingOpen(true);
  };

  const handleTransferBooking = (booking: Booking, newRoomId: string) => {
    updateBookingMutation.mutate({ 
      bookingId: booking.id, 
      data: { room_id: newRoomId } 
    });
    setIsTransferBookingOpen(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge variant="default" className="font-retro"><CheckCircle className="h-3 w-3 mr-1" />CONFIRMED</Badge>;
      case "completed":
        return <Badge variant="secondary" className="font-retro">COMPLETED</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="font-retro"><XCircle className="h-3 w-3 mr-1" />CANCELLED</Badge>;
      default:
        return <Badge variant="outline" className="font-retro">{status.toUpperCase()}</Badge>;
    }
  };

  if (loadingBookings) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            ALL SYSTEM BOOKINGS
          </CardTitle>
          <Badge variant="outline" className="font-retro">
            {new Date().toLocaleDateString()}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left p-3 font-retro text-sm text-muted-foreground">ROOM</th>
                  <th className="text-left p-3 font-retro text-sm text-muted-foreground">SUBJECT</th>
                  <th className="text-left p-3 font-retro text-sm text-muted-foreground">BOOKED BY</th>
                  <th className="text-left p-3 font-retro text-sm text-muted-foreground">TIME</th>
                  <th className="text-left p-3 font-retro text-sm text-muted-foreground">ATTENDEES</th>
                  <th className="text-left p-3 font-retro text-sm text-muted-foreground">STATUS</th>
                  <th className="text-left p-3 font-retro text-sm text-muted-foreground">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center font-retro text-muted-foreground">
                      No bookings found in the system.
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking, index) => {
                    const showDateHeader = index === 0 || booking.date !== bookings[index - 1].date;
                    return (
                      <Fragment key={booking.id}>
                        {showDateHeader && (
                          <tr className='bg-muted/30'>
                            <td colSpan={7} className='p-2 px-4'>
                              <div className='flex items-center gap-2 text-primary font-pixel text-[10px]'>
                                <Calendar className='h-3 w-3' />
                                {new Date(booking.date).toLocaleDateString('en-US', { 
                                  weekday: 'long', 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                }).toUpperCase()}
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr className="border-b border-border hover:bg-muted/5">
                          <td className="p-3">
                            <p className="font-pixel text-xs">{booking.room_id}</p>
                          </td>
                          <td className="p-3 font-retro text-lg">{booking.subject}</td>
                          <td className="p-3 font-retro text-lg text-muted-foreground">{booking.bookedBy}</td>
                          <td className="p-3 font-retro text-lg text-primary">
                            <div className="flex flex-col">
                              <span>{booking.startTime} - {booking.endTime}</span>
                              <span className="text-[10px] text-muted-foreground">{booking.date}</span>
                            </div>
                          </td>
                          <td className="p-3 font-retro text-lg">{booking.attendees}</td>
                          <td className="p-3">{getStatusBadge(booking.status)}</td>
                          <td className="p-3">
                            <BookingActions
                              booking={booking}
                              onEdit={handleEditBooking}
                              onCancel={handleCancelBookingPrompt}
                              onTransfer={handleTransferBookingPrompt}
                              compact
                            />
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
        rooms={rooms}
        isOpen={isTransferBookingOpen}
        onClose={() => {
          setIsTransferBookingOpen(false);
          setSelectedBooking(null);
        }}
        onTransfer={handleTransferBooking}
      />
    </div>
  );
};
