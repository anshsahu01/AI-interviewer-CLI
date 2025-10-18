


import { PvRecorder } from '@picovoice/pvrecorder-node';
import { SpeechClient } from '@google-cloud/speech';
import chalk from 'chalk';
import ora from 'ora';
import { getSpeakingState, setRecordingState } from './state.js';

const SAMPLE_RATE = 16000;
const FRAME_LENGTH = 512;
const MAX_DURATION_MS = 2 * 60 * 1000; // duration for each answer
const client = new SpeechClient();

export default async function listenAndTranscribe(turn, sessionDir) {
  if (getSpeakingState()) {
    console.log(chalk.gray("🔇 TTS is speaking, STT paused."));
    return "";
  }

  const spinner = ora(chalk.yellow(`🎙️ Listening for answer ${turn}...`)).start();
  let finalTranscript = "";
  let streamEnded = false;
  const seenFinals = new Set();

  const request = {
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: SAMPLE_RATE,
      languageCode: 'en-US',
    },
    interimResults: true,
  };

  const recognizeStream = client
    .streamingRecognize(request)
    .on('error', (err) => {
      spinner.fail("❌ STT error");
      setRecordingState(false);
      finalTranscript = "[Transcription failed]";
    })
    .on('data', (data) => {
      if (streamEnded) return;

      const result = data.results[0];
      const transcript = result?.alternatives[0]?.transcript?.trim();

      if (transcript && result.isFinal && !seenFinals.has(transcript)) {
        finalTranscript += transcript + " ";
        seenFinals.add(transcript);
      }
    });

  const recorder = new PvRecorder(FRAME_LENGTH);
  recorder.deviceIndex = 0;

  try {
    await recorder.start();
    setRecordingState(true);

    const startTime = Date.now();

    //  Countdown timer
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MAX_DURATION_MS - elapsed);
      const mm = String(Math.floor(remaining / 60000)).padStart(2, '0');
      const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
      const timeText = chalk.yellow(`⏱️ ${mm}:${ss} remaining...`);
      const transcriptText = finalTranscript.trim() ? chalk.gray(finalTranscript.trim()) : "";
      spinner.text = `${timeText}\n${transcriptText}`;
    }, 1000);

    while ((Date.now() - startTime) < MAX_DURATION_MS) {
      const frame = await recorder.read();
      recognizeStream.write(Buffer.from(frame.buffer));
    }

    clearInterval(timer);
    await recorder.stop();
    recorder.release();

    streamEnded = true;
    recognizeStream.end();
    recognizeStream.destroy();

    spinner.succeed(chalk.green("🧑 You: ") + chalk.white(finalTranscript.trim() || "[No speech detected]"));
    setRecordingState(false);
    return finalTranscript.trim();

  } catch (err) {
    spinner.fail("❌ PvRecorder error");
    setRecordingState(false);
    return "[Mic error]";
  }
}