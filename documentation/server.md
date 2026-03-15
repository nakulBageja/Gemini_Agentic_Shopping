# DealLens AI Backend Server Documentation

## Overview

The DealLens AI backend is a **FastAPI-based WebSocket server** that provides real-time voice conversation capabilities powered by **Gemini 2.0 Flash Live API**. It features native audio streaming, intelligent deal search tools, and production-ready cloud deployment on Google Cloud Run.

## Architecture

### Core Technologies
- **FastAPI**: High-performance async web framework
- **Gemini Live API**: Real-time voice conversation with function calling
- **WebSocket**: Bidirectional real-time communication with frontend
- **Python 3.11**: Modern async/await patterns
- **Google Cloud Run**: Serverless container deployment
- **Secret Manager**: Secure API key storage

### System Components

```
Frontend (WebSocket) ↔ Backend (FastAPI) ↔ Gemini Live API
                              ↓
                        Deal Search Tools
                              ↓
                         Deals Database
```

## File Structure

```
app/backend/
├── main.py              # FastAPI application with WebSocket endpoints
├── deal_tools.py        # Function calling tools for Gemini
├── deals.json          # Sample product deals database
├── requirements.txt     # Python dependencies
├── Dockerfile          # Container configuration
├── cloudbuild.yaml     # Google Cloud Build configuration
└── .env               # Environment variables (local only)
```

## Core Features

### 1. Real-time Audio Streaming
- **Native Audio Processing**: Handles PCM audio at 24kHz sample rate
- **Seamless Streaming**: Chunk-based audio delivery with no gaps
- **Interruption Support**: Users can interrupt AI responses mid-speech
- **Conversation Logging**: Detailed timing and transcription logs

### 2. Gemini Live API Integration
```python
# Official Gemini Live API with native audio support
config = types.LiveConnectConfig(
    response_modalities=[types.Modality.AUDIO],
    speech_config=types.SpeechConfig(
        voice_config=types.VoiceConfig(
            prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Puck")
        )
    ),
    system_instruction=types.Content(parts=[
        types.Part(text="You are DealLens AI, a helpful shopping assistant...")
    ]),
    tools=genai_tools,
)
```

### 3. Deal Search Functions
The backend provides three main function tools for Gemini:

#### `search_deals(product_name, current_price?, store_name?)`
```python
# Example: User says "I found AirPods for £249, can you find cheaper?"
{
    "success": True,
    "product_name": "AirPods Pro",
    "current_price": 249.0,
    "deals": [
        {"store": "Amazon UK", "price": 229.99, "savings": 19.01},
        {"store": "John Lewis", "price": 239.99, "savings": 9.01}
    ]
}
```

#### `get_best_deals(limit=5)`
Returns top deals across all products

#### `get_product_list()`
Lists all available products for searching

## Local Development

### Prerequisites
- Python 3.11+
- pip package manager
- Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Setup Steps

1. **Clone and Navigate**
```bash
cd app/backend
```

2. **Install Dependencies**
```bash
pip install -r requirements.txt
```

3. **Configure Environment**
Create `.env` file:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

4. **Run Server**
```bash
python main.py
```

5. **Test Connection**
- Server runs on `http://localhost:8000`
- WebSocket endpoint: `ws://localhost:8000/ws/audio`
- Health check: `http://localhost:8000/`

### Development Features
- **Hot Reload**: Server restarts automatically on code changes
- **Detailed Logging**: Conversation timing and transcription logs
- **Error Handling**: Graceful failure with user-friendly messages
- **CORS Enabled**: Allows frontend connections from any origin

## Cloud Deployment (Google Cloud Run)

### Deployment Architecture
```
Internet → Cloud Load Balancer → Cloud Run Container → Gemini Live API
                                        ↓
                                Secret Manager (API Keys)
```

### Prerequisites
1. **Google Cloud Project** with billing enabled
2. **gcloud CLI** installed and authenticated
3. **Gemini API Key** (same as local development)

### Quick Deploy Steps

1. **Enable Required APIs**
```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  secretmanager.googleapis.com iam.googleapis.com containerregistry.googleapis.com
```

2. **Create Service Account**
```bash
gcloud iam service-accounts create deallens-backend \
    --description="DealLens AI Backend Service Account" \
    --display-name="DealLens Backend SA"

# Grant Secret Manager access
PROJECT_ID=$(gcloud config get-value project)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:deallens-backend@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

3. **Store API Key in Secret Manager**
```bash
echo -n "YOUR_GEMINI_API_KEY" | \
  gcloud secrets create GOOGLE_API_KEY --replication-policy="automatic" --data-file=-
```

4. **Deploy with Cloud Build**
```bash
cd app/backend
gcloud builds submit --config cloudbuild.yaml
```

5. **Get Deployment URL**
```bash
gcloud run services describe deallens-backend --region us-central1 \
  --format 'value(status.url)'
```

### Current Production Deployment
- **URL**: `https://deallens-backend-553067044467.us-central1.run.app`
- **Region**: `us-central1`
- **Scaling**: 0-100 instances (auto-scaling)
- **Memory**: 1 GiB per instance
- **CPU**: 1 vCPU per instance

### Container Configuration
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## API Reference

### WebSocket Endpoint
**URL**: `/ws/audio`

### Message Types

#### From Frontend → Backend

**Start Recording**
```json
{"type": "start_recording"}
```

**Audio Chunk**
```json
{
    "type": "audio_chunk",
    "audio_data": "base64_encoded_pcm_audio"
}
```

**Stop Recording**
```json
{"type": "stop_recording"}
```

**End of Speech**
```json
{"type": "end_of_speech"}
```

**Interrupt AI**
```json
{"type": "interrupt_ai"}
```

#### From Backend → Frontend

**Audio Response**
```json
{
    "type": "audio_response",
    "audio_data": "base64_encoded_pcm_audio",
    "mime_type": "audio/pcm;rate=24000"
}
```

**Function Result**
```json
{
    "type": "function_result",
    "function_name": "search_deals",
    "result": {
        "success": true,
        "product_name": "PlayStation 5",
        "deals": [...]
    }
}
```

**Error**
```json
{
    "type": "error",
    "message": "Error description"
}
```

### HTTP Endpoints

**Health Check**
```
GET / 
Response: {"status": "healthy", "service": "DealLens AI", "gemini_configured": true}
```

## Configuration

### Environment Variables

**Local Development (.env)**
```env
GEMINI_API_KEY=your_api_key_here
```

**Cloud Run (Automatic)**
```env
GOOGLE_CLOUD_PROJECT=your-project-id
PORT=8000
```

### Audio Settings
- **Sample Rate**: 24,000 Hz (unified across recording/playback)
- **Format**: PCM 16-bit signed integers
- **Channels**: Mono (1 channel)
- **Chunk Size**: Variable (typically 960-1920 samples)

## Monitoring & Logging

### Production Monitoring
- **Cloud Run Metrics**: CPU, Memory, Request latency, Error rates
- **Cloud Logging**: All application logs with structured JSON
- **Secret Manager Audit**: API key access tracking

### Log Examples
```
INFO:conversation:[CONVERSATION 1] USER: "Find PlayStation deals"
INFO:conversation:[CONVERSATION 1] FUNCTION CALL: search_deals({'product_name': 'PlayStation 5'})
INFO:conversation:[CONVERSATION 1] MODEL: "I found PlayStation 5 deals..."
INFO:conversation:[CONVERSATION 1] RESPONSE DURATION: 12.51s
```

## Troubleshooting

### Common Issues

**Secret Manager Access Denied**
```bash
# Verify service account has correct permissions
gcloud secrets add-iam-policy-binding GOOGLE_API_KEY \
    --member="serviceAccount:deallens-backend@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

**WebSocket Connection Failed**
- Check Cloud Run service is deployed and healthy
- Verify CORS configuration allows your frontend domain
- Test with WebSocket client tools

**Audio Streaming Issues**
- Verify audio chunks are properly base64 encoded
- Check sample rate consistency (24kHz)
- Monitor Cloud Run logs for audio processing errors

**Function Calling Errors**
- Validate JSON schema in deal_tools.py matches Gemini expectations
- Check deals.json file is properly formatted
- Review function execution logs

### Performance Optimization

**For High Traffic**
- Increase Cloud Run max instances
- Enable CPU boost for faster cold starts
- Consider connection pooling for Gemini API

**For Cost Optimization**
- Set minimum instances to 0 (default)
- Use smaller machine types if sufficient
- Monitor Secret Manager API calls

## Security

### Production Security Features
- **API Key Protection**: Stored in Secret Manager, never in code
- **Service Account**: Principle of least privilege access
- **HTTPS Only**: All traffic encrypted in transit
- **No Data Persistence**: No user conversations stored permanently
- **Input Validation**: All user inputs validated before processing

### Security Best Practices
- Rotate API keys regularly
- Monitor Secret Manager access logs
- Keep dependencies updated (`pip audit`)
- Use Cloud Run IAM for access control

## Contributing

### Development Workflow
1. Fork repository
2. Create feature branch
3. Test locally with `python main.py`
4. Test cloud deployment
5. Submit pull request

### Code Style
- Follow PEP 8 Python style guide
- Use type hints for all functions
- Add docstrings for new functions
- Include error handling for external API calls

---

**Live Production Backend**: https://deallens-backend-553067044467.us-central1.run.app

This backend powers the DealLens AI shopping assistant with enterprise-grade reliability and performance. 🚀
