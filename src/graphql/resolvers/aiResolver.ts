import { aiService } from "../../services/aiService";
import { taskService } from "../../services/taskService";
import { authorizationService } from "../../services/authorizationService";
import { GraphQLContext } from "../../auth/authMiddleware";

export const aiResolvers = {
  Query: {
    summarizeTaskDescription: async (
      parent: any,
      { description }: { description: string },
      context: GraphQLContext
    ) => {
      if (!context.user) throw new Error("Unauthorized");
      return aiService.summarizeText(description);
    },
  },
  Mutation: {
    generateTasksFromPrompt: async (
      parent: any,
      { projectId, prompt }: { projectId: string; prompt: string },
      context: GraphQLContext
    ) => {
      if (!context.user) throw new Error("Unauthorized");

      // Authorization: User must be a Contributor or Lead to add tasks
      const canEdit = await authorizationService.canEditTask(
        context.user.id,
        projectId
      );
      if (!canEdit)
        throw new Error(
          "Forbidden: You do not have permission to generate tasks for this project."
        );

      // 1. Call AI service
      const generatedTasks = await aiService.generateTasksFromPrompt(prompt);

      // 2. Persist tasks to the database
      const createdTasks = [];
      for (const task of generatedTasks) {
        const createdTask = await taskService.createTask(
          context.user.id,
          projectId,
          task.title,
          task.description
        );
        createdTasks.push(createdTask);
      }

      return createdTasks;
    },
  },
};
