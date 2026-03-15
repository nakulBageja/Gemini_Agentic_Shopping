"""
DealLens AI - Native Audio Backend using Official Google GenAI Types
Uses the official google.genai types for proper Live API integration
"""

import asyncio
import json
import logging
import os
import time
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from google import genai
from google.genai import types
from dotenv import load_dotenv
from deal_tools import execute_function, FUNCTION_SCHEMAS
import inspect


# Cloud environment detection
def is_cloud_environment():
    return os.getenv("GOOGLE_CLOUD_PROJECT") is not None


# Secret Manager integration for cloud deployment
def get_secret_from_manager(secret_name):
    """Get secret from Google Secret Manager"""
    try:
        from google.cloud import secretmanager

        client = secretmanager.SecretManagerServiceClient()
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
        response = client.access_secret_version(request={"name": name})
        return response.payload.data.decode("UTF-8")
    except Exception as e:
        logger.error(f"Failed to get secret {secret_name} from Secret Manager: {e}")
        return None


# Configure logging first
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables - cloud vs local
if is_cloud_environment():
    logger.info("Running in cloud environment - using Secret Manager")
    # Running in cloud - don't load .env file
else:
    logger.info("Running in local environment - loading .env file")
    # Load environment variables from .env file for local development
    load_dotenv()

# Create conversation logger
conversation_logger = logging.getLogger("conversation")
conversation_handler = logging.FileHandler("conversation_log.txt")
conversation_formatter = logging.Formatter("%(asctime)s - %(message)s")
conversation_handler.setFormatter(conversation_formatter)
conversation_logger.addHandler(conversation_handler)
conversation_logger.setLevel(logging.INFO)


# Conversation tracking
class ConversationTracker:
    def __init__(self):
        self.user_input_start = None
        self.user_input_end = None
        self.model_response_start = None
        self.model_response_end = None
        self.conversation_id = 1
        self.user_transcription = ""
        self.model_transcription = ""

    def log_user_start(self):
        self.user_input_start = time.time()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        conversation_logger.info(
            f"[CONVERSATION {self.conversation_id}] USER INPUT START - {timestamp}"
        )

    def log_user_end(self):
        self.user_input_end = time.time()
        duration = (
            self.user_input_end - self.user_input_start if self.user_input_start else 0
        )
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        conversation_logger.info(
            f"[CONVERSATION {self.conversation_id}] USER INPUT END - {timestamp} - Duration: {duration:.2f}s"
        )

    def log_user_transcription(self, text):
        self.user_transcription = text
        conversation_logger.info(
            f'[CONVERSATION {self.conversation_id}] USER MESSAGE: "{text}"'
        )

    def log_model_start(self):
        self.model_response_start = time.time()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        conversation_logger.info(
            f"[CONVERSATION {self.conversation_id}] MODEL RESPONSE START - {timestamp}"
        )

    def log_model_end(self):
        self.model_response_end = time.time()
        response_duration = (
            self.model_response_end - self.model_response_start
            if self.model_response_start
            else 0
        )
        total_duration = (
            self.model_response_end - self.user_input_start
            if self.user_input_start
            else 0
        )
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]

        conversation_logger.info(
            f"[CONVERSATION {self.conversation_id}] MODEL RESPONSE END - {timestamp}"
        )
        conversation_logger.info(
            f"[CONVERSATION {self.conversation_id}] RESPONSE DURATION: {response_duration:.2f}s"
        )
        conversation_logger.info(
            f"[CONVERSATION {self.conversation_id}] TOTAL CONVERSATION DURATION: {total_duration:.2f}s"
        )
        conversation_logger.info(
            f'[CONVERSATION {self.conversation_id}] USER: "{self.user_transcription}"'
        )
        conversation_logger.info(
            f'[CONVERSATION {self.conversation_id}] MODEL: "{self.model_transcription}"'
        )
        conversation_logger.info(
            f"[CONVERSATION {self.conversation_id}] ========================================"
        )

        # Reset for next conversation
        self.conversation_id += 1
        self.user_transcription = ""
        self.model_transcription = ""

    def log_model_transcription(self, text):
        self.model_transcription += text + " "

    def log_function_call(self, function_name, args, result):
        conversation_logger.info(
            f"[CONVERSATION {self.conversation_id}] FUNCTION CALL: {function_name}({args}) -> {result}"
        )


# Global conversation tracker
conv_tracker = ConversationTracker()

# FastAPI app
app = FastAPI(title="DealLens AI - Native Audio Backend")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend files only if directory exists (for local development)
if os.path.exists("../frontend"):
    app.mount("/static", StaticFiles(directory="../frontend"), name="static")
    logger.info("Static file serving enabled for local development")
else:
    logger.info(
        "Static file serving disabled - frontend directory not found (cloud deployment)"
    )

# Gemini API key - cloud vs local
if is_cloud_environment():
    logger.info("Loading Gemini API key from Secret Manager")
    GEMINI_API_KEY = get_secret_from_manager("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        logger.error("Failed to load GEMINI_API_KEY from Secret Manager")
else:
    logger.info("Loading Gemini API key from environment variable")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY environment variable not set")

# Create Gemini client
client = genai.Client(api_key=GEMINI_API_KEY)

# Tool mapping for function calls
tool_mapping = {
    "search_deals": execute_function,
}

# Convert FUNCTION_SCHEMAS to proper genai types
genai_tools = []
for schema in FUNCTION_SCHEMAS:
    genai_tools.append(
        types.Tool(
            function_declarations=[
                types.FunctionDeclaration(
                    name=schema["name"],
                    description=schema["description"],
                    parameters=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            prop_name: types.Schema(
                                type=getattr(types.Type, prop_info["type"].upper()),
                                description=prop_info.get("description", ""),
                            )
                            for prop_name, prop_info in schema["parameters"][
                                "properties"
                            ].items()
                        },
                        required=schema["parameters"].get("required", []),
                    ),
                )
            ]
        )
    )


@app.get("/")
async def root():
    """Health check"""
    return {
        "status": "healthy",
        "service": "DealLens AI Native Audio Backend with Official GenAI Types",
        "gemini_configured": bool(GEMINI_API_KEY),
    }


@app.websocket("/ws/audio")
async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint for native audio processing using official GenAI Live API"""
    await websocket.accept()
    logger.info("Frontend connected")

    # Audio input queue for Gemini Live
    audio_input_queue = asyncio.Queue()
    video_input_queue = asyncio.Queue()
    text_input_queue = asyncio.Queue()

    try:
        # Real-time audio streaming callback
        async def audio_output_callback(audio_data):
            logger.info(f"🔊 Sending audio chunk: {len(audio_data)} bytes")

            # Encode bytes to base64 for frontend
            import base64

            audio_b64 = base64.b64encode(audio_data).decode("utf-8")

            # Send chunk immediately for real-time streaming
            await websocket.send_text(
                json.dumps(
                    {
                        "type": "audio_response",
                        "audio_data": audio_b64,
                        "mime_type": "audio/pcm;rate=24000",
                    }
                )
            )

        # Start Gemini Live session
        gemini_live = GeminiLive(
            project_id=None,  # Using API key instead
            location=None,
            model="models/gemini-2.5-flash-native-audio-preview-09-2025",
            input_sample_rate=16000,
            tools=genai_tools,
            tool_mapping={
                "search_deals": lambda **kwargs: execute_function(
                    "search_deals", kwargs
                ),
                "get_best_deals": lambda **kwargs: execute_function(
                    "get_best_deals", kwargs
                ),
                "get_product_list": lambda **kwargs: execute_function(
                    "get_product_list", kwargs
                ),
            },
        )

        # Handle bidirectional communication
        await asyncio.gather(
            handle_frontend_messages(
                websocket, audio_input_queue, video_input_queue, text_input_queue
            ),
            handle_gemini_session(
                gemini_live,
                audio_input_queue,
                video_input_queue,
                text_input_queue,
                audio_output_callback,
                websocket,
            ),
        )

    except WebSocketDisconnect:
        logger.info("Frontend disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))


async def handle_interruption(websocket: WebSocket, audio_input_queue):
    """Handle AI interruption request from user"""
    try:
        # Clear any pending audio data in queue
        while not audio_input_queue.empty():
            try:
                audio_input_queue.get_nowait()
            except:
                break

        # Send confirmation to frontend that interruption was processed
        await websocket.send_text(
            json.dumps(
                {
                    "type": "interruption_processed",
                    "message": "AI response interrupted, ready for new input",
                }
            )
        )

        logger.info("🔴 AI interruption processed - queues cleared")

    except Exception as e:
        logger.error(f"Error handling interruption: {e}")


async def handle_frontend_messages(
    websocket: WebSocket, audio_input_queue, video_input_queue, text_input_queue
):
    """Handle messages from frontend"""
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            logger.info(f"Frontend message type: {message.get('type')}")

            if message.get("type") == "audio_chunk":
                # Decode base64 audio data
                import base64

                audio_data = base64.b64decode(message.get("audio_data"))
                await audio_input_queue.put(audio_data)

            elif message.get("type") == "start_recording":
                logger.info("Recording started")
                conv_tracker.log_user_start()
                # Clear any previous audio data in queue to start fresh
                while not audio_input_queue.empty():
                    try:
                        audio_input_queue.get_nowait()
                    except:
                        break

            elif message.get("type") == "stop_recording":
                logger.info("Recording stopped")
                conv_tracker.log_user_end()

            elif message.get("type") == "interrupt_ai":
                logger.info("🔴 AI interruption requested by user")
                # Handle interruption - stop current response and clear queues
                await handle_interruption(websocket, audio_input_queue)

            elif message.get("type") == "end_of_speech":
                logger.info("🗣️ End of speech signal received - user finished speaking")
                # In real-time architecture, this signals the AI can now respond
                # The audio chunks have already been sent to Gemini Live API
                # This is just a notification that user input is complete

    except WebSocketDisconnect:
        logger.info("Frontend disconnected in handler")
    except Exception as e:
        logger.error(f"Frontend message handler error: {e}")


async def handle_gemini_session(
    gemini_live,
    audio_input_queue,
    video_input_queue,
    text_input_queue,
    audio_output_callback,
    websocket,
):
    """Handle Gemini Live session"""
    try:
        async for event in gemini_live.start_session(
            audio_input_queue=audio_input_queue,
            video_input_queue=video_input_queue,
            text_input_queue=text_input_queue,
            audio_output_callback=audio_output_callback,
        ):
            if event.get("type") == "tool_call":
                # Log function call
                conv_tracker.log_function_call(
                    event["name"], event["args"], event["result"]
                )
                # Send function result to frontend for display
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "function_result",
                            "function_name": event["name"],
                            "result": event["result"],
                        }
                    )
                )
            elif event.get("type") == "model_started":
                # Model started responding
                conv_tracker.log_model_start()
            elif event.get("type") == "turn_complete":
                # Turn complete - log end of model response
                conv_tracker.log_model_end()
                logger.info("Turn complete")
            elif event.get("type") == "user_transcription":
                # Log user transcription when available
                conv_tracker.log_user_transcription(event["text"])
            elif event.get("type") == "model_transcription":
                # Log model transcription when available
                conv_tracker.log_model_transcription(event["text"])
            elif event.get("type") == "error":
                logger.error(f"Gemini session error: {event['error']}")
                await websocket.send_text(
                    json.dumps(
                        {"type": "error", "message": f"Gemini error: {event['error']}"}
                    )
                )
                break

    except Exception as e:
        logger.error(f"Gemini session handler error: {e}")


class GeminiLive:
    """Official GeminiLive implementation using google.genai types"""

    def __init__(
        self,
        project_id,
        location,
        model,
        input_sample_rate,
        tools=None,
        tool_mapping=None,
    ):
        self.project_id = project_id
        self.location = location
        self.model = model
        self.input_sample_rate = input_sample_rate
        self.client = client  # Use the global client
        self.tools = tools or []
        self.tool_mapping = tool_mapping or {}

    async def start_session(
        self,
        audio_input_queue,
        video_input_queue,
        text_input_queue,
        audio_output_callback,
        audio_interrupt_callback=None,
    ):
        config = types.LiveConnectConfig(
            response_modalities=[types.Modality.AUDIO],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Puck")
                )
            ),
            system_instruction=types.Content(
                parts=[
                    types.Part(
                        text="""You are DealLens AI, a helpful shopping assistant that helps users find better deals on products. 

You have access to tools that can search for product deals across different stores. When users mention a product and price, use the search_deals function to find better options.

Key behaviors:
- Be conversational and friendly
- When users mention a product, immediately search for deals
- Highlight savings and better prices enthusiastically
- If no better deals found, be encouraging
- Keep responses concise but informative
- Focus on helping users save money

Available products: PlayStation 5, AirPods Pro, MacBook Air M2, iPhone 15 Pro"""
                    )
                ]
            ),
            tools=self.tools,
        )

        async with self.client.aio.live.connect(
            model=self.model, config=config
        ) as session:

            async def send_audio():
                try:
                    while True:
                        chunk = await audio_input_queue.get()
                        await session.send_realtime_input(
                            audio=types.Blob(
                                data=chunk,
                                mime_type=f"audio/pcm;rate={self.input_sample_rate}",
                            )
                        )
                except asyncio.CancelledError:
                    pass

            async def send_video():
                try:
                    while True:
                        chunk = await video_input_queue.get()
                        await session.send_realtime_input(
                            video=types.Blob(data=chunk, mime_type="image/jpeg")
                        )
                except asyncio.CancelledError:
                    pass

            async def send_text():
                try:
                    while True:
                        text = await text_input_queue.get()
                        await session.send(input=text, end_of_turn=True)
                except asyncio.CancelledError:
                    pass

            event_queue = asyncio.Queue()

            model_response_started = False

            async def receive_loop():
                nonlocal model_response_started
                try:
                    while True:
                        async for response in session.receive():
                            server_content = response.server_content
                            tool_call = response.tool_call

                            if server_content:
                                # Check for user transcription
                                if (
                                    server_content.input_transcription
                                    and server_content.input_transcription.text
                                ):
                                    await event_queue.put(
                                        {
                                            "type": "user_transcription",
                                            "text": server_content.input_transcription.text,
                                        }
                                    )

                                # Check for model output transcription
                                if (
                                    server_content.output_transcription
                                    and server_content.output_transcription.text
                                ):
                                    await event_queue.put(
                                        {
                                            "type": "model_transcription",
                                            "text": server_content.output_transcription.text,
                                        }
                                    )

                                if (
                                    server_content.model_turn
                                    and server_content.model_turn.parts
                                ):
                                    for part in server_content.model_turn.parts:
                                        if part.inline_data:
                                            # Detect first model response
                                            if not model_response_started:
                                                model_response_started = True
                                                await event_queue.put(
                                                    {"type": "model_started"}
                                                )

                                            if inspect.iscoroutinefunction(
                                                audio_output_callback
                                            ):
                                                await audio_output_callback(
                                                    part.inline_data.data
                                                )
                                            else:
                                                audio_output_callback(
                                                    part.inline_data.data
                                                )

                                if server_content.turn_complete:
                                    model_response_started = (
                                        False  # Reset for next turn
                                    )
                                    await event_queue.put({"type": "turn_complete"})

                                if server_content.interrupted:
                                    if audio_interrupt_callback:
                                        if inspect.iscoroutinefunction(
                                            audio_interrupt_callback
                                        ):
                                            await audio_interrupt_callback()
                                        else:
                                            audio_interrupt_callback()
                                    await event_queue.put({"type": "interrupted"})

                            if tool_call and tool_call.function_calls:
                                function_responses = []
                                for fc in tool_call.function_calls:
                                    func_name = fc.name
                                    args = fc.args or {}

                                    if func_name in self.tool_mapping:
                                        try:
                                            tool_func = self.tool_mapping[func_name]
                                            if inspect.iscoroutinefunction(tool_func):
                                                result = await tool_func(**args)
                                            else:
                                                loop = asyncio.get_running_loop()
                                                result = await loop.run_in_executor(
                                                    None, lambda: tool_func(**args)
                                                )
                                        except Exception as e:
                                            result = f"Error: {e}"

                                        function_responses.append(
                                            types.FunctionResponse(
                                                name=func_name,
                                                id=fc.id,
                                                response={"result": result},
                                            )
                                        )
                                        await event_queue.put(
                                            {
                                                "type": "tool_call",
                                                "name": func_name,
                                                "args": args,
                                                "result": result,
                                            }
                                        )

                                # Use the official send_tool_response method
                                if function_responses:
                                    await session.send_tool_response(
                                        function_responses=function_responses
                                    )

                except Exception as e:
                    await event_queue.put({"type": "error", "error": str(e)})
                finally:
                    await event_queue.put(None)

            send_audio_task = asyncio.create_task(send_audio())
            send_video_task = asyncio.create_task(send_video())
            send_text_task = asyncio.create_task(send_text())
            receive_task = asyncio.create_task(receive_loop())

            try:
                while True:
                    event = await event_queue.get()
                    if event is None:
                        break
                    if isinstance(event, dict) and event.get("type") == "error":
                        yield event
                        break
                    yield event
            finally:
                send_audio_task.cancel()
                send_video_task.cancel()
                send_text_task.cancel()
                receive_task.cancel()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
