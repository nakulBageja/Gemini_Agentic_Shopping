# DealLens AI – System Architecture

## Overview

DealLens AI is built as a **multi-agent real-time AI system** running on Google Cloud.

The architecture separates responsibilities between:

1. Voice interaction layer
2. AI agent orchestration
3. Deal search services
4. Cloud infrastructure

This modular design allows the system to evolve from a simple voice agent into a fully multimodal shopping assistant.

---

# Phase 1 – Voice Shopping Agent (MVP)

The first phase focuses on building a **live voice agent** that users can talk to in real time.

Users can describe products they see in stores and ask if cheaper deals exist online.

## Key Capabilities

- Voice input from browser
- Real-time conversation
- Interruptible responses
- Deal search from database or APIs
- Voice and visual output

## System Flow

User speaks through the website microphone.

The frontend streams audio to the backend where Gemini Live API processes the conversation.

The **Manager Agent** interprets the request and extracts structured information such as:

- product name
- observed price
- store

The manager agent then calls the **Deal Search Agent** to retrieve available offers.

The results are returned to the manager agent which generates a natural language response.

The response is returned as both:

- spoken output
- visual deal results

## Phase 1 Architecture
 User -> Web Interface (Voice Input) -> Gemini Live API -> Manager Agent -> Deal Search Agent -> Product Deals Database -> Manager Agent -> Voice + Visual Response

## Google Cloud Components

- Cloud Run → Backend services
- Vertex AI → Gemini models
- Firestore → Product deals database


---

# Phase 2 – Vision Enabled Shopping

The second phase introduces **camera-based product recognition**.

Instead of describing the product manually, users can simply point their phone camera at the product.

Gemini multimodal models analyze the image and detect the product name.

The detected product is then passed to the existing deal search pipeline.

## Example Flow

User points camera at a product box.

The AI agent identifies the product and asks:

> "I see a PlayStation 5. Would you like me to check if it's cheaper elsewhere?"

The user confirms with voice.

The system performs the same deal comparison process.

## Phase 2 Architecture

User Camera -> Gemini Vision Model -> Product Detection -> Manager Agent -> Deal Search Agent -> Marketplace APIs -> Voice + Visual Results

## Benefits

- Faster user interaction
- Reduced manual input
- Stronger multimodal experience

# Phase 3 – Autonomous Purchasing

The final phase transforms DealLens AI from a comparison assistant into an **autonomous shopping agent**.

Once the system finds a better deal, it can offer to complete the purchase for the user.

## Example Interaction

Agent:

> "Amazon has this product for £469. Would you like me to order it?"

User:

> "Yes, order it."

The system then:

1. Verifies price and stock
2. Confirms shipping details
3. Places the order through supported marketplace APIs


User -> Voice Agent -> Manager Agent -> Deal Search Agent -> Best Deal Identified -> Purchase Agent -> Marketplace API -> Order Confirmation


## Additional Components

- Secure payment integration
- Order confirmation workflow
- Delivery tracking system

---

# Agent Roles

## Manager Agent

Responsible for:

- Conversation flow
- Intent detection
- Extracting product details
- Coordinating other agents
- Generating final responses

---

## Deal Search Agent

Responsible for:

- Querying product databases
- Fetching marketplace deals
- Comparing prices
- Returning structured deal data

---

## Purchase Agent (Phase 3)

Responsible for:

- Verifying availability
- Executing purchase requests
- Confirming order completion

---

# Key Design Principles

## Real-Time Interaction

The system prioritizes low latency so conversations feel natural and responsive.

---

## Modular Agent Architecture

Each agent performs a specific function, allowing the system to scale and evolve easily.

---

## Multimodal Experience

DealLens AI combines:

- Voice interaction
- Visual recognition
- Structured data

This creates a more natural user experience compared to traditional chat interfaces.

---

# Summary

DealLens AI evolves through three stages:

Phase 1  
Real-time voice shopping assistant.

Phase 2  
Vision-enabled product recognition.

Phase 3  
Autonomous purchasing agent.
