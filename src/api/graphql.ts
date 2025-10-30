// src/api/graphql.ts
import { gql } from "@apollo/client";

// FRAGMENTS
const USER_FIELDS = gql`
  fragment UserFields on User {
    id
    email
    globalStatus
  }
`;

const TASK_FIELDS = gql`
  fragment TaskFields on Task {
    id
    title
    description
    status
    projectId
    createdBy {
      ...UserFields
    }
    assignees {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

// QUERIES
export const GET_MY_WORKSPACES = gql`
  query GetMyWorkspaces {
    myWorkspaces {
      id
      name
    }
  }
`;

export const GET_WORKSPACE_DETAILS = gql`
  query GetWorkspaceDetails($id: ID!) {
    getWorkspace(id: $id) {
      id
      name
      projects {
        id
        name
        tasks {
          ...TaskFields
        }
      }
      members {
        role
        user {
          ...UserFields
        }
      }
    }
  }
  ${TASK_FIELDS}
`;

export const SUMMARIZE_TASK_DESCRIPTION = gql`
  query SummarizeTask($description: String!) {
    summarizeTaskDescription(description: $description)
  }
`;

// ADMIN QUERIES
export const GET_ALL_USERS_ADMIN = gql`
  query GetAllUsersAdmin {
    getAllUsers {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

// MUTATIONS
export const REGISTER_MUTATION = gql`
  mutation Register($email: String!, $password: String!) {
    register(input: { email: $email, password: $password }) {
      accessToken
      user {
        ...UserFields
      }
    }
  }
  ${USER_FIELDS}
`;

export const CREATE_WORKSPACE_MUTATION = gql`
  mutation CreateWorkspace($name: String!) {
    createWorkspace(input: { name: $name }) {
      id
      name
    }
  }
`;

export const UPDATE_TASK_MUTATION = gql`
  mutation UpdateTask(
    $id: ID!
    $status: TaskStatus
    $title: String
    $description: String
  ) {
    updateTask(
      id: $id
      input: { status: $status, title: $title, description: $description }
    ) {
      ...TaskFields
    }
  }
  ${TASK_FIELDS}
  
`;export const CREATE_TASK_MUTATION = gql`
  mutation CreateTask($projectId: ID!, $title: String!) {
    createTask(input: { projectId: $projectId, title: $title }) {
      id
      title
      status
    }
  }
`;

export const GENERATE_TASKS_FROM_PROMPT = gql`
  mutation GenerateTasks($projectId: ID!, $prompt: String!) {
    generateTasksFromPrompt(projectId: $projectId, prompt: $prompt) {
      ...TaskFields
    }
  }
  ${TASK_FIELDS}
`;

// ADMIN MUTATIONS
export const ADMIN_UPDATE_USER_STATUS = gql`
  mutation AdminUpdateUserStatus($userId: ID!, $status: UserGlobalStatus!) {
    adminUpdateUserStatus(userId: $userId, status: $status) {
      ...UserFields
    }
  }
  ${USER_FIELDS}
`;

// SUBSCRIPTIONS
export const TASK_STATUS_UPDATED_SUBSCRIPTION = gql`
  subscription OnTaskStatusUpdated($workspaceId: ID!) {
    taskStatusUpdated(workspaceId: $workspaceId) {
      ...TaskFields
    }
  }
  ${TASK_FIELDS}
`;
