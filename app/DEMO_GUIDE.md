# 🎯 DealLens AI - Demo Guide

## 🚀 **5-Minute Setup**

### **Step 1: Install Dependencies**
```bash
cd app/backend
pip install -r requirements.txt
```

### **Step 2: Get Gemini API Key**
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a free API key
3. Update app/backend/.env file as below:
```
GEMINI_API_KEY='your_key_here'
```

### **Step 3: Start Backend**
```bash
cd app/backend

# Start the server
python main.py
```

### **Step 4: Open Frontend**
Open: `http://localhost:8000/static/index.html`

### **Step 5: Test Connection**
1. Check that the frontend shows "Connected!" 
2. Click the microphone button
3. Grant microphone permissions when prompted
4. The system is now ready for voice interaction

---

## � **Demo Script (2-3 minutes)**

### **Opening (30 seconds)**
> "I'd like to show you DealLens AI - a native audio shopping assistant that helps users find better deals through natural conversation."

### **Architecture Overview (30 seconds)**
> "This uses a new native audio architecture where your voice goes directly to Gemini Live API - no speech-to-text conversion. The AI natively understands audio, searches our product database, and responds with natural voice."

**Show the simple architecture:**
```
Frontend (Web Audio) → Backend (Relay) → Gemini Live → Function Tools
```

### **Live Demo (60-90 seconds)**

**1. Basic Interaction:**
- Click microphone
- Say: *"Hello, can you help me find deals?"*
- **Expected:** Gemini responds with audio, explaining capabilities

**2. Price Comparison:**
- Click microphone  
- Say: *"I found AirPods Pro for £249 at Apple Store. Can you find them cheaper?"*
- **Expected:** 
  - Function call executes
  - Shows deals on screen
  - Audio response: "I found better deals! Amazon has them for £229.99, saving you £19.01..."

**3. Product Search:**
- Click microphone
- Say: *"What's the best deal on PlayStation 5 right now?"*
- **Expected:**
  - Shows multiple PS5 deals
  - Audio highlights the cheapest option

### **Key Points to Highlight:**
- ✅ **Native Audio**: No lossy conversion, preserves tone and context
- ✅ **Real-time Function Calling**: AI can search and calculate on-the-fly
- ✅ **Natural Conversation**: Interruptions, context awareness
- ✅ **Visual Feedback**: Deal cards with savings calculations

---

## 🛠️ **Technical Architecture**

### **What Makes This Special:**

1. **Native Audio Processing**
   - Direct PCM audio streaming to Gemini Live
   - No speech-to-text/text-to-speech pipeline
   - Preserves audio nuances and enables barge-in

2. **Function Calling Integration**
   - AI can execute product searches
   - Real-time price comparisons
   - Savings calculations

3. **Modern Web Stack**
   - Web Audio API for audio capture
   - WebSocket for real-time communication
   - FastAPI backend as relay

### **File Structure (6 files total):**
```
app/
├── backend/
│   ├── main.py          # FastAPI + WebSocket relay
│   ├── deal_tools.py    # Function calling tools
│   ├── deals.json       # Product database
│   └── requirements.txt # Python dependencies
└── frontend/
    ├── index.html       # Audio interface
    └── app.js          # Web Audio API
```

---

## 🎯 **Demo Scenarios**

### **Scenario 1: Price Comparison**
**User:** *"I saw a MacBook Air for £1149 at Apple Store. Can you find it cheaper?"*

**Expected Flow:**
1. Audio captured and sent to Gemini Live
2. Gemini calls `search_deals` function
3. Backend searches database, finds Amazon for £1099.99
4. Gemini responds: *"Great news! I found it £50 cheaper at Amazon..."*
5. Visual deal cards appear with savings highlighted

### **Scenario 2: Product Discovery**
**User:** *"What's available for gaming?"*

**Expected Flow:**
1. Gemini calls `get_best_deals` or `search_deals` with "gaming"
2. Returns PlayStation 5 deals
3. Audio response lists options with prices
4. Visual display shows all gaming deals

### **Scenario 3: Conversational Follow-up**
**User:** *"That's still too expensive. What about something under £400?"*

**Expected Flow:**
1. Gemini understands context (referring to previous PlayStation search)
2. Re-searches with price filter
3. Suggests alternatives or explains no options available
4. Maintains conversation thread

---

## 🚨 **Troubleshooting**

### **Backend Won't Start**
- Check: `GEMINI_API_KEY` environment variable set
- Verify: Dependencies installed (`cd app/backend && pip install -r requirements.txt`)
- Ensure: Python 3.8+ is being used

### **Frontend Won't Connect**
- Check: Backend running on port 8000
- Verify: Browser allows microphone access
- Ensure: WebSocket connection to `ws://localhost:8000/ws/audio`

### **No Audio Response**
- Check: Browser console for errors
- Verify: Gemini Live API key is valid
- Test: Basic function calls working (check backend logs)

---

## 🏆 **Judge Questions & Answers**

**Q: "How is this different from existing voice assistants?"**
A: "Native audio processing means no lossy conversion, better context understanding, and natural interruption handling. Plus real-time function calling for live deal searching."

**Q: "What's the scalability plan?"**
A: "This architecture scales horizontally - each backend instance handles its own Gemini connection. Function calls can integrate with real APIs (Amazon, eBay) instead of our JSON database."

**Q: "How accurate is the product matching?"**
A: "We use fuzzy matching on product names and keywords. In production, this would integrate with proper product APIs and machine learning models for better matching."

**Q: "What about privacy?"**
A: "Audio is streamed to Gemini Live but not stored. All deal searching happens server-side. For enterprise, this could be deployed with on-premises models."

---

## 🎉 **Success Metrics**

**Demo is successful if:**
- ✅ Audio conversation flows naturally
- ✅ Function calls execute and return deals
- ✅ Visual deal cards display with savings
- ✅ AI responds contextually to follow-up questions
- ✅ No major technical glitches

**Backup plan:** If audio fails, explain the architecture and show the visual deal search interface manually.

---

*Ready to win that hackathon! 🏆*
