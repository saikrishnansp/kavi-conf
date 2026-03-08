import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingActions, type Booking as UIBooking } from "@/components/BookingManagementDialogs";

interface MyBookingsTabProps {
  activeBookings: UIBooking[];
  pastBookings: UIBooking[];
  onEditBooking: (booking: UIBooking) => void;
  onCancelBooking: (booking: UIBooking) => void;
  onTransferBooking: (booking: UIBooking) => void;
}

export const MyBookingsTab = ({
  activeBookings,
  pastBookings,
  onEditBooking,
  onCancelBooking,
  onTransferBooking,
}: MyBookingsTabProps) => {
  return (
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
                          {booking.room_id}
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
                      onEdit={onEditBooking}
                      onCancel={onCancelBooking}
                      onTransfer={onTransferBooking}
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
                          {booking.room_id}
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
  );
};
