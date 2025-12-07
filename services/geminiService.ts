import { GoogleGenAI, Type } from "@google/genai";
import { TaskStep, PracticeProblem, FocusMode } from "../types";

const apiKey = process.env.API_KEY;
// Using flash for responsiveness
const MODEL_NAME = "gemini-2.5-flash"; 
const IMAGE_MODEL_NAME = "gemini-2.5-flash-image";

const ai = new GoogleGenAI({ apiKey: apiKey });

// Helper to clean potential markdown code blocks from JSON response
const cleanJsonString = (text: string): string => {
  if (!text) return "{}";
  // Remove ```json and ``` wrapping if present
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "");
  return cleaned.trim();
};

export const breakDownGoal = async (goal: string): Promise<TaskStep[]> => {
  const prompt = `You are an ADHD-aware productivity coach. The user has this goal: "${goal}". 
  Break this into 3 to 7 very small, concrete, actionable steps. 
  Each step should take between 5 to 20 minutes. 
  Be encouraging but concise.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  minutes: { type: Type.NUMBER },
                },
                required: ["title", "description", "minutes"],
              },
            },
          },
        },
      },
    });

    const rawText = response.text || "{}";
    const cleanedText = cleanJsonString(rawText);
    const json = JSON.parse(cleanedText);
    
    return json.steps || [];
  } catch (error) {
    console.error("Error breaking down goal:", error);
    // Provide a fallback if parsing fails completely, rather than crashing
    throw new Error("Failed to generate steps. Please try again.");
  }
};

export const getDistractionCoaching = async (
  goal: string,
  mode: FocusMode,
  minutesElapsed: number
): Promise<string> => {
  const prompt = `The user is in a "${mode}" session working on "${goal}". 
  They have been working for ${minutesElapsed} minutes but just clicked "I got distracted". 
  In 2-3 sentences, respond in a non-judgmental, warm, dopamine-friendly way. 
  Acknowledge it happens, and suggest one tiny, 2-minute micro-step to get back on track. 
  Do not format as a list, just a supportive paragraph.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });
    return response.text || "It happens to the best of us! Take a deep breath, reset, and just try to do the very first tiny thing on your list.";
  } catch (error) {
    console.error("Error fetching coaching:", error);
    return "You're doing great. Just take one small step.";
  }
};

export const generatePracticeProblem = async (
  topic: string,
  difficulty: string,
  userGoal: string
): Promise<PracticeProblem> => {
  const isSmartContext = topic.includes("Smart Context") || topic.includes("Based on Goal");
  
  const prompt = isSmartContext 
    ? `You are a friendly tutor. The user is working on this specific goal: "${userGoal}".
       Generate a practice problem or active recall question that is directly relevant to this goal.
       Difficulty level: ${difficulty}.
       
       Return a JSON object with:
       - title: A short title.
       - statement: The problem/question description.
       - inputOutput: (Optional) Example input/output or key concept format.
       - hints: An array of 1-3 short hints.
       - explanation: A concise solution or answer explanation.`
    : `You are a friendly computer science tutor. 
       Generate a practice problem for the topic "${topic}" at "${difficulty}" difficulty.
       The user's current broader goal is "${userGoal}".
       
       Return a JSON object with:
       - title: A short title.
       - statement: The problem description.
       - inputOutput: (Optional) Example input/output if it's a coding problem.
       - hints: An array of 1-3 short hints.
       - explanation: A concise solution explanation or approach.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            statement: { type: Type.STRING },
            inputOutput: { type: Type.STRING },
            hints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            explanation: { type: Type.STRING },
          },
          required: ["title", "statement", "hints", "explanation"],
        },
      },
    });

    const rawText = response.text || "{}";
    const cleanedText = cleanJsonString(rawText);
    const json = JSON.parse(cleanedText);
    return json as PracticeProblem;
  } catch (error) {
    console.error("Error generating problem:", error);
    throw new Error("Could not generate a problem right now.");
  }
};

export const editImageWithGemini = async (
  imageBase64: string,
  imageMimeType: string,
  prompt: string
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: imageMimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    // Extract image from response parts
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated in response");
  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};