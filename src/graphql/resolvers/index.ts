// src/graphql/resolvers/index.ts
import { userResolvers } from './userResolver';
import { workspaceResolvers } from './workspaceResolver';
import { projectResolvers } from './projectResolver';
import { taskResolvers } from './taskResolver';
import { notificationResolvers } from './notificationResolver';
import { aiResolvers } from './aiResolver';

export const resolvers = [
  userResolvers,
  workspaceResolvers,
  projectResolvers,
  taskResolvers,
  notificationResolvers,
  aiResolvers,
];