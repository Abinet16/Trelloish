// src/components/workspace/KanbanBoard.tsx
import React, { useState, useMemo, useEffect } from "react"; // Added useEffect
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { useMutation } from "@apollo/client/react";
import { UPDATE_TASK_MUTATION } from "@/api/graphql";
import { KanbanColumn } from "./KanbanColumn";

const columns = ["TODO", "IN_PROGRESS", "DONE"];

// --- FIX IS HERE ---
// 1. Update the props type definition to include workspaceId
export function KanbanBoard({
  tasks: initialTasks,
  workspaceId,
}: {
  tasks: any[];
  workspaceId: string;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [updateTask] = useMutation(UPDATE_TASK_MUTATION);

  // Add useEffect to update state when the initial tasks prop changes
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const tasksByColumn = useMemo(() => {
    return columns.reduce((acc, status) => {
      acc[status] = tasks.filter((task) => task.status === status);
      return acc;
    }, {} as Record<string, any[]>);
  }, [tasks]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id && over?.data.current) {
      const overContainer = over.data.current?.sortable.containerId;
      const taskId = active.id;
      const newStatus = overContainer;

      // Optimistic UI update
      setTasks((prev) => {
        const taskIndex = prev.findIndex((t) => t.id === taskId);
        if (taskIndex > -1) {
          const updatedTasks = [...prev];
          const taskToUpdate = updatedTasks[taskIndex];
          // Only update if status is actually different
          if (taskToUpdate.status !== newStatus) {
            updatedTasks[taskIndex] = { ...taskToUpdate, status: newStatus };
            return updatedTasks;
          }
        }
        return prev;
      });

      // Fire mutation
      updateTask({ variables: { id: taskId, status: newStatus } });
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((status) => (
          // --- FIX IS HERE ---
          // 2. Pass the workspaceId down to the KanbanColumn
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByColumn[status]}
            workspaceId={workspaceId} // Pass the prop here
          />
        ))}
      </div>
    </DndContext>
  );
}
