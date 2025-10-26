import { query } from "../db";
import { WorkspaceRole, ProjectRole, UserGlobalStatus } from "../models";

export const authorizationService = {
  // --- Workspace Authorization ---

  async getUserWorkspaceRole(
    userId: string,
    workspaceId: string
  ): Promise<WorkspaceRole | null> {
    const result = await query(
      "SELECT role FROM workspace_members WHERE user_id = $1 AND workspace_id = $2",
      [userId, workspaceId]
    );
    return result.rows[0]?.role || null;
  },

  async canManageWorkspace(
    userId: string,
    workspaceId: string
  ): Promise<boolean> {
    const role = await this.getUserWorkspaceRole(userId, workspaceId);
    return role === "OWNER"; // Only owner can manage workspace (add/remove members, update roles)
  },

  async canEditProjectsInWorkspace(
    userId: string,
    workspaceId: string
  ): Promise<boolean> {
    const role = await this.getUserWorkspaceRole(userId, workspaceId);
    // Owners and Members can create/edit/delete projects within the Workspace
    return role === "OWNER" || role === "MEMBER";
  },

  async canViewWorkspace(
    userId: string,
    workspaceId: string
  ): Promise<boolean> {
    const role = await this.getUserWorkspaceRole(userId, workspaceId);
    // Any member role (OWNER, MEMBER, VIEWER) can view the workspace
    return role !== null;
  },

  // --- Project Authorization ---

  async getUserProjectRole(
    userId: string,
    projectId: string
  ): Promise<ProjectRole | null> {
    const result = await query(
      "SELECT role FROM project_members WHERE user_id = $1 AND project_id = $2",
      [userId, projectId]
    );
    return result.rows[0]?.role || null;
  },

  async canManageProject(userId: string, projectId: string): Promise<boolean> {
    const role = await this.getUserProjectRole(userId, projectId);
    return role === "PROJECT_LEAD"; // Only Project Leads can manage project membership/roles
  },

  async canEditTask(userId: string, projectId: string): Promise<boolean> {
    const role = await this.getUserProjectRole(userId, projectId);
    // Project Leads can edit all tasks
    // Contributors can create, edit, update status of tasks assigned to them or unassigned tasks
    return role === "PROJECT_LEAD" || role === "CONTRIBUTOR";
  },

  async canViewProject(userId: string, projectId: string): Promise<boolean> {
    const role = await this.getUserProjectRole(userId, projectId);
    // Any project role can view
    return role !== null;
  },

  // --- Global Admin Check ---
  isAdmin(userStatus: UserGlobalStatus): boolean {
    return userStatus === "ADMIN";
  },

  // --- Combined checks (Example for a Project Mutation) ---
  async checkProjectAccess(
    userId: string,
    projectId: string,
    requiredWorkspaceRole: WorkspaceRole[],
    requiredProjectRole: ProjectRole[],
    errorMessage: string
  ) {
    const projectResult = await query(
      "SELECT workspace_id FROM projects WHERE id = $1",
      [projectId]
    );
    if (projectResult.rows.length === 0) {
      throw new Error("Project not found.");
    }
    const workspaceId = projectResult.rows[0].workspace_id;

    const workspaceRole = await this.getUserWorkspaceRole(userId, workspaceId);
    if (!workspaceRole || !requiredWorkspaceRole.includes(workspaceRole)) {
      throw new Error(errorMessage);
    }

    const projectRole = await this.getUserProjectRole(userId, projectId);
    if (!projectRole || !requiredProjectRole.includes(projectRole)) {
      throw new Error(errorMessage);
    }
    return { workspaceId, workspaceRole, projectRole };
  },

  // Helper to ensure user is a workspace member for project related actions
  async ensureWorkspaceMembership(
    userId: string,
    workspaceId: string
  ): Promise<boolean> {
    const role = await this.getUserWorkspaceRole(userId, workspaceId);
    return role !== null;
  },
};
