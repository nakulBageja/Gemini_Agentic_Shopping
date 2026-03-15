# DealLens AI - A Real-Time Voice Shopping Agent

## Overview

DealLens AI is a real-time conversational shopping assistant that helps users instantly find better deals for products they encounter in physical stores.

Instead of manually searching multiple websites, users simply speak to the agent and describe the product and its price. The AI agent analyzes the request, searches available marketplaces, and responds instantly with better deals through voice and visual results.

DealLens AI is built as a **multimodal live agent** using Google Gemini models and Google Cloud infrastructure. The system supports natural speech interaction, interruption handling, and contextual responses.

The goal is to create a shopping experience where users can **talk to an AI assistant the same way they would talk to a friend while shopping.**

---

## Problem

When people see a product in a store, they often wonder:

- "Is this the best price?"
- "Can I get this cheaper online?"
- "Is there a better deal somewhere else?"

Finding the answer usually requires:

1. Opening multiple apps
2. Typing the product name
3. Comparing prices across websites
4. Manually checking delivery and availability

This process is slow, inconvenient, and breaks the in-store shopping experience.

---

## Solution

DealLens AI introduces a **voice-first shopping agent** that can instantly analyze a product and find better deals.

Users simply say:

> "I see a PlayStation 5 for £500 in a Sony store. Can you check if it’s cheaper somewhere else?"

The AI agent:

1. Understands the request through voice input
2. Extracts the product name and price
3. Searches available marketplaces
4. Compares prices
5. Responds with a spoken answer and visual results

Example response:

> "Yes. I found the same PlayStation 5 for £469 on Amazon and £479 on Argos. You could save £31."

---

## Why This Was Created

Modern AI assistants are still heavily focused on **text chat interfaces**, which do not feel natural for real-world tasks like shopping.

DealLens AI explores a new interaction model where users can:

- Speak naturally
- Receive immediate answers
- Interact in real time
- Interrupt the agent during responses
- See visual deal results

The project demonstrates how **live AI agents can augment real-world decision making**.

---

## Key Features

### 🎤 Real-Time Voice Interaction

Users speak directly to the AI agent through the browser.

The agent understands natural language and responds with voice output.

---

### ⏱ Interruptible Conversation

The agent supports **barge-in interaction**, allowing users to interrupt while the agent is speaking.

Example:

User:  
"Check if AirPods Pro are cheaper online."

Agent begins response...

User interrupts:  
"Only show new ones."

The agent adjusts its response immediately.

---

### 🧠 Multi-Agent Architecture

The system uses multiple AI agents working together:

Manager Agent  
Handles conversation, intent detection, and response generation.

Deal Search Agent  
Searches available product databases or APIs to find better deals.

---

### 📊 Visual Deal Results

In addition to voice responses, the system displays:

- Store name
- Price comparison
- Savings vs store price

This provides quick visual confirmation for users.

---

## Multimodal Design

DealLens AI is designed as a **multimodal system**.

Current modalities:

Input  
- Voice

Output  
- Voice response
- Visual deal cards

Planned extension:

- Camera-based product detection

---

## Future Vision

The project is designed to evolve into a fully autonomous shopping assistant capable of:

- Recognizing products through the camera
- Checking global marketplaces
- Tracking historical prices
- Automatically ordering products for the user

Ultimately, DealLens AI aims to become a **real-time AI shopping companion** that helps users always find the best value.

---

## Technologies Used

AI Models  
- Gemini (Google)

Agent Framework  
- Google GenAI SDK / Agent Development Kit

Cloud Infrastructure  
- Google Cloud Run
- Vertex AI
- Firestore

Frontend  
- Web interface with voice interaction

---

## Key Learnings

While building DealLens AI we explored:

- Designing live AI agents instead of chatbots
- Handling interruptible conversations
- Structuring multi-agent workflows
- Building real-time multimodal systems on Google Cloud

The project demonstrates how modern AI agents can move beyond simple text interfaces and become **interactive assistants embedded in everyday experiences.**
