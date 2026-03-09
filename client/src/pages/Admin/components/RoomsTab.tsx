import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Settings, Loader2, Pencil, Trash2, Power } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { roomsApi } from "@/lib/api/rooms";
import PageLoader from "@/components/ui/PageLoader";
import type { Room, RoomCreate } from "@/types/api";

export const RoomsTab = () => {
  const queryClient = useQueryClient();

  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isEditRoomOpen, setIsEditRoomOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const [newRoom, setNewRoom] = useState<RoomCreate>({
    room_id: "",
    capacity: 0,
    amenities: "",
    is_split: false,
    parent_room_id: "",
  });

  const [editRoom, setEditRoom] = useState<RoomCreate>({
    room_id: "",
    capacity: 0,
    amenities: "",
    is_split: false,
    parent_room_id: "",
  });

  const { data: roomsData, isLoading: loadingRooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.getAll(false)
  });

  const rooms = useMemo(() => roomsData?.items || [], [roomsData]);

  const createRoomMutation = useMutation({
    mutationFn: roomsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setIsAddRoomOpen(false);
      setNewRoom({ room_id: "", capacity: 0, amenities: "", is_split: false, parent_room_id: "" });
      toast.success("ROOM ADDED", { description: "The new room has been created successfully." });
    },
    onError: (err: any) => {
      const backendMessage = err.response?.data?.detail || err.message;
      toast.error("ACTION FAILED", {
        description: backendMessage,
      });
    }
  });

  const updateRoomMutation = useMutation({
    mutationFn: ({ roomId, data }: { roomId: string; data: Partial<RoomCreate> }) =>
      roomsApi.update(roomId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setIsEditRoomOpen(false);
      setSelectedRoom(null);
      toast.success("ROOM UPDATED", { description: "Room details have been saved." });
    },
    onError: (err: any) => {
      const backendMessage = err.response?.data?.detail || err.message;
      toast.error("ACTION FAILED", {
        description: backendMessage,
      });
    }
  });

  const deleteRoomMutation = useMutation({
    mutationFn: roomsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setIsDeleteDialogOpen(false);
      setSelectedRoom(null);
      toast.error("ROOM DELETED", { description: "The room has been removed." });
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail || err.message || "Failed to delete room.";
      let userFriendlyMessage = detail;

      // Make the backend database constraints user-friendly
      if (detail.toLowerCase().includes("child") || detail.toLowerCase().includes("parent")) {
        userFriendlyMessage = "Cannot delete a parent room. Please delete its child rooms first, or Edit this room and toggle 'Active' to off to hide it.";
      } else if (detail.toLowerCase().includes("history") || detail.toLowerCase().includes("booking")) {
        userFriendlyMessage = "Cannot delete a room with past bookings. Please Edit this room and toggle 'Active' to off to hide it instead.";
      }

      toast.error("Action Blocked", {
        description: userFriendlyMessage,
        duration: 6000,
      });
    }
  });

  const handleAddRoom = () => {
    if (!newRoom.room_id || !newRoom.capacity) {
      toast.error("ERROR", {
        description: "Please fill in all required fields",
      });
      return;
    }
    
    const payload = {
      ...newRoom,
      parent_room_id: newRoom.is_split ? newRoom.parent_room_id : undefined
    };
    
    createRoomMutation.mutate(payload);
  };

  const handleToggleActive = (room: Room) => {
    updateRoomMutation.mutate({ 
      roomId: room.room_id, 
      data: { is_active: !room.is_active } 
    });
  };

  const handleEditRoom = (room: Room) => {
    setSelectedRoom(room);
    setEditRoom({
      room_id: room.room_id,
      capacity: room.capacity,
      amenities: room.amenities || "",
      is_split: room.is_split,
      parent_room_id: room.parent_room_id || "",
    });
    setIsEditRoomOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedRoom || !editRoom.room_id || !editRoom.capacity) {
      toast.error("ERROR", {
        description: "Please fill in all required fields",
      });
      return;
    }

    updateRoomMutation.mutate({
      roomId: selectedRoom.room_id,
      data: {
        capacity: editRoom.capacity,
        amenities: editRoom.amenities,
        is_split: editRoom.is_split,
        parent_room_id: editRoom.is_split ? editRoom.parent_room_id : null
      }
    });
  };

  const handleDeletePrompt = (room: Room) => {
    setSelectedRoom(room);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteRoom = () => {
    if (!selectedRoom) return;
    deleteRoomMutation.mutate(selectedRoom.room_id);
  };

  if (loadingRooms) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-pixel text-sm text-foreground">MANAGE ROOMS</h2>
        <Dialog open={isAddRoomOpen} onOpenChange={setIsAddRoomOpen}>
          <DialogTrigger asChild>
            <Button variant="neon" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              ADD ROOM
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-pixel text-sm text-primary">ADD NEW ROOM</DialogTitle>
              <DialogDescription className="font-retro text-lg">
                Enter the details for the new room.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="room_id" className="font-retro">Room ID (Unique)</Label>
                  <Input
                    id="room_id"
                    value={newRoom.room_id}
                    onChange={(e) => setNewRoom({ ...newRoom, room_id: e.target.value })}
                    placeholder="e.g., 101-CONF-A"
                    className="font-retro"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="capacity" className="font-retro">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={newRoom.capacity || ""}
                    onChange={(e) => setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) || 0 })}
                    placeholder="8"
                    className="font-retro"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amenities" className="font-retro">Amenities</Label>
                <Textarea
                  id="amenities"
                  value={newRoom.amenities}
                  onChange={(e) => setNewRoom({ ...newRoom, amenities: e.target.value })}
                  placeholder="e.g., Projector, Whiteboard..."
                  className="font-retro"
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is_split" className="font-retro">Splittable Room</Label>
                <Switch
                  id="is_split"
                  checked={newRoom.is_split}
                  onCheckedChange={(checked) => setNewRoom({ ...newRoom, is_split: checked })}
                />
              </div>
              {newRoom.is_split && (
                <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                  <Label htmlFor="parent_room" className="font-retro text-primary">Parent Room</Label>
                  <Select 
                    value={newRoom.parent_room_id} 
                    onValueChange={(val) => setNewRoom({ ...newRoom, parent_room_id: val })}
                  >
                    <SelectTrigger className="font-retro">
                      <SelectValue placeholder="Select Parent Room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.filter(r => !r.is_split).map((room) => (
                        <SelectItem key={room.room_id} value={room.room_id} className="font-retro">
                          {room.room_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddRoomOpen(false)}>
                CANCEL
              </Button>
              <Button variant="neon" onClick={handleAddRoom} disabled={createRoomMutation.isPending}>
                {createRoomMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                CREATE ROOM
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left p-3 font-retro text-sm text-muted-foreground">ROOM ID</th>
                  <th className="text-left p-3 font-retro text-sm text-muted-foreground">CAPACITY</th>
                  <th className="text-left p-3 font-retro text-sm text-muted-foreground">AVAILABILITY</th>
                  <th className="text-left p-3 font-retro text-sm text-muted-foreground">STATUS</th>
                  <th className="text-left p-3 font-retro text-sm text-muted-foreground">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {rooms.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center font-retro text-muted-foreground">
                      No rooms found in the system.
                    </td>
                  </tr>
                ) : (
                  rooms.map((room) => {
                    const isAvailable = !room.next_available_at || new Date(room.next_available_at) <= new Date();
                    const formatTime = (isoString: string) => {
                      return new Date(isoString).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: false 
                      });
                    };

                    return (
                      <tr key={room.room_id} className="border-b border-border hover:bg-muted/5">
                        <td className="p-3">
                          <p className="font-pixel text-xs">{room.room_id}</p>
                        </td>
                        <td className="p-3 font-retro text-lg">{room.capacity} seats</td>
                        <td className="p-3">
                          <div className="font-retro text-sm">
                            <span className="text-muted-foreground">Next: </span>
                            <span className={isAvailable ? "text-primary" : "text-destructive"}>
                              {isAvailable ? "NOW" : formatTime(room.next_available_at!)}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant={room.is_active ? "default" : "destructive"} className="font-retro">
                            {room.is_active ? "ONLINE" : "OFFLINE"}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEditRoom(room)}
                              title="Edit Room"
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              EDIT
                            </Button>
                            <Button 
                              variant={room.is_active ? "destructive" : "default"} 
                              size="sm"
                              onClick={() => handleToggleActive(room)}
                              disabled={updateRoomMutation.isPending}
                              title={room.is_active ? "Deactivate Room" : "Activate Room"}
                            >
                              <Power className="h-3 w-3 mr-1" />
                              {room.is_active ? "OFF" : "ON"}
                            </Button>
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handleDeletePrompt(room)}
                              title="Delete Room"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              DEL
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Room Dialog */}
      <Dialog open={isEditRoomOpen} onOpenChange={setIsEditRoomOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-pixel text-sm text-primary">EDIT ROOM</DialogTitle>
            <DialogDescription className="font-retro text-lg">
              Update details for {selectedRoom?.room_id}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_capacity" className="font-retro">Capacity</Label>
              <Input
                id="edit_capacity"
                type="number"
                value={editRoom.capacity || ""}
                onChange={(e) => setEditRoom({ ...editRoom, capacity: parseInt(e.target.value) || 0 })}
                className="font-retro"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_amenities" className="font-retro">Amenities</Label>
              <Textarea
                id="edit_amenities"
                value={editRoom.amenities}
                onChange={(e) => setEditRoom({ ...editRoom, amenities: e.target.value })}
                placeholder="e.g., Projector, Whiteboard..."
                className="font-retro"
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit_is_split" className="font-retro">Splittable Room</Label>
              <Switch
                id="edit_is_split"
                checked={editRoom.is_split}
                onCheckedChange={(checked) => setEditRoom({ ...editRoom, is_split: checked })}
              />
            </div>
            {editRoom.is_split && (
              <div className="grid gap-2">
                <Label htmlFor="edit_parent_room" className="font-retro text-primary">Parent Room</Label>
                <Select 
                  value={editRoom.parent_room_id} 
                  onValueChange={(val) => setEditRoom({ ...editRoom, parent_room_id: val })}
                >
                  <SelectTrigger className="font-retro">
                    <SelectValue placeholder="Select Parent Room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.filter(r => !r.is_split && r.room_id !== editRoom.room_id).map((room) => (
                      <SelectItem key={room.room_id} value={room.room_id} className="font-retro">
                        {room.room_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditRoomOpen(false)}>
              CANCEL
            </Button>
            <Button variant="neon" onClick={handleSaveEdit} disabled={updateRoomMutation.isPending}>
              {updateRoomMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              SAVE CHANGES
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixel text-sm text-destructive">DELETE ROOM</AlertDialogTitle>
            <AlertDialogDescription className="font-retro text-lg">
              This room has no future bookings. Are you sure you want to permanently delete <span className="text-primary font-bold">{selectedRoom?.room_id}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-retro">CANCEL</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteRoom} 
              className="bg-destructive hover:bg-destructive/90 font-retro"
              disabled={deleteRoomMutation.isPending}
            >
              {deleteRoomMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              DELETE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
