import { useState } from "react";
import { RoomCard } from "@/components/RoomCard";
import { RoomCardAdmin } from "@/components/ui/RoomCardAdmin";
import { BookRoomDialog } from "@/components/BookRoomDialog";
import { RoomWithBookings } from "../types";
import { Room } from "@/types/api";

interface RoomsListTabProps {
  rooms: RoomWithBookings[];
  isAdmin: boolean;
  onEditRoom: (room: Room) => void;
}

export const RoomsListTab = ({
  rooms,
  isAdmin,
  onEditRoom,
}: RoomsListTabProps) => {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
      {rooms.map((room) => {
        if (isAdmin) {
          return (
            <RoomCardAdmin
              key={room.room_id}
              room={room}
              onEdit={onEditRoom}
              onBook={(room) => setSelectedRoom(room)}
            />
          );
        }

        return (
          <RoomCard
            key={room.room_id}
            room={room}
            onBook={(room) => setSelectedRoom(room)}
          />
        );
      })}

      <BookRoomDialog
        room={selectedRoom}
        isOpen={selectedRoom !== null}
        onClose={() => setSelectedRoom(null)}
      />
    </div>
  );
};
