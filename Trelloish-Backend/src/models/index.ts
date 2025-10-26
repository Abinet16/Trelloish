export type UserGlobalStatus = "ACTIVE" | "BANNED" | "ADMIN";
export type LogLevel = "info" | "warn" | "error" | "security" | "activity";
export type WorkspaceRole = "OWNER" | "MEMBER" | "VIEWER";
export type ProjectRole = "PROJECT_LEAD" | "CONTRIBUTOR" | "PROJECT_VIEWER";
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type NotificationStatus = 'DELIVERED' | 'SEEN';
export type RelatedEntityType = 'TASK' | 'PROJECT' | 'WORKSPACE'; // For notifications

export interface User {
  id: string;
  email: string;
  password_hash: string;
  global_status: UserGlobalStatus;
  created_at: Date;
  updated_at: Date;
}

export interface UserDevice {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  login_time: Date;
  is_revoked: boolean;
  expires_at: Date;
  created_at: Date;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  level: LogLevel;
  user_id: string | null;
  ip_address: string | null;
  action: string;
  details: Record<string, any> | null;
  created_at: Date;
}

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

// Token types for JWT
export interface AccessTokenPayload {
  userId: string;
  email: string;
  status: UserGlobalStatus;
}

export interface RefreshTokenPayload {
  userId: string;
  deviceId: string; // To link to a specific session/device
}

export interface Workspace {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: Date;
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  created_at: Date;
}
// src/models/index.ts (Add these to your existing interfaces)


export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  created_by: string; // User ID
  created_at: Date;
  updated_at: Date;
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  assigned_at: Date;
}

export interface Notification {
  id: string;
  recipient_id: string;
  title: string;
  body: string | null;
  status: NotificationStatus;
  related_entity_id: string | null;
  related_entity_type: RelatedEntityType | null;
  created_at: Date;
  updated_at: Date;
}
