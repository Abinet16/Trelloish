import { GoogleGenerativeAI } from "@google/generative-ai";
import logger from "../logging/logger";

// Get API key from your environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const aiService = {

  async summarizeText(text: string): Promise<string> {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `Summarize the following task description in one or two concise sentences: "${text}"`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      logger.error("Gemini API call for summarization failed", {
        error: error.message,
      });
      throw new Error("Failed to summarize text using AI service.");
    }
  },

  async generateTasksFromPrompt(
    prompt: string
  ): Promise<{ title: string; description: string }[]> {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const fullPrompt = `Based on the high-level goal "${prompt}", generate a list of actionable tasks. Return the list as a valid JSON array of objects, where each object has a "title" and a "description" key. Do not include any other text or formatting. Example: [{"title": "Task 1", "description": "Description 1"}]`;

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const jsonText = response
        .text()
        .replace(/```json|```/g, "")
        .trim(); // Clean up potential markdown formatting
      return JSON.parse(jsonText);
    } catch (error: any) {
      logger.error("Gemini API call for task generation failed", {
        error: error.message,
      });
      throw new Error("Failed to generate tasks using AI service.");
    }
  },
};
