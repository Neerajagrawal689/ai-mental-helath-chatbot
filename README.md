# 🌿 Serene — AI Mental Health & Wellness Companion

<div align="center">

![Serene Banner](https://img.shields.io/badge/Serene-AI%20Mental%20Health%20Companion-059669?style=for-the-badge&logo=leaf&logoColor=white)

[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Flask 3.1](https://img.shields.io/badge/Flask-3.1-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Google Gemini API](https://img.shields.io/badge/Google%20Gemini-Flash%20Lite%20AI-4285F4?style=flat-square&logo=google&logoColor=white)](https://aistudio.google.com/)
[![Scikit-Learn](https://img.shields.io/badge/Scikit--Learn-ML%20Fallback-F7931E?style=flat-square&logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

**An empathetic, trauma-informed conversational wellness companion powered by Google Gemini, Cognitive Behavioral Therapy (CBT) principles, interactive grounding tools, and zero-latency crisis safety guardrails.**

[Live Demo](http://127.0.0.1:5000/) • [Features](#-key-features) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [Safety & Ethics](#-safety--ethics)

</div>

---

## 📖 Overview

**Serene** is designed to bridge the gap between mental health support and modern artificial intelligence. It provides a safe, judgment-free sanctuary for people experiencing emotional distress, overthinking, anxiety, or burnout.

Unlike traditional static rule-based chatbots, Serene combines **Google Gemini LLM reasoning** with **active listening techniques** (Rogerian empathy & Cognitive Behavioral Therapy) and automatically falls back to an offline **Scikit-Learn ML engine** if disconnected.

---

## ✨ Key Features

### 1. 🧠 Dual-Engine Intelligence & Language Mirroring
* **Adaptive Generative AI:** Powered by Google's ultra-fast Gemini Flash engine with multi-turn conversation memory.
* **Natural Hinglish & Multilingual Support:** Automatically matches the user's language—whether pure English, Hindi (Devanagari), or conversational Hinglish (*"mai bahut dukhi mahsoos kr rha hu"*).
* **100% Offline Zero-Crash Fallback:** If internet or API quotas fail, Serene seamlessly switches to an internal TF-IDF + Multinomial Naive Bayes classifier with curated coping strategies.

### 2. 🎙️ Voice Mode (Speech-to-Text & Text-to-Speech)
* **Mic Input:** Allows hands-free speech input in Hindi and English using the Web Speech API—ideal when typing feels overwhelming.
* **Serene Voice Output:** Every response can be listened to in a calm, soothing voice via Web Speech Synthesis with play/stop controls.

### 3. 🌧️ Built-in Ambient Soundscapes (Web Audio API)
* Built-in sound generator synthesizing real-time calming audio directly in browser memory without external MP3 files:
  * 🌧️ **Gentle Rain:** Pink-noise bandpass filtered for steady soothing rain texture.
  * 🌊 **Ocean Waves:** Low-frequency Brown noise modulated by an LFO to mimic rhythmic 7-second oceanic tides.
  * 🍃 **Zen Noise:** Deep focus white/pink noise for stopping racing thoughts.
  * 🔊 **Live Volume Slider & Instant Mute.**

### 4. 🧠 CBT Thought Reframer ("Catch That Thought")
* An interactive Cognitive Behavioral Therapy tool designed to challenge cognitive distortions:
  * Detects thought traps: *Mind Reading, Catastrophizing, All-or-Nothing, Personalization, Fortune Telling*.
  * Provides Socratic reality-check questions.
  * Generates a balanced, compassionate replacement perspective.
  * Suggests an immediate 2-minute actionable grounding exercise.

### 5. 🌬️ Zen Mindful Breathing & Grounding Tools
* **Interactive Breathing Orb:** Visual expanding/contracting circle with live countdown timer supporting:
  * **Box Breathing (4-4-4-4):** Instant panic reset.
  * **Relaxing Breath (4-7-8):** Sleep trouble & deep nervous system reset.
* **5-4-3-2-1 Sensory Grounding Wizard:** Guided step-by-step physical awareness check to break panic attacks.

### 6. 📈 Visual Mood Trend Analytics
* **Daily Mood Check-In:** Log emotional states (*Joyful, Calm, Neutral, Anxious, Exhausted*).
* **Interactive SVG Mood Wave Chart:** Visual trajectory graph of your emotional patterns over time, along with dominant mood statistics and average balance score.

### 7. 🆘 Zero-Latency Crisis Guardrails
* Deterministic keyword interceptor that detects thoughts of self-harm or suicide and instantly bypasses the LLM to display emergency contacts:
  * 🇮🇳 **Tele-MANAS (Govt. of India):** `14416` / `1800-891-4416` (24x7, Toll-Free, Multi-lingual)
  * 🇮🇳 **KIRAN Helpline:** `1800-599-0019`
  * 🇮🇳 **Vandrevala Foundation:** `9999 666 555`
  * 🇺🇸/🇨🇦 **988 Suicide & Crisis Lifeline:** `988`
  * 🇬🇧 **NHS Urgent Support:** `111` / Text `SHOUT` to `85258`

---

## 🏛️ Architecture

```
                               ┌─────────────────────────────────┐
                               │   Modern Client (Frontend)      │
                               │  HTML5 • CSS3 • JavaScript      │
                               │  Web Audio • Web Speech API     │
                               └────────────────┬────────────────┘
                                                │ JSON / REST
                                                ▼
                               ┌─────────────────────────────────┐
                               │      Flask RESTful Backend      │
                               │   Zero-Latency Crisis Filter    │
                               └────────┬───────────────┬────────┘
                                        │               │
                        (Self-Harm / Emergency)         │ (Safe Message)
                                        ▼               ▼
                      ┌──────────────────────┐  ┌──────────────────────────────────┐
                      │ Instant SOS Helplines│  │ Check: GEMINI_API_KEY Configured?│
                      │ 14416 / KIRAN / 988  │  └───────┬──────────────────┬───────┘
                      └──────────────────────┘          │ Yes              │ No
                                                        ▼                  ▼
                                        ┌─────────────────────┐  ┌─────────────────────┐
                                        │ Google Gemini AI    │  │ Scikit-Learn Local  │
                                        │ CBT & Trauma-Prompt │  │ TF-IDF + Naive Bayes│
                                        │ Hinglish Mirroring  │  │ Coping Strategies   │
                                        └─────────────────────┘  └─────────────────────┘
```

---

## 📁 Repository Structure

```text
ai-mental-helath-chatbot/
├── backend/
│   ├── app.py                     # Flask server, Gemini API & local ML engine
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example               # Environment variables template
│   └── data/
│       ├── coping_strategies.json # Actionable self-care techniques
│       ├── crisis_support.txt     # Verified emergency numbers
│       ├── mental_health_responses.csv # Categorized emotional responses
│       ├── relaxation_tips.txt    # Evidence-based mindfulness tips
│       ├── sentiment_keywords.json # Multilingual/Hinglish emotion keywords
│       └── training_data.csv      # ML training corpus
├── frontend/
│   ├── index.html                 # App layout, modals & dashboard canvas
│   ├── styles.css                 # Glassmorphic UI & dark/light theme
│   └── script.js                  # Speech, Web Audio, SVG charts & API logic
└── README.md                      # Comprehensive project documentation
```

---

## 🚀 Getting Started

### Prerequisites
* Python `3.10` or higher
* Modern web browser (Google Chrome, Microsoft Edge, or Safari)

### 1. Clone the Repository
```bash
git clone https://github.com/Neerajagrawal689/ai-mental-helath-chatbot.git
cd ai-mental-helath-chatbot
```

### 2. Set Up Virtual Environment (Recommended)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env` inside the `backend/` directory:
```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and insert your [Google AI Studio API Key](https://aistudio.google.com/):
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
```
*(Note: If you run the project without a Gemini API key, it will automatically operate in offline Scikit-Learn ML mode).*

### 5. Launch the Application
```bash
python backend/app.py
```
Open your browser and navigate to:
👉 **`http://127.0.0.1:5000/`**

---

## 🛡️ Safety & Ethics

> [!IMPORTANT]
> **Serene is an emotional support AI companion and NOT a licensed medical professional, therapist, or diagnostic tool.**
> * It does **not** prescribe medication or diagnose psychiatric conditions.
> * It adheres to non-violent, trauma-informed communication guidelines.
> * If a user expresses suicidal ideation or intent for self-harm, Serene immediately provides verified local and international crisis helpline resources.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE) — feel free to use and adapt it for learning and personal growth.

<div align="center">
  <sub>Made with 💚 for emotional well-being and mindful technology.</sub>
</div>
