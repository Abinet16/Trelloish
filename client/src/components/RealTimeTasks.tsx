// src/components/RealTimeTasks.tsx
import React, { useState, useEffect } from "react";
import { gql } from "@apollo/client";
import {useSubscription} from "@apollo/client/react"
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

const TASK_STATUS_UPDATED_SUBSCRIPTION = gql`
  subscription OnTaskStatusUpdated($workspaceId: ID!) {
    taskStatusUpdated(workspaceId: $workspaceId) {
      id
      title
      status
    }
  }
`;

export const RealTimeTasks = () => {
  const [workspaceId, setWorkspaceId] = useState("");
  const { toast } = useToast();

  const { loading, error } = useSubscription(TASK_STATUS_UPDATED_SUBSCRIPTION, {
    variables: { workspaceId },
    skip: !workspaceId,
    onData: ({ data }) => {
      // Apollo sometimes wraps the payload as `data.data`; normalize and cast to any to avoid TS errors
      const payload = (data as any)?.data ?? data;
      if (payload?.taskStatusUpdated) {
        const { title, status } = payload.taskStatusUpdated;
        toast({
          title: "📢 Real-Time Update",
          description: `Task "${title}" was updated to status: ${status}`,
        });
      }
    },
  });

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Subscription Error",
        description: error.message,
      });
    }
  }, [error, toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Real-Time Task Monitor</CardTitle>
        <CardDescription>
          Enter a Workspace ID to listen for real-time task status updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="workspaceId">Workspace ID to Monitor</Label>
          <Input
            id="workspaceId"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            placeholder="Enter the Workspace UUID"
          />
        </div>
        <div>
          {loading && workspaceId && (
            <p className="text-sm text-blue-500 animate-pulse">
              Listening for updates in workspace {workspaceId}...
            </p>
          )}
          {!workspaceId && (
            <p className="text-sm text-muted-foreground">
              Please enter a Workspace ID to begin monitoring.
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            Updates will appear as toast notifications at the bottom-right of
            the screen.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
