<div align= "center">
    <img height="256" alt="Captura de pantalla 2025-05-09 001109k" src="https://github.com/user-attachments/assets/ae939d12-9c18-4ea8-ab32-fbe67fbb6063" />
    <h1>AI Video Editor Agent</h1>
</div>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="#demo">Demo Scope</a> •
  <a href="#vision">Vision</a> •
  <a href="#tech-stack">Tech Stack</a>
</p>

# AIlice Multimodal

This is an enhanced version of AIlice, a fully autonomous, general-purpose AI agent originally developed by MyShell AI. This fork adds comprehensive multimodal capabilities with a focus on video input/output and video editing functionalities.

## Original Project Credits
This project is based on [AIlice](https://github.com/myshell-ai/AIlice) by MyShell AI. All core functionality credit goes to the original developers. The multimodal capabilities are an extension built on their excellent foundation.

## Features

### Base Features (from original AIlice)
- **In-depth research capabilities** on specialized subjects
- **Advanced automation in programming and script execution**
- **Voice interaction support**
- **Compatibility with open-source models** and seamless integration with commercial models
- **Natural and fault-tolerant Interactive Agents Call Tree architecture**
- **Self-expansion capabilities** through dynamically loaded modules

### New Multimodal Capabilities
- **Video Input Processing**: Analyze and understand video content
- **Video Output Generation**: Create video content based on prompts
- **Video Editing**: Cut, trim, merge, and apply effects to videos
- **Video Transcription**: Convert speech in videos to text
- **Video Search**: Find and retrieve relevant sections in videos
- **Video Summarization**: Generate concise summaries of video content

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/AIlice.git
cd AIlice
pip install -e .
ailice_web --modelID=anthropic:claude-3-5-sonnet-20241022 --contextWindowRatio=0.2
```



