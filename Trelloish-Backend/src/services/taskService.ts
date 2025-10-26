import { query, getClient } from "../db";
import { Task, TaskStatus, TaskAssignee, User } from "../models";
import { auditLogService } from "../logging/auditLogService";
import { notificationService } from "./notificationService";
import { userService } from "./userService";

export const taskService = {

  async createTask(
    creatorId: string,
    projectId: string,
    title: string,
    description: string | null,
    assigneeIds: string[] = []
  ): Promise<Task> {
    const client = await getClient();
    try {
      await client.query("BEGIN");

      const taskResult = await client.query(
        "INSERT INTO tasks (project_id, title, description, created_by) VALUES ($1, $2, $3, $4) RETURNING *",
        [projectId, title, description, creatorId]
      );
      const newTask: Task = taskResult.rows[0];

      // Assign users
      if (assigneeIds && assigneeIds.length > 0) {
        await this.updateTaskAssigneesInternal(client, newTask.id, assigneeIds);
        // Trigger notifications for new assignees
        const users = (
          await Promise.all(
            assigneeIds.map((id) => userService.findUserById(id))
          )
        ).filter(Boolean) as User[];
        for (const user of users) {
          await notificationService.createNotification(
            user.id,
            "Task Assigned",
            `You have been assigned to task "${newTask.title}" in Project ${projectId}.`,
            newTask.id,
            "TASK"
          );
        }
      }

      await client.query("COMMIT");
      await auditLogService.activity("TASK_CREATED", creatorId, {
        taskId: newTask.id,
        projectId,
        title,
        assignees: assigneeIds,
      });
      return newTask;
    } catch (error: any) {
      await client.query("ROLLBACK");
      await auditLogService.error(
        "TASK_CREATION_FAILED",
        creatorId,
        undefined,
        { projectId, title, error: error.message }
      );
      throw error;
    } finally {
      client.release();
    }
  },

  async updateTask(
    updaterId: string,
    taskId: string,
    updates: {
      title?: string;
      description?: string | null;
      status?: TaskStatus;
      assigneeIds?: string[];
    }
  ): Promise<Task> {
    const client = await getClient();
    try {
      await client.query("BEGIN");

      const currentTask = (
        await client.query("SELECT * FROM tasks WHERE id = $1", [taskId])
      ).rows[0];
      if (!currentTask) {
        throw new Error("Task not found.");
      }

      const { title, description, status, assigneeIds } = updates;
      const params: any[] = [];
      const setClauses: string[] = [];
      let paramCount = 1;
      let oldStatus: TaskStatus | undefined;
      let newStatus: TaskStatus | undefined;

      if (title !== undefined) {
        setClauses.push(`title = $${paramCount++}`);
        params.push(title);
      }
      if (description !== undefined) {
        setClauses.push(`description = $${paramCount++}`);
        params.push(description);
      }
      if (status !== undefined && status !== currentTask.status) {
        oldStatus = currentTask.status;
        newStatus = status;
        setClauses.push(`status = $${paramCount++}`);
        params.push(status);
      }

      if (setClauses.length > 0) {
        const updateResult = await client.query(
          `UPDATE tasks SET ${setClauses.join(
            ", "
          )} WHERE id = $${paramCount++} RETURNING *`,
          [...params, taskId]
        );
        if (updateResult.rows.length === 0) {
          throw new Error("Task not found or not authorized to update.");
        }
      }

      // Handle assignees update
      if (assigneeIds !== undefined) {
        const oldAssigneeIdsResult = await client.query(
          "SELECT user_id FROM task_assignees WHERE task_id = $1",
          [taskId]
        );
        const oldAssigneeIds = oldAssigneeIdsResult.rows.map(
          (row) => row.user_id
        );

        await this.updateTaskAssigneesInternal(client, taskId, assigneeIds);

        const newlyAssigned = assigneeIds.filter(
          (id) => !oldAssigneeIds.includes(id)
        );
        const users = (
          await Promise.all(
            newlyAssigned.map((id) => userService.findUserById(id))
          )
        ).filter(Boolean) as User[];
        for (const user of users) {
          await notificationService.createNotification(
            user.id,
            "Task Assigned",
            `You have been assigned to task "${currentTask.title}" in Project ${currentTask.project_id}.`,
            taskId,
            "TASK"
          );
        }
      }

      await client.query("COMMIT");

      // Log task status change if it occurred
      if (oldStatus && newStatus) {
        await auditLogService.activity("TASK_STATUS_UPDATE", updaterId, {
          taskId,
          oldStatus,
          newStatus,
          projectId: currentTask.project_id,
        });
      }
      await auditLogService.activity("TASK_UPDATED", updaterId, {
        taskId,
        updates,
      });

      // Fetch the final updated task
      const updatedTaskResult = await client.query(
        "SELECT * FROM tasks WHERE id = $1",
        [taskId]
      );
      return updatedTaskResult.rows[0];
    } catch (error:any) {
      await client.query("ROLLBACK");
      await auditLogService.error("TASK_UPDATE_FAILED", updaterId, undefined, {
        taskId,
        updates,
        error: error.message,
      });
      throw error;
    } finally {
      client.release();
    }
  },

  async updateTaskAssigneesInternal(
    client: any,
    taskId: string,
    newAssigneeIds: string[]
  ): Promise<void> {
    // Delete existing assignees not in new list
    if (newAssigneeIds.length > 0) {
      await client.query(
        "DELETE FROM task_assignees WHERE task_id = $1 AND user_id NOT IN (" +
          newAssigneeIds.map((_, i) => `$${i + 2}`).join(",") +
          ")",
        [taskId, ...newAssigneeIds]
      );
    } else {
      await client.query("DELETE FROM task_assignees WHERE task_id = $1", [
        taskId,
      ]);
    }

    // Add new assignees (upsert-like logic to avoid duplicates)
    for (const userId of newAssigneeIds) {
      await client.query(
        `INSERT INTO task_assignees (task_id, user_id) VALUES ($1, $2)
         ON CONFLICT (task_id, user_id) DO NOTHING`,
        [taskId, userId]
      );
    }
  },

  async deleteTask(deleterId: string, taskId: string): Promise<void> {
    const result = await query("DELETE FROM tasks WHERE id = $1 RETURNING *", [
      taskId,
    ]);
    if (result.rows.length === 0) {
      throw new Error("Task not found or not authorized to delete.");
    }
    await auditLogService.activity("TASK_DELETED", deleterId, { taskId });
  },

  async getTaskById(taskId: string): Promise<Task | null> {
    const result = await query("SELECT * FROM tasks WHERE id = $1", [taskId]);
    return result.rows[0] || null;
  },

  async getTasksInProject(projectId: string): Promise<Task[]> {
    const result = await query(
      "SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at DESC",
      [projectId]
    );
    return result.rows;
  },

  async getTaskAssignees(taskId: string): Promise<User[]> {
    const result = await query(
      `SELECT u.id, u.email, u.global_status FROM users u
       JOIN task_assignees ta ON u.id = ta.user_id
       WHERE ta.task_id = $1`,
      [taskId]
    );
    return result.rows.map((row) => ({
      ...row,
      globalStatus: row.global_status,
    }));
  },
};
