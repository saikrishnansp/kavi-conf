import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import AttendeeSelect from "@/components/AttendeeSelect";
import { cn } from "@/lib/utils";

interface BookingDetailsFormProps {
  subject: string;
  dates: Date[];
  attendees: string[];
  startTime: string;
  endTime: string;
  description: string;
  setForm: (updates: any) => void;
}

const BookingDetailsForm = ({
  subject,
  dates,
  attendees,
  startTime,
  endTime,
  description,
  setForm,
}: BookingDetailsFormProps) => {
  return (
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
                  .map((d) => (
                    <Badge
                      key={d.toISOString()}
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
  );
};

export default BookingDetailsForm;
