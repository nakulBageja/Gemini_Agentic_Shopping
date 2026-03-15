# DealLens AI 🛍️
**Talk to your shopping assistant like never before!** DealLens AI is a real-time conversational shopping companion powered by Gemini 2.0 Flash Live API.

Think "Alexa for shopping" but smarter – speak naturally about products you're considering, and get instant voice responses with visual deal comparisons. DealLens transforms how you discover better prices and make purchasing decisions.

---

## ✨ Key Features

🎤 **Natural Voice Conversations**: Low-latency, interruptible shopping discussions  
🛒 **Real-time Price Discovery**: "I see AirPods for £249 at Apple Store" → Get instant alternatives  
👁️ **Visual Deal Cards**: See price comparisons and savings at a glance  
🔊 **Seamless Audio**: Crystal clear responses with no breaking or distortion  
↩️ **Smart Interruptions**: Change your mind mid-conversation, just like talking to a human  
📱 **Clean UI**: Icon-only interface with visual state indicators  

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

## 🔧 Technical Architecture

**Technologies:** Python FastAPI, WebSocket, Gemini Live API, Web Audio API, Vanilla JS  
**Audio Processing:** Unified 24kHz sample rate, seamless chunk scheduling, persistent microphone streams  
**Data Storage:** JSON-based deal database for rapid prototyping  
**Category:** Live Agents with multimodal Voice + Visual output

### Architecture Overview
```
User Voice → Frontend (JS) → WebSocket → Backend (Python) → Gemini Live API
                ↓                           ↓
           Audio Processing            Deal Search Tools
                ↓                           ↓
        Visual Deal Cards  ←  Voice Response + Deal Data
```

**Recent Technical Achievements:**
- 🎵 **Voice Breaking Eliminated**: Seamless audio scheduling prevents gaps between response chunks
- ⚡ **50% Faster Response**: 3-second silence detection (down from 10s)  
- 🎤 **No Permission Re-requests**: Persistent microphone streams improve UX
- 📊 **Web Audio API Compliant**: Power-of-2 buffer sizes (8192) for optimal performance

---

## 🚀 **Try DealLens AI Now**

### **🌐 Live Demo (Cloud Deployment)**
**Production Backend**: `https://deallens-backend-553067044467.us-central1.run.app`

**Quick Start**:
1. Open the frontend locally: [Download & serve frontend files](app/frontend/)
2. Frontend automatically connects to cloud backend
3. Click microphone, grant permissions, and start talking!

*The production backend runs on Google Cloud Run with enterprise-grade reliability.*

### **💻 Local Development Setup**

#### **Step 1: Install Dependencies**
```bash
cd app/backend
pip install -r requirements.txt
```

#### **Step 2: Get Gemini API Key**
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a free API key
3. Create `app/backend/.env` file:
```env
GEMINI_API_KEY=your_key_here
```

#### **Step 3: Start Local Backend**
```bash
cd app/backend
python main.py
```

#### **Step 4: Open Frontend**
Open: `http://localhost:8000/static/index.html`

*Frontend automatically detects local vs cloud backend*

#### **Step 5: Test Connection**
1. Check "Connected!" status appears
2. Click the microphone button
3. Grant microphone permissions when prompted
4. Say: "I found AirPods for £249, can you find cheaper?"

### **☁️ Cloud Deployment**

The backend is deployed on **Google Cloud Run** for global accessibility:

- **URL**: `<>`
- **Region**: `us-central1` (Iowa, USA)
- **Scaling**: Auto-scaling 0-100 instances
- **Security**: API keys in Secret Manager
- **Monitoring**: Cloud Run metrics and logging

See [Server Documentation](documentation/server.md) for full deployment guide.

---

## 📖 Documentation

### **Complete Technical Documentation**
- **[Server Documentation](documentation/server.md)**: Backend architecture, Gemini Live API integration, local development, and Cloud Run deployment
- **[Frontend Documentation](documentation/frontend.md)**: Web Audio API implementation, WebSocket communication, conversation flow, and browser compatibility
- **[Product Architecture](documentation/product.md)**: Business overview and product requirements
- **[System Architecture](documentation/architecture.md)**: High-level system design and technical decisions

---

## 💬 Example Conversations

**Price Comparison:**
> 🗣️ "I found iPhone 15 Pro for £999 at Currys, can you find it cheaper?"  
> 🤖 "Amazon has it for £949 and Very for £969. You could save £50 with Amazon!"

**Product Discovery:**
> 🗣️ "What's the best deal on gaming headsets under £100?"  
> 🤖 "Great question! I found the SteelSeries Arctis 7 for £89 at Game, down from £159!"

**Smart Interruptions:**
> 🗣️ "Actually, I meant wireless headsets instead"  
> 🤖 "Got it! For wireless, the Sony WH-1000XM4 is £279 at John Lewis..."

---

## How It Works

1. **User speaks** into the microphone on the web page
3. **Gemini Live API** handles transcription & intent parsing in real-time
4. **Deal Search Tools** query the product database for price comparisons
5. **User receives** synchronized voice response + visual deal cards

---

## ❓ Troubleshooting

### **Audio Issues**
- **No microphone access**: Ensure HTTPS is used (or localhost). Check browser permissions in Settings.
- **Voice breaking/distortion**: Clear browser cache and reload. Try Chrome/Edge for best compatibility.
- **Microphone not working**: Test microphone with other apps. Check device isn't muted.

### **Connection Issues**
- **"Disconnected" status**: Ensure backend is running on `localhost:8000`. Check terminal for errors.
- **WebSocket errors**: Try refreshing the page. Check firewall isn't blocking port 8000.
- **API errors**: Verify Gemini API key is valid and has Live API access enabled.

### **Browser Compatibility**
- **Recommended**: Chrome, Edge (full Web Audio API support)
- **Limitations**: Safari may have microphone permission issues
- **Mobile**: Works best on mobile Chrome/Safari with HTTPS

### **Common Error Messages**
- `"Microphone permission denied"`: Grant permissions in browser settings
- `"Not connected to backend"`: Start the Python backend server
- `"Audio processing failed"`: Check Web Audio API support in browser console

---

## 🛣️ Roadmap

**Phase 1** ✅ Voice-first shopping assistant with seamless audio  
**Phase 2** 🔄 Vision-enabled product recognition via camera  
**Phase 3** 📋 Enhanced deal database with real-time pricing APIs  
**Phase 4** 🤝 Multi-retailer integrations and purchase capabilities

---

## 📜 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 🤝 Contributing

DealLens AI is developed by Nakul Bageja to explore practical applications of conversational AI in shopping. Contributions, suggestions, and feedback are welcome via Issues or Pull Requests.

**Disclaimer:** Product prices and availability are for demonstration purposes using sample data. This is a proof-of-concept showcasing Gemini Live API capabilities, created during [Gemini Live Agent hackathon ](https://geminiliveagentchallenge.devpost.com/)

---

**Ready to revolutionize your shopping experience?** 🛍️ Start talking to DealLens AI today!

# LEFT TO DO

- [ ] Architecture.md
- [ ] Improved Examples in deals.json
- [ ] Demo Video

Eg:
https://github.com/GoogleCloudPlatform/generative-ai/blob/main/gemini/multimodal-live-api/project-livewire/assets/architecture.png
