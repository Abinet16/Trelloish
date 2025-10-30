// src/components/workspace/TaskCard.tsx
import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EditTaskDialog } from "./EditTaskDialog";
import { GripVertical } from "lucide-react";
import { getInitials } from "@/lib/utils";

export function TaskCard({
  task,
  workspaceId,
}: {
  task: any;
  workspaceId: string;
}) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging
      ? "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
      : "none",
  };

  return (
    <>
      <div ref={setNodeRef} style={style}>
        <Card
          className="group relative cursor-pointer bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors shadow-sm"
          onClick={() => setIsEditDialogOpen(true)}
        >
          {/* We make the whole card the drag handle for better mobile experience */}
          <div
            {...attributes}
            {...listeners}
            className="absolute top-2 right-2 p-2 opacity-20 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>

          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium pr-8">
              {task.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {task.description || "No description"}
            </p>
          </CardContent>
          {task.assignees && task.assignees.length > 0 && (
            <CardFooter className="pt-4 flex justify-end">
              <div className="flex -space-x-2">
                <TooltipProvider delayDuration={100}>
                  {task.assignees.map((assignee: any) => (
                    <Tooltip key={assignee.id}>
                      <TooltipTrigger asChild>
                        <Avatar className="h-8 w-8 border-2 border-white dark:border-slate-900">
                          <AvatarImage
                            src={`https://api.dicebear.com/7.x/initials/svg?seed=${assignee.email}`}
                          />
                          <AvatarFallback>
                            {getInitials(assignee.email)}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{assignee.email}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
      <EditTaskDialog
        task={task}
        isOpen={isEditDialogOpen}
        setIsOpen={setIsEditDialogOpen}
        workspaceId={workspaceId}
      />
    </>
  );
}
