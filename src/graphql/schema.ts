import gql from "graphql-tag";

export const typeDefs = gql`
  # Enums
  enum UserGlobalStatus {
    ACTIVE
    BANNED
    ADMIN
  }

  enum WorkspaceRole {
    OWNER
    MEMBER
    VIEWER
  }

  enum ProjectRole {
    PROJECT_LEAD
    CONTRIBUTOR
    PROJECT_VIEWER
  }

  enum TaskStatus {
    TODO
    IN_PROGRESS
    DONE
  }

  # Notification Enums
  enum NotificationStatus {
    DELIVERED
    SEEN
  }

  enum RelatedEntityType {
    TASK
    PROJECT
    WORKSPACE
  }

  # Types
  type User {
    id: ID!
    email: String!
    globalStatus: UserGlobalStatus!
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    accessToken: String!
    user: User!
  }

  type Workspace {
    id: ID!
    name: String!
    createdAt: String!
    updatedAt: String!
    members: [WorkspaceMemberDetails!] # List of members and their roles
  }

  type WorkspaceMemberDetails {
    id: ID! # ID of the membership record
    user: User! # The user object
    role: WorkspaceRole!
    createdAt: String!
  }

  # Project Types
  type Project {
    id: ID!
    workspaceId: ID!
    name: String!
    createdAt: String!
    updatedAt: String!
    members: [ProjectMemberDetails!]
    tasks: [Task!] # List of tasks in this project
  }

  type ProjectMemberDetails {
    id: ID!
    user: User!
    role: ProjectRole!
    createdAt: String!
  }

  # Task Types
  type Task {
    id: ID!
    projectId: ID!
    title: String!
    description: String
    status: TaskStatus!
    createdBy: User!
    assignees: [User!]
    createdAt: String!
    updatedAt: String!
  }

  # Notification Types
  type Notification {
    id: ID!
    recipient: User!
    title: String!
    body: String
    status: NotificationStatus!
    relatedEntityId: ID
    relatedEntityType: RelatedEntityType
    createdAt: String!
  }

  # Input Types
  input RegisterInput {
    email: String!
    password: String!
  }

  input ForgotPasswordInput {
    email: String!
  }

  input UpdatePasswordInput {
    oldPassword: String!
    newPassword: String!
  }

  input AdminUpdateUserInput {
    userId: ID!
    status: UserGlobalStatus
    newPassword: String # For adminResetPassword
  }

  # Input Types for Workspaces
  input CreateWorkspaceInput {
    name: String!
  }

  input AddWorkspaceMemberInput {
    workspaceId: ID!
    userEmail: String! # To identify user to add
    role: WorkspaceRole = MEMBER # Default role
  }

  input UpdateWorkspaceMemberRoleInput {
    workspaceId: ID!
    userId: ID! # User whose role is being updated
    newRole: WorkspaceRole!
  }

  # Input Types for Projects
  input CreateProjectInput {
    workspaceId: ID!
    name: String!
  }

  input UpdateProjectInput {
    name: String!
  }

  input AddProjectMemberInput {
    projectId: ID!
    userId: ID! # User to add
    role: ProjectRole = CONTRIBUTOR # Default role
  }

  input UpdateProjectMemberRoleInput {
    projectId: ID!
    userId: ID!
    newRole: ProjectRole!
  }

  # Input Types for Tasks
  input CreateTaskInput {
    projectId: ID!
    title: String!
    description: String
    assigneeIds: [ID!]
  }

  input UpdateTaskInput {
    title: String
    description: String
    status: TaskStatus
    assigneeIds: [ID!]
  }

  # Input Types for Notifications
  input MarkNotificationAsSeenInput {
    notificationId: ID!
  }

  # Root Query
  type Query {
    me: User # Get current authenticated user
    myWorkspaces: [Workspace!]! # Get all workspaces the current user is a member of
    getWorkspace(id: ID!): Workspace # Get a single workspace if user is a member
    getAllWorkspaces: [Workspace!]! # Admin-only: view all workspaces in the system
    getProject(id: ID!): Project # Get a single project
    getTasksInProject(projectId: ID!): [Task!]!
    myNotifications(status: NotificationStatus): [Notification!]!
  }
  extend type Query {
    """
    Accepts a long task description string and uses an AI model
    to return a concise, 1-2 sentence summary.
    Requires authentication.
    """
    summarizeTaskDescription(description: String!): String!
  }

  # Root Mutation
  type Mutation {
    # Authentication
    register(input: RegisterInput!): AuthPayload!
    forgotPassword(input: ForgotPasswordInput!): String! # Returns message/status
    updatePassword(input: UpdatePasswordInput!): User!

    # Admin-Specific Mutations
    adminUpdateUserStatus(userId: ID!, status: UserGlobalStatus!): User!
    adminResetUserPassword(userId: ID!, newPassword: String!): User!

    # Workspace Operations
    createWorkspace(input: CreateWorkspaceInput!): Workspace!
    addWorkspaceMember(input: AddWorkspaceMemberInput!): WorkspaceMemberDetails!
    removeWorkspaceMember(workspaceId: ID!, userId: ID!): Boolean!
    updateWorkspaceMemberRole(
      input: UpdateWorkspaceMemberRoleInput!
    ): WorkspaceMemberDetails!

    # Project CRUD
    createProject(input: CreateProjectInput!): Project!
    updateProject(id: ID!, input: UpdateProjectInput!): Project!
    deleteProject(id: ID!): Boolean!
    addProjectMember(input: AddProjectMemberInput!): ProjectMemberDetails!
    removeProjectMember(projectId: ID!, userId: ID!): Boolean!
    updateProjectMemberRole(
      input: UpdateProjectMemberRoleInput!
    ): ProjectMemberDetails!

    # Task CRUD & Assignment
    createTask(input: CreateTaskInput!): Task!
    updateTask(id: ID!, input: UpdateTaskInput!): Task!
    deleteTask(id: ID!): Boolean!

    # Notification Management
    markNotificationAsSeen(input: MarkNotificationAsSeenInput!): Notification!
  }
  extend type Mutation {
    """
    Accepts a high-level prompt (e.g., "Create a plan for launching a website")
    and uses an AI model to generate a structured list of potential tasks.
    The resolver then persists these generated tasks into the specified Project.
    Returns the list of newly created tasks.
    Requires authentication and Project Contributor/Lead role.
    """
    generateTasksFromPrompt(projectId: ID!, prompt: String!): [Task!]!
  }
  # Subscriptions for Real-time Updates
  type Subscription {
    taskStatusUpdated(workspaceId: ID!): Task!
  }
`;
