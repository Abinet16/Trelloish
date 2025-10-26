// src/graphql/resolvers/workspaceResolver.ts
import { GraphQLContext } from '../../auth/authMiddleware';
import { workspaceService } from '../../services/workspaceService';
import { authorizationService } from '../../services/authorizationService';
import { userService } from '../../services/userService';

export const workspaceResolvers = {
  Query: {
    myWorkspaces: async (parent: any, args: any, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Unauthorized: You must be logged in.');
      }
      const workspaces = await workspaceService.getWorkspacesForUser(context.user.id);
      return workspaces.map(ws => ({ ...ws, globalStatus: (ws as any).global_status ?? (ws as any).globalStatus })); // Map DB fields
    },

    getWorkspace: async (parent: any, { id }: { id: string }, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Unauthorized: You must be logged in.');
      }

      // Authorization: Requires at least Viewer role membership
      const canView = await authorizationService.canViewWorkspace(context.user.id, id);
      if (!canView) {
        throw new Error('Forbidden: You do not have permission to view this workspace.');
      }

      const workspace = await workspaceService.getWorkspaceById(id);
      if (!workspace) {
        throw new Error('Workspace not found.');
      }

      // Fetch members for the workspace
      const members = await workspaceService.getWorkspaceMembers(id);
      const memberDetails = await Promise.all(members.map(async (member) => {
          const user = await userService.findUserById(member.user_id);
          return {
              id: member.id,
              user: user ? { ...user, globalStatus: (user as any).global_status ?? (user as any).globalStatus } : null, // Map user fields
              role: member.role,
              createdAt: member.created_at,
          };
      }));

      return {
          ...workspace,
          members: memberDetails, // Attach members to the workspace object
      };
    },

    getAllWorkspaces: async (parent: any, args: any, context: GraphQLContext) => {
      // Authorization: Admin Only
      if (!context.user || !authorizationService.isAdmin(context.user.status)) {
        throw new Error('Forbidden: Only ADMIN users can view all workspaces.');
      }
      const workspaces = await workspaceService.getAllWorkspaces();
      // For admin view, you might want to fetch full member lists too, but keeping it simple for now.
      return workspaces;
    },
  },

  Mutation: {
    createWorkspace: async (parent: any, { input }: any, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Unauthorized: You must be logged in to create a workspace.');
      }
      const { name } = input;
      const newWorkspace = await workspaceService.createWorkspace(context.user.id, name);
      return { ...newWorkspace, globalStatus: (newWorkspace as any).global_status ?? (newWorkspace as any).globalStatus }; // Map DB fields
    },

    addWorkspaceMember: async (parent: any, { input }: any, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Unauthorized: You must be logged in.');
      }
      const { workspaceId, userEmail, role } = input;

      // Authorization: Requires Owner role
      const canManage = await authorizationService.canManageWorkspace(context.user.id, workspaceId);
      if (!canManage) {
        throw new Error('Forbidden: Only workspace owners can add members.');
      }

      const newMember = await workspaceService.addWorkspaceMember(context.user.id, workspaceId, userEmail, role);
      const user = await userService.findUserById(newMember.user_id);
      return {
          id: newMember.id,
          user: user ? { ...user, globalStatus: (user as any).global_status ?? (user as any).globalStatus } : null,
          role: newMember.role,
          createdAt: newMember.created_at,
      };
    },

    removeWorkspaceMember: async (parent: any, { workspaceId, userId }: any, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Unauthorized: You must be logged in.');
      }

      // Authorization: Requires Owner role
      const canManage = await authorizationService.canManageWorkspace(context.user.id, workspaceId);
      if (!canManage) {
        throw new Error('Forbidden: Only workspace owners can remove members.');
      }
      // Cannot remove self if owner (handled in service layer)
      if (context.user.id === userId) {
          throw new Error('Cannot remove yourself from the workspace. Transfer ownership first.');
      }

      await workspaceService.removeWorkspaceMember(context.user.id, workspaceId, userId);
      return true;
    },

    updateWorkspaceMemberRole: async (parent: any, { input }: any, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Unauthorized: You must be logged in.');
      }
      const { workspaceId, userId, newRole } = input;

      // Authorization: Requires Owner role
      const canManage = await authorizationService.canManageWorkspace(context.user.id, workspaceId);
      if (!canManage) {
        throw new Error('Forbidden: Only workspace owners can update member roles.');
      }

      // Cannot update the owner's role (handled in service layer)
      // Check if target user is the owner, and if so, prevent changing their role to non-owner
      const targetUserCurrentRole = await authorizationService.getUserWorkspaceRole(userId, workspaceId);
      if (targetUserCurrentRole === 'OWNER' && newRole !== 'OWNER') {
          throw new Error('Cannot change the role of the workspace owner directly. Transfer ownership first.');
      }

      const updatedMember = await workspaceService.updateWorkspaceMemberRole(context.user.id, workspaceId, userId, newRole);
      const user = await userService.findUserById(updatedMember.user_id);
      return {
          id: updatedMember.id,
          user: user ? { ...user, globalStatus: user.global_status } : null,
          role: updatedMember.role,
          createdAt: updatedMember.created_at,
      };
    },
  },

  // Field resolver for Workspace.members to populate User data
  Workspace: {
    members: async (parent: any, args: any, context: GraphQLContext) => {
      // This resolver is for the 'members' field inside a Workspace type.
      // It will be called after getWorkspace or myWorkspaces have fetched the basic workspace.
      // We already fetch members in getWorkspace, so this might be redundant if the parent already has it.
      // However, if the parent just has workspace details, this will fetch them.

      // We need to ensure the user has permission to see members details.
      // Assumed that if they can view the workspace, they can view its member list.
      if (!context.user) return []; // Should be caught by parent resolver if needed
      const canView = await authorizationService.canViewWorkspace(context.user.id, parent.id);
      if (!canView) return []; // Or throw error, depending on UX

      const members = await workspaceService.getWorkspaceMembers(parent.id);
      const memberDetails = await Promise.all(members.map(async (member) => {
          const user = await userService.findUserById(member.user_id);
          return {
              id: member.id, // ID of the membership record
              user: user ? { ...user, globalStatus: user.global_status } : null,
              role: member.role,
              createdAt: member.created_at,
          };
      }));
      return memberDetails;
    }
  }
};