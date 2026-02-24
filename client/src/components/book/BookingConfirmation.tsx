import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Room } from "@/types/api";

interface BookingConfirmationProps {
  selectedRoom: Room | null;
  dates: Date[];
  startTime: string;
  endTime: string;
  subject: string;
  attendeeCount: number;
  handleBook: () => void;
  isBooking: boolean;
  loadingText: string;
}

const BookingConfirmation = ({
  selectedRoom,
  dates,
  startTime,
  endTime,
  subject,
  attendeeCount,
  handleBook,
  isBooking,
  loadingText,
}: BookingConfirmationProps) => {
  return (
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
                        .map((d) => (
                          <Badge
                            key={d.toISOString()}
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
  );
};

export default BookingConfirmation;
