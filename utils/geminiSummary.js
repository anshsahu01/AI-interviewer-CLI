import fs from 'fs-extra';
import path from 'path';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generates a performance summary based on the interview transcript.
 * @param {string} sessionDir
 * @param {string} interviewType
 * @returns {Promise<string>}
 */
export async function getInterviewSummary(sessionDir, interviewType) {
  const conversationPath = path.join(sessionDir, 'conversation.json');
  if (!fs.existsSync(conversationPath)) return "No conversation found.";

  const conversation = fs.readJsonSync(conversationPath);

  const formattedTranscript = conversation.map((entry, i) => {
    return `Q${i + 1}: ${entry.question}\nA${i + 1}: ${entry.answer}`;
  }).join("\n\n");

  const prompt = `
You are a senior interviewer evaluating a candidate for a ${interviewType} interview.
Here is the full transcript:

${formattedTranscript}

Please provide a concise, recruiter-friendly summary with:
- A score out of 10 based on overall performance
- A brief analysis of strengths (bullet points preferred)
- Suggestions for improvement (bullet points preferred)

Your tone should be professional, constructive, and encouraging.
Do NOT include any greetings or closing remarks.
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error("Gemini summary error:", err);
    return "[Summary generation failed]";
  }
}