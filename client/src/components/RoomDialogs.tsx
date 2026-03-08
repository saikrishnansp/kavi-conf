import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { Room, RoomCreate } from "@/types/api";

const EMPTY_ROOMS: Room[] = [];

interface EditRoomDialogProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (roomId: string, data: Partial<RoomCreate>) => void;
  isPending?: boolean;
  allRooms?: Room[];
}

export function EditRoomDialog({
  room,
  isOpen,
  onClose,
  onSave,
  isPending,
  allRooms = EMPTY_ROOMS,
}: EditRoomDialogProps) {
  const [formData, setFormData] = useState<RoomCreate>({
    room_id: "",
    capacity: 0,
    amenities: "",
    is_split: false,
    parent_room_id: "",
  });

  useEffect(() => {
    if (room) {
      setFormData({
        room_id: room.room_id,
        capacity: room.capacity,
        amenities: room.amenities || "",
        is_split: room.is_split,
        parent_room_id: room.parent_room_id || "",
      });
    }
  }, [room, isOpen]);

  const handleSave = () => {
    if (!room) return;
    onSave(room.room_id, {
      capacity: formData.capacity,
      amenities: formData.amenities,
      is_split: formData.is_split,
      parent_room_id: formData.is_split ? formData.parent_room_id : undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-pixel text-sm text-primary">EDIT ROOM</DialogTitle>
          <DialogDescription className="font-retro text-lg">
            Update details for {room?.room_id}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit_capacity" className="font-retro">Capacity</Label>
            <Input
              id="edit_capacity"
              type="number"
              value={formData.capacity || ""}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
              className="font-retro"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit_amenities" className="font-retro">Amenities</Label>
            <Textarea
              id="edit_amenities"
              value={formData.amenities}
              onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
              placeholder="e.g., Projector, Whiteboard, 4K Display"
              className="font-retro"
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="edit_is_split" className="font-retro">Splittable Room</Label>
            <Switch
              id="edit_is_split"
              checked={formData.is_split}
              onCheckedChange={(checked) => setFormData({ ...formData, is_split: checked })}
            />
          </div>
          {formData.is_split && (
            <div className="grid gap-2">
              <Label htmlFor="edit_parent_room" className="font-retro text-primary">Parent Room</Label>
              <Select 
                value={formData.parent_room_id} 
                onValueChange={(val) => setFormData({ ...formData, parent_room_id: val })}
              >
                <SelectTrigger className="font-retro">
                  <SelectValue placeholder="Select Parent Room" />
                </SelectTrigger>
                <SelectContent>
                  {allRooms
                    .filter((r) => !r.is_split && r.room_id !== room?.room_id)
                    .map((r) => (
                      <SelectItem key={r.room_id} value={r.room_id} className="font-retro">
                        {r.room_id}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            CANCEL
          </Button>
          <Button variant="neon" onClick={handleSave} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            SAVE CHANGES
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
