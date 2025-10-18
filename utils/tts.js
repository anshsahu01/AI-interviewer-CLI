import { createClient } from '@deepgram/sdk';
import Speaker from 'speaker';
import chalk from 'chalk';
import { setSpeakingState, getSpeakingState } from './state.js';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

export function getAudioState() {
  return getSpeakingState();
}

export default async function speakQuestion(text) {
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

    for await (const chunk of stream) {
      speaker.write(chunk);
    }
    speaker.end();

    await new Promise((resolve) => {
      speaker.on('close', () => {
        setSpeakingState(false);
        console.log(chalk.blue("✅ Playback finished"));
        resolve();
      });
    });

  } catch (err) {
    setSpeakingState(false);
    console.error(chalk.red("❌ Error in TTS playback:"), err);
    throw err;
  }
}