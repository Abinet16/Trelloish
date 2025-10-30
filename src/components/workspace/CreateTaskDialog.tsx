// src/components/workspace/CreateTaskDialog.tsx
import React, { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { CREATE_TASK_MUTATION, GET_WORKSPACE_DETAILS } from "@/api/graphql"; // We need this to refetch

// We need a new CREATE_TASK mutation definition
// const CREATE_TASK_MUTATION = gql`
//   mutation CreateTask($projectId: ID!, $title: String!) {
//     createTask(input: { projectId: $projectId, title: $title }) {
//       id # We only need the ID back to confirm success
//     }
//   }
// `;

// Define the shape of the 'project' prop for type safety
interface Project {
  id: string;
  name: string;
}

export function CreateTaskDialog({
  projects,
  workspaceId,
}: {
  projects: Project[];
  workspaceId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<
    string | undefined
  >(undefined);
  const { toast } = useToast();

  const [createTask, { loading }] = useMutation(CREATE_TASK_MUTATION, {
    // This is the most important part: after the mutation succeeds,
    // we tell Apollo to refetch the entire workspace details.
    // This will automatically update the Kanban board with the new task.
    refetchQueries: [
      {
        query: GET_WORKSPACE_DETAILS,
        variables: { id: workspaceId },
      },
    ],
    onCompleted: () => {
      toast({
        title: "Task Created!",
        description: `"${title}" has been added to the board.`,
      });
      setIsOpen(false);
      setTitle("");
      setSelectedProjectId(undefined);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error creating task",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !selectedProjectId) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please select a project and enter a task title.",
      });
      return;
    }
    createTask({ variables: { projectId: selectedProjectId, title } });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>
            Select a project and give your new task a title. It will be added to
            the 'TODO' column.
          </DialogDescription>
        </DialogHeader>
        <form id="create-task-form" onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="project" className="text-right">
                Project
              </Label>
              <Select
                onValueChange={setSelectedProjectId}
                value={selectedProjectId}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Finalize marketing brief"
                required
              />
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="create-task-form" disabled={loading}>
            {loading ? "Adding..." : "Add Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
