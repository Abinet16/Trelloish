// src/graphql/resolvers/projectResolver.ts
import { GraphQLContext } from '../../auth/authMiddleware';
import { projectService } from '../../services/projectService';
import { authorizationService } from '../../services/authorizationService';
import { userService } from '../../services/userService';
import { taskService } from '../../services/taskService'; // To get tasks in a project

export const projectResolvers = {
  Query: {
    getProject: async (parent: any, { id }: { id: string }, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Unauthorized: You must be logged in.');
      }

      // Authorization: User must be a member of the project
      const canView = await authorizationService.canViewProject(context.user.id, id);
      if (!canView) {
        throw new Error('Forbidden: You do not have permission to view this project.');
      }

      const project = await projectService.getProjectById(id);
      if (!project) {
        throw new Error('Project not found.');
      }

      // Fetch members for the project
      const members = await projectService.getProjectMembers(id);
      const memberDetails = await Promise.all(members.map(async (member) => {
          const user = await userService.findUserById(member.user_id);
          return {
              id: member.id,
              user: user ? { ...user, globalStatus: user.global_status } : null,
              role: member.role,
              createdAt: member.created_at,
          };
      }));

      // Fetch tasks for the project
      const tasks = await taskService.getTasksInProject(id);
      const taskDetails = await Promise.all(tasks.map(async (task) => {
        const createdByUser = await userService.findUserById(task.created_by);
        const assignees = await taskService.getTaskAssignees(task.id);
        return {
          ...task,
          projectId: task.project_id,
          createdBy: createdByUser ? { ...createdByUser, globalStatus: createdByUser.global_status } : null,
          assignees: assignees.map(u => ({ ...u, globalStatus: u.global_status })),
        };
      }));


      return {
          ...project,
          workspaceId: project.workspace_id,
          members: memberDetails,
          tasks: taskDetails, // Attach tasks to the project object
      };
    },
  },

  Mutation: {
    createProject: async (parent: any, { input }: any, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Unauthorized: You must be logged in.');
      }
      const { workspaceId, name } = input;

      // Authorization: Requires Workspace Member or Owner role
      const canEditWorkspaceProjects = await authorizationService.canEditProjectsInWorkspace(context.user.id, workspaceId);
      if (!canEditWorkspaceProjects) {
        throw new Error('Forbidden: You do not have permission to create projects in this workspace.');
      }

      const newProject = await projectService.createProject(context.user.id, workspaceId, name);
      return { ...newProject, workspaceId: newProject.workspace_id };
    },

    updateProject: async (parent: any, { id, input }: any, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Unauthorized: You must be logged in.');
      }

      // Authorization: Requires Project Lead or Workspace Owner (via workspace role if needed)
      const project = await projectService.getProjectById(id);
      if (!project) throw new Error('Project not found.');

      const isProjectLead = await authorizationService.canManageProject(context.user.id, id);
      const isWorkspaceOwner = await authorizationService.canManageWorkspace(context.user.id, project.workspace_id);

      if (!isProjectLead && !isWorkspaceOwner) {
        throw new Error('Forbidden: Only project leads or workspace owners can update projects.');
      }

      const updatedProject = await projectService.updateProject(context.user.id, id, input.name);
      return { ...updatedProject, workspaceId: updatedProject.workspace_id };
    },

    deleteProject: async (parent: any, { id }: { id: string }, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Unauthorized: You must be logged in.');
      }

      // Authorization: Requires Project Lead or Workspace Owner
      const project = await projectService.getProjectById(id);
      if (!project) throw new Error('Project not found.');

      const isProjectLead = await authorizationService.canManageProject(context.user.id, id);
      const isWorkspaceOwner = await authorizationService.canManageWorkspace(context.user.id, project.workspace_id);

      if (!isProjectLead && !isWorkspaceOwner) {
        throw new Error('Forbidden: Only project leads or workspace owners can delete projects.');
      }

      await projectService.deleteProject(context.user.id, id);
      return true;
    },

    addProjectMember: async (parent: any, { input }: any, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Unauthorized: You must be logged in.');
      }
      const { projectId, userId, role } = input;

      // Authorization: Requires Project Lead or Workspace Owner
      const project = await projectService.getProjectById(projectId);
      if (!project) throw new Error('Project not found.');

      const isProjectLead = await authorizationService.canManageProject(context.user.id, projectId);
      const isWorkspaceOwner = await authorizationService.canManageWorkspace(context.user.id, project.workspace_id);

      if (!isProjectLead && !isWorkspaceOwner) {
        throw new Error('Forbidden: Only project leads or workspace owners can add project members.');
      }

      // Important: ensure the user being added is already a member of the parent workspace
      const isTargetUserWorkspaceMember = await authorizationService.ensureWorkspaceMembership(userId, project.workspace_id);
      if (!isTargetUserWorkspaceMember) {
          throw new Error('Cannot add user to project: user must be a member of the parent workspace first.');
      }

      const newMember = await projectService.addProjectMember(context.user.id, projectId, userId, role);
      const user = await userService.findUserById(newMember.user_id);
      return {
          id: newMember.id,
          user: user ? { ...user, globalStatus: user.global_status } : null,
          role: newMember.role,
          createdAt: newMember.created_at,
      };
    },

    removeProjectMember: async (parent: any, { projectId, userId }: any, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Unauthorized: You must be logged in.');
      }

      // Authorization: Requires Project Lead or Workspace Owner
      const project = await projectService.getProjectById(projectId);
      if (!project) throw new Error('Project not found.');

      const isProjectLead = await authorizationService.canManageProject(context.user.id, projectId);
      const isWorkspaceOwner = await authorizationService.canManageWorkspace(context.user.id, project.workspace_id);

      if (!isProjectLead && !isWorkspaceOwner) {
        throw new Error('Forbidden: Only project leads or workspace owners can remove project members.');
      }

      // Cannot remove self if Project Lead (handled in service layer)
      if (context.user.id === userId) {
          throw new Error('Cannot remove yourself from the project if you are the lead. Transfer leadership first.');
      }

      await projectService.removeProjectMember(context.user.id, projectId, userId);
      return true;
    },

    updateProjectMemberRole: async (parent: any, { input }: any, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Unauthorized: You must be logged in.');
      }
      const { projectId, userId, newRole } = input;

      // Authorization: Requires Project Lead or Workspace Owner
      const project = await projectService.getProjectById(projectId);
      if (!project) throw new Error('Project not found.');

  // ... (inside the updateProjectMemberRole mutation)
      const isProjectLead = await authorizationService.canManageProject(context.user.id, projectId);
      const isWorkspaceOwner = await authorizationService.canManageWorkspace(context.user.id, project.workspace_id);

      if (!isProjectLead && !isWorkspaceOwner) {
        throw new Error('Forbidden: Only project leads or workspace owners can update member roles.');
      }

      const updatedMember = await projectService.updateProjectMemberRole(context.user.id, projectId, userId, newRole);
      const user = await userService.findUserById(updatedMember.user_id);
      return {
          id: updatedMember.id,
          user: user ? { ...user, globalStatus: user.global_status } : null,
          role: updatedMember.role,
          createdAt: updatedMember.created_at,
      };
    },
  },

  // Field Resolvers to populate nested data
  Project: {
    members: async (parent: any, args: any, context: GraphQLContext) => {
      if (!context.user) return [];
      const canView = await authorizationService.canViewProject(context.user.id, parent.id);
      if (!canView) return [];

      const members = await projectService.getProjectMembers(parent.id);
      return Promise.all(members.map(async (member) => {
        const user = await userService.findUserById(member.user_id);
        return {
          id: member.id,
          user: user ? { ...user, globalStatus: user.global_status } : null,
          role: member.role,
          createdAt: member.created_at,
        };
      }));
    },
    tasks: async (parent: any, args: any, context: GraphQLContext) => {
        if (!context.user) return [];
        const canView = await authorizationService.canViewProject(context.user.id, parent.id);
        if (!canView) return [];

        const tasks = await taskService.getTasksInProject(parent.id);
        // Populate createdBy and assignees for each task
        return Promise.all(tasks.map(async (task) => {
            const createdByUser = await userService.findUserById(task.created_by);
            const assignees = await taskService.getTaskAssignees(task.id);
            return {
              ...task,
              projectId: task.project_id,
              createdBy: createdByUser ? { ...createdByUser, globalStatus: createdByUser.global_status } : null,
              assignees: assignees.map(u => ({ ...u, globalStatus: u.global_status })),
            };
        }));
    }
  }
};