// src/graphql/resolvers/userResolver.ts
import { GraphQLContext } from "../../auth/authMiddleware";
import { authService } from "../../services/authService";
import { userService } from "../../services/userService";
import bcrypt from "bcrypt";
import { auditLogService } from "../../logging/auditLogService";

export const userResolvers = {
  Query: {
    me: async (parent: any, args: any, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error(
          "Unauthorized: You must be logged in to view your profile."
        );
      }
      const user = await userService.findUserById(context.user.id);
      if (!user) {
        throw new Error("User not found.");
      }
      return {
        ...user,
        globalStatus: user.global_status, // Map DB snake_case to GraphQL camelCase
      };
    },
  },

  Mutation: {
    register: async (parent: any, { input }: any, context: GraphQLContext) => {
      const { email, password } = input;
      const ipAddress = context.ipAddress;
      const userAgent = context.userAgent;

      try {
        const { accessToken, refreshToken, user } = await authService.registerUser(email, password) as any;
        
        // Set refresh token as HTTP-only cookie on the response
        context.res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // FIX: Safely handle the user object and global_status
        return {
          accessToken,
          user: { 
            ...user, 
            globalStatus: user.global_status || user.globalStatus || 'ACTIVE' // Fallback to default
          },
        };
      } catch (error: any) {
        await auditLogService.error("REGISTER_FAILURE", undefined, ipAddress, {
          email,
          error: error.message,
        });
        throw new Error(error.message);
      }
    },

    // ... rest of your mutations remain the same
    forgotPassword: async (
      parent: any,
      { input }: any,
      context: GraphQLContext
    ) => {
      const { email } = input;
      try {
        const token = await userService.generatePasswordResetToken(email);
        console.log(`Mock Email Sent to ${email} with reset token: ${token}`);
        return `If an account with ${email} exists, a password reset link has been sent.`;
      } catch (error: any) {
        await auditLogService.error(
          "FORGOT_PASSWORD_ERROR",
          undefined,
          context.ipAddress,
          { email, error: error.message }
        );
        return "An error occurred while processing your request.";
      }
    },

    updatePassword: async (
      parent: any,
      { input }: any,
      context: GraphQLContext
    ) => {
      if (!context.user) {
        throw new Error(
          "Unauthorized: You must be logged in to update your password."
        );
      }
      const { oldPassword, newPassword } = input;

      const user = await userService.findUserById(context.user.id);
      if (!user) {
        throw new Error("User not found.");
      }

      if (!(await bcrypt.compare(oldPassword, user.password_hash))) {
        await auditLogService.security(
          "UPDATE_PASSWORD_FAILURE",
          user.id,
          context.ipAddress,
          { reason: "Incorrect old password" }
        );
        throw new Error("Incorrect old password.");
      }

      await userService.updateUserPassword(user.id, newPassword);
      return { ...user, globalStatus: user.global_status };
    },

    adminUpdateUserStatus: async (
      parent: any,
      { userId, status }: any,
      context: GraphQLContext
    ) => {
      if (!context.user || context.user.status !== "ADMIN") {
        throw new Error("Forbidden: Only admins can update user status.");
      }
      if (context.user.id === userId && status === "BANNED") {
        throw new Error("Admin cannot ban themselves.");
      }

      const updatedUser = await userService.updateUserStatus(
        context.user.id,
        userId,
        status
      );
      if (!updatedUser) {
        throw new Error("User not found.");
      }
      return { ...updatedUser, globalStatus: updatedUser.global_status };
    },

    adminResetUserPassword: async (
      parent: any,
      { userId, newPassword }: any,
      context: GraphQLContext
    ) => {
      if (!context.user || context.user.status !== "ADMIN") {
        throw new Error("Forbidden: Only admins can reset user passwords.");
      }
      if (context.user.id === userId) {
        throw new Error(
          "Admin cannot reset their own password using this function. Use updatePassword instead."
        );
      }

      const updatedUser = await userService.adminResetUserPassword(
        context.user.id,
        userId,
        newPassword
      );
      if (!updatedUser) {
        throw new Error("User not found.");
      }
      return { ...updatedUser, globalStatus: updatedUser.global_status };
    },
  },
};