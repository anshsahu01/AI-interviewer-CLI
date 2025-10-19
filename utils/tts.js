import { createClient } from '@deepgram/sdk';
import Speaker from 'speaker';
import chalk from 'chalk';
import { setSpeakingState, getSpeakingState } from './state.js';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
const MAX_TTS_LENGTH = 300;

export function getAudioState() {
  return getSpeakingState();
}

export default async function speakQuestion(text) {
  if (!text || typeof text !== 'string') return;

  console.log(chalk.gray(`🧪 TTS input length: ${text.length}`));

  if (text.length > MAX_TTS_LENGTH) {
    console.log(chalk.gray("⚠️ Question too long for TTS. Skipping playback."));
    return;
  }

  await new Promise(res => setTimeout(res, 300)); // small buffer before playback

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await deepgram.speak.request(
        { text },
        {
          model: 'aura-asteria-en',
          encoding: 'linear16',
          sample_rate: 16000,
        }
      );

      const stream = await response.getStream();

      const speaker = new Speaker({
        channels: 1,
        bitDepth: 16,
        sampleRate: 16000,
      });

      setSpeakingState(true);
      console.log(chalk.green("🔊 Audio playback started"));

      let playbackFinished = false;

      speaker.on('close', () => {
        if (!playbackFinished) {
          playbackFinished = true;
          setSpeakingState(false);
          console.log(chalk.blue("✅ Playback finished"));
        }
      });

      for await (const chunk of stream) {
        speaker.write(chunk);
      }

      speaker.end();

      // Wait for speaker to close
      await new Promise((resolve) => {
        const check = () => {
          if (playbackFinished) return resolve();
          setTimeout(check, 50);
        };
        check();
      });

      return; 

    } catch (err) {
      console.error(chalk.red(`❌ TTS attempt ${attempt} failed:`), err);
      setSpeakingState(false);
      if (attempt === 2) throw err;
      await new Promise(res => setTimeout(res, 500)); 
    }
  }
}