// src/graphql/resolvers/taskResolver.ts
import { GraphQLContext } from '../../auth/authMiddleware';
import { taskService } from '../../services/taskService';
import { projectService } from '../../services/projectService';
import { authorizationService } from '../../services/authorizationService';
import { userService } from '../../services/userService';
import { pubsub } from '../../app'; // Import pubsub for subscriptions
import { withFilter } from 'graphql-subscriptions';

const TASK_STATUS_UPDATED = 'TASK_STATUS_UPDATED';

export const taskResolvers = {
  Query: {
    getTasksInProject: async (parent: any, { projectId }: { projectId: string }, context: GraphQLContext) => {
      if (!context.user) throw new Error('Unauthorized');
      const canView = await authorizationService.canViewProject(context.user.id, projectId);
      if (!canView) throw new Error('Forbidden: You cannot view tasks in this project.');
      return taskService.getTasksInProject(projectId);
    },
  },

  Mutation: {
    createTask: async (parent: any, { input }: any, context: GraphQLContext) => {
      if (!context.user) throw new Error('Unauthorized');
      const { projectId, title, description, assigneeIds } = input;

      // Authorization: Requires Project Contributor or Project Lead role
      const canEdit = await authorizationService.canEditTask(context.user.id, projectId);
      if (!canEdit) throw new Error('Forbidden: You must be a Contributor or Lead to create tasks.');

      // Ensure assignees are members of the project
      if (assigneeIds && assigneeIds.length > 0) {
        const projectMembers = await projectService.getProjectMembers(projectId);
        const memberIds = projectMembers.map(m => m.user_id);
        for (const assigneeId of assigneeIds) {
          if (!memberIds.includes(assigneeId)) {
            throw new Error(`User with ID ${assigneeId} is not a member of this project and cannot be assigned.`);
          }
        }
      }

      return taskService.createTask(context.user.id, projectId, title, description, assigneeIds);
    },

    updateTask: async (parent: any, { id, input }: any, context: GraphQLContext) => {
      if (!context.user) throw new Error('Unauthorized');
      const task = await taskService.getTaskById(id);
      if (!task) throw new Error('Task not found.');

      // Authorization: Requires Project Contributor or Project Lead
      const canEdit = await authorizationService.canEditTask(context.user.id, task.project_id);
      if (!canEdit) throw new Error('Forbidden: You must be a Contributor or Lead to update tasks.');

      // If a Contributor is updating a task, they must be assigned to it (unless unassigned)
      const userRole = await authorizationService.getUserProjectRole(context.user.id, task.project_id);
      if (userRole === 'CONTRIBUTOR') {
        const assignees = await taskService.getTaskAssignees(id);
        const isAssigned = assignees.some(a => a.id === context.user!.id);
        if (assignees.length > 0 && !isAssigned) {
          throw new Error('Forbidden: As a Contributor, you can only edit tasks assigned to you or unassigned tasks.');
        }
      }

      const updatedTask = await taskService.updateTask(context.user.id, id, input);

      // CRITICAL: Publish subscription event if status changed
      if (input.status && input.status !== task.status) {
        const project = await projectService.getProjectById(updatedTask.project_id);
        const createdByUser = await userService.findUserById(updatedTask.created_by);
        const assignees = await taskService.getTaskAssignees(updatedTask.id);

        pubsub.publish(TASK_STATUS_UPDATED, {
          taskStatusUpdated: {
            ...updatedTask,
            workspaceId: project?.workspace_id, // Add workspaceId to payload for filtering
            projectId: updatedTask.project_id,
            createdBy: createdByUser,
            assignees,
          },
        });
      }

      return updatedTask;
    },

    deleteTask: async (parent: any, { id }: { id: string }, context: GraphQLContext) => {
      if (!context.user) throw new Error('Unauthorized');
      const task = await taskService.getTaskById(id);
      if (!task) throw new Error('Task not found.');

      // Authorization: Requires Project Lead or Workspace Owner (more robust)
      const project = await projectService.getProjectById(task.project_id);
      if (!project) throw new Error('Project not found for this task.');

      const isProjectLead = await authorizationService.canManageProject(context.user.id, task.project_id);
      const isWorkspaceOwner = await authorizationService.canManageWorkspace(context.user.id, project.workspace_id);

      if (!isProjectLead && !isWorkspaceOwner) {
        throw new Error('Forbidden: Only a Project Lead or Workspace Owner can delete tasks.');
      }

      await taskService.deleteTask(context.user.id, id);
      return true;
    },
  },

  Subscription: {
    taskStatusUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([TASK_STATUS_UPDATED]),
        async (payload, variables, context) => {
          // 'context' here comes from the subscription connection context setup in app.ts
          const user = context.user;
          if (!user) {
            return false; // Not authenticated
          }
          // The payload contains the task that was updated, including its workspaceId
          const taskWorkspaceId = payload.taskStatusUpdated.workspaceId;
          const targetWorkspaceId = variables.workspaceId;

          // 1. The event must match the workspaceId the user is subscribed to
          if (taskWorkspaceId !== targetWorkspaceId) {
            return false;
          }

          // 2. The user must be a member of that workspace to receive the update
          const isMember = await authorizationService.canViewWorkspace(user.id, taskWorkspaceId);
          return isMember;
        }
      ),
    },
  },

  Task: {
    projectId: (parent: any) => parent.project_id, // Map snake_case to camelCase
    createdBy: (parent: any) => userService.findUserById(parent.created_by),
    assignees: (parent: any) => taskService.getTaskAssignees(parent.id),
  },
};