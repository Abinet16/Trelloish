// src/pages/DashboardPage.tsx
import { useQuery } from "@apollo/client/react"; // Corrected import
import { GET_MY_WORKSPACES } from "@/api/graphql";
import { WorkspaceCard } from "@/components/dashboard/WorkspaceCard";
import { CreateWorkspaceDialog } from "@/components/dashboard/CreateWorkspaceDialog";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext"; // <-- NEW IMPORT
import { Navigate } from "react-router";  
// --- FIX IS HERE: Step 1 - Define the types for your data ---

// Represents a single workspace object from the query
interface Workspace {
  id: string;
  name: string;
}

// Represents the entire data object returned by the GET_MY_WORKSPACES query
interface GetMyWorkspacesData {
  myWorkspaces: Workspace[];
}

export function DashboardPage() {
   // --- FIX IS HERE: Step 2 - Use generics to type the useQuery hook ---
   const { user } = useAuth();
   const { data, loading, error } =useQuery<GetMyWorkspacesData>(GET_MY_WORKSPACES);

  // --- THE FIX IS HERE ---
  // This check runs when the component mounts. By this time, the AuthContext
  // state will be up-to-date from the login action.
  if (user?.globalStatus === "ADMIN") {
    // If the user is an admin, don't render the dashboard.
    // Instead, immediately redirect them to the admin page.
    return <Navigate to="/admin" replace />;
  }

 
  // --- FIX IS HERE: Step 3 - Refactor rendering logic with early returns ---

  const renderContent = () => {
    // State 1: Loading
    if (loading) {
      return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Skeleton Loader for a better UX */}
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="border bg-card text-card-foreground shadow-sm rounded-lg p-6 space-y-4 animate-pulse"
            >
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      );
    }

    // State 2: Error
    if (error) {
      return (
        <div className="text-center py-10 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <AlertCircle className="mx-auto h-12 w-12" />
          <h3 className="mt-2 text-lg font-semibold">
            Failed to load workspaces
          </h3>
          <p className="mt-1 text-sm">{error.message}</p>
        </div>
      );
    }

    // State 3: Success, but no data (should be rare) or no workspaces
    if (!data || data.myWorkspaces.length === 0) {
      return (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            No workspaces yet
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating a new workspace.
          </p>
        </div>
      );
    }

    // State 4: Success with data
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* TypeScript now knows `data.myWorkspaces` is an array of `Workspace` objects */}
        {data.myWorkspaces.map((ws) => (
          // No need for `(ws: any)` anymore!
          <WorkspaceCard key={ws.id} workspace={ws} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your Workspaces</h1>
          <p className="text-muted-foreground">
            Select a workspace to view its projects or create a new one.
          </p>
        </div>
        <CreateWorkspaceDialog />
      </div>

      {/* Render the content based on the current state */}
      {renderContent()}
    </div>
  );
}
