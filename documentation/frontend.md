# DealLens AI Frontend Documentation

## Overview

The DealLens AI frontend is a **real-time voice interface** built with vanilla JavaScript and Web Audio API. It provides professional-grade audio processing, seamless WebSocket communication, and an intuitive conversation flow for the voice shopping assistant.

## Architecture

### Core Technologies
- **Vanilla JavaScript**: Modern ES6+ with async/await patterns
- **Web Audio API**: Real-time audio capture and playback at 24kHz
- **WebSocket**: Bidirectional communication with backend
- **HTML5**: Responsive UI with CSS3 animations
- **Base64 Encoding**: Audio chunk serialization for network transmission

### System Components

```
User Microphone → Web Audio API → WebSocket → Backend → Gemini Live API
                       ↓              ↓
                Audio Processing   State Management
                       ↓              ↓
               Audio Playback    UI Updates & Deal Cards
```

## File Structure

```
app/frontend/
├── index.html          # Main HTML interface
├── app.js             # Core application logic
└── (static files served by backend)
```

## Audio Processing Architecture

### 1. Real-time Audio Capture

The frontend captures audio using the **Web Audio API** with optimal configuration for voice processing:

```javascript
// Unified sample rate for recording and playback consistency
this.UNIFIED_SAMPLE_RATE = 24000; // 24kHz to match Gemini Live API

// ScriptProcessorNode for real-time audio processing
this.audioProcessor = this.audioContext.createScriptProcessor(8192, 1, 1);
```

#### Audio Flow: User → Backend
1. **Microphone Access**: Request user permission (preserved across sessions)
2. **Audio Context**: Create 24kHz audio context for consistent processing
3. **Script Processor**: 8192 sample buffer (power of 2 for optimal performance)
4. **PCM Conversion**: Convert Float32Array to Int16Array (16-bit PCM)
5. **Base64 Encoding**: Serialize audio for WebSocket transmission
6. **Buffered Streaming**: Collect chunks locally for turn-based coordination

### 2. Smart Audio Buffering

**Hybrid Buffered Approach**: Unlike traditional streaming, DealLens uses intelligent buffering:

```javascript
// Audio buffering for turn-taking coordination
this.audioBuffer = [];

// Buffer chunks locally during recording
this.audioBuffer.push(base64Audio);

// Send complete buffer when user stops speaking
this.sendBufferedAudio();
```

**Benefits**:
- **Better Turn-taking**: Complete utterances sent as units
- **Improved Recognition**: Full context for Gemini Live API
- **Network Efficiency**: Fewer WebSocket messages

### 3. Professional Audio Playback

#### Audio Flow: Backend → User
1. **Chunk Reception**: Receive base64-encoded PCM from backend
2. **Smart State Management**: `IDLE → AI_THINKING → AI_SPEAKING`
3. **Chunk Accumulation**: Wait for complete response (1.5s timeout)
4. **Buffer Combination**: Merge small chunks into larger buffers (20:1 ratio)
5. **Sequential Playback**: Play combined buffers without gaps
6. **Interruption Support**: Allow user to interrupt mid-response

```javascript
async playBufferedAudioChunks() {
    // Combine 392 small chunks → 20 larger buffers
    const combinedBuffers = this.combineSmallChunks(chunksToPlay);
    
    // Play each buffer sequentially
    for (let buffer of combinedBuffers) {
        await this.playAudioBuffer(buffer);
    }
}
```

### 4. Silence Detection

**3-Second Auto-Timeout**: Automatically stop recording after periods of silence:

```javascript
class SilenceDetector {
    constructor(timeoutMs = 3000) {
        this.timeoutMs = timeoutMs;
        this.silenceThreshold = 0.01; // Calibrated for voice detection
    }
    
    detectSilence(audioLevel, onTimeout) {
        if (audioLevel < this.silenceThreshold) {
            // Start 3-second countdown
            this.silenceTimer = setTimeout(onTimeout, this.timeoutMs);
        }
    }
}
```

## Conversation State Management

### State Flow Diagram
```
IDLE → LISTENING → AI_THINKING → AI_SPEAKING → IDLE
 ↓        ↓            ↓            ↓         ↓
Start   Recording   Gathering   Playing   Complete
Click   Audio      Chunks      Audio     Ready
```

### State Definitions

#### **IDLE**
- **UI**: "Click the microphone to start"
- **Button**: Green gradient, clickable
- **Action**: Start recording on click

#### **LISTENING** 
- **UI**: "🎤 Listening... (Click to stop)"
- **Button**: Red pulsing animation
- **Features**: Audio visualizer active, silence detection running
- **Action**: Stop recording on click or 3s silence

#### **AI_THINKING**
- **UI**: "🧠 AI is thinking... preparing response"
- **Button**: Disabled with thinking animation
- **Process**: Accumulating audio chunks from backend (1.5s max wait)
- **Trigger**: First audio chunk received from backend

#### **AI_SPEAKING**
- **UI**: "🔊 AI responding... (Tap to interrupt)"
- **Button**: Purple gradient, interruption-ready
- **Process**: Playing audio response sequentially
- **Action**: Interrupt and resume recording on click

### Dynamic Backend Detection

The frontend automatically detects whether to use local or cloud backend:

```javascript
getBackendWebSocketURL() {
    const hostname = window.location.hostname;
    const isLocalDevelopment = hostname === 'localhost' || hostname === '127.0.0.1';
    
    if (isLocalDevelopment) {
        return 'ws://localhost:8000/ws/audio';  // Local development
    } else {
        return 'wss://deallens-backend-553067044467.us-central1.run.app/ws/audio'; // Cloud
    }
}
```

## WebSocket Communication

### Connection Management

```javascript
connectWebSocket() {
    this.ws = new WebSocket(backendUrl);
    
    this.ws.onopen = () => {
        this.isConnected = true;
        this.updateStatus('Connected! Click the microphone to start');
    };
    
    this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(JSON.parse(event.data));
    };
}
```

### Message Protocol

#### Frontend → Backend Messages

**Start Recording**
```javascript
this.sendWebSocketMessage({
    type: 'start_recording'
});
```

**Audio Chunk** (Base64 PCM)
```javascript
this.sendWebSocketMessage({
    type: 'audio_chunk',
    audio_data: base64Audio  // Int16Array → Base64
});
```

**End of Speech**
```javascript
this.sendWebSocketMessage({
    type: 'end_of_speech'  // Signals complete user input
});
```

**Interrupt AI**
```javascript
this.sendWebSocketMessage({
    type: 'interrupt_ai'  // Stop current response, resume recording
});
```

#### Backend → Frontend Messages

**Audio Response** (Streaming)
```javascript
{
    type: 'audio_response',
    audio_data: 'base64_pcm_data',
    mime_type: 'audio/pcm;rate=24000'
}
```

**Function Result** (Deal Search)
```javascript
{
    type: 'function_result',
    function_name: 'search_deals',
    result: {
        success: true,
        product_name: 'PlayStation 5',
        deals: [...] // Deal cards data
    }
}
```

## User Interface Components

### 1. Microphone Button

**Dynamic Visual States**:
```css
.mic-button {
    /* Base state - green gradient */
    background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
}

.mic-button.recording {
    /* Recording - red pulsing */
    background: linear-gradient(45deg, #ff4757, #ff3838);
    animation: pulse 1.5s infinite;
}

.mic-button.ai-speaking {
    /* AI speaking - purple glow */
    background: linear-gradient(45deg, #9b59b6, #e74c3c);
    animation: glow 2s ease-in-out infinite alternate;
}
```

### 2. Audio Visualizer

**Real-time Bars**: Display audio levels during recording
```javascript
updateAudioVisualizer(audioData) {
    const level = this.calculateAudioLevel(audioData);
    const bars = this.audioVisualizer.querySelectorAll('.bar');
    
    bars.forEach(bar => {
        const height = Math.random() * level * 50 + 5;
        bar.style.height = `${height}px`;
    });
}
```

### 3. Deal Cards

**Dynamic Deal Display**: Show price comparisons visually
```javascript
displayDeals(result) {
    const { product_name, deals } = result;
    
    this.dealsContainer.innerHTML = `
        <h3>🛍️ Deals for ${product_name}</h3>
        ${deals.map(deal => `
            <div class="deal-item">
                <div class="deal-store">${deal.store}</div>
                <div class="deal-price">£${deal.price.toFixed(2)}</div>
                ${deal.savings > 0 ? `
                    <div class="deal-savings">
                        💰 Save £${deal.savings.toFixed(2)}
                    </div>
                ` : ''}
            </div>
        `).join('')}
    `;
}
```

## Running the Frontend

### With Local Backend

1. **Start Backend**
```bash
cd app/backend
python main.py
```

2. **Open Frontend**
```
http://localhost:8000/static/index.html
```
*(Backend serves frontend as static files)*

### With Cloud Backend

#### Option 1: Static File Server
```bash
cd app/frontend
python -m http.server 3000

# Open: http://localhost:3000
# Automatically connects to: wss://deallens-backend-553067044467.us-central1.run.app
```

#### Option 2: Live Server (VS Code)
1. Install "Live Server" extension
2. Right-click `index.html` → "Open with Live Server"  
3. Automatically detects cloud backend via hostname

### Deployment Options

#### **GitHub Pages / Netlify / Vercel**
```bash
# Simple static deployment
# Frontend automatically detects cloud backend
# No additional configuration needed
```

#### **Cloud Run (Full Stack)**
- Deploy frontend as separate Cloud Run service
- Configure CORS in backend for frontend domain
- Use custom domain for production

## Advanced Features

### 1. Interruption Handling

**Seamless Mid-Response Interruption**:
```javascript
async interruptAI() {
    // Stop audio playback immediately
    this.stopAudioPlayback();
    
    // Send interrupt signal
    this.sendWebSocketMessage({ type: 'interrupt_ai' });
    
    // Resume recording WITHOUT requesting permissions
    await this.resumeRecording();
}
```

### 2. Persistent Microphone Streams

**Performance Optimization**: Preserve microphone access across conversations
```javascript
// DON'T close media stream after recording
// this.mediaStream.getTracks().forEach(track => track.stop()); // ❌

// Instead, preserve for next recording session
console.log('🔄 Media stream preserved for future use'); // ✅
```

**Benefits**:
- No repeated permission requests
- Faster recording startup
- Better user experience

### 3. Error Handling & Recovery

**Graceful Degradation**:
```javascript
try {
    await this.startRecording();
} catch (error) {
    if (error.name === 'NotAllowedError') {
        this.showError('Microphone permission denied');
    } else if (error.name === 'NotFoundError') {
        this.showError('No microphone found');
    }
    // App continues functioning, user can retry
}
```

### 4. Browser Compatibility

**Supported Browsers**:
- ✅ **Chrome/Chromium**: Full Web Audio API support
- ✅ **Edge**: Full Web Audio API support  
- ⚠️ **Firefox**: Limited ScriptProcessorNode support
- ⚠️ **Safari**: iOS microphone permission issues

**Mobile Support**:
- ✅ **Chrome Mobile**: Works with HTTPS
- ✅ **Safari Mobile**: Works with HTTPS
- ❌ **HTTP**: Microphone blocked on mobile

## Audio Performance Optimization

### 1. Chunk Size Optimization

**8192 Sample Buffer**: Optimal for 24kHz audio
```javascript
// Power of 2 for optimal browser performance
this.audioProcessor = this.audioContext.createScriptProcessor(8192, 1, 1);

// Results in ~341ms chunks at 24kHz
// Balance between latency and processing efficiency
```

### 2. Memory Management

**Audio Source Cleanup**:
```javascript
source.onended = () => {
    // Remove from tracking array to prevent memory leaks
    const index = this.currentAudioSources.indexOf(source);
    if (index > -1) {
        this.currentAudioSources.splice(index, 1);
    }
};
```

### 3. Network Optimization

**Buffered Sending**: Reduce WebSocket message frequency
```javascript
// Instead of sending every audio chunk individually:
// sendAudioChunk() // ❌ 100+ messages

// Send complete buffered input:
sendBufferedAudio() // ✅ 1 complete message
```

## Troubleshooting

### Common Issues

**Microphone Permission Denied**
- Check browser permissions in site settings
- Ensure HTTPS (required on mobile)
- Try incognito mode to reset permissions

**Audio Not Playing**  
- Check Web Audio API support in browser console
- Verify WebSocket connection is established
- Monitor network tab for audio message reception

**Choppy/Distorted Audio**
- Clear browser cache and cookies
- Check CPU usage during audio processing
- Try reducing other tabs/applications

**Connection Issues**
- Verify backend URL in browser network tab
- Check CORS headers if using different domains
- Test WebSocket connection with browser tools

### Debug Tools

**Browser Console Logs**:
```javascript
// Enable detailed logging
console.log('🔊 Playing buffer 1/20, state: AI_SPEAKING');
console.log('📦 Combined 392 chunks into 20 buffers');
console.log('🧠 AI thinking... more chunks arrived, total now: 100');
```

**Performance Monitoring**:
- Chrome DevTools → Performance tab
- Monitor Web Audio API usage
- Check memory usage patterns
- Analyze WebSocket message timing

## Security & Privacy

### Client-Side Security
- **No Data Persistence**: Audio never stored locally
- **Memory Cleanup**: Audio buffers cleared after use  
- **Permission Respect**: Honor user microphone permissions
- **HTTPS Enforcement**: Secure connections required

### Privacy Features  
- **Real-time Processing**: No audio recordings saved
- **Temporary Buffers**: Audio cleared between conversations
- **User Control**: Clear stop/start/interrupt controls

---

## Integration Examples

### Example 1: Complete Voice Interaction
```javascript
User: "I found AirPods Pro for £249 at Apple Store"
→ Frontend captures audio → Buffers locally → Sends complete utterance
→ Backend processes → Gemini Live API responds with audio + function call
→ Frontend displays deal cards + plays voice response
AI: "I found them for £229 at Amazon, saving you £20!"
```

### Example 2: Interruption Flow
```javascript  
User starts speaking while AI is responding:
→ Frontend detects mic button click during AI_SPEAKING
→ Stops audio playback immediately → Sends interrupt signal
→ Resumes recording without permission request
→ Seamless conversation continuation
```

---

**Live Frontend**: Compatible with `https://deallens-backend-553067044467.us-central1.run.app`

The DealLens AI frontend delivers enterprise-grade voice interaction with Web Audio API excellence! 🎤
