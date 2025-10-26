import { describe, it, expect, beforeAll, afterAll } from "bun:test";

const API_URL = "http://localhost:4000";

describe("Authentication Flow E2E", () => {
  const testUser = {
    email: `testuser_${Date.now()}@example.com`,
    password: "password123",
  };
  let accessToken = "";

  it("should register a new user via GraphQL", async () => {
    const response = await fetch(`${API_URL}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          mutation Register($email: String!, $password: String!) {
            register(input: { email: $email, password: $password }) {
              accessToken
              user { id email }
            }
          }
        `,
        variables: { email: testUser.email, password: testUser.password },
      }),
    });

    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data.register.accessToken).toBeString();
    expect(data.register.user.email).toBe(testUser.email);
  });

  it("should login the user via REST and receive an access token", async () => {
    const response = await fetch(`${API_URL}/rest/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.accessToken).toBeString();
    accessToken = data.accessToken;
  });

  it("should fail to view a restricted workspace without authorization", async () => {
    // Assuming workspace 'some-restricted-id' exists and user is not a member
    const response = await fetch(`${API_URL}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        query: `
          query GetWorkspace($id: ID!) {
            getWorkspace(id: $id) {
              id name
            }
          }
        `,
        variables: { id: "some-restricted-id" }, // Replace with a real ID
      }),
    });

    const body = await response.json();
    expect(body.errors).toBeDefined();
    expect(body.errors[0].message).toContain("Forbidden");
  });
});
