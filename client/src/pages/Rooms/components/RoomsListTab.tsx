import { RoomCard } from "@/components/RoomCard";
import { RoomCardAdmin } from "@/components/ui/RoomCardAdmin";
import { RoomWithBookings } from "../types";
import { Room } from "@/types/api";

interface RoomsListTabProps {
  rooms: RoomWithBookings[];
  isAdmin: boolean;
  onEditRoom: (room: Room) => void;
  onBookRoom: (room: Room) => void;
}

export const RoomsListTab = ({
  rooms,
  isAdmin,
  onEditRoom,
  onBookRoom,
}: RoomsListTabProps) => {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
      {rooms.map((room) => {
        if (isAdmin) {
          return (
            <RoomCardAdmin
              key={room.room_id}
              room={room}
              onEdit={onEditRoom}
            />
          );
        }

        return (
          <RoomCard
            key={room.room_id}
            room={room}
            onBook={() => onBookRoom(room)}
          />
        );
      })}
    </div>
  );
};
