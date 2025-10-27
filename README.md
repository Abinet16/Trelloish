

# Full Stack Collaboration Platform(Trelloish) API (Backend) and Minimal Frontend

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

This repository contains the backend API for a collaborative project management platform, simulating a Trello-like task tracker. It features a robust, secure, and scalable architecture built with a modern technology stack, focusing on complex authorization, real-time updates, and comprehensive security logging. This project demonstrates capabilities in secure authentication, mixed API architecture (REST/GraphQL), serverless PostgreSQL data modeling (Neon DB), and robust logging.

---

## ✨ Core Features

*   **Secure Authentication & User Management:**
    *   **Mixed API Approach:** REST for token handling (`/login`, `/logout`, `/refresh_token`) and GraphQL for user data operations (`register`, `me`, `forgotPassword`, `updatePassword`).
    *   **JWT-Based:** Uses separate, short-lived Access Tokens (bearer header) and long-lived, rotating Refresh Tokens (secure `HttpOnly` cookies).
    *   **Password Security:** Strong password hashing (bcrypt) and a "Forgot Password" flow with mocked email sending.
    *   **Device & Session Tracking:** Records device metadata (IP, User-Agent, login time) for each refresh token in a dedicated `user_devices` table, allowing for session termination.
*   **Complex Authorization Model:**
    *   **Workspace-Level Roles:** `OWNER` (full CRUD on workspace, member management), `MEMBER` (can create/edit/delete projects/tasks), `VIEWER` (read-only).
    *   **Project-Level Roles:** `PROJECT_LEAD` (manage project membership/roles, edit all tasks, delete project), `CONTRIBUTOR` (create/edit/update assigned/unassigned tasks), `PROJECT_VIEWER` (read-only).
    *   **Global Admin Role:** An `ADMIN` status for application-wide management (user ban/unban, force password reset).
*   **Real-Time Collaboration:**
    *   **GraphQL Subscriptions:** Implements `taskStatusUpdated(workspaceId: ID!)` for real-time updates to all connected workspace members when a task's status changes. This is filtered by workspace and user membership.
*   **Task & Project Management:**
    *   Full CRUD operations for Workspaces, Projects, and Tasks, meticulously protected by the granular authorization model.
    *   Automated notification generation when tasks are assigned or re-assigned.
*   **Secure Dual Logging (Part 4 Compliance):**
    *   **File Logging (`./logs/audit.log`):** Captures all application activities (info, warn, error, security, activity) for production monitoring, including timestamp, level, message, user ID, IP, and action.
    *   **Database Logging (`audit_logs` table):** Records security-sensitive events (failed logins, admin actions), critical errors, task lifecycle, and project/workspace management for compliance and auditing.
*   **Bonus Challenge: AI Integration (Gemini API):**
    *   **`summarizeTaskDescription(description: String!)` (Query):** Utilizes AI to return a concise, 1-2 sentence summary of a long task description.
    *   **`generateTasksFromPrompt(projectId: ID!, prompt: String!)` (Mutation):** Accepts a high-level prompt, uses AI to generate a structured list of potential tasks, and persists them into the specified project.

---

## ⚙️ Architectural Overview & Tech Stack

The API follows a modular, service-oriented architecture, ensuring clear separation of concerns, scalability, and maintainability.

*   **Runtime:** **Bun** (for execution, package management, and testing)
*   **Framework:** **Express.js**
*   **Database:** **PostgreSQL** (Managed by **Neon Serverless DB** for production, with raw `pg` driver for precise control)
*   **API Architecture:**
    *   **GraphQL (Primary):** Apollo Server handles all data-related queries, mutations, and subscriptions. This provides a flexible and efficient interface for clients.
    *   **REST (Token Management):** Dedicated REST endpoints for stateless token operations (`/login`, `/logout`, `/refresh_token`), which naturally integrate with `HttpOnly` cookie management.
*   **Real-Time:** **GraphQL Subscriptions** over WebSockets (`graphql-ws`).
*   **Authentication:** **JSON Web Tokens (JWT)** for stateless security.
*   **Logging:** **Winston** for robust dual-destination logging.
*   **Containerization:** **Docker & Docker Compose** for streamlined deployment (backend only, connecting to external Neon DB).
*   **AI Integration:** **Google Gemini API** for advanced text processing.

---

## 🚀 Getting Started

This project is designed for easy setup, leveraging Docker and a serverless database.

### Prerequisites

*   **Bun** (`curl -fsSL https://bun.sh/install | bash`)
*   **Docker & Docker Compose**
*   **A Neon.tech PostgreSQL Database:**
    *   Sign up at [Neon.tech](https://neon.tech/).
    *   Create a new project and retrieve your **connection string**. It's crucial this string includes `?sslmode=require`.

### 1. Setup & Running the Application

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Abinet16/Trelloish-Backend-graphQL---N4PCC.git
    cd Trelloish-Backend-graphQL
    ```

2.  **Create your environment file:**
    Copy the example and fill in your secrets.
    ```bash
    cp .env.example .env
    ```
    *   **`DATABASE_URL`**: Paste your Neon connection string here. **Example**: `postgresql://user:password@ep-host-123.us-east-2.aws.neon.tech/neondb?sslmode=require`
    *   **`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`**: Use long, random strings for security.
    *   **`GEMINI_API_KEY`**: If using the AI bonus features, provide your Google Gemini API key.

3.  **Install dependencies and apply database schema:**
    ```bash
    bun install
    bun run db:migrate # Connects to Neon and creates/updates all tables
    ```
    The `db:migrate` script ensures your Neon database has all the necessary tables and enums defined in `src/db/schema.sql`.

4.  **Run with Docker Compose (Recommended for simplified local dev/testing):**
    ```bash
    docker-compose up --build -d
    ```
    This will build and start your backend application container. Since we're using Neon, there's no separate database container managed by Docker Compose. Your backend will connect to your remote Neon instance.

    The API will be running at `http://localhost:4000`.

5.  **Alternatively, Run Locally (without Docker for the app):**
    ```bash
    bun dev
    ```
    This starts the Bun application directly on your machine with hot-reloading, connecting to your Neon database via the `.env` configuration.

---

## 🧪 Testing

The project includes a comprehensive test suite.

*   **Unit Tests:** Verify the correctness of critical utility functions and core business logic (e.g., JWT generation, logging service).
*   **End-to-End (E2E) Tests:** Validate complex, security-sensitive workflows like full authentication flows, authorization checks, and data consistency across the API.

**To run all tests:**
```bash
bun test
```

**To run unit or E2E tests specifically:**
```bash
bun test --target unit
bun test --target e2e
```

---

## 🚀 CI/CD Readiness

A basic GitHub Actions workflow (`.github/workflows/ci.yml`) is provided to demonstrate CI/CD readiness. This pipeline defines steps to:

*   Install dependencies.
*   Lint the codebase.
*   Run the full test suite (unit and E2E).
*   (Placeholder for build steps if applicable).

This ensures automated validation of code quality and functionality on every push or pull request.

---

## 📖 API Usage & Examples

**GraphQL Endpoint:** `http://localhost:4000/graphql`
**GraphQL Subscriptions Endpoint:** `ws://localhost:4000/graphql`
**REST Endpoint Base:** `http://localhost:4000/rest`

_All protected GraphQL endpoints require an `Authorization: Bearer <accessToken>` header._

#### 1. Register a New User (GraphQL Mutation)

```graphql
mutation RegisterUser {
  register(input: { email: "test@overlook.com", password: "pass1234" }) {
    accessToken
    user {
      id
      email
      globalStatus
    }
  }
}
```
<img width="1912" height="827" alt="image" src="https://github.com/user-attachments/assets/2f9c5130-6299-438d-940c-ac8ddfca4a25" />

#### 2. Login (REST Endpoint)

This returns the `accessToken` in the response body and sets the `refreshToken` in a secure, `HttpOnly` cookie.

```bash
curl -X POST http://localhost:4000/rest/auth/login \
-H "Content-Type: application/json" \
-d '{"email": "test@overlook.com", "password": "pass1234"}' \
-c cookies.txt # Save cookies to see the refreshToken
```
<img width="1083" height="873" alt="image" src="https://github.com/user-attachments/assets/721ce546-e5da-4a53-8fb6-04c156af4274" />

#### 3. Create a Workspace (GraphQL Mutation)

```graphql
mutation CreateNewWorkspace {
  createWorkspace(input: { name: "My New Project Workspace" }) {
    id
    name
    members {
      user {
        email
      }
      role
    }
  }
}
```
<img width="1876" height="790" alt="image" src="https://github.com/user-attachments/assets/47ae7f7c-044b-48cd-9e13-c42578daed9c" />

#### 4. Update a Task's Status (GraphQL Mutation)

This action will trigger a real-time subscription event to all relevant workspace members.

```graphql
mutation UpdateTaskStatus {
  updateTask(id: "task-uuid-here", input: { status: IN_PROGRESS }) {
    id
    title
    status
    updatedAt
  }
}
```

#### 5. Subscribe to Task Updates (GraphQL Subscription)

Use a GraphQL client that supports WebSockets (e.g., Apollo Studio Sandbox, Insomnia, or a dedicated frontend) and run this subscription. Ensure you provide the `workspaceId` and a valid `Authorization` header in the WebSocket connection parameters.

```graphql
subscription OnTaskStatusUpdated($workspaceId: ID!) {
  taskStatusUpdated(workspaceId: $workspaceId) {
    id
    title
    status
    updatedAt
    projectId
    createdBy {
      id
      email
    }
    assignees {
      id
      email
    }
  }
}
# With subscription variables:
# { "workspaceId": "your-workspace-uuid-here" }
```

#### 6. Summarize a Task Description (AI Query)

```graphql
query GetTaskSummary {
  summarizeTaskDescription(description: "This is a very long and detailed task description that involves setting up the initial project structure, installing all the necessary dependencies like Express and Apollo Server, configuring the database connection with PostgreSQL, and then finally creating the initial GraphQL schema for the user authentication part of the application.")
}
```
<img width="1890" height="632" alt="image" src="https://github.com/user-attachments/assets/f651d0a3-ef92-49d2-80a9-6a859ec8a37a" />

#### 7. Generate Tasks from Prompt (AI Mutation)

```graphql
mutation GenerateTasks {
  generateTasksFromPrompt(
    projectId: "your-project-id-here",
    prompt: "Plan the launch of our new marketing campaign for the Q4 product release."
  ) {
    id
    title
    description
    status
    projectId
  }
}
```

---

## 🔐 Security & Differentiators

Beyond the core requirements, the following features enhance the application's robustness and security:

*   **Rate Limiting & Throttling:** Implemented using `express-rate-limit` to protect public endpoints (login, registration, refresh token) from brute-force attacks, with stricter limits on authentication-related actions.
*   **Graceful Shutdown:** Ensures the application handles termination signals (`SIGTERM`, `SIGINT`) gracefully, closing the HTTP server and explicitly ending the PostgreSQL database connection pool to prevent data corruption or lost operations. Includes a timeout for forceful shutdown if necessary.
*   **HTTP-only Cookies for Refresh Tokens:** Mitigates XSS attacks by preventing client-side JavaScript access to the refresh token.
*   **Robust Error Handling & Logging:** Comprehensive error handling across REST and GraphQL, with all errors being logged to both file and database via the secure dual-logging system.

---

## 🪵 Logging System

The dual-logging system (`src/logging`) is a critical security and operational component:

*   **File (`./logs/audit.log`):** A comprehensive, human-readable log of all system activities (levels `info`, `warn`, `error`, `security`, `activity`). Ideal for real-time monitoring and debugging in a production environment.
*   **Database (`audit_logs` table):** A structured, queryable log of high-importance events for compliance and auditing. It records:
    *   **`security`:** Failed login attempts, admin actions (user banning/password resets).
    *   **`error`:** All exceptions and unhandled errors.
    *   **`activity`:** Key business events like task status changes, workspace/project creation/deletion, and membership changes.
    *   **`info`:** General operational information, like successful logins/logout.

---

## 📂 Project Structure

```
.
├── src/
│   ├── auth/          # JWT utilities, authentication middleware
│   ├── config/        # Environment variable management
│   ├── db/            # Database connection, schema.sql, migration script
│   ├── graphql/       # GraphQL type definitions and resolvers (user, workspace, project, task, notification, ai)
│   ├── logging/       # Winston logger configuration and DB audit service
│   ├── models/        # TypeScript interfaces for data models
│   ├── rest/          # REST API route definitions (authentication)
│   ├── services/      # Core business logic (user, workspace, project, task, notification, AI)
│   ├── app.ts         # Express app configuration, middleware, Apollo Server setup
│   └── server.ts      # Server entry point, graceful shutdown logic
├── tests/
│   ├── unit/          # Unit tests for core functions
│   └── e2e/           # End-to-end tests for critical flows
├── .env.example       # Template for environment variables
├── Dockerfile         # Dockerfile for building the backend application container
├── docker-compose.yml # Docker Compose for orchestrating the backend (connecting to Neon DB)
└── README.md          # This documentation
```

---


A brief (2-5 minute) video walkthrough demonstrating the application setup and key functionalities achieved (e.g., Admin banning a user, a task status update triggering the GQL Subscription, AI task generation) has been included with this submission.

---
