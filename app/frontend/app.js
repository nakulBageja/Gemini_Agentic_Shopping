/**
 * DealLens AI - Native Audio Frontend
 * Handles Web Audio API, WebSocket communication, and UI interactions
 */

class DealLensAudioClient {
    constructor() {
        // WebSocket connection
        this.ws = null;
        this.isConnected = false;

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
        this.audioSampleRate = 24000; // Default Gemini rate
        this.playbackContext = null;

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
            if (!this.isRecording) {
                this.startRecording();
            } else {
                this.stopRecording();
            }
        });

        // Handle page visibility for proper cleanup
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRecording) {
                this.stopRecording();
            }
        });
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

    async startRecording() {
        if (!this.isConnected) {
            this.showError('Not connected to backend');
            return;
        }

        try {
            // Request microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });

            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000
            });

            // Create media stream source
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);

            // Create audio processor using ScriptProcessorNode (deprecated but widely supported)
            // For production, consider using AudioWorklet
            this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);

            this.audioProcessor.onaudioprocess = (event) => {
                if (this.isRecording) {
                    this.processAudioData(event.inputBuffer);
                }
            };

            // Connect audio nodes
            source.connect(this.audioProcessor);
            this.audioProcessor.connect(this.audioContext.destination);

            this.isRecording = true;
            this.updateUI('recording');
            this.updateStatus('🎤 Listening... (Click to stop)');
            this.showAudioVisualizer();

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

        console.log('Stopping recording...');

        // IMPORTANT: Set recording to false FIRST to stop processAudioData immediately
        this.isRecording = false;

        // Disconnect audio processor IMMEDIATELY to prevent more audio events
        if (this.audioProcessor) {
            this.audioProcessor.onaudioprocess = null; // Remove the handler first
            this.audioProcessor.disconnect();
            this.audioProcessor = null;
        }

        // Stop media stream tracks immediately
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        // Close audio context
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
            this.audioContext = null;
        }

        // Update UI after cleanup
        this.updateUI('processing');
        this.updateStatus('🤔 Processing... please wait');
        this.hideAudioVisualizer();

        // Send stop recording signal AFTER cleanup
        this.sendWebSocketMessage({
            type: 'stop_recording'
        });

        console.log('Recording stopped and cleanup complete');
    }

    processAudioData(inputBuffer) {
        // Get audio data from the input buffer
        const audioData = inputBuffer.getChannelData(0);

        // Convert Float32Array to Int16Array (PCM format)
        const pcmData = new Int16Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
            // Convert from [-1, 1] to [-32768, 32767]
            pcmData[i] = Math.max(-32768, Math.min(32767, audioData[i] * 32768));
        }

        // Convert to base64 for WebSocket transmission
        const base64Audio = this.arrayBufferToBase64(pcmData.buffer);

        // Send audio chunk to backend
        this.sendWebSocketMessage({
            type: 'audio_chunk',
            audio_data: base64Audio
        });

        // Update audio visualizer
        this.updateAudioVisualizer(audioData);
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
                // Parse sample rate from mime type
                let sampleRate = 24000; // default to what Gemini sends
                const rateMatch = mimeType.match(/rate=(\d+)/);
                if (rateMatch) {
                    sampleRate = parseInt(rateMatch[1]);
                }

                this.audioSampleRate = sampleRate;

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
            // Don't call stopProcessing here as it might interfere with state
            this.updateStatus('🔊 Playing response...');
            this.isPlaying = true;

            // Create audio context for playback
            if (!this.playbackContext || this.playbackContext.state === 'closed') {
                this.playbackContext = new (window.AudioContext || window.webkitAudioContext)({
                    sampleRate: this.audioSampleRate
                });
            }

            console.log(`Starting playback with ${this.audioChunks.length} chunks`);

            // Play all queued chunks sequentially
            while (this.audioChunks.length > 0) {
                const chunk = this.audioChunks.shift();
                await this.playAudioChunk(chunk);
            }

            // Playback complete - ENSURE state is properly reset
            this.isPlaying = false;
            this.isProcessing = false; // Explicitly clear processing state
            this.updateStatus('Click the microphone to continue');
            this.updateUI('idle'); // This should clear the processing state

            console.log('Audio playback completed, state reset to idle');

        } catch (error) {
            console.error('Audio playback error:', error);
            this.isPlaying = false;
            this.isProcessing = false; // Ensure processing is cleared on error too
            this.updateStatus(`Audio playback failed: ${error.message}`);
            this.updateUI('idle');
        }
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

                source.onended = () => {
                    resolve();
                };

                source.onerror = (error) => {
                    console.error('Audio source error:', error);
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

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Initializing DealLens AI Native Audio Client');
    new DealLensAudioClient();
});
