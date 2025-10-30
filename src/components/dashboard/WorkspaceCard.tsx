// src/components/dashboard/WorkspaceCard.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { MoreHorizontal, Settings, Trash2 } from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  // In a real app, you might also pass member counts or project counts
  // memberCount?: number;
  // projectCount?: number;
}

export function WorkspaceCard({ workspace }: { workspace: Workspace }) {
  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking the dropdown
    // TODO: Open workspace settings modal/page
    console.log("Settings clicked for workspace:", workspace.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking the dropdown
    // TODO: Open a confirmation dialog before deleting
    console.log("Delete clicked for workspace:", workspace.id);
  };

  return (
    <Link to={`/workspace/${workspace.id}`} className="block group">
      <Card className="hover:border-primary hover:shadow-md transition-all duration-200 ease-in-out h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-semibold tracking-tight group-hover:text-primary">
            {workspace.name}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={(e) => e.preventDefault()}
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleSettingsClick}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-500"
                onClick={handleDeleteClick}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="flex-grow">
          <CardDescription>
            {/* You could pass project/member counts here */}A collaborative
            space for your team's projects.
          </CardDescription>
        </CardContent>
        <CardFooter className="pt-4">
          {/* Avatars of members could go here for a richer look */}
          <p className="text-xs text-muted-foreground">Click to open board</p>
        </CardFooter>
      </Card>
    </Link>
  );
}
