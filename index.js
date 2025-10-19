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
import {
  getFirstQuestion,
  getFollowUpOrNext,
  getClarifiedQuestion
} from './utils/geminiApi.js';
import { getInterviewSummary } from './utils/geminiSummary.js';
import { loadQuestionBank } from './utils/questionLoader.js';

const program = new Command();
const INTERVIEW_LENGTH = 3;
let isRecording = false;

function showAndSpeak(question) {
  console.log(chalk.yellow('AI: ') + chalk.white(question));
  return speakQuestion(question);
}

program
  .name("ai-interviewer")
  .description("A CLI AI Interviewer powered by Gemini and Deepgram")
  .version("1.0.0");

program.command("start").action(async () => {
  console.log(chalk.bold.magenta("🎤 AI Interviewer Started!\n"));

  console.log(chalk.bold.blue("📋 Instructions:"));
  console.log(chalk.white("- You will be asked 3 questions based on your selected interview type."));
  console.log(chalk.white("- Each question will be spoken aloud. You’ll have 2 minutes to answer."));
  console.log(chalk.white("- Your voice will be transcribed and saved automatically."));
  console.log(chalk.white("- During your answer, you can say:"));
  console.log(chalk.white("   • 'clarify' → AI will rephrase the question"));
  console.log(chalk.white("   • 'repeat' → AI will replay the question"));
  console.log(chalk.white("   • 'done' → End your answer early and move on"));
  console.log(chalk.white("- After the interview, Gemini will evaluate your performance with:"));
  console.log(chalk.white("   • A score out of 10"));
  console.log(chalk.white("   • Strengths and improvement suggestions"));
  console.log(chalk.white("- All logs and audio files will be saved locally for review.\n"));
  console.log(chalk.green("👉 Press ENTER to continue to interview type selection..."));

  await new Promise((resolve) => {
    readline.createInterface({
      input: process.stdin,
      output: process.stdout
    }).question('', () => resolve());
  });

  const { interviewType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'interviewType',
      message: chalk.yellow("🧠 Choose your interview type:"),
      choices: [
        "Product Design",
        "Product Improvement",
        "Product Metrics",
        "Root Cause",
        "Guesstimate"
      ]
    }
  ]);

  console.log(chalk.green(`\n✅ Interview type selected:`), chalk.white(interviewType));

  const questionBank = loadQuestionBank(interviewType);
  const sessionTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sessionDir = path.join('./logs', sessionTimestamp);
  fs.ensureDirSync(sessionDir);
  console.log(chalk.blue(`Logs for this session will be saved in: ${sessionDir}\n`));

  let conversationHistory = [];
  const loggedConversation = [];
  let currentIndex = 0;
  let currentQuestion = getFirstQuestion(questionBank);

  for (let i = 0; i < INTERVIEW_LENGTH; i++) {
    console.log(chalk.cyan(`\n--- Question ${i + 1} of ${INTERVIEW_LENGTH} ---`));

    while (isRecording) {
      await new Promise(res => setTimeout(res, 200));
    }

    try {
      await showAndSpeak(currentQuestion);
    } catch (err) {
      console.error(chalk.red("❌ Error in TTS playback:"), err);
      console.log(chalk.gray("⚠️ Could not play audio. Please read the question above."));
    }

    while (getAudioState()) {
      await new Promise(res => setTimeout(res, 200));
    }

    let answer = "";
    let command = null;

    try {
      isRecording = true;
      const result = await listenAndTranscribe(i + 1, sessionDir);
      answer = result.transcript;
      command = result.command;
    } catch (err) {
      console.error(chalk.red("❌ STT failed:"), JSON.stringify(err, null, 2));
      answer = "[Transcription failed]";
    } finally {
      isRecording = false;
    }

    // 🧠 Process voice command
    if (command === "clarify") {
      console.log(chalk.gray("🔁 Clarify command detected. Rephrasing..."));
      currentQuestion = await getClarifiedQuestion(currentQuestion);
      try {
        await showAndSpeak(currentQuestion);
      } catch (err) {
        console.error(chalk.red("❌ Error in TTS playback:"), err);
        console.log(chalk.gray("⚠️ Could not play audio. Please read the question above."));
      }
      i--; // Re-ask same question
      continue;
    }

    if (command === "repeat") {
      console.log(chalk.gray("🔁 Repeat command detected. Replaying..."));
      try {
        await showAndSpeak(currentQuestion);
      } catch (err) {
        console.error(chalk.red("❌ Error in TTS playback:"), err);
        console.log(chalk.gray("⚠️ Could not play audio. Please read the question above."));
      }
      i--; // Re-ask same question
      continue;
    }

    if (command === "done") {
      console.log(chalk.gray("⏭️ Done command detected. Skipping to next..."));
    }

    loggedConversation.push({ question: currentQuestion, answer, interviewType });
    conversationHistory.push(
      { role: "model", parts: [{ text: currentQuestion }] },
      { role: "user", parts: [{ text: answer }] }
    );

    fs.writeJsonSync(path.join(sessionDir, 'conversation.json'), loggedConversation, { spaces: 2 });

    if (i < INTERVIEW_LENGTH - 1) {
      currentQuestion = await getFollowUpOrNext(answer, interviewType, questionBank, currentIndex);
      currentIndex++;
    }
  }

  console.log(chalk.bold.green("\n🎉 Interview Finished!"));
  console.log(chalk.blue(`Check the full log at: ${path.join(sessionDir, 'conversation.json')}`));
  console.log(chalk.blue(`Your audio answers are saved as .wav files in the same directory.`));

  const summary = await getInterviewSummary(sessionDir, interviewType);
  console.log(chalk.bold.magenta("\n📊 Interview Summary:\n"));

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