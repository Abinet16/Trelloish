// src/pages/AdminPage.tsx
import { useMutation, useQuery } from "@apollo/client/react"; // Corrected import path
import { ADMIN_UPDATE_USER_STATUS, GET_ALL_USERS_ADMIN } from "@/api/graphql";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast"; // Corrected import path
import { Shield, UserX, UserCheck, Loader2 } from "lucide-react";

// --- FIX IS HERE: Step 1 - Define the types for your data ---

// This type represents a single user object returned by the query
interface User {
  id: string;
  email: string;
  globalStatus: "ACTIVE" | "BANNED" | "ADMIN";
}

// This type represents the entire data object returned by the query
interface GetAllUsersData {
  getAllUsers: User[];
}

export function AdminPage() {
  // --- FIX IS HERE: Step 2 - Use the generic to type the useQuery hook ---
  const { data, loading, error } =
    useQuery<GetAllUsersData>(GET_ALL_USERS_ADMIN);
  const { toast } = useToast();

  const [updateUserStatus, { loading: updating }] = useMutation(
    ADMIN_UPDATE_USER_STATUS,
    {
      onCompleted: (data:any) => {
        // data is now strongly typed
        toast({
          title: "User Status Updated",
          description: `User ${data.adminUpdateUserStatus.email} is now ${data.adminUpdateUserstatus.globalStatus}.`,
        });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: err.message,
        });
      },
      refetchQueries: [{ query: GET_ALL_USERS_ADMIN }],
    }
  );

  // The 'user' parameter is now strongly typed as 'User', no need for 'any'
  const handleToggleBan = (user: User) => {
    const newStatus = user.globalStatus === "BANNED" ? "ACTIVE" : "BANNED";
    updateUserStatus({ variables: { userId: user.id, status: newStatus } });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-500">
        Error: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Site Administration
          </h1>
          <p className="text-muted-foreground">
            Manage all users in the system.
          </p>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* TypeScript now knows that data.getAllUsers exists and is an array of User objects */}
          {data?.getAllUsers.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.email}</TableCell>
              <TableCell>
                {user.globalStatus === "ADMIN" && (
                  <Badge
                    variant="destructive"
                    className="flex items-center w-fit"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Admin
                  </Badge>
                )}
                {user.globalStatus === "ACTIVE" && (
                  <Badge variant="secondary">Active</Badge>
                )}
                {user.globalStatus === "BANNED" && (
                  <Badge variant="outline">Banned</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {user.globalStatus !== "ADMIN" && (
                  <Button
                    variant={
                      user.globalStatus === "BANNED"
                        ? "secondary"
                        : "destructive"
                    }
                    size="sm"
                    onClick={() => handleToggleBan(user)}
                    disabled={updating}
                  >
                    {user.globalStatus === "BANNED" ? (
                      <UserCheck className="mr-2 h-4 w-4" />
                    ) : (
                      <UserX className="mr-2 h-4 w-4" />
                    )}
                    {user.globalStatus === "BANNED" ? "Unban" : "Ban"}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
