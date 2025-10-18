let isSpeaking = false;
let isRecording = false;

/**
 * TTS playback state
 */
export function setSpeakingState(val) {
  isSpeaking = val;
}

export function getSpeakingState() {
  return isSpeaking;
}

/**
 * STT recording state
 */
export function setRecordingState(val) {
  isRecording = val;
}

export function getRecordingState() {
  return isRecording;
}