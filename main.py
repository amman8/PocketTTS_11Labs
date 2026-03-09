import os
import torch
import traceback
import tempfile
import scipy.io.wavfile
import numpy as np
import json
import time
from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pocket_tts import TTSModel
from huggingface_hub import login
from typing import Optional, List
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

app = FastAPI(title="Pocket TTS Premium")

# Get token from environment variable
DEFAULT_TOKEN = os.getenv("HF_TOKEN")

def authenticate_hf(token: str):
    if not token:
        print("No HF Token provided.")
        return False
    try:
        # print(f"Authenticating with HF Token: {token[:6]}...")
        login(token=token)
        return True
    except Exception as e:
        # print(f"HF Authentication failed: {e}")
        return False

# Initial login with default token if available
if DEFAULT_TOKEN:
    authenticate_hf(DEFAULT_TOKEN)

# Global model instance
tts_model = None

def load_model():
    global tts_model
    if tts_model is None:
        print("Loading model (CPU optimized)...")
        try:
            tts_model = TTSModel.load_model()
        except Exception as e:
            print(f"Error loading model: {e}")
            raise e
    return tts_model

# Directories
base_dir = os.path.dirname(__file__)
static_dir = os.path.join(base_dir, "static")
generations_dir = os.path.join(base_dir, "generations")
history_file = os.path.join(base_dir, "history.json")

for d in [static_dir, generations_dir]:
    if not os.path.exists(d):
        os.makedirs(d)

def get_history():
    if not os.path.exists(history_file):
        return []
    try:
        with open(history_file, "r") as f:
            return json.load(f)
    except:
        return []

def save_history(entry):
    history = get_history()
    history.insert(0, entry)
    history = history[:50]
    with open(history_file, "w") as f:
        json.dump(history, f, indent=2)

@app.post("/generate")
async def generate_speech(
    text: str = Form(...),
    voice: str = Form(...),
    hf_token: Optional[str] = Form(None),
    speed: float = Form(1.0),
    stability: float = Form(0.5),
    voice_file: Optional[UploadFile] = File(None)
):
    try:
        # Use provided token or fallback to environment variable
        actual_token = (hf_token.strip() if hf_token and hf_token.strip() else DEFAULT_TOKEN)
        if actual_token:
             if not authenticate_hf(actual_token):
                if hf_token: # Only raise if the user explicitly provided an invalid one
                    raise HTTPException(status_code=401, detail="Invalid Hugging Face token.")
        
        model = load_model()
        
        voice_input = voice
        temp_voice_path = None
        voice_label = voice
        
        if voice_file:
            temp_voice = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
            content = await voice_file.read()
            with open(temp_voice.name, "wb") as f:
                f.write(content)
            voice_input = temp_voice.name
            temp_voice_path = temp_voice.name
            voice_label = f"Cloned ({voice_file.filename})"
        
        # Audio generation
        try:
            voice_state = model.get_state_for_audio_prompt(voice_input)
            audio_tensor = model.generate_audio(voice_state, text)
        finally:
            if temp_voice_path and os.path.exists(temp_voice_path):
                os.remove(temp_voice_path)
        
        # Save output
        gen_id = int(time.time() * 1000)
        filename = f"gen_{gen_id}.wav"
        file_path = os.path.join(generations_dir, filename)
        scipy.io.wavfile.write(file_path, model.sample_rate, audio_tensor.numpy())
        
        # History
        history_entry = {
            "id": gen_id,
            "text": text,
            "voice": voice_label,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "url": f"/api/audio/{filename}",
            "filename": filename
        }
        save_history(history_entry)
        
        return JSONResponse(content={
            "success": True,
            "url": f"/api/audio/{filename}",
            "download_url": f"/api/download/{filename}",
            "entry": history_entry
        })

    except HTTPException as he:
        raise he
    except Exception as e:
        print(traceback.format_exc())
        return JSONResponse(status_code=500, content={"detail": str(e)})

@app.get("/api/audio/{filename}")
async def get_audio(filename: str):
    file_path = os.path.join(generations_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404)
    return FileResponse(file_path, media_type="audio/wav")

@app.get("/api/download/{filename}")
async def download_audio(filename: str):
    file_path = os.path.join(generations_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404)
    return FileResponse(file_path, media_type="audio/wav", filename="pocket_tts_generation.wav")

@app.get("/voices")
async def get_voices():
    return ["alba", "marius", "javert", "jean", "fantine", "cosette", "eponine", "azelma"]

@app.get("/history")
async def get_generation_history():
    return get_history()

# Serve static frontend
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
