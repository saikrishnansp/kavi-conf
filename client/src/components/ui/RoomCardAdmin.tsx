import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Pencil, Power, Trash2, CheckCircle, XCircle, ArrowRight, Lamp } from "lucide-react";
import type { Room } from "@/types/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { roomsApi } from "@/lib/api/rooms";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RoomCardAdminProps {
  room: Room;
  onEdit: (room: Room) => void;
  onBook?: (room: Room) => void;
}

export function RoomCardAdmin({ room, onEdit, onBook }: RoomCardAdminProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const toggleActiveMutation = useMutation({
    mutationFn: () => roomsApi.update(room.room_id, { is_active: !room.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success(room.is_active ? "ROOM DEACTIVATED" : "ROOM ACTIVATED", {
        description: `${room.room_id} is now ${room.is_active ? "offline" : "online"}.`,
      });
    },
    onError: (error: any) => {
      toast.error("ACTION FAILED", {
        description: error.response?.data?.detail || "Could not update room status.",
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => roomsApi.delete(room.room_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.error("ROOM DELETED", {
        description: `${room.room_id} has been removed.`,
      });
    },
    onError: (error: any) => {
      toast.error("DELETE FAILED", {
        description: error.response?.data?.detail || "Could not delete room.",
      });
    }
  });

  const currentBooking = room.current_booking;
  const status = currentBooking ? "BOOKED" : "AVAILABLE";
  
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const isAvailable = !room.next_available_at || new Date(room.next_available_at) <= new Date();
  const nextAvailableText = isAvailable ? "NOW" : formatTime(room.next_available_at!);

  return (
    <Card className="relative overflow-hidden hover:border-primary/50 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base truncate max-w-[150px] font-pixel">{room.room_id}</CardTitle>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Action Icons to the left of the badge */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-primary/20 hover:text-primary"
                onClick={() => onEdit(room)}
                title="Edit Room"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${room.is_active ? 'hover:bg-destructive/20 hover:text-destructive' : 'hover:bg-primary/20 hover:text-primary'}`}
                onClick={() => toggleActiveMutation.mutate()}
                disabled={toggleActiveMutation.isPending}
                title={room.is_active ? "Deactivate Room" : "Activate Room"}
              >
                <Power className="h-4 w-4" />
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive"
                    title="Delete Room"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-pixel text-sm text-destructive">ARE YOU SURE?</AlertDialogTitle>
                    <AlertDialogDescription className="font-retro text-lg">
                      This will permanently delete <strong>{room.room_id}</strong>. This action cannot be undone and will fail if the room has booking history.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="font-retro">CANCEL</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate()}
                      className="bg-destructive hover:bg-destructive/90 font-retro"
                    >
                      DELETE
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Status Badge - Far Right */}
            <Badge variant={status === "AVAILABLE" ? "default" : "destructive"} className="font-retro shrink-0">
              {status === "AVAILABLE" ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> AVAILABLE</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" /> BOOKED</>
              )}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 text-primary" />
            <span className="font-retro text-lg">{room.capacity} SEATS</span>
            {!room.is_active && (
              <Badge variant="outline" className="ml-2 font-retro text-[10px] opacity-70">OFFLINE</Badge>
            )}
          </div>

          {room.amenities && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <Lamp className="h-4 w-4 mt-0.5 text-accent shrink-0" />
              <span className="font-retro text-sm line-clamp-2">{room.amenities}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm font-retro">
          <span className="text-muted-foreground">Next available:</span>
          <span className={isAvailable ? "text-primary" : "text-destructive"}>
            {nextAvailableText}
          </span>
        </div>

        <Button
          variant="neon"
          size="sm"
          className="w-full"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onBook?.(room);
          }}
          disabled={!room.is_active}
        >
          BOOK NOW
          <ArrowRight className="h-3 w-3 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}
