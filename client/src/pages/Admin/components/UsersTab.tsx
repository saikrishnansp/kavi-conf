import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { usersApi } from "@/lib/api/users";
import { authApi } from "@/lib/api/auth";
import { useAuth } from "@/contexts/AuthContext";
import PageLoader from "@/components/ui/PageLoader";
import type { UserResponse, UserCreate } from "@/types/api";

export const UsersTab = () => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false);
  const [editUserForm, setEditUserForm] = useState<Partial<UserCreate>>({
    email: "",
    full_name: "",
    position: "",
    employee_id: "",
  });

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['users', { search: userSearch }],
    queryFn: () =>
      usersApi.list({
        search: userSearch,
        skip: 0,
        limit: 50,
      }),
  });

  const users: UserResponse[] = usersData || [];

  const updateUserMutation = useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: Partial<UserCreate> }) =>
      authApi.updateUser(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['usersCount'] });
      setIsEditUserOpen(false);
      setSelectedUser(null);
      toast.success("EMPLOYEE UPDATED", {
        description: "Employee details have been saved.",
      });
    },
    onError: (error: any) => {
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
      setIsDeleteUserOpen(false);
      setSelectedUser(null);
      toast.success("EMPLOYEE REMOVED", {
        description: "The employee has been deleted.",
      });
    },
  });

  const handleEditUser = (userToEdit: UserResponse) => {
    setSelectedUser(userToEdit);
    setEditUserForm({
      email: userToEdit.email,
      full_name: userToEdit.full_name || "",
      position: userToEdit.position || "",
      employee_id: userToEdit.employee_id,
    });
    setIsEditUserOpen(true);
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
    setSelectedUser(userToDelete);
    setIsDeleteUserOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      await deleteUserMutation.mutateAsync(selectedUser.employee_id);
    } catch (error: any) {
      const detail = error.response?.data?.detail || "";
      if (error.response?.status === 400 && detail.toLowerCase().includes("active bookings")) {
        const confirmed = window.confirm(
          "This user has active bookings. Do you want to force delete them? This will cancel all their upcoming meetings."
        );
        
        if (confirmed) {
          try {
            await usersApi.delete(selectedUser.employee_id, true);
            queryClient.invalidateQueries({ queryKey: ['users'] });
            queryClient.invalidateQueries({ queryKey: ['usersCount'] });
            setIsDeleteUserOpen(false);
            setSelectedUser(null);
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

  return (
    <div className="space-y-4">
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
              onChange={(e) => setUserSearch(e.target.value)}
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
                      <PageLoader />
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
                            disabled={emp.employee_id === currentUser?.employee_id}
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

      {/* Edit Employee Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
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
                  setEditUserForm({ ...editUserForm, email: e.target.value })
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
                  setEditUserForm({ ...editUserForm, full_name: e.target.value })
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
                  setEditUserForm({ ...editUserForm, position: e.target.value })
                }
                className="font-retro"
                placeholder="Job title"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
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
      <AlertDialog open={isDeleteUserOpen} onOpenChange={setIsDeleteUserOpen}>
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
    </div>
  );
};