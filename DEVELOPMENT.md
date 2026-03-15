# DealLens AI - Native Audio Development Log

## 🎯 **Architecture Decision: Native Audio Multimodal**

**Date:** March 15, 2026  
**Decision:** Complete rebuild using native audio processing with Gemini Live API

### **Why This Change?**
1. **Previous Architecture Issues:**
   - Complex cascaded pipeline (Speech-to-Text → Processing → Text-to-Speech)
   - Lossy audio conversion
   - Complex interruption handling
   - Multiple services and dependencies

2. **New Native Audio Benefits:**
   - Direct audio processing by LLM
   - Natural barge-in support
   - Preserved audio context and nuance
   - Simpler, more reliable pipeline
   - Better user experience

### **New Architecture:**
```
Frontend (Web Audio) ←→ Backend (WebSocket Relay) ←→ Gemini Live API
                                    ↓
                            Function Call Tools
                                    ↓
                            Deal Search Service
```

---

## 📋 **Development Steps**

### **Step 1: Clean Up Old Architecture**
- **Action:** Remove complex multi-agent system
- **Reason:** Simplify to single native audio agent
- **Files Removed:** All old backend files except data

### **Step 2: Create Minimal Structure**
- **Action:** Create new minimal file structure
- **Reason:** Focus on core functionality only
- **Target:** ~5 files instead of 15+

### **Step 3: Backend WebSocket Relay**
- **Action:** Build FastAPI server that relays to Gemini Live
- **Reason:** Need backend to handle function calls and business logic

### **Step 4: Function Calling Tools**
- **Action:** Define deal search tools for Gemini to call
- **Reason:** Enable AI to search products and compare prices

### **Step 5: Frontend Audio Client**
- **Action:** Web Audio API client for mic/speaker
- **Reason:** Capture/playback native audio streams

### **Step 6: Simple Deal Database**
- **Action:** Streamlined JSON product database
- **Reason:** Focus on demo functionality

---

## 🚀 **Current Progress**

- [x] Architecture planning
- [x] Development log setup
- [x] Clean up old code
- [x] Create new structure
- [x] Implement backend relay
- [x] Create function tools
- [x] Build frontend client
- [ ] Test native audio pipeline
- [ ] Create demo documentation

---

## 📝 **Step-by-Step Implementation Log**

### **Step 1: Clean Up Old Architecture ✅**
- **Completed:** Removed entire `app/backend` directory 
- **Files Removed:** 15+ files including complex agents, services, models
- **Result:** Clean slate for new architecture

### **Step 2: Create Minimal Structure ✅**
- **Completed:** New directory structure with only essential files
- **Files Created:** 
  - `app/backend/` (4 core files)
  - `app/frontend/` (2 files)
- **Result:** ~6 files instead of 15+

### **Step 3: Backend WebSocket Relay ✅**
- **Completed:** `main.py` - FastAPI server with Gemini Live integration
- **Features:**
  - Direct WebSocket connection to Gemini Live API
  - Audio streaming relay
  - Function calling support
  - Session management
- **Result:** Native audio pipeline established

### **Step 4: Function Calling Tools ✅**
- **Completed:** `deal_tools.py` - Product search functionality
- **Functions:** `search_deals`, `get_best_deals`, `get_product_list`
- **Features:**
  - Fuzzy product matching
  - Price comparison with savings calculation
  - Store filtering
- **Result:** AI can execute deal searches

### **Step 5: Frontend Audio Client ✅**
- **Completed:** `app.js` - Web Audio API integration
- **Features:**
  - Real-time audio capture (16kHz PCM)
  - WebSocket communication
  - Audio playback
  - Visual feedback and deal display
- **Result:** Complete audio interface

### **Step 6: Simple Deal Database ✅**
- **Completed:** `deals.json` - Product database
- **Content:** 4 products, 12 deals across major UK stores
- **Structure:** Product matching with keywords and pricing
- **Result:** Demo-ready product catalog

---

## 📝 **Technical Notes**

### **Gemini Live Integration:**
- Direct WebSocket connection to Gemini Live API
- Handle audio streams in Base64 format
- Process function call events
- Manage session state

### **Function Calling Schema:**
```json
{
  "name": "search_deals",
  "description": "Find better deals for a product",
  "parameters": {
    "product_name": "string",
    "current_price": "number",
    "store_name": "string"
  }
}
```

### **Audio Format:**
- **Input:** PCM 16kHz mono audio
- **Transport:** Base64 encoded WebSocket messages
- **Output:** Direct audio playback

---

## 🎯 **Demo Scenarios**
1. "Hey, I found AirPods Pro for £249 at Apple Store, can you find them cheaper?"
2. "What's the best deal on PlayStation 5 right now?"
3. "I'm looking for a MacBook Air under £1000"

---

*This log will be updated as development progresses...*
