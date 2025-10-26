import pool,{ query } from '../db';
import { Workspace, WorkspaceMember, WorkspaceRole } from '../models';
import { auditLogService } from '../logging/auditLogService';
import { userService } from './userService';

export const workspaceService = {
  async createWorkspace(userId: string, name: string): Promise<Workspace> {
    const client = await pool.connect(); // Use pool to get a client for transaction
    try {
      await client.query('BEGIN');

      const workspaceResult = await client.query(
        'INSERT INTO workspaces (name) VALUES ($1) RETURNING *',
        [name]
      );
      const newWorkspace: Workspace = workspaceResult.rows[0];

      // User who creates it is automatically assigned the Owner role
      await client.query(
        'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)',
        [newWorkspace.id, userId, 'OWNER']
      );

      await client.query('COMMIT');
      await auditLogService.activity('WORKSPACE_CREATED', userId, { workspaceId: newWorkspace.id, name });
      return newWorkspace;
    } catch (error: any) {
      await client.query('ROLLBACK');
      await auditLogService.error('WORKSPACE_CREATION_FAILED', userId, undefined, { name, error: error.message });
      throw error;
    } finally {
      client.release();
    }
  },

  async getWorkspaceById(workspaceId: string): Promise<Workspace | null> {
    const result = await query('SELECT * FROM workspaces WHERE id = $1', [workspaceId]);
    return result.rows[0] || null;
  },

  async getWorkspacesForUser(userId: string): Promise<Workspace[]> {
    const result = await query(
      `SELECT w.*, wm.role FROM workspaces w
       JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE wm.user_id = $1`,
      [userId]
    );
    return result.rows;
  },

  async getAllWorkspaces(): Promise<Workspace[]> {
    const result = await query('SELECT * FROM workspaces');
    return result.rows;
  },

  async addWorkspaceMember(ownerId: string, workspaceId: string, email: string, defaultRole: WorkspaceRole = 'MEMBER'): Promise<WorkspaceMember> {
    const userToAdd = await userService.findUserByEmail(email);
    if (!userToAdd) {
      throw new Error('User to add not found.');
    }

    // Check if already a member
    const existingMember = await query(
      'SELECT * FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userToAdd.id]
    );
    if (existingMember.rows.length > 0) {
      throw new Error('User is already a member of this workspace.');
    }

    const result = await query(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3) RETURNING *',
      [workspaceId, userToAdd.id, defaultRole]
    );
    await auditLogService.activity('WORKSPACE_MEMBER_ADDED', ownerId, { workspaceId, targetUserId: userToAdd.id, role: defaultRole });
    return result.rows[0];
  },

  async removeWorkspaceMember(ownerId: string, workspaceId: string, userIdToRemove: string): Promise<void> {
    const currentMember = await query(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [workspaceId, userIdToRemove]
    );

    if (currentMember.rows[0]?.role === 'OWNER') {
        throw new Error('Cannot remove the workspace owner. Transfer ownership first.');
    }

    const result = await query(
      'DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 RETURNING *',
      [workspaceId, userIdToRemove]
    );

    if (result.rows.length === 0) {
        throw new Error('User is not a member of this workspace.');
    }
    await auditLogService.activity('WORKSPACE_MEMBER_REMOVED', ownerId, { workspaceId, targetUserId: userIdToRemove });
  },

  async updateWorkspaceMemberRole(ownerId: string, workspaceId: string, userIdToUpdate: string, newRole: WorkspaceRole): Promise<WorkspaceMember> {
    const currentMember = await query(
        'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
        [workspaceId, userIdToUpdate]
    );

    if (currentMember.rows.length === 0) {
        throw new Error('User is not a member of this workspace.');
    }
    if (currentMember.rows[0].role === 'OWNER' && newRole !== 'OWNER') {
        throw new Error('Cannot change the role of the workspace owner. Transfer ownership if needed.');
    }

    const result = await query(
      'UPDATE workspace_members SET role = $1 WHERE workspace_id = $2 AND user_id = $3 RETURNING *',
      [newRole, workspaceId, userIdToUpdate]
    );
    await auditLogService.activity('WORKSPACE_MEMBER_ROLE_UPDATED', ownerId, { workspaceId, targetUserId: userIdToUpdate, newRole });
    return result.rows[0];
  },

  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const result = await query(
      `SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, u.email as user_email
       FROM workspace_members wm
       JOIN users u ON wm.user_id = u.id
       WHERE wm.workspace_id = $1`,
      [workspaceId]
    );
    // You might want to return a more complete User object here, depending on needs.
    // For now, let's keep it simple.
    return result.rows.map(row => ({
      ...row,
      user: { id: row.user_id, email: row.user_email, role: row.role } // Attach user info
    }));
  }
};