```
  
  
  ██   ██████     ██████ ██   ██ ██████ ██████ ██████  ██   ██ ██████ ██████ ██   ██ ██████ ██████  
 ████    ██         ██   ███  ██   ██   ██     ██   ██ ██   ██   ██   ██     ██   ██ ██     ██   ██ 
██  ██   ██         ██   ████ ██   ██   █████  ██████  ██   ██   ██   █████  ██   ██ █████  ██████  
██████   ██         ██   ██ ████   ██   ██     ██ ██    ██ ██    ██   ██     ██ █ ██ ██     ██ ██   
██  ██   ██         ██   ██  ███   ██   ██     ██  ██    ███     ██   ██     ███████ ██     ██  ██  
██  ██ ██████     ██████ ██   ██   ██   ██████ ██   ██   ██    ██████ ██████ ██   ██ ██████ ██   ██ 

```


# 🎙️ AI Interviewer CLI

A terminal-based AI interviewer powered by **Google Gemini** and **Deepgram**. This tool simulates a real interview experience with role-specific questions, live transcription, countdown timers, and a performance summary — all inside your terminal.

---

## 🚀 Features

- 🧠 Role-based question generation (MERN, Backend, PM)
- 🎧 Real-time voice transcription using Google-Cloud-Speech-to-Text
- ⏱️ Countdown timer for each answer (2 minutes)
- 🗣️ Text-to-speech playback of questions using Deepgram SDK
- 📊 Gemini-powered interview summary with score + feedback
- 📁 Session logs saved with transcript and audio
- 🎨 Polished CLI experience with emojis and formatting

---

## 📦 Requirements

Before running the project, make sure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- A working **microphone**
- Internet connection (for Gemini + Deepgram APIs)
- API keys:
  - `GEMINI_API_KEY` from [Google AI Studio](https://makersuite.google.com/)
  - `DEEPGRAM_API_KEY` from [Deepgram Console](https://console.deepgram.com/)
  -  `credentials.json` if using Google STT fallback from [Google Cloud Console](https://console.cloud.google.com/)

---

## 🔧 Installation

```bash
git clone https://github.com/anshsahu01/AI-interviewer-CLI.git
cd AI-interviewer-CLI
npm install


❤️ Made with love by Ansh Sahu

