import bcrypt from "bcrypt";
import { query } from "../db";
import { User, UserGlobalStatus } from "../models";
import { auditLogService } from "../logging/auditLogService";
//import { v4 as uuidv4 } from "uuid"; // For generating reset tokens
import { v4 as uuidv4, validate as uuidValidate } from "uuid";
const SALT_ROUNDS = 10;

interface PasswordResetToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at?: Date;
}

export const userService = {
  async findUserByEmail(email: string): Promise<User | null> {
    const result = await query("SELECT * FROM users WHERE email = $1", [email]);
    return result.rows[0] || null;
  },

  async findUserById(id: string): Promise<User | null> {
    const result = await query("SELECT * FROM users WHERE id = $1", [id]);
    return result.rows[0] || null;
  },

  async createUser(email: string, passwordPlain: string): Promise<User> {
    const password_hash = await bcrypt.hash(passwordPlain, SALT_ROUNDS);
    const result = await query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *",
      [email, password_hash]
    );
    return result.rows[0];
  },

  async updateUserPassword(
    userId: string,
    newPasswordPlain: string
  ): Promise<void> {
    const password_hash = await bcrypt.hash(newPasswordPlain, SALT_ROUNDS);
    await query("UPDATE users SET password_hash = $1 WHERE id = $2", [
      password_hash,
      userId,
    ]);
    await auditLogService.activity("PASSWORD_UPDATE", userId);
  },

  async updateUserStatus(
    adminId: string,
    targetUserId: string,
    status: UserGlobalStatus
  ): Promise<User | null> {
    const result = await query(
      "UPDATE users SET global_status = $1 WHERE id = $2 RETURNING *",
      [status, targetUserId]
    );
    if (result.rows[0]) {
      const action =
        status === "BANNED" ? "ADMIN_USER_BANNED" : "ADMIN_USER_UNBANNED";
      await auditLogService.security(action, adminId, undefined, {
        targetUserId,
        newStatus: status,
      });
    }
    return result.rows[0] || null;
  },

  async generatePasswordResetToken(email: string): Promise<string | null> {
    const user = await this.findUserByEmail(email);
    if (!user) return null;

    // Invalidate existing tokens for this user
    await query("DELETE FROM password_reset_tokens WHERE user_id = $1", [
      user.id,
    ]);

    const token = uuidv4(); // Unique token for the link
    const tokenHash = await bcrypt.hash(token, SALT_ROUNDS); // Hash the token for storage
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour expiry

    await query(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
      [user.id, tokenHash, expiresAt]
    );

    await auditLogService.info("PASSWORD_RESET_REQUEST", user.id, undefined, {
      email,
    });

    // In a real application, you would send this 'token' via email to the user.
    // For this test, we mock it by returning it.
    console.log(`Mock: Password reset token for ${email}: ${token}`);
    return token;
  },

  async resetPasswordWithToken(
    token: string,
    newPasswordPlain: string
  ): Promise<boolean> {
    const tokens = (
      await query(
        "SELECT prt.*, u.id as user_id_from_user FROM password_reset_tokens prt JOIN users u ON prt.user_id = u.id WHERE prt.expires_at > NOW()"
      )
    ).rows;

    let validTokenFound: PasswordResetToken | null = null;
    let targetUserId: string | null = null;

    for (const storedToken of tokens) {
      if (await bcrypt.compare(token, storedToken.token_hash)) {
        validTokenFound = storedToken;
        targetUserId = storedToken.user_id;
        break;
      }
    }

    if (!validTokenFound || !targetUserId) {
      return false;
    }

    await this.updateUserPassword(targetUserId, newPasswordPlain);
    await query("DELETE FROM password_reset_tokens WHERE user_id = $1", [
      targetUserId,
    ]); // Invalidate used token

    await auditLogService.activity("PASSWORD_RESET_SUCCESS", targetUserId);
    return true;
  },

  async adminResetUserPassword(
    adminId: string,
    targetUserId: string,
    newPasswordPlain: string
  ): Promise<User | null> {
    const user = await this.findUserById(targetUserId);
    if (!user) return null;

    await this.updateUserPassword(targetUserId, newPasswordPlain);
    await auditLogService.security("ADMIN_PASSWORD_RESET", adminId, undefined, {
      targetUserId,
    });
    return user;
  },
};
