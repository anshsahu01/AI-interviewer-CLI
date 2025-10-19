import { GoogleGenerativeAI } from "@google/generative-ai";
import chalk from 'chalk';
import ora from 'ora';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const generationConfig = {
  temperature: 0.9,
  topK: 1,
  topP: 1,
  maxOutputTokens: 150,
};

/**
 * Returns the first question from the question bank directly.
 * @param {Array<Object>} questionBank
 * @returns {string}
 */
export function getFirstQuestion(questionBank) {
  return questionBank[0].question;
}

/**
 * Based on user's answer, Gemini decides whether to ask a follow-up or move to next question.
 * @param {string} userAnswer
 * @param {string} interviewType
 * @param {Array<Object>} questionBank
 * @param {number} currentIndex
 * @returns {Promise<string>}
 */
export async function getFollowUpOrNext(userAnswer, interviewType, questionBank, currentIndex) {
  const spinner = ora(chalk.yellow('🧠 AI is evaluating your answer...')).start();

  const remainingQuestions = questionBank.slice(currentIndex + 1);

  const prompt = `
You are a senior interviewer conducting a mock interview for the role: ${interviewType}.
Here is the candidate’s answer:
"${userAnswer}"

If the answer lacks depth or clarity, ask a follow-up question to probe further.
If the answer is strong and complete, ask the next question from this list:
${JSON.stringify(remainingQuestions)}

Respond with ONLY the question text, nothing else.
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const nextQuestion = response.text().trim();

    spinner.succeed(chalk.green('✅ AI has generated the next question.'));
    return nextQuestion;

  } catch (error) {
    spinner.fail(chalk.red('❌ Error generating follow-up or next question.'));
    console.error(error);
    return "Can you elaborate on your previous answer?";
  }
}

/**
 * Rephrases the current question for clarity.
 * @param {string} originalQuestion
 * @returns {Promise<string>}
 */
export async function getClarifiedQuestion(originalQuestion) {
  const prompt = `
You are a senior interviewer. Rephrase this question more clearly:
"${originalQuestion}"
Respond with ONLY the rephrased question.
`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("❌ Error clarifying question:", error);
    return originalQuestion;
  }
}