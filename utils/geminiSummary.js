
import fs from 'fs-extra';
import path from 'path';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function getInterviewSummary(sessionDir, selectedRole) {
  const conversationPath = path.join(sessionDir, 'conversation.json');
  if (!fs.existsSync(conversationPath)) return "No conversation found.";

  const conversation = fs.readJsonSync(conversationPath);

  const formattedTranscript = conversation.map((entry, i) => {
    return `Q${i + 1}: ${entry.question}\nA${i + 1}: ${entry.answer}`;
  }).join("\n\n");

  const prompt = `
You are an expert interviewer evaluating a candidate for the role of ${selectedRole}.
Here is the transcript of the interview:

${formattedTranscript}

Please provide:
- A score out of 10 based on the overall performance
- A brief analysis of strengths
- Suggestions for improvement
Keep it concise and professional.
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // ✅ Correct model
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error("Gemini summary error:", err);
    return "[Summary generation failed]";
  }
}