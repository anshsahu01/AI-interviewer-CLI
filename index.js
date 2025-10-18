



import 'dotenv/config';
import { Command } from "commander";
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import readline from 'readline';
import inquirer from 'inquirer';
import { setRecordingState, getRecordingState } from './utils/state.js';

import speakQuestion, { getAudioState } from './utils/tts.js';
import listenAndTranscribe from './utils/stt.js';
import { getNextQuestion } from './utils/geminiApi.js';
import { getInterviewSummary } from './utils/geminiSummary.js';

const program = new Command();
const INTERVIEW_LENGTH = 1;

let isRecording = false;

program
  .name("ai-interviewer")
  .description("A CLI AI Interviewer powered by Gemini and Deepgram")
  .version("1.0.0");

program.command("start").action(async () => {
  console.log(chalk.bold.magenta("🎤 AI Interviewer Started!\n"));

  // 📋 Instructions
  console.log(chalk.bold.blue("📋 Instructions:"));
  console.log(chalk.white("- You will be asked 5 questions."));
  console.log(chalk.white("- You’ll have 2 minutes to answer each."));
  console.log(chalk.white("- Your responses will be transcribed and saved."));
  console.log(chalk.white("- At the end, Gemini will evaluate your performance.\n"));
  console.log(chalk.green("👉 Press ENTER to continue to role selection..."));

  await new Promise((resolve) => {
    readline.createInterface({
      input: process.stdin,
      output: process.stdout
    }).question('', () => resolve());
  });

  // 🧠 Role Selection
  const { selectedRole } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedRole',
      message: chalk.yellow("🧠 Choose your interview role:"),
      choices: [
        "MERN Stack Developer",
        "Backend Developer",
        "Product Manager"
      ]
    }
  ]);

  console.log(chalk.green(`\n✅ Role selected:`), chalk.white(selectedRole));

  // 📁 Session folder
  const sessionTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sessionDir = path.join('./logs', sessionTimestamp);
  fs.ensureDirSync(sessionDir);
  console.log(chalk.blue(`Logs for this session will be saved in: ${sessionDir}\n`));

  let conversationHistory = [];
  const loggedConversation = [];

  // 🧠 First question from Gemini
  let currentQuestion = await getNextQuestion(conversationHistory, selectedRole);

  for (let i = 0; i < INTERVIEW_LENGTH; i++) {
    console.log(chalk.cyan(`\n--- Question ${i + 1} of ${INTERVIEW_LENGTH} ---`));
    console.log(chalk.yellow('AI: ') + chalk.white(currentQuestion));

    while (isRecording) {
      await new Promise(res => setTimeout(res, 200));
    }

    await speakQuestion(currentQuestion);

    while (getAudioState()) {
      await new Promise(res => setTimeout(res, 200));
    }

    let answer = "";
    try {
      isRecording = true;
      answer = await listenAndTranscribe(i + 1, sessionDir);
    } catch (err) {
      console.error(chalk.red("❌ STT failed:"), JSON.stringify(err, null, 2));
      answer = "[Transcription failed]";
    } finally {
      isRecording = false;
    }

    loggedConversation.push({ question: currentQuestion, answer, role: selectedRole });
    conversationHistory.push(
      { role: "model", parts: [{ text: currentQuestion }] },
      { role: "user", parts: [{ text: answer }] }
    );

    fs.writeJsonSync(path.join(sessionDir, 'conversation.json'), loggedConversation, { spaces: 2 });

    if (i < INTERVIEW_LENGTH - 1) {
      currentQuestion = await getNextQuestion(conversationHistory, selectedRole);
    }
  }

  console.log(chalk.bold.green("\n🎉 Interview Finished!"));
  console.log(chalk.blue(`Check the full log at: ${path.join(sessionDir, 'conversation.json')}`));
  console.log(chalk.blue(`Your audio answers are saved as .wav files in the same directory.`));

  // 📊 Gemini Evaluation
  const summary = await getInterviewSummary(sessionDir, selectedRole);
  console.log(chalk.bold.magenta("\n📊 Interview Summary:\n"));

  // 🧠 Format Gemini output
  const lines = summary.split('\n');
  for (let line of lines) {
    line = line.trim();

    if (/score/i.test(line)) {
      console.log(chalk.bold.yellow(`⭐ ${line}`));
    } else if (/strengths/i.test(line)) {
      console.log(chalk.bold.green(`\n💪 ${line}`));
    } else if (/suggestions|improve/i.test(line)) {
      console.log(chalk.italic.cyan(`\n🛠️ ${line}`));
    } else {
      console.log(chalk.white(line));
    }
  }

  fs.writeFileSync(path.join(sessionDir, 'summary.txt'), summary);
  console.log(chalk.green(`\n✅ Summary saved to: ${path.join(sessionDir, 'summary.txt')}`));
});

program.parse(process.argv);