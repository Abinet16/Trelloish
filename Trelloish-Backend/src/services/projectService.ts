// src/services/projectService.ts
import { query, getClient } from "../db";
import { Project, ProjectMember, ProjectRole, User } from "../models";
import { auditLogService } from "../logging/auditLogService";
import { userService } from "./userService";

export const projectService = {
  async createProject(
    creatorId: string,
    workspaceId: string,
    name: string
  ): Promise<Project> {
    const client = await getClient();
    try {
      await client.query("BEGIN");

      const projectResult = await client.query(
        "INSERT INTO projects (workspace_id, name) VALUES ($1, $2) RETURNING *",
        [workspaceId, name]
      );
      const newProject: Project = projectResult.rows[0];

      // Creator is automatically Project Lead
      await client.query(
        "INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)",
        [newProject.id, creatorId, "PROJECT_LEAD"]
      );

      await client.query("COMMIT");
      await auditLogService.activity("PROJECT_CREATED", creatorId, {
        projectId: newProject.id,
        workspaceId,
        name,
      });
      return newProject;
    } catch (error: any) {
      await client.query("ROLLBACK");
      await auditLogService.error(
        "PROJECT_CREATION_FAILED",
        creatorId,
        undefined,
        { workspaceId, name, error: error.message }
      );
      throw error;
    } finally {
      client.release();
    }
  },

  async updateProject(
    updaterId: string,
    projectId: string,
    name: string
  ): Promise<Project> {
    const result = await query(
      "UPDATE projects SET name = $1 WHERE id = $2 RETURNING *",
      [name, projectId]
    );
    if (result.rows.length === 0) {
      throw new Error("Project not found or not authorized to update.");
    }
    await auditLogService.activity("PROJECT_UPDATED", updaterId, {
      projectId,
      newName: name,
    });
    return result.rows[0];
  },

  async deleteProject(deleterId: string, projectId: string): Promise<void> {
    const result = await query(
      "DELETE FROM projects WHERE id = $1 RETURNING *",
      [projectId]
    );
    if (result.rows.length === 0) {
      throw new Error("Project not found or not authorized to delete.");
    }
    await auditLogService.activity("PROJECT_DELETED", deleterId, { projectId });
  },

  async getProjectById(projectId: string): Promise<Project | null> {
    const result = await query("SELECT * FROM projects WHERE id = $1", [
      projectId,
    ]);
    return result.rows[0] || null;
  },

  async getProjectsInWorkspace(workspaceId: string): Promise<Project[]> {
    const result = await query(
      "SELECT * FROM projects WHERE workspace_id = $1",
      [workspaceId]
    );
    return result.rows;
  },

  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    const result = await query(
      `SELECT pm.id, pm.project_id, pm.user_id, pm.role, u.email as user_email
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1`,
      [projectId]
    );
    return result.rows.map((row) => ({
      ...row,
      user: { id: row.user_id, email: row.user_email, role: row.role },
    }));
  },

  async addProjectMember(
    managerId: string,
    projectId: string,
    userIdToAdd: string,
    role: ProjectRole = "CONTRIBUTOR"
  ): Promise<ProjectMember> {
    // Check if user is already a member
    const existingMember = await query(
      "SELECT * FROM project_members WHERE project_id = $1 AND user_id = $2",
      [projectId, userIdToAdd]
    );
    if (existingMember.rows.length > 0) {
      throw new Error("User is already a member of this project.");
    }

    // Ensure the user to add is already a member of the parent workspace
    const project = await this.getProjectById(projectId);
    if (!project) throw new Error("Project not found.");
    const isWorkspaceMember = await query(
      "SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
      [project.workspace_id, userIdToAdd]
    );
    if (isWorkspaceMember.rows.length === 0) {
      throw new Error(
        "User must be a member of the parent workspace before being added to a project."
      );
    }

    const result = await query(
      "INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3) RETURNING *",
      [projectId, userIdToAdd, role]
    );
    await auditLogService.activity("PROJECT_MEMBER_ADDED", managerId, {
      projectId,
      targetUserId: userIdToAdd,
      role,
    });
    return result.rows[0];
  },

  async removeProjectMember(
    managerId: string,
    projectId: string,
    userIdToRemove: string
  ): Promise<void> {
    const currentMember = await query(
      "SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2",
      [projectId, userIdToRemove]
    );

    if (currentMember.rows[0]?.role === "PROJECT_LEAD") {
      throw new Error(
        "Cannot remove the project lead. Transfer leadership first."
      );
    }

    const result = await query(
      "DELETE FROM project_members WHERE project_id = $1 AND user_id = $2 RETURNING *",
      [projectId, userIdToRemove]
    );
    if (result.rows.length === 0) {
      throw new Error("User is not a member of this project.");
    }
    await auditLogService.activity("PROJECT_MEMBER_REMOVED", managerId, {
      projectId,
      targetUserId: userIdToRemove,
    });
  },

  async updateProjectMemberRole(
    managerId: string,
    projectId: string,
    userIdToUpdate: string,
    newRole: ProjectRole
  ): Promise<ProjectMember> {
    const currentMember = await query(
      "SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2",
      [projectId, userIdToUpdate]
    );

    if (currentMember.rows.length === 0) {
      throw new Error("User is not a member of this project.");
    }
    if (
      currentMember.rows[0].role === "PROJECT_LEAD" &&
      newRole !== "PROJECT_LEAD"
    ) {
      throw new Error(
        "Cannot change the role of the project lead directly. Transfer leadership if needed."
      );
    }

    const result = await query(
      "UPDATE project_members SET role = $1 WHERE project_id = $2 AND user_id = $3 RETURNING *",
      [newRole, projectId, userIdToUpdate]
    );
    await auditLogService.activity("PROJECT_MEMBER_ROLE_UPDATED", managerId, {
      projectId,
      targetUserId: userIdToUpdate,
      newRole,
    });
    return result.rows[0];
  },
};
