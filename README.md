<div align="center">
  <img height="256" alt="Wands Preview" src="https://github.com/user-attachments/assets/ae939d12-9c18-4ea8-ab32-fbe67fbb6063" />
  <h1>Wands — AI Video Editor Agent (Demo)</h1>
  <p>Natural language–driven editing. No timeline. No drag & drop. Just prompts.</p>
</div>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="#demo-scope">Demo Scope</a> •
  <a href="#vision">Vision</a> •
  <a href="#tech-stack">Tech Stack</a>
</p>

---

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/wands-demo.git
cd wands-demo
npm install
npm run dev
```

---

## Features

- ✂️ Trim & cut via prompts  
- 📝 Add text overlays & subtitles  
- 🎵 Add music, transitions, and effects  
- ⚡ Simulated AI-agent experience (no real agent yet)

---

## Demo Scope

This is an early demo of Wands — it does **not include** the autonomous AI agent yet.  
Instead, it simulates how a user would interact with Wands through prompts, offering a preview of the experience:

> “Zoom in at 0:15, add subtitles, and background music” → Result in seconds.

The goal is to validate:
- The interaction model (prompt → edit)
- UX design for AI-first editing
- Value for creators stuck in manual workflows

---

## Vision

Video editing is slow, manual, and painful for most creators.  
Wands is building a future where creators describe the edit — and the agent does the rest.

- Edit with natural language  
- Automatically plan and apply cuts, effects, music  
- Save 90% of editing time  
- Focus on creativity, not timelines

---

## Tech Stack

- **Frontend**: React, Next.js, Tailwind CSS, Framer Motion  
- **Media**: FFmpeg (for future versions)  
- **Infra (planned)**: AI agents with multimodal planning + local rendering pipelines

---

## License

MIT

---

## Author

Built by [David Puértolas](https://tubelabs.ai)  
[Instagram – @tubelabs.ai](https://www.instagram.com/tubelabs.ai/)
