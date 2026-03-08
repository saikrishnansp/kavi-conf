import AttendeeSelect from "./AttendeeSelect";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRightLeft, Edit, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import type { AttendeeDetail, Room } from "@/types/api";

export interface Booking {
  id: number;
  room_id: string;
  subject: string;
  description?: string;
  bookedBy: string;
  date: string;
  startTime: string;
  endTime: string;
  attendees: number;
  attendees_list: AttendeeDetail[];
  status: "confirmed" | "completed" | "cancelled";
}

interface EditBookingDialogProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (booking: Booking) => void;
}

export function EditBookingDialog({ booking, isOpen, onClose, onSave }: EditBookingDialogProps) {
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    attendeeEmails: [] as string[],
  });

  // Update form when booking changes
  useEffect(() => {
    if (booking) {
      setFormData({
        subject: booking.subject,
        description: booking.description || "",
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        attendeeEmails: booking.attendees_list?.map(a => a.email) || [],
      });
    }
  }, [booking, isOpen]);

  const handleSave = () => {
    if (!booking) return;
    onSave({
      ...booking,
      subject: formData.subject,
      description: formData.description,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      attendees_list: formData.attendeeEmails.map(email => ({
        email,
        full_name: "", // Will be hydrated by backend
      })),
      attendees: formData.attendeeEmails.length,
    });
    onClose();
  };

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-pixel text-sm text-primary flex items-center gap-2">
            <Edit className="h-4 w-4" />
            EDIT BOOKING
          </DialogTitle>
          <DialogDescription className="font-retro text-lg">
            Modify booking details for {booking.room_id}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="subject" className="font-retro">Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="font-retro"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description" className="font-retro">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="font-retro"
              rows={2}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="date" className="font-retro">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="font-retro"
            />
          </div>
          <div className="grid gap-2">
            <Label className="font-retro">Attendees</Label>
            <AttendeeSelect
              selectedEmails={formData.attendeeEmails}
              onChange={(emails) => setFormData({ ...formData, attendeeEmails: emails })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startTime" className="font-retro">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="font-retro"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endTime" className="font-retro">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="font-retro"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>CANCEL</Button>
          <Button variant="neon" onClick={handleSave}>SAVE CHANGES</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CancelBookingDialogProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (booking: Booking) => void;
}

export function CancelBookingDialog({ booking, isOpen, onClose, onConfirm }: CancelBookingDialogProps) {
  if (!booking) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-pixel text-sm text-destructive flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            CANCEL BOOKING
          </AlertDialogTitle>
          <AlertDialogDescription className="font-retro text-lg">
            Are you sure you want to cancel <span className="text-primary font-bold">"{booking.subject}"</span> in {booking.room_id} on {booking.date}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="font-retro">GO BACK</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => {
              onConfirm(booking);
              onClose();
            }} 
            className="bg-destructive hover:bg-destructive/90 font-retro"
          >
            CANCEL BOOKING
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface TransferBookingDialogProps {
  booking: Booking | null;
  rooms: Room[];
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (booking: Booking, newRoomId: string) => void;
}

export function TransferBookingDialog({ booking, rooms, isOpen, onClose, onTransfer }: TransferBookingDialogProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");

  const availableRooms = rooms.filter(r => 
    r.is_active && r.room_id !== booking?.room_id
  );

  const handleTransfer = () => {
    if (!booking || !selectedRoomId) return;
    onTransfer(booking, selectedRoomId);
    setSelectedRoomId("");
    onClose();
  };

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-pixel text-sm text-primary flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            TRANSFER BOOKING
          </DialogTitle>
          <DialogDescription className="font-retro text-lg">
            Move "{booking.subject}" to a different room.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="p-3 rounded-sm bg-muted/20 border border-border">
            <p className="font-retro text-sm text-muted-foreground">Current Room</p>
            <p className="font-pixel text-xs text-foreground">{booking.room_id}</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="newRoom" className="font-retro">Transfer To</Label>
            <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
              <SelectTrigger className="font-retro">
                <SelectValue placeholder="Select a room" />
              </SelectTrigger>
              <SelectContent>
                {availableRooms.map((room) => (
                  <SelectItem key={room.room_id} value={room.room_id} className="font-retro">
                    {room.room_id} (Cap: {room.capacity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>CANCEL</Button>
          <Button 
            variant="neon" 
            onClick={handleTransfer}
            disabled={!selectedRoomId}
          >
            TRANSFER
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface BookingActionsProps {
  booking: Booking;
  onEdit: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
  onTransfer: (booking: Booking) => void;
  compact?: boolean;
}

export function BookingActions({ booking, onEdit, onCancel, onTransfer, compact = false }: BookingActionsProps) {
  if (booking.status !== "confirmed") {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => onEdit(booking)} title="Edit">
          <Edit className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onTransfer(booking)} title="Transfer">
          <ArrowRightLeft className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onCancel(booking)} title="Cancel" className="text-destructive hover:text-destructive">
          <XCircle className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => onEdit(booking)}>
        <Edit className="h-3 w-3 mr-1" />
        EDIT
      </Button>
      <Button variant="outline" size="sm" onClick={() => onTransfer(booking)}>
        <ArrowRightLeft className="h-3 w-3 mr-1" />
        TRANSFER
      </Button>
      <Button variant="destructive" size="sm" onClick={() => onCancel(booking)}>
        <XCircle className="h-3 w-3 mr-1" />
        CANCEL
      </Button>
    </div>
  );
}
