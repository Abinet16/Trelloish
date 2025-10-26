// src/graphql/resolvers/notificationResolver.ts
import { GraphQLContext } from '../../auth/authMiddleware';
import { notificationService } from '../../services/notificationService';
import { userService } from '../../services/userService';
import { NotificationStatus } from '../../models';

export const notificationResolvers = {
  Query: {
    myNotifications: async (parent: any, { status }: { status?: NotificationStatus }, context: GraphQLContext) => {
      if (!context.user) throw new Error('Unauthorized');
      return notificationService.getNotificationsForUser(context.user.id, status);
    },
  },

  Mutation: {
    markNotificationAsSeen: async (parent: any, { input }: any, context: GraphQLContext) => {
      if (!context.user) throw new Error('Unauthorized');
      const { notificationId } = input;
      return notificationService.markNotificationAsSeen(context.user.id, notificationId);
    },
  },

  // Field Resolvers for Notification type
  Notification: {
    recipient: (parent: any) => userService.findUserById(parent.recipient_id),
  },
};