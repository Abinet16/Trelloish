
import { describe, it, expect } from "bun:test";
import { generateAccessToken, verifyAccessToken } from "../../src/auth/jwt";
import { UserGlobalStatus } from "../../src/models";

describe("JWT Utilities", () => {
  const userId = "a1b2c3d4-e5f6-7890-1234-567890abcdef";
  const email = "test@example.com";
  const status: UserGlobalStatus = "ACTIVE";

  it("should generate a valid access token", () => {
    const token = generateAccessToken(userId, email, status);
    expect(token).toBeString();
  });

  it("should verify a valid access token and return the correct payload", () => {
    const token = generateAccessToken(userId, email, status);
    const payload = verifyAccessToken(token);

    expect(payload).not.toBeNull();
    expect(payload?.userId).toBe(userId);
    expect(payload?.email).toBe(email);
    expect(payload?.status).toBe(status);
  });

  it("should return null for an invalid or expired token", () => {
    const invalidToken = "this.is.not.a.real.token";
    const payload = verifyAccessToken(invalidToken);
    expect(payload).toBeNull();
  });
});
