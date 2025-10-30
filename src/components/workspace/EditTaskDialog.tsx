// src/components/workspace/EditTaskDialog.tsx
import React, { useState, useEffect } from "react";
import { useMutation, useLazyQuery } from "@apollo/client/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  UPDATE_TASK_MUTATION,
  SUMMARIZE_TASK_DESCRIPTION,
  GENERATE_TASKS_FROM_PROMPT,
  GET_WORKSPACE_DETAILS,
} from "@/api/graphql";
import { Sparkles, Bot } from "lucide-react";

export function EditTaskDialog({
  task,
  isOpen,
  setIsOpen,
  workspaceId,
}: {
  task: any;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  workspaceId: string;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
    }
  }, [task]);

  const [updateTask, { loading: updating }] = useMutation(
    UPDATE_TASK_MUTATION,
    {
      onCompleted: () => {
        toast({ title: "Task Updated" });
        setIsOpen(false);
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: error.message,
        });
      },
    }
  );

  const [summarize, { loading: summarizing }] = useLazyQuery(
    SUMMARIZE_TASK_DESCRIPTION,
    {
      onCompleted: (data) => {
        setDescription(data.summarizeTaskDescription);
        toast({ title: "AI Summary Complete!" });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "AI Summary Failed",
          description: error.message,
        });
      },
      fetchPolicy: "network-only", // Always hit the network for this
    }
  );

  const [generateTasks, { loading: generating }] = useMutation(
    GENERATE_TASKS_FROM_PROMPT,
    {
      onCompleted: (data) => {
        toast({
          title: "AI Task Generation Complete!",
          description: `Generated ${data.generateTasksFromPrompt.length} new tasks.`,
        });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "AI Generation Failed",
          description: error.message,
        });
      },
      refetchQueries: [
        { query: GET_WORKSPACE_DETAILS, variables: { id: workspaceId } },
      ],
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTask({ variables: { id: task.id, title, description } });
  };

  const handleSummarize = () => {
    if (!description) {
      toast({
        variant: "destructive",
        title: "Nothing to summarize",
        description: "Please enter a description first.",
      });
      return;
    }
    summarize({ variables: { description } });
  };

  const handleGenerateTasks = () => {
    generateTasks({ variables: { projectId: task.projectId, prompt: title } });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Task Details</DialogTitle>
          <DialogDescription>
            Edit task details or use AI to enhance your workflow.
          </DialogDescription>
        </DialogHeader>
        <form
          id="edit-task-form"
          onSubmit={handleSubmit}
          className="space-y-4 py-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
            />
          </div>
        </form>
        <div className="flex flex-col sm:flex-row gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={handleSummarize}
            disabled={summarizing || generating}
          >
            <Sparkles
              className={`mr-2 h-4 w-4 ${summarizing ? "animate-spin" : ""}`}
            />
            {summarizing ? "Summarizing..." : "AI Summarize Description"}
          </Button>
          <Button
            variant="outline"
            onClick={handleGenerateTasks}
            disabled={summarizing || generating}
          >
            <Bot
              className={`mr-2 h-4 w-4 ${generating ? "animate-spin" : ""}`}
            />
            {generating ? "Generating..." : "AI Generate Sub-Tasks"}
          </Button>
        </div>
        <DialogFooter>
          <Button type="submit" form="edit-task-form" disabled={updating}>
            {updating ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
