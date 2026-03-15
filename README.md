# DealLens AI – Real-Time Shopping Assistant

## Overview

DealLens AI is a real-time conversational shopping agent that helps users find better deals instantly. By simply describing a product via voice, users can get spoken answers and visual results showing cheaper prices across multiple marketplaces. The system is designed to handle interruptions and respond naturally.

**Category:** Live Agents  
**Technologies:** Google Gemini, Gemini Live API, Google Cloud Run, Firestore, GenAI SDK / ADK  
**Multimodal:** Voice input, Voice + Visual output

---

## Problem

When shopping in-store, users often wonder if they can find the same product cheaper elsewhere. Manually checking websites is time-consuming and breaks the shopping experience.

---

## Solution

- Users speak to the agent:  
  > "I see a PS5 for £500 at Sony store. Can you check for cheaper options?"
- The agent parses intent and searches deals.
- Agent responds via **voice** and **visual cards**:  
  > "Amazon has it for £469 and Argos for £479. You could save £31."

Planned enhancements include **camera-based product recognition**.

---

## Features

- Real-time voice interaction  
- Interruptible conversation (barge-in)  
- Visual deal cards  
- Multi-agent architecture: Manager Agent + Deal Search Agent  
- Google Cloud hosted backend

---

## Architecture

See [Architecture Diagram](documentation/architecture.md)

**Phase 1:** Voice-first shopping assistant  
**Phase 2:** Vision-enabled product recognition  
**Phase 3:** Autonomous purchase agent

---

## Setup & Deployment

### Prerequisites

- Node.js (frontend)
- Python 3.10+ (backend)
- Google Cloud Project
- Firestore DB with product deals
- Gemini Live API access

### Local Setup

1. Clone the repository  
```bash
git clone https://github.com/<username>/deallens-ai.git
cd deallens-ai
```

2. Install backend dependencies
```
pip install -r requirements.txt
```
3. Install frontend dependencies
```
cd frontend
npm install
```
4. Set environment variables:
```
GEMINI_API_KEY=<your_key>
FIRESTORE_CREDENTIALS=<path_to_json>
```
5. Run backend
```
python app.py
```
6. Run frontend
```
npm start
```

### Deployment

Backend: Deploy to Google Cloud Run

Database: Firestore

Gemini API calls handled via Cloud Run backend

### How It Works

1. User speaks into the microphone on the web page

2. Audio is sent to Gemini Live API for transcription & intent parsing

3. Manager Agent coordinates the workflow

4. Deal Search Agent queries Firestore / Marketplace APIs

5. Results are returned to the Manager Agent

6. User receives voice reply + visual cards

### Demo Video

Watch Demo video here