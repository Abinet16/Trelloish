// src/components/CreateTask.tsx
import React, { useState } from "react";
import { useMutation } from "@apollo/client/react";
import {gql} from "@apollo/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const CREATE_TASK_MUTATION = gql`
  mutation CreateTask($projectId: ID!, $title: String!) {
    createTask(input: { projectId: $projectId, title: $title }) {
      id
      title
    }
  }
`;

export const CreateTask = () => {
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const { toast } = useToast();

  interface CreateTaskData {
    createTask: {
      id: string;
      title: string;
    };
  }

  interface CreateTaskVars {
    projectId: string;
    title: string;
  }

  const [createTask, { loading }] = useMutation<CreateTaskData, CreateTaskVars>(CREATE_TASK_MUTATION, {
    onCompleted: (data) => {
      toast({
        title: "Task Created!",
        description: `Successfully created task: "${data.createTask.title}"`,
      });
      setTitle("");
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error Creating Task",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !title) return;
    createTask({ variables: { projectId, title } });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a New Task</CardTitle>
        <CardDescription>
          Enter a Project ID and a title for your new task.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="projectId">Project ID</Label>
            <Input
              id="projectId"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Enter the Project UUID"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="taskTitle">Task Title</Label>
            <Input
              id="taskTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Design the new dashboard"
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Task"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
