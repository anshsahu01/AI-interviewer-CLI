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
 * Role ke hisaab se Gemini ko prompt karke agla sawaal generate karta hai.
 * @param {Array<Object>} conversationHistory - [{ role: "user", parts: [{ text: "..." }] }, { role: "model", parts: [{ text: "..." }] }]
 * @param {string} selectedRole - e.g. "MERN Stack Developer", "Backend Developer", "Product Manager"
 * @returns {Promise<string>} - Gemini se generate kiya gaya naya sawaal.
 */
export async function getNextQuestion(conversationHistory, selectedRole) {
  const spinner = ora(chalk.yellow('AI is thinking of the next question...')).start();

  // 🎯 Role-based system instruction
  let systemText = "";

  switch (selectedRole) {
    case "MERN Stack Developer":
      systemText = `You are a senior MERN stack engineer conducting a technical interview.
      Your goal is to assess the candidate's understanding of React, Node.js, MongoDB, and Express.
      - Ask only one question at a time.
      - Keep your questions concise and specific.
      - Your response should ONLY contain the question text, nothing else.`;
      break;

    case "Backend Developer":
      systemText = `You are a backend architect conducting a technical interview.
      Your goal is to assess the candidate's understanding of APIs, databases, scalability, and system design.
      - Ask only one question at a time.
      - Keep your questions concise and specific.
      - Your response should ONLY contain the question text, nothing else.`;
      break;

    case "Product Manager":
    default:
      systemText = `You are an expert product manager conducting a product interview.
      Your goal is to assess the candidate's product sense and problem-solving skills.
      - Ask only one question at a time.
      - Keep your questions concise and to the point.
      - Your response should ONLY contain the question text, nothing else.`;
      break;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: {
        role: "system",
        parts: [{ text: systemText }],
      }
    });

    const chat = model.startChat({
      history: conversationHistory,
      generationConfig,
    });

    const result = await chat.sendMessage("Next question please.");
    const response = result.response;
    const nextQuestion = response.text();

    spinner.succeed(chalk.green('AI has a new question.'));
    return nextQuestion;

  } catch (error) {
    spinner.fail(chalk.red('Error generating next question from LLM.'));
    console.error(error);
    return "Can you tell me about a time you had to make a difficult decision?";
  }
}



