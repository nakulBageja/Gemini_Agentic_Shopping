/**
 * DealLens AI - Native Audio Frontend
 * Handles Web Audio API, WebSocket communication, and UI interactions
 */

class DealLensAudioClient {
    constructor() {
        // WebSocket connection
        this.ws = null;
        this.isConnected = false;

        // Conversation state management
        this.conversationState = 'IDLE'; // IDLE, LISTENING, PROCESSING, AI_SPEAKING
        this.isInterrupting = false; // Flag to track interruption context

        // Audio context and processing
        this.audioContext = null;
        this.mediaStream = null;
        this.audioProcessor = null;
        this.isRecording = false;
        this.isProcessing = false;

        // Audio playback
        this.audioQueue = [];
        this.isPlaying = false;
        this.audioChunks = [];
        this.audioSampleRate = 24000; // Unified sample rate for both recording and playback
        this.UNIFIED_SAMPLE_RATE = 24000; // Constant for consistent sample rate
        this.playbackContext = null;
        this.currentAudioSources = []; // Track playing audio sources for interruption

        // Silence detection for hybrid buffered turn-taking
        this.silenceDetector = new SilenceDetector(3000); // 3 second timeout for fast response

        // Audio buffering for turn-taking coordination
        this.audioBuffer = [];

        // UI elements
        this.micButton = document.getElementById('micButton');
        this.statusDiv = document.getElementById('status');
        this.dealsContainer = document.getElementById('dealsContainer');
        this.errorContainer = document.getElementById('errorContainer');
        this.audioVisualizer = document.getElementById('audioVisualizer');

        // Initialize
        this.initializeEventListeners();
        this.connectWebSocket();
    }

    initializeEventListeners() {
        this.micButton.addEventListener('click', () => {
            this.handleMicButtonClick();
        });

        // Handle page visibility for proper cleanup
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRecording) {
                this.stopRecording();
            }
        });
    }

    async handleMicButtonClick() {
        console.log(`Mic button clicked in state: ${this.conversationState}`);

        switch (this.conversationState) {
            case 'IDLE':
                await this.startRecording();
                break;
            case 'LISTENING':
                await this.stopRecording();
                break;
            case 'AI_SPEAKING':
                await this.interruptAI();
                break;
            case 'PROCESSING':
                // Button should be disabled - no action
                console.log('Button clicked during processing - ignoring');
                break;
            default:
                console.warn(`Unknown conversation state: ${this.conversationState}`);
        }
    }

    async interruptAI() {
        console.log('🔴 Interrupting AI response...');

        // Set interruption flag to track context
        this.isInterrupting = true;

        // Stop current audio playback immediately
        this.stopAudioPlayback();

        // Send interrupt signal to backend
        this.sendWebSocketMessage({
            type: 'interrupt_ai'
        });

        // Clear any queued audio chunks and buffer
        this.audioChunks = [];
        this.audioBuffer = [];

        // Resume recording WITHOUT requesting new permissions
        await this.resumeRecording();
    }

    async resumeRecording() {
        console.log('🔄 Resuming recording for interruption...');

        try {
            // Check if we already have media stream and audio context
            if (!this.mediaStream || !this.audioContext) {
                // If no existing stream, use startRecording (will request permissions)
                console.log('No existing stream, starting new recording...');
                await this.startRecording();
                return;
            }

            // Reuse existing media stream and context
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);

            // Create new audio processor  
            // Buffer size adjusted for 24kHz (8192 = next power of 2 after 4096 * 1.5)
            this.audioProcessor = this.audioContext.createScriptProcessor(8192, 1, 1);
            this.audioProcessor.onaudioprocess = (event) => {
                if (this.isRecording) {
                    this.processAudioData(event.inputBuffer);
                }
            };

            // Connect audio nodes
            source.connect(this.audioProcessor);
            this.audioProcessor.connect(this.audioContext.destination);

            // Resume recording
            this.isRecording = true;
            this.setConversationState('LISTENING');
            this.showAudioVisualizer();

            // Reset silence detector for new recording session
            this.silenceDetector.reset();

            // Send start recording signal
            this.sendWebSocketMessage({
                type: 'start_recording'
            });

            console.log('Recording resumed with existing stream');

        } catch (error) {
            console.error('Failed to resume recording:', error);
            // Fallback to new recording if resume fails
            await this.startRecording();
        }
    }

    setConversationState(newState) {
        console.log(`🔄 Conversation state: ${this.conversationState} → ${newState}`);
        this.conversationState = newState;
        this.updateUIForState();
    }

    updateUIForState() {
        // Reset to base class and clear any previous states
        this.micButton.className = 'mic-button';

        switch (this.conversationState) {
            case 'IDLE':
                // Clean idle state - just the SVG icon
                this.micButton.disabled = false;
                this.micButton.style.cursor = 'pointer';
                this.micButton.title = 'Click to speak';
                this.updateStatus('Click the microphone to start');
                break;

            case 'LISTENING':
                // Add recording visual state - pulsing red animation
                this.micButton.classList.add('recording');
                this.micButton.disabled = false;
                this.micButton.style.cursor = 'pointer';
                this.micButton.title = 'Click to stop recording';
                this.updateStatus('🎤 Listening... (Click to stop)');
                break;

            case 'PROCESSING':
                // Add processing visual state - spinning animation
                this.micButton.classList.add('processing');
                this.micButton.disabled = true;
                this.micButton.style.cursor = 'not-allowed';
                this.micButton.title = 'Processing...';
                this.updateStatus('🤔 Processing... please wait');
                break;

            case 'AI_SPEAKING':
                // Add interrupt-ready visual state - different color gradient
                this.micButton.classList.add('ai-speaking');
                this.micButton.disabled = false;
                this.micButton.style.cursor = 'pointer';
                this.micButton.title = 'Tap to interrupt';
                this.updateStatus('🔊 AI speaking... (Tap microphone to interrupt)');
                break;

            default:
                console.warn(`Unknown state for UI update: ${this.conversationState}`);
        }
    }

    stopAudioPlayback() {
        // Stop all currently playing audio sources
        this.currentAudioSources.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Source might already be stopped
            }
        });
        this.currentAudioSources = [];

        // Reset playback state
        this.isPlaying = false;

        // Clear remaining audio chunks
        this.audioChunks = [];

        console.log('🔇 Audio playback stopped');
    }

    connectWebSocket() {
        try {
            // Connect to backend WebSocket
            this.ws = new WebSocket('ws://localhost:8000/ws/audio');

            this.ws.onopen = () => {
                console.log('Connected to DealLens AI backend');
                this.isConnected = true;
                this.updateStatus('Connected! Click the microphone to start');
                this.clearError();
            };

            this.ws.onmessage = (event) => {
                this.handleWebSocketMessage(JSON.parse(event.data));
            };

            this.ws.onclose = () => {
                console.log('Disconnected from backend');
                this.isConnected = false;
                this.updateStatus('Disconnected');
                this.showError('Connection lost. Please refresh the page.');
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.showError('Connection error. Make sure the backend is running.');
            };

        } catch (error) {
            console.error('Failed to connect:', error);
            this.showError('Failed to connect. Make sure the backend is running on port 8000.');
        }
    }

    handleWebSocketMessage(message) {
        console.log('Received message:', message.type);

        switch (message.type) {
            case 'audio_response':
                this.playAudioResponse(message.audio_data, message.mime_type);
                break;

            case 'text_response':
                console.log('AI Response:', message.text);
                this.updateStatus(message.text);
                break;

            case 'function_result':
                this.displayFunctionResult(message);
                break;

            case 'error':
                this.showError(message.message);
                this.stopProcessing();
                break;

            default:
                console.log('Unknown message type:', message.type);
        }
    }

    async ensureMediaStream() {
        // Only request new permission if we don't have an active stream
        if (!this.mediaStream || !this.mediaStream.active) {
            console.log('Requesting microphone access...');

            // Check if getUserMedia is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('getUserMedia is not supported in this browser');
            }

            try {
                // Check available devices first
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioDevices = devices.filter(device => device.kind === 'audioinput');
                console.log(`Found ${audioDevices.length} audio input devices`);

                if (audioDevices.length === 0) {
                    throw new Error('No microphone devices found');
                }

                // Try with minimal constraints
                this.mediaStream = await navigator.mediaDevices.getUserMedia({
                    audio: true
                });
                console.log('✅ Microphone access granted');

                // Log stream details for debugging
                const tracks = this.mediaStream.getAudioTracks();
                if (tracks.length > 0) {
                    console.log('Audio track settings:', tracks[0].getSettings());
                }

            } catch (error) {
                console.error('❌ Microphone access failed:', error);

                // Provide specific error messages based on error type
                if (error.name === 'NotAllowedError') {
                    throw new Error('Microphone permission denied. Please allow microphone access and try again.');
                } else if (error.name === 'NotFoundError') {
                    throw new Error('No microphone found. Please connect a microphone and try again.');
                } else if (error.name === 'NotReadableError') {
                    throw new Error('Microphone is already in use by another application.');
                } else {
                    throw new Error(`Microphone access failed: ${error.message}`);
                }
            }
        } else {
            console.log('Reusing existing media stream - no permission request needed');
        }
    }

    async startRecording() {
        if (!this.isConnected) {
            this.showError('Not connected to backend');
            return;
        }

        try {
            // Ensure we have media stream (reuse existing if available)
            await this.ensureMediaStream();

            // Create audio context if needed
            if (!this.audioContext || this.audioContext.state === 'closed') {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                    sampleRate: this.UNIFIED_SAMPLE_RATE // 24000Hz to match Gemini
                });
            }

            // Create media stream source
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);

            // Create audio processor using ScriptProcessorNode (deprecated but widely supported)
            // For production, consider using AudioWorklet
            // Buffer size adjusted for 24kHz (8192 = next power of 2 after 4096 * 1.5)
            this.audioProcessor = this.audioContext.createScriptProcessor(8192, 1, 1);

            this.audioProcessor.onaudioprocess = (event) => {
                if (this.isRecording) {
                    this.processAudioData(event.inputBuffer);
                }
            };

            // Connect audio nodes
            source.connect(this.audioProcessor);
            this.audioProcessor.connect(this.audioContext.destination);

            this.isRecording = true;
            this.setConversationState('LISTENING');
            this.showAudioVisualizer();

            // Reset silence detector for new recording session
            this.silenceDetector.reset();

            // Send start recording signal
            this.sendWebSocketMessage({
                type: 'start_recording'
            });

            console.log('Recording started');

        } catch (error) {
            console.error('Failed to start recording:', error);
            this.showError('Microphone access denied or not available');
        }
    }

    stopRecording() {
        if (!this.isRecording) return;

        console.log('Stopping recording (preserving media stream)...');

        // IMPORTANT: Set recording to false FIRST to stop processAudioData immediately
        this.isRecording = false;

        // Disconnect audio processor IMMEDIATELY to prevent more audio events
        if (this.audioProcessor) {
            this.audioProcessor.onaudioprocess = null; // Remove the handler first
            this.audioProcessor.disconnect();
            this.audioProcessor = null;
        }

        // KEEP MEDIA STREAM ALIVE - do NOT stop tracks or set to null
        // This prevents repeated microphone permission requests
        console.log('🔄 Media stream preserved for future use (no permission request needed)');

        // DON'T close audio context - keep it available for reuse
        // This improves performance and user experience
        console.log('🔄 Audio context preserved for future use');

        // Reset silence detector
        this.silenceDetector.reset();

        // Context-aware state transitions - SKIP processing stage entirely
        if (this.isInterrupting) {
            // During interruption: Go to IDLE and wait for AI response
            console.log('🔴 Stopping recording after interruption - going to IDLE');
            this.setConversationState('IDLE');
            this.isInterrupting = false; // Reset interruption flag
        } else {
            // Normal recording: Go directly to IDLE (no processing stage needed)
            console.log('📝 Stopping normal recording - going to IDLE (buffered audio will be sent)');
            this.setConversationState('IDLE');
        }

        this.hideAudioVisualizer();

        // Send buffered audio if we have any
        this.sendBufferedAudio();

        // Send end of speech signal
        this.sendWebSocketMessage({
            type: 'end_of_speech'
        });

        // Send stop recording signal
        this.sendWebSocketMessage({
            type: 'stop_recording'
        });

        console.log('Recording stopped (stream preserved), buffered audio sent, cleanup complete');
    }

    processAudioData(inputBuffer) {
        // Get audio data from the input buffer
        const audioData = inputBuffer.getChannelData(0);

        // Calculate audio level for silence detection
        const audioLevel = this.silenceDetector.calculateAudioLevel(audioData);

        // Check for silence timeout (3 seconds for hybrid buffered approach)
        this.silenceDetector.detectSilence(audioLevel, () => {
            console.log('🔇 3-second silence detected - sending complete buffered audio');
            this.sendBufferedAudio();
            this.stopRecording();
        });

        // Convert Float32Array to Int16Array (PCM format)
        const pcmData = new Int16Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
            // Convert from [-1, 1] to [-32768, 32767]
            pcmData[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768));
        }

        // Convert to base64 and buffer locally for turn-taking coordination
        const base64Audio = this.arrayBufferToBase64(pcmData.buffer);
        this.audioBuffer.push(base64Audio);

        // Update audio visualizer
        this.updateAudioVisualizer(audioData);
    }

    sendBufferedAudio() {
        if (this.audioBuffer.length === 0) return;

        console.log(`📤 Sending ${this.audioBuffer.length} buffered audio chunks to AI`);

        // Send all buffered audio chunks as complete user input
        this.audioBuffer.forEach(chunk => {
            this.sendWebSocketMessage({
                type: 'audio_chunk',
                audio_data: chunk
            });
        });

        // Clear the buffer after sending
        this.audioBuffer = [];
    }

    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    base64ToArrayBuffer(base64) {
        const binary = window.atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    async playAudioResponse(base64Audio, mimeType = 'audio/pcm') {
        try {
            console.log(`Received audio chunk: ${base64Audio.length} chars, MIME: ${mimeType}`);

            // Convert base64 to array buffer
            const audioBuffer = this.base64ToArrayBuffer(base64Audio);

            if (mimeType.startsWith('audio/pcm')) {
                // Use unified sample rate for consistent audio processing
                this.audioSampleRate = this.UNIFIED_SAMPLE_RATE; // Always 24000Hz

                // Convert PCM data to Float32Array
                const audioData = new Int16Array(audioBuffer);
                const floatArray = new Float32Array(audioData.length);

                for (let i = 0; i < audioData.length; i++) {
                    floatArray[i] = Math.max(-1, Math.min(1, audioData[i] / 32768.0));
                }

                // Add to audio chunks queue
                this.audioChunks.push(floatArray);
                console.log(`Queued audio chunk: ${floatArray.length} samples, total chunks: ${this.audioChunks.length}`);

                // Start playing if not already playing
                if (!this.isPlaying) {
                    this.startAudioPlayback();
                }
            }

        } catch (error) {
            console.error('Audio chunk processing error:', error);
            this.updateStatus(`Audio processing failed: ${error.message}`);

            // Don't crash the app
            setTimeout(() => {
                this.updateStatus('Click the microphone to continue');
                this.updateUI('idle');
            }, 2000);
        }
    }

    async startAudioPlayback() {
        if (this.isPlaying || this.audioChunks.length === 0) return;

        try {
            this.isPlaying = true;

            // Set conversation state to AI_SPEAKING
            this.setConversationState('AI_SPEAKING');

            // Create audio context for playback
            if (!this.playbackContext || this.playbackContext.state === 'closed') {
                this.playbackContext = new (window.AudioContext || window.webkitAudioContext)({
                    sampleRate: this.audioSampleRate
                });
            }

            console.log(`Starting AI audio playback with ${this.audioChunks.length} chunks`);

            // Schedule all chunks for seamless playback
            await this.scheduleAudioChunks();

        } catch (error) {
            console.error('Audio playback error:', error);
            this.isPlaying = false;
            this.isProcessing = false;
            this.setConversationState('IDLE');
        }
    }

    async scheduleAudioChunks() {
        if (this.audioChunks.length === 0) return;

        // Start scheduling from current time
        let scheduledTime = this.playbackContext.currentTime;
        const chunksToSchedule = [...this.audioChunks]; // Copy the array
        this.audioChunks = []; // Clear original array

        // Track scheduled sources for proper cleanup
        const scheduledSources = [];

        return new Promise((resolve) => {
            let completedChunks = 0;

            chunksToSchedule.forEach((chunk, index) => {
                try {
                    // Create audio buffer for this chunk
                    const buffer = this.playbackContext.createBuffer(1, chunk.length, this.audioSampleRate);
                    buffer.copyToChannel(chunk, 0);

                    // Create source and schedule it
                    const source = this.playbackContext.createBufferSource();
                    source.buffer = buffer;
                    source.connect(this.playbackContext.destination);

                    // Track this source
                    scheduledSources.push(source);
                    this.currentAudioSources.push(source);

                    // Schedule this chunk to start at the precise time
                    source.start(scheduledTime);

                    // Calculate when this chunk will end
                    const chunkDuration = chunk.length / this.audioSampleRate;
                    scheduledTime += chunkDuration;

                    // Handle completion
                    source.onended = () => {
                        // Remove from tracking arrays
                        const schedIndex = scheduledSources.indexOf(source);
                        if (schedIndex > -1) scheduledSources.splice(schedIndex, 1);

                        const currentIndex = this.currentAudioSources.indexOf(source);
                        if (currentIndex > -1) this.currentAudioSources.splice(currentIndex, 1);

                        completedChunks++;

                        // Check if this was the last chunk
                        if (completedChunks === chunksToSchedule.length) {
                            this.isPlaying = false;
                            this.isProcessing = false;

                            // Only return to idle if not interrupted
                            if (this.conversationState === 'AI_SPEAKING') {
                                this.setConversationState('IDLE');
                            }

                            console.log('AI audio playback completed');
                            resolve();
                        }
                    };

                    source.onerror = (error) => {
                        console.error('Audio chunk error:', error);
                        completedChunks++;
                        if (completedChunks === chunksToSchedule.length) {
                            resolve();
                        }
                    };

                    console.log(`Scheduled chunk ${index + 1}/${chunksToSchedule.length} at time ${scheduledTime - chunkDuration}, duration: ${chunkDuration}s`);

                } catch (error) {
                    console.error(`Error scheduling chunk ${index}:`, error);
                    completedChunks++;
                    if (completedChunks === chunksToSchedule.length) {
                        resolve();
                    }
                }
            });

            console.log(`Scheduled ${chunksToSchedule.length} audio chunks for seamless playback`);
        });
    }

    playAudioChunk(floatArray) {
        return new Promise((resolve, reject) => {
            try {
                // Create audio buffer for this chunk
                const buffer = this.playbackContext.createBuffer(1, floatArray.length, this.audioSampleRate);
                buffer.copyToChannel(floatArray, 0);

                // Create source and play
                const source = this.playbackContext.createBufferSource();
                source.buffer = buffer;
                source.connect(this.playbackContext.destination);

                // Track this source for interruption capability
                this.currentAudioSources.push(source);

                source.onended = () => {
                    // Remove from tracking array
                    const index = this.currentAudioSources.indexOf(source);
                    if (index > -1) {
                        this.currentAudioSources.splice(index, 1);
                    }
                    resolve();
                };

                source.onerror = (error) => {
                    console.error('Audio source error:', error);
                    // Remove from tracking array
                    const index = this.currentAudioSources.indexOf(source);
                    if (index > -1) {
                        this.currentAudioSources.splice(index, 1);
                    }
                    reject(error);
                };

                source.start(0);

            } catch (error) {
                reject(error);
            }
        });
    }

    playDecodedAudio(context, buffer) {
        return new Promise((resolve) => {
            const source = context.createBufferSource();
            source.buffer = buffer;
            source.connect(context.destination);

            source.onended = () => {
                this.updateStatus('Click the microphone to continue');
                this.updateUI('idle');
                resolve();
            };

            source.start(0);
        });
    }

    displayFunctionResult(message) {
        const { function_name, result } = message;

        if (function_name === 'search_deals' && result.success) {
            this.displayDeals(result);
        } else if (function_name === 'get_best_deals' && result.success) {
            this.displayBestDeals(result);
        } else {
            console.log('Function result:', result);
        }
    }

    displayDeals(result) {
        const { product_name, current_price, deals } = result;

        this.dealsContainer.innerHTML = `
            <h3>🛍️ Deals for ${product_name}</h3>
            ${deals.map(deal => `
                <div class="deal-item">
                    <div class="deal-store">${deal.store}</div>
                    <div class="deal-price">£${deal.price.toFixed(2)}</div>
                    ${deal.savings > 0 ? `
                        <div class="deal-savings">
                            💰 Save £${deal.savings.toFixed(2)} (${deal.savings_percentage.toFixed(1)}%)
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        `;
    }

    displayBestDeals(result) {
        const { deals } = result;

        this.dealsContainer.innerHTML = `
            <h3>🔥 Best Deals Available</h3>
            ${deals.map(deal => `
                <div class="deal-item">
                    <div class="deal-store">${deal.store}</div>
                    <div>${deal.product_name}</div>
                    <div class="deal-price">£${deal.price.toFixed(2)}</div>
                </div>
            `).join('')}
        `;
    }

    updateUI(state) {
        this.micButton.className = 'mic-button';

        switch (state) {
            case 'recording':
                this.micButton.classList.add('recording');
                break;
            case 'processing':
                this.micButton.classList.add('processing');
                this.isProcessing = true;
                break;
            case 'idle':
            default:
                this.isProcessing = false;
                break;
        }
    }

    stopProcessing() {
        this.isProcessing = false;
        this.updateUI('idle');
    }

    updateStatus(message) {
        this.statusDiv.textContent = message;
    }

    showError(message) {
        this.errorContainer.innerHTML = `<div class="error">❌ ${message}</div>`;
    }

    clearError() {
        this.errorContainer.innerHTML = '';
    }

    showAudioVisualizer() {
        this.audioVisualizer.style.display = 'flex';
    }

    hideAudioVisualizer() {
        this.audioVisualizer.style.display = 'none';
    }

    updateAudioVisualizer(audioData) {
        // Calculate audio level for visualization
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += Math.abs(audioData[i]);
        }
        const average = sum / audioData.length;
        const level = Math.min(1, average * 10); // Amplify for visibility

        // Update visualizer bars
        const bars = this.audioVisualizer.querySelectorAll('.bar');
        bars.forEach((bar, index) => {
            const height = Math.random() * level * 50 + 5; // Add some randomness
            bar.style.height = `${height}px`;
        });
    }

    sendWebSocketMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }
}


/**
 * SilenceDetector - Handles auto-timeout after periods of silence
 */
class SilenceDetector {
    constructor(timeoutMs = 10000) {
        this.timeoutMs = timeoutMs;
        this.silenceTimer = null;
        this.silenceThreshold = 0.01; // Audio level threshold for silence
        this.onTimeoutCallback = null;
    }

    detectSilence(audioLevel, onTimeout) {
        this.onTimeoutCallback = onTimeout;

        if (audioLevel < this.silenceThreshold) {
            // Audio is below silence threshold
            if (!this.silenceTimer) {
                console.log('Silence detected, starting timeout timer...');
                this.silenceTimer = setTimeout(() => {
                    console.log(`${this.timeoutMs}ms silence timeout reached`);
                    if (this.onTimeoutCallback) {
                        this.onTimeoutCallback();
                    }
                    this.reset();
                }, this.timeoutMs);
            }
        } else {
            // Audio detected, reset timer
            this.reset();
        }
    }

    reset() {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
    }

    calculateAudioLevel(audioData) {
        let sum = 0;
        for (let i = 0; i < audioData.length; i++) {
            sum += Math.abs(audioData[i]);
        }
        return sum / audioData.length;
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Initializing DealLens AI Native Audio Client');
    new DealLensAudioClient();
});
