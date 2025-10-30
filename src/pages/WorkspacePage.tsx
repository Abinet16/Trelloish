// src/pages/WorkspacePage.tsx
import { useParams } from "react-router-dom";
import { useQuery, useSubscription } from "@apollo/client/react"; // Corrected import
import {
  GET_WORKSPACE_DETAILS,
  TASK_STATUS_UPDATED_SUBSCRIPTION,
} from "@/api/graphql";
import { CreateTaskDialog } from "../components/workspace/CreateTaskDialog";
import { getInitials } from "@/lib/utils";
import { KanbanBoard } from "@/components/workspace/KanbanBoard";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Users, Loader2, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// --- FIX IS HERE: Step 1 - Define the types for your data ---

// Define the shape of all the nested objects
interface User {
  id: string;
  email: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  projectName: string; // We add this property in the flatMap below
  // You can add createdBy, assignees, etc. if needed
}

interface Project {
  id: string;
  name: string;
  tasks: Task[];
}

interface Member {
  role: "OWNER" | "MEMBER" | "VIEWER";
  user: User;
}

interface Workspace {
  id: string;
  name: string;
  projects: Project[];
  members: Member[];
}

// This represents the top-level structure of the query result
interface GetWorkspaceData {
  getWorkspace: Workspace;
}

export function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  // --- FIX IS HERE: Step 2 - Use generics to type the useQuery hook ---
  const { data, loading, error, client } = useQuery<GetWorkspaceData>(
    GET_WORKSPACE_DETAILS,
    {
      variables: { id: workspaceId! },
    }
  );

  // Subscription hook remains the same, but we can type its data too
  useSubscription(TASK_STATUS_UPDATED_SUBSCRIPTION, {
    variables: { workspaceId: workspaceId! },
    onData: () => {
      client.refetchQueries({ include: [GET_WORKSPACE_DETAILS] });
    },
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <AlertCircle className="mx-auto h-12 w-12" />
        <h3 className="mt-2 text-lg font-semibold">Failed to load workspace</h3>
        <p className="mt-1 text-sm">{error.message}</p>
      </div>
    );
  }

  // --- FIX IS HERE: Step 3 - TypeScript now knows 'data' exists and has a 'getWorkspace' property ---
  if (!data) {
    // This is a fallback case in case data is somehow null after loading is false
    return <p>No data available.</p>;
  }

  const { getWorkspace: workspace } = data;

  // The 'p' and 't' parameters are now strongly typed, no need for 'any'
  const allTasks: Task[] = workspace.projects.flatMap((p) =>
    p.tasks.map((t) => ({ ...t, projectName: p.name }))
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{workspace.name}</h1>
        <div className="flex items-center gap-2">
          <CreateTaskDialog
            projects={workspace.projects}
            workspaceId={workspaceId!}
          />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Members ({workspace.members.length})
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Workspace Members</SheetTitle>
                <SheetDescription>
                  Users with access to this workspace.
                </SheetDescription>
              </SheetHeader>
              <div className="py-4 space-y-4">
                {workspace.members.map((member) => (
                  <div
                    key={member.user.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.user.email}`}
                        />
                        <AvatarFallback>
                          {getInitials(member.user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.user.email}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {member.role.toLowerCase()}
                        </p>
                      </div>
                    </div>
                    {/* TODO: Add dropdown to change role or remove member */}
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <KanbanBoard tasks={allTasks} workspaceId={workspaceId!} />
    </div>
  );
}
