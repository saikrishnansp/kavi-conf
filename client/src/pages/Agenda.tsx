import { useQuery } from "@tanstack/react-query";
import { format, isWithinInterval, parseISO, setHours, setMinutes, startOfDay, endOfDay } from "date-fns";
import { Calendar as CalendarIcon, Clock, MapPin, Plus, ExternalLink, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BookingHeader from "@/components/book/BookingHeader";
import { RetroBackground } from "@/components/RetroBackground";
import { RetroHeader } from "@/components/RetroHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api/axios";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import PageLoader from "@/components/ui/PageLoader";

interface AgendaItem {
  id: string;
  subject: string;
  start_time: string;
  end_time: string;
  status: "BOOKED" | "EXTERNAL";
  show_book_btn?: boolean;
  location?: string;
  room_id?: string;
  booking_id?: number;
  attendees?: string[];
  meet_link?: string;
}

const Agenda = () => {
  const navigate = useNavigate();
  const { googleToken } = useAuth();
  const today = new Date();

  const { data: agenda, isLoading } = useQuery<AgendaItem[]>({
    queryKey: ["agenda"],
    queryFn: async () => {
      const response = await api.get("/bookings/agenda");
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const workingHours = {
    start: setMinutes(setHours(today, 13), 0),
    end: setMinutes(setHours(today, 22), 0),
  };
  
  // Clear seconds and milliseconds for consistent comparison
  workingHours.start.setSeconds(0, 0);
  workingHours.end.setSeconds(0, 0);

  const isWorkingHours = (timeStr: string) => {
    try {
      const date = parseISO(timeStr);
      return date >= workingHours.start && date < workingHours.end;
    } catch (e) {
      return false;
    }
  };

  const handleBookNow = (item: AgendaItem) => {
    const startDate = parseISO(item.start_time);
    const endDate = parseISO(item.end_time);
    
    // Extract attendee emails from the event
    const attendeeEmails = item.attendees || [];

    navigate("/book", {
      state: {
        prefill: {
          subject: item.subject,
          dates: [startOfDay(startDate)],
          startTime: format(startDate, "HH:mm"),
          endTime: format(endDate, "HH:mm"),
          googleEventId: item.id,
          meetLink: item.meet_link,
          attendees: attendeeEmails,
        }
      }
    });
  };

  const workingHoursAgenda = agenda?.filter(item => isWorkingHours(item.start_time)) || [];
  
  // Debug mode to see what data is triggering flags
  // console.log("Agenda Items:", agenda);

  const hasMorningEvents = agenda?.some(item => {
    const start = parseISO(item.start_time);
    const end = parseISO(item.end_time);
    
    // Skip All-day events (usually 00:00 to 23:59 or 00:00 next day)
    const isAllDay = format(start, "HH:mm") === "00:00" && 
                    (format(end, "HH:mm") === "23:59" || format(end, "HH:mm") === "00:00");
    
    if (isAllDay) return false;
    
    return start < workingHours.start;
  }) || false;

  const hasEveningEvents = agenda?.some(item => parseISO(item.start_time) >= workingHours.end) || false;

  return (
    <RetroBackground>
      <RetroHeader />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <BookingHeader googleToken={googleToken} />
            <h1 className="font-pixel text-2xl text-primary neon-glow mb-1">DAILY AGENDA</h1>
            <p className="font-retro text-xl text-muted-foreground flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(today, "EEEE, MMMM do yyyy")}
            </p>
          </div>
          
          <Button 
            variant="neon" 
            onClick={() => navigate("/book")}
            className="font-pixel text-xs h-12"
          >
            <Plus className="mr-2 h-4 w-4" />
            QUICK BOOK
          </Button>
        </header>

        {isLoading ? (
          <PageLoader />
        ) : (
          <div className="space-y-12">
            {/* Early Meetings (Before 1 PM) */}
            {hasMorningEvents && (
              <section className="space-y-4">
                <h2 className="font-pixel text-xs text-muted-foreground/60 border-b border-border pb-2">MORNING SESSIONS</h2>
                <div className="space-y-3">
                  {agenda
                    ?.filter(i => parseISO(i.start_time) < workingHours.start)
                    .map(item => <AgendaCard key={item.id} item={item} onBook={handleBookNow} />)}
                </div>
              </section>
            )}

            {/* Core Working Hours (1 PM - 10 PM) */}
            <section className="relative">
              <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-primary to-transparent opacity-30 hidden md:block" />
              
              <div className="flex items-center gap-4 mb-6">
                <Badge variant="outline" className="font-pixel text-[10px] py-1 px-3 border-primary/50 text-primary">
                  FOCUS ZONE: 13:00 - 22:00
                </Badge>
              </div>

              {workingHoursAgenda.length > 0 ? (
                <div className="space-y-4">
                  {workingHoursAgenda.map(item => (
                    <AgendaCard key={item.id} item={item} onBook={handleBookNow} isFocusZone />
                  ))}
                </div>
              ) : (
                <Card className="border-dashed border-2 bg-transparent">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Clock className="h-10 w-10 mb-4 opacity-20" />
                    <p className="font-retro text-xl italic">Free afternoon! No focus zone meetings scheduled.</p>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* Late Meetings (After 10 PM) */}
            {hasEveningEvents && (
              <section className="space-y-4">
                <h2 className="font-pixel text-xs text-muted-foreground/60 border-b border-border pb-2">LATE SESSIONS</h2>
                <div className="space-y-3">
                  {agenda
                    ?.filter(i => parseISO(i.start_time) >= workingHours.end)
                    .map(item => <AgendaCard key={item.id} item={item} onBook={handleBookNow} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </RetroBackground>
  );
};

const AgendaCard = ({ 
  item, 
  onBook, 
  isFocusZone 
}: { 
  item: AgendaItem; 
  onBook: (item: AgendaItem) => void;
  isFocusZone?: boolean;
}) => {
  const isBooked = item.status === "BOOKED";
  const start = parseISO(item.start_time);
  const end = parseISO(item.end_time);

  return (
    <Card className={cn(
      "group transition-all duration-300 border-2 overflow-hidden",
      isBooked 
        ? "border-primary/20 bg-primary/5 hover:border-primary/40" 
        : "border-muted-foreground/20 bg-card hover:border-primary/40",
      isFocusZone && isBooked && "neon-box"
    )}>
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row md:items-center">
          {/* Time Sidebar */}
          <div className={cn(
            "p-4 md:w-40 flex flex-row md:flex-col justify-between md:justify-center items-center md:items-start gap-1 border-b md:border-b-0 md:border-r border-border",
            isBooked ? "bg-primary/10" : "bg-muted/10"
          )}>
            <div className="flex items-center gap-2 text-primary">
              <Clock className="h-4 w-4" />
              <span className="font-mono font-bold text-lg">{format(start, "HH:mm")}</span>
            </div>
            <div className="text-muted-foreground font-mono text-sm ml-6 md:ml-0">
              to {format(end, "HH:mm")}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {isBooked ? (
                    <Badge className="bg-primary text-primary-foreground font-pixel text-[10px]">
                      Room Booked
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="font-pixel text-[10px]">
                      EXTERNAL
                    </Badge>
                  )}
                  {item.location && !isBooked && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {item.location}
                    </div>
                  )}
                </div>
                
                <h3 className={cn(
                  "font-retro text-2xl mb-1 leading-tight",
                  isBooked ? "text-foreground" : "text-muted-foreground"
                )}>
                  {item.subject}
                </h3>

                {isBooked && (
                  <div className="flex items-center gap-2 mt-3 text-primary font-pixel text-[10px]">
                    <MapPin className="h-3 w-3" />
                    ROOM: {item.room_id}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isBooked && item.show_book_btn && (
                  <Button 
                    variant="neon" 
                    size="sm" 
                    onClick={() => onBook(item)}
                    className="font-pixel text-[10px] h-9"
                  >
                    BOOK ROOM
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                )}
                
                {isBooked && item.booking_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-pixel text-[10px] h-9 opacity-50 hover:opacity-100"
                    onClick={() => window.open(`/rooms`, "_self")}
                  >
                    DETAILS
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Agenda;
