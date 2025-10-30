// src/components/workspace/KanbanColumn.tsx
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TaskCard } from "./TaskCard";

export function KanbanColumn({
  status,
  tasks,
  workspaceId,
}: {
  status: string;
  tasks: any[];
  workspaceId: string;
}) {
  const { setNodeRef } = useDroppable({ id: status });

  return (
    <div className="flex flex-col bg-slate-100 dark:bg-slate-800/50 rounded-lg max-h-[calc(100vh-12rem)]">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-slate-800 dark:text-slate-200 capitalize flex items-center">
          {status.replace("_", " ").toLowerCase()}
          <span className="ml-2 text-sm text-muted-foreground bg-slate-200 dark:bg-slate-700 rounded-full px-2 py-0.5">
            {tasks.length}
          </span>
        </h2>
      </div>
      <SortableContext
        id={status}
        items={tasks}
        strategy={verticalListSortingStrategy}
      >
        <div ref={setNodeRef} className="p-4 space-y-4 overflow-y-auto flex-1">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <TaskCard key={task.id} task={task} workspaceId={workspaceId} />
            ))
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No tasks in this column.
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
