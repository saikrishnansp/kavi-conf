import { useState, useMemo, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RetroBackground } from "@/components/RetroBackground";
import { RetroHeader } from "@/components/RetroHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Calendar,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Settings,
  Loader2,
  User,
  Pencil,
  Trash2,
  Power,
} from "lucide-react";
import { toast } from "sonner";
import { roomsApi } from "@/lib/api/rooms";
import { bookingsApi } from "@/lib/api/bookings";
import { usersApi } from "@/lib/api/users";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "@/contexts/AuthContext";
import type { Room, RoomCreate, UserResponse, UserCreate } from "@/types/api";
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
import {
  EditBookingDialog,
  CancelBookingDialog,
  TransferBookingDialog,
  BookingActions,
  type Booking,
} from "@/components/BookingManagementDialogs";

const Admin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [state, setState] = useState(() => ({
    activeTab: "bookings",
    isAddRoomOpen: false,
    isEditRoomOpen: false,
    isDeleteDialogOpen: false,
    selectedRoom: null as Room | null,
    selectedBooking: null as Booking | null,
    isEditBookingOpen: false,
    isCancelBookingOpen: false,
    isTransferBookingOpen: false,
    userSearch: "",
    selectedUser: null as UserResponse | null,
    isEditUserOpen: false,
    isDeleteUserOpen: false,
    editUserForm: {
      email: "",
      full_name: "",
      position: "",
      employee_id: "",
    } as Partial<UserCreate>,
    newRoom: {
      room_id: "",
      name: "",
      room_number: 0,
      capacity: 0,
      is_split: false,
      parent_room_id: "",
    } as RoomCreate,
    editRoom: {
      room_id: "",
      name: "",
      room_number: 0,
      capacity: 0,
      is_split: false,
      parent_room_id: "",
    } as RoomCreate,
  }));

  const updateState = (updates: Partial<typeof state>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const {
    activeTab,
    isAddRoomOpen,
    isEditRoomOpen,
    isDeleteDialogOpen,
    selectedRoom,
    selectedBooking,
    isEditBookingOpen,
    isCancelBookingOpen,
    isTransferBookingOpen,
    userSearch,
    selectedUser,
    isEditUserOpen,
    isDeleteUserOpen,
    editUserForm,
    newRoom,
    editRoom,
  } = state;

  const getLocalDateString = (date: Date) => {
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const todaysDateStr = getLocalDateString(new Date());

  // Queries
  const { data: roomsData, isLoading: loadingRooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.getAll(false) // Include inactive rooms for management
  });

  const { data: bookingsData, isLoading: loadingBookings } = useQuery({
    queryKey: ['bookings', { all_bookings: true }],
    queryFn: () => bookingsApi.getAll({ all_bookings: true })
  });

  const { data: todaysBookingsData } = useQuery({
    queryKey: ['bookings', { all_bookings: true, date: todaysDateStr }],
    queryFn: () => bookingsApi.getAll({ 
      all_bookings: true, 
      date: todaysDateStr,
      limit: 1 // We only need the total
    })
  });

  const { data: usersCountData } = useQuery({
    queryKey: ['usersCount'],
    queryFn: () => usersApi.getCount()
  });

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['users', { search: userSearch }],
    queryFn: () =>
      usersApi.list({
        search: userSearch,
        skip: 0,
        limit: 50,
      }),
    enabled: activeTab === "employees",
  });

  const rooms = useMemo(() => roomsData?.items || [], [roomsData]);
  const rawBookings = useMemo(() => bookingsData?.items || [], [bookingsData]);
  const users: UserResponse[] = usersData || [];

  // Map API bookings to UI Booking interface
  const bookings: Booking[] = useMemo(() => {
    return rawBookings.map(b => {
      const room = rooms.find(r => r.room_id === b.room_id);
      return {
        id: b.id,
        room_id: b.room_id,
        roomName: room?.name || "Unknown Room",
        roomNumber: room?.room_number || 0,
        subject: b.subject,
        description: b.description,
        bookedBy: b.user_id,
        date: b.start_time.split('T')[0],
        startTime: b.start_time.split('T')[1].substring(0, 5),
        endTime: b.end_time.split('T')[1].substring(0, 5),
        attendees: b.attendee_count,
        attendees_list: b.attendees,
        status: b.status,
      };
    });
  }, [rawBookings, rooms]);

  // Mutations
  const createRoomMutation = useMutation({
    mutationFn: roomsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      updateState({
        isAddRoomOpen: false,
        newRoom: { room_id: "", name: "", room_number: 0, capacity: 0, is_split: false, parent_room_id: "" }
      });
      toast.success("ROOM ADDED", { description: "The new room has been created successfully." });
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      toast.error("ERROR", { description: error.response?.data?.detail || "Failed to create room" });
    }
  });

  const updateRoomMutation = useMutation({
    mutationFn: ({ roomId, data }: { roomId: string; data: Partial<RoomCreate> }) =>
      roomsApi.update(roomId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      updateState({
        isEditRoomOpen: false,
        selectedRoom: null
      });
      toast.success("ROOM UPDATED", { description: "Room details have been saved." });
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      toast.error("ERROR", { description: error.response?.data?.detail || "Failed to update room" });
    }
  });

  const deleteRoomMutation = useMutation({
    mutationFn: roomsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      updateState({
        isDeleteDialogOpen: false,
        selectedRoom: null
      });
      toast.success("ROOM DELETED", { description: "The room has been removed." });
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      toast.error("ERROR", { description: error.response?.data?.detail || "Failed to delete room" });
    }
  });

  const cancelBookingMutation = useMutation({
    mutationFn: (bookingId: number) => bookingsApi.cancel(bookingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success("BOOKING CANCELLED", { description: "The booking has been removed." });
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      toast.error("ERROR", { description: error.response?.data?.detail || "Failed to cancel booking" });
    }
  });

  const updateBookingMutation = useMutation({
    mutationFn: ({ bookingId, data }: { bookingId: number; data: unknown }) =>
      bookingsApi.update(bookingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success("BOOKING UPDATED", { description: "Changes saved successfully." });
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      toast.error("ERROR", { description: error.response?.data?.detail || "Failed to update booking" });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: Partial<UserCreate> }) =>
      authApi.updateUser(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['usersCount'] });
      updateState({
        isEditUserOpen: false,
        selectedUser: null
      });
      toast.success("EMPLOYEE UPDATED", {
        description: "Employee details have been saved.",
      });
    },
    onError: (error: { response?: { data?: { detail?: string } } }) => {
      toast.error("ERROR", {
        description: error.response?.data?.detail || "Failed to update employee",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (employeeId: string) => usersApi.delete(employeeId, false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['usersCount'] });
      updateState({
        isDeleteUserOpen: false,
        selectedUser: null
      });
      toast.success("EMPLOYEE REMOVED", {
        description: "The employee has been deleted.",
      });
    },
  });

  if (!user?.is_admin) {
    return (
      <RetroBackground>
        <RetroHeader />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="font-pixel text-2xl text-destructive mb-4">ACCESS DENIED</h1>
          <p className="font-retro text-lg">You do not have administrative privileges to access this dashboard.</p>
        </div>
      </RetroBackground>
    );
  }

  // Check if room has future bookings
  const roomHasFutureBookings = (room_id: string) => {
    const now = new Date();
    return rawBookings.some(
      b => b.room_id === room_id && new Date(b.start_time) >= now && b.status === "confirmed"
    );
  };

  const todaysBookings = rawBookings.filter(b => b.start_time.startsWith(todaysDateStr));
  const activeRooms = rooms.filter(r => r.is_active);
  const totalEmployees = usersCountData?.total_employees || 0;

  const handleEditUser = (userToEdit: UserResponse) => {
    updateState({
      selectedUser: userToEdit,
      editUserForm: {
        email: userToEdit.email,
        full_name: userToEdit.full_name || "",
        position: userToEdit.position || "",
        employee_id: userToEdit.employee_id,
      },
      isEditUserOpen: true
    });
  };

  const handleSaveUserEdit = () => {
    if (!selectedUser) return;

    if (!editUserForm.email) {
      toast.error("ERROR", {
        description: "Email is required",
      });
      return;
    }

    updateUserMutation.mutate({
      employeeId: selectedUser.employee_id,
      data: {
        email: editUserForm.email,
        full_name: editUserForm.full_name,
        position: editUserForm.position,
      },
    });
  };

  const handleDeleteUserPrompt = (userToDelete: UserResponse) => {
    updateState({
      selectedUser: userToDelete,
      isDeleteUserOpen: true
    });
  };

  const handleConfirmDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      await deleteUserMutation.mutateAsync(selectedUser.employee_id);
    } catch (error: any) {
      // Check if it's a 400 error due to active bookings
      const detail = error.response?.data?.detail || "";
      if (error.response?.status === 400 && detail.toLowerCase().includes("active bookings")) {
        const confirmed = window.confirm(
          "This user has active bookings. Do you want to force delete them? This will cancel all their upcoming meetings."
        );
        
        if (confirmed) {
          try {
            await usersApi.delete(selectedUser.employee_id, true);
            
            // On success of force delete
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['usersCount'] });
            updateState({
              isDeleteUserOpen: false,
              selectedUser: null
            });
            
            toast.success("EMPLOYEE REMOVED (FORCED)", {
              description: "The employee and all their active bookings have been deleted.",
            });
          } catch (forceError: any) {
            toast.error("ERROR", {
              description: forceError.response?.data?.detail || "Failed to force delete employee",
            });
          }
        }
      } else {
        toast.error("ERROR", {
          description: detail || "Failed to delete employee",
        });
      }
    }
  };

  const handleAddRoom = () => {
    if (!newRoom.name || !newRoom.room_id || !newRoom.room_number || !newRoom.capacity) {
      toast.error("ERROR", {
        description: "Please fill in all required fields",
      });
      return;
    }
    
    const payload = {
      ...newRoom,
      name: newRoom.name.toUpperCase(),
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
    updateState({
      selectedRoom: room,
      editRoom: {
        room_id: room.room_id,
        name: room.name,
        room_number: room.room_number,
        capacity: room.capacity,
        is_split: room.is_split,
        parent_room_id: room.parent_room_id || "",
      },
      isEditRoomOpen: true
    });
  };

  const handleSaveEdit = () => {
    if (!selectedRoom || !editRoom.name || !editRoom.room_id || !editRoom.capacity) {
      toast.error("ERROR", {
        description: "Please fill in all required fields",
      });
      return;
    }

    updateRoomMutation.mutate({
      roomId: selectedRoom.room_id,
      data: {
        name: editRoom.name.toUpperCase(),
        room_number: editRoom.room_number,
        capacity: editRoom.capacity,
        is_split: editRoom.is_split,
        parent_room_id: editRoom.is_split ? editRoom.parent_room_id : null
      }
    });
  };

  const handleDeletePrompt = (room: Room) => {
    updateState({
      selectedRoom: room,
      isDeleteDialogOpen: true
    });
  };

  const handleDeleteRoom = () => {
    if (!selectedRoom) return;
    deleteRoomMutation.mutate(selectedRoom.room_id);
  };

  // Booking management handlers
  const handleEditBooking = (booking: Booking) => {
    updateState({
      selectedBooking: booking,
      isEditBookingOpen: true
    });
  };

  const handleSaveBooking = (updatedBooking: Booking) => {
    // Map UI Booking back to API expected data
    const apiData = {
      subject: updatedBooking.subject,
      description: updatedBooking.description,
      start_time: `${updatedBooking.date}T${updatedBooking.startTime}:00`,
      end_time: `${updatedBooking.date}T${updatedBooking.endTime}:00`,
      attendees: updatedBooking.attendees_list.map(a => a.email),
    };
    updateBookingMutation.mutate({ bookingId: updatedBooking.id, data: apiData });
    updateState({ isEditBookingOpen: false });
  };

  const handleCancelBookingPrompt = (booking: Booking) => {
    updateState({
      selectedBooking: booking,
      isCancelBookingOpen: true
    });
  };

  const handleCancelBooking = (booking: Booking) => {
    cancelBookingMutation.mutate(booking.id);
  };

  const handleTransferBookingPrompt = (booking: Booking) => {
    updateState({
      selectedBooking: booking,
      isTransferBookingOpen: true
    });
  };

  const handleTransferBooking = (booking: Booking, newRoomId: string) => {
    updateBookingMutation.mutate({ 
      bookingId: booking.id, 
      data: { room_id: newRoomId } 
    });
    updateState({ isTransferBookingOpen: false });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge variant="default" className="font-retro"><CheckCircle className="h-3 w-3 mr-1" />CONFIRMED</Badge>;
      case "completed":
        return <Badge variant="secondary" className="font-retro">COMPLETED</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="font-retro"><XCircle className="h-3 w-3 mr-1" />CANCELLED</Badge>;
      default:
        return <Badge variant="outline" className="font-retro">{status.toUpperCase()}</Badge>;
    }
  };

  if (loadingRooms || loadingBookings) {
    return (
      <RetroBackground>
        <RetroHeader />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        </div>
      </RetroBackground>
    );
  }

  return (
    <RetroBackground>
      <RetroHeader />

      <main className="container mx-auto px-4 py-6 lg:py-10">
        {/* Admin Dashboard Header */}
        <div className="mb-8">
          <h1 className="font-pixel text-xl sm:text-2xl text-primary neon-glow mb-2">
            ADMIN DASHBOARD
          </h1>
          <p className="font-retro text-lg text-muted-foreground">
            Manage rooms, bookings, and system settings
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-sm bg-primary/20">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-retro text-2xl text-foreground">{todaysBookingsData?.total || 0}</p>
                <p className="font-retro text-sm text-muted-foreground">TODAY'S BOOKINGS</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-sm bg-secondary/20">
                <Users className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="font-retro text-2xl text-foreground">{totalEmployees}</p>
                <p className="font-retro text-sm text-muted-foreground">TOTAL EMPLOYEES</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-sm bg-accent/20">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-retro text-2xl text-foreground">{rooms.length}</p>
                <p className="font-retro text-sm text-muted-foreground">TOTAL ROOMS</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-sm bg-primary/20">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-retro text-2xl text-foreground">{activeRooms.length}</p>
                <p className="font-retro text-sm text-muted-foreground">ROOMS ONLINE</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => updateState({ activeTab: val })} className="space-y-6">
          <TabsList className="grid w-full max-w-xl grid-cols-3">
            <TabsTrigger value="bookings" className="gap-2">
              <Calendar className="h-4 w-4" />
              ALL BOOKINGS
            </TabsTrigger>
            <TabsTrigger value="rooms" className="gap-2">
              <Settings className="h-4 w-4" />
              ROOM SETTINGS
            </TabsTrigger>
            <TabsTrigger value="employees" className="gap-2">
              <User className="h-4 w-4" />
              EMPLOYEES
            </TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  ALL SYSTEM BOOKINGS
                </CardTitle>
                <Badge variant="outline" className="font-retro">
                  {new Date().toLocaleDateString()}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-border">
                        <th className="text-left p-3 font-retro text-sm text-muted-foreground">ROOM</th>
                        <th className="text-left p-3 font-retro text-sm text-muted-foreground">SUBJECT</th>
                        <th className="text-left p-3 font-retro text-sm text-muted-foreground">BOOKED BY</th>
                        <th className="text-left p-3 font-retro text-sm text-muted-foreground">TIME</th>
                        <th className="text-left p-3 font-retro text-sm text-muted-foreground">ATTENDEES</th>
                        <th className="text-left p-3 font-retro text-sm text-muted-foreground">STATUS</th>
                        <th className="text-left p-3 font-retro text-sm text-muted-foreground">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center font-retro text-muted-foreground">
                            No bookings found in the system.
                          </td>
                        </tr>
                      ) : (
                        bookings.map((booking, index) => {
                          const showDateHeader = index === 0 || booking.date !== bookings[index - 1].date;
                          return (
                            <Fragment key={booking.id}>
                              {showDateHeader && (
                                <tr className='bg-muted/30'>
                                  <td colSpan={7} className='p-2 px-4'>
                                    <div className='flex items-center gap-2 text-primary font-pixel text-[10px]'>
                                      <Calendar className='h-3 w-3' />
                                      {new Date(booking.date).toLocaleDateString('en-US', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                      }).toUpperCase()}
                                    </div>
                                  </td>
                                </tr>
                              )}
                              <tr className="border-b border-border hover:bg-muted/5">
                                <td className="p-3">
                                  <p className="font-pixel text-xs">{booking.roomName}</p>
                                  <p className="font-retro text-sm text-muted-foreground">#{booking.roomNumber}</p>
                                </td>
                                <td className="p-3 font-retro text-lg">{booking.subject}</td>
                                <td className="p-3 font-retro text-lg text-muted-foreground">{booking.bookedBy}</td>
                                <td className="p-3 font-retro text-lg text-primary">
                                  <div className="flex flex-col">
                                    <span>{booking.startTime} - {booking.endTime}</span>
                                    <span className="text-[10px] text-muted-foreground">{booking.date}</span>
                                  </div>
                                </td>
                                <td className="p-3 font-retro text-lg">{booking.attendees}</td>
                                <td className="p-3">{getStatusBadge(booking.status)}</td>
                                <td className="p-3">
                                  <BookingActions
                                    booking={booking}
                                    onEdit={handleEditBooking}
                                    onCancel={handleCancelBookingPrompt}
                                    onTransfer={handleTransferBookingPrompt}
                                    compact
                                  />
                                </td>
                              </tr>
                            </Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Room Settings Tab */}
          <TabsContent value="rooms" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-pixel text-sm text-foreground">MANAGE ROOMS</h2>
              <Dialog open={isAddRoomOpen} onOpenChange={(val) => updateState({ isAddRoomOpen: val })}>
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
                    <div className="grid gap-2">
                      <Label htmlFor="room_id" className="font-retro">Room ID (Unique)</Label>
                      <Input
                        id="room_id"
                        value={newRoom.room_id}
                        onChange={(e) => updateState({ newRoom: { ...newRoom, room_id: e.target.value } })}
                        placeholder="e.g., 101-CONF-A"
                        className="font-retro"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="name" className="font-retro">Room Name</Label>
                      <Input
                        id="name"
                        value={newRoom.name}
                        onChange={(e) => updateState({ newRoom: { ...newRoom, name: e.target.value } })}
                        placeholder="e.g., NEON LOUNGE"
                        className="font-retro"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="room_number" className="font-retro">Number</Label>
                        <Input
                          id="room_number"
                          type="number"
                          value={newRoom.room_number || ""}
                          onChange={(e) => updateState({ newRoom: { ...newRoom, room_number: parseInt(e.target.value) || 0 } })}
                          placeholder="101"
                          className="font-retro"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="capacity" className="font-retro">Capacity</Label>
                        <Input
                          id="capacity"
                          type="number"
                          value={newRoom.capacity || ""}
                          onChange={(e) => updateState({ newRoom: { ...newRoom, capacity: parseInt(e.target.value) || 0 } })}
                          placeholder="8"
                          className="font-retro"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="is_split" className="font-retro">Splittable Room</Label>
                      <Switch
                        id="is_split"
                        checked={newRoom.is_split}
                        onCheckedChange={(checked) => updateState({ newRoom: { ...newRoom, is_split: checked } })}
                      />
                    </div>
                    {newRoom.is_split && (
                      <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                        <Label htmlFor="parent_room" className="font-retro text-primary">Parent Room</Label>
                        <Select 
                          value={newRoom.parent_room_id} 
                          onValueChange={(val) => updateState({ newRoom: { ...newRoom, parent_room_id: val } })}
                        >
                          <SelectTrigger className="font-retro">
                            <SelectValue placeholder="Select Parent Room" />
                          </SelectTrigger>
                          <SelectContent>
                            {rooms.filter(r => !r.is_split).map((room) => (
                              <SelectItem key={room.room_id} value={room.room_id} className="font-retro">
                                {room.name} (#{room.room_number})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => updateState({ isAddRoomOpen: false })}>
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
                        <th className="text-left p-3 font-retro text-sm text-muted-foreground">ROOM</th>
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
                                <p className="font-pixel text-xs">{room.name}</p>
                                <p className="font-retro text-sm text-muted-foreground">#{room.room_number}</p>
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
          </TabsContent>

          {/* Employees Tab */}
          <TabsContent value="employees" className="space-y-4">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between gap-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-secondary" />
                  EMPLOYEE DIRECTORY
                </CardTitle>
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Search by name, email or employee ID..."
                    className="font-retro w-64"
                    value={userSearch}
                    onChange={(e) => updateState({ userSearch: e.target.value })}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-border">
                        <th className="text-left p-3 font-retro text-sm text-muted-foreground">
                          EMPLOYEE ID
                        </th>
                        <th className="text-left p-3 font-retro text-sm text-muted-foreground">
                          NAME
                        </th>
                        <th className="text-left p-3 font-retro text-sm text-muted-foreground">
                          EMAIL
                        </th>
                        <th className="text-left p-3 font-retro text-sm text-muted-foreground">
                          POSITION
                        </th>
                        <th className="text-left p-3 font-retro text-sm text-muted-foreground">
                          ROLE
                        </th>
                        <th className="text-left p-3 font-retro text-sm text-muted-foreground">
                          CREATED
                        </th>
                        <th className="text-left p-3 font-retro text-sm text-muted-foreground">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingUsers ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center">
                            <Loader2 className="h-6 w-6 text-primary animate-spin inline-block" />
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="p-8 text-center font-retro text-muted-foreground"
                          >
                            No employees found.
                          </td>
                        </tr>
                      ) : (
                        users.map((emp) => (
                          <tr
                            key={emp.employee_id}
                            className="border-b border-border hover:bg-muted/5"
                          >
                            <td className="p-3 font-retro text-lg">{emp.employee_id}</td>
                            <td className="p-3 font-retro text-lg">
                              {emp.full_name || "-"}
                            </td>
                            <td className="p-3 font-retro text-lg text-muted-foreground">
                              {emp.email}
                            </td>
                            <td className="p-3 font-retro text-lg">
                              {emp.position || "-"}
                            </td>
                            <td className="p-3">
                              <Badge
                                variant={emp.is_admin ? "default" : "outline"}
                                className="font-retro"
                              >
                                {emp.is_admin ? "ADMIN" : "USER"}
                              </Badge>
                            </td>
                            <td className="p-3 font-retro text-sm text-muted-foreground">
                              {new Date(emp.created_at).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditUser(emp)}
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  EDIT
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteUserPrompt(emp)}
                                  disabled={emp.employee_id === user?.employee_id}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  DELETE
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Room Dialog */}
        <Dialog open={isEditRoomOpen} onOpenChange={(val) => updateState({ isEditRoomOpen: val })}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-pixel text-sm text-primary">EDIT ROOM</DialogTitle>
              <DialogDescription className="font-retro text-lg">
                Update the room details.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_name" className="font-retro">Room Name</Label>
                <Input
                  id="edit_name"
                  value={editRoom.name}
                  onChange={(e) => updateState({ editRoom: { ...editRoom, name: e.target.value } })}
                  placeholder="e.g., NEON LOUNGE"
                  className="font-retro"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit_room_number" className="font-retro">Number</Label>
                  <Input
                    id="edit_room_number"
                    type="number"
                    value={editRoom.room_number || ""}
                    onChange={(e) => updateState({ editRoom: { ...editRoom, room_number: parseInt(e.target.value) || 0 } })}
                    className="font-retro"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit_capacity" className="font-retro">Capacity</Label>
                  <Input
                    id="edit_capacity"
                    type="number"
                    value={editRoom.capacity || ""}
                    onChange={(e) => updateState({ editRoom: { ...editRoom, capacity: parseInt(e.target.value) || 0 } })}
                    className="font-retro"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit_is_split" className="font-retro">Splittable Room</Label>
                <Switch
                  id="edit_is_split"
                  checked={editRoom.is_split}
                  onCheckedChange={(checked) => updateState({ editRoom: { ...editRoom, is_split: checked } })}
                />
              </div>
              {editRoom.is_split && (
                <div className="grid gap-2">
                  <Label htmlFor="edit_parent_room" className="font-retro text-primary">Parent Room</Label>
                  <Select 
                    value={editRoom.parent_room_id} 
                    onValueChange={(val) => updateState({ editRoom: { ...editRoom, parent_room_id: val } })}
                  >
                    <SelectTrigger className="font-retro">
                      <SelectValue placeholder="Select Parent Room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.filter(r => !r.is_split && r.room_id !== editRoom.room_id).map((room) => (
                        <SelectItem key={room.room_id} value={room.room_id} className="font-retro">
                          {room.name} (#{room.room_number})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => updateState({ isEditRoomOpen: false })}>
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
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={(val) => updateState({ isDeleteDialogOpen: val })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-pixel text-sm text-destructive">DELETE ROOM</AlertDialogTitle>
              <AlertDialogDescription className="font-retro text-lg">
                This room has no future bookings. Are you sure you want to permanently delete <span className="text-primary font-bold">{selectedRoom?.name}</span>?
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

        {/* Edit Employee Dialog */}
        <Dialog open={isEditUserOpen} onOpenChange={(val) => updateState({ isEditUserOpen: val })}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-pixel text-sm text-primary">
                EDIT EMPLOYEE
              </DialogTitle>
              <DialogDescription className="font-retro text-lg">
                Update the employee details.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="font-retro">EMPLOYEE ID</Label>
                <Input
                  value={editUserForm.employee_id || ""}
                  disabled
                  className="font-retro opacity-70"
                />
              </div>
              <div className="grid gap-2">
                <Label className="font-retro">EMAIL *</Label>
                <Input
                  value={editUserForm.email || ""}
                  onChange={(e) =>
                    updateState({ editUserForm: { ...editUserForm, email: e.target.value } })
                  }
                  type="email"
                  className="font-retro"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label className="font-retro">FULL NAME</Label>
                <Input
                  value={editUserForm.full_name || ""}
                  onChange={(e) =>
                    updateState({ editUserForm: { ...editUserForm, full_name: e.target.value } })
                  }
                  className="font-retro"
                  placeholder="Employee name"
                />
              </div>
              <div className="grid gap-2">
                <Label className="font-retro">POSITION</Label>
                <Input
                  value={editUserForm.position || ""}
                  onChange={(e) =>
                    updateState({ editUserForm: { ...editUserForm, position: e.target.value } })
                  }
                  className="font-retro"
                  placeholder="Job title"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => updateState({ isEditUserOpen: false })}>
                CANCEL
              </Button>
              <Button
                variant="neon"
                onClick={handleSaveUserEdit}
                disabled={updateUserMutation.isPending}
              >
                {updateUserMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                SAVE CHANGES
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Employee Confirmation Dialog */}
        <AlertDialog open={isDeleteUserOpen} onOpenChange={(val) => updateState({ isDeleteUserOpen: val })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-pixel text-sm text-destructive">
                DELETE EMPLOYEE
              </AlertDialogTitle>
              <AlertDialogDescription className="font-retro text-lg">
                Are you sure you want to permanently remove{" "}
                <span className="text-primary font-bold">
                  {selectedUser?.full_name || selectedUser?.email}
                </span>
                ? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-retro">
                CANCEL
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteUser}
                className="bg-destructive hover:bg-destructive/90 font-retro"
                disabled={deleteUserMutation.isPending}
              >
                {deleteUserMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                DELETE
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Booking Management Dialogs */}
        <EditBookingDialog
          booking={selectedBooking}
          isOpen={isEditBookingOpen}
          onClose={() => {
            updateState({ isEditBookingOpen: false, selectedBooking: null });
          }}
          onSave={handleSaveBooking}
        />
        <CancelBookingDialog
          booking={selectedBooking}
          isOpen={isCancelBookingOpen}
          onClose={() => {
            updateState({ isCancelBookingOpen: false, selectedBooking: null });
          }}
          onConfirm={handleCancelBooking}
        />
        <TransferBookingDialog
          booking={selectedBooking}
          rooms={rooms}
          isOpen={isTransferBookingOpen}
          onClose={() => {
            updateState({ isTransferBookingOpen: false, selectedBooking: null });
          }}
          onTransfer={handleTransferBooking}
        />
      </main>
    </RetroBackground>
  );
};

export default Admin;