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
            # Save uploaded file with its original extension
            original_ext = os.path.splitext(voice_file.filename)[1] or ".wav"
            temp_original = tempfile.NamedTemporaryFile(delete=False, suffix=original_ext)
            temp_original_path = temp_original.name
            temp_original.close()
            
            content = await voice_file.read()
            with open(temp_original_path, "wb") as f:
                f.write(content)
            
            # Ensure file is valid PCM WAV (pocket_tts strictly requires this)
            import wave
            is_valid_wav = False
            try:
                with wave.open(temp_original_path, "rb") as wf:
                    is_valid_wav = True
            except Exception:
                pass
            
            if is_valid_wav:
                # Already a valid WAV — use directly
                temp_voice_path = temp_original_path
            else:
                # Not a WAV — convert using torch (already installed)
                try:
                    import torchaudio
                    waveform, sr = torchaudio.load(temp_original_path)
                except Exception:
                    # Fallback: try loading with scipy for odd WAV variants
                    try:
                        sr_read, data = scipy.io.wavfile.read(temp_original_path)
                        waveform = torch.from_numpy(data.astype(np.float32))
                        if waveform.dim() == 1:
                            waveform = waveform.unsqueeze(0)
                        else:
                            waveform = waveform.T
                        sr = sr_read
                    except Exception as e:
                        os.remove(temp_original_path)
                        raise HTTPException(
                            status_code=400,
                            detail="Unsupported audio format. Please upload a .wav file (standard PCM format)."
                        )
                
                # Convert to mono if stereo
                if waveform.shape[0] > 1:
                    waveform = waveform.mean(dim=0, keepdim=True)
                
                # Save as standard PCM 16-bit WAV
                temp_wav = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
                temp_voice_path = temp_wav.name
                temp_wav.close()
                
                audio_np = waveform.squeeze().numpy()
                # Normalize to int16 range
                if audio_np.max() <= 1.0 and audio_np.min() >= -1.0:
                    audio_np = (audio_np * 32767).astype(np.int16)
                else:
                    audio_np = audio_np.astype(np.int16)
                
                scipy.io.wavfile.write(temp_voice_path, sr, audio_np)
                
                # Clean up original
                if os.path.exists(temp_original_path):
                    os.remove(temp_original_path)
            
            voice_input = temp_voice_path
            voice_label = f"Cloned ({voice_file.filename})"
        
        # Audio generation
        try:
            voice_state = model.get_state_for_audio_prompt(voice_input)
            audio_tensor = model.generate_audio(voice_state, text)
        finally:
            # Cleanup temp file with retry (model may briefly hold it)
            if temp_voice_path and os.path.exists(temp_voice_path):
                for attempt in range(3):
                    try:
                        os.remove(temp_voice_path)
                        break
                    except PermissionError:
                        time.sleep(0.5)
        
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
    # Stream for playback, but suggest a name just in case
    return FileResponse(file_path, media_type="audio/wav", filename=filename)

@app.get("/api/download/{filename}")
async def download_audio(filename: str):
    file_path = os.path.join(generations_dir, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404)
    # Using application/octet-stream is safer for programmatic fetch/blob downloads
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return FileResponse(file_path, media_type="application/octet-stream", filename=filename, headers=headers)

@app.get("/voices")
async def get_voices():
    return ["alba", "marius", "javert", "jean", "fantine", "cosette", "eponine", "azelma"]

@app.get("/history")
async def get_generation_history():
    return get_history()

@app.delete("/api/history/{gen_id}")
async def delete_history_item(gen_id: int):
    history = get_history()
    item_to_delete = next((item for item in history if item["id"] == gen_id), None)
    
    if not item_to_delete:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Delete file
    file_path = os.path.join(generations_dir, item_to_delete["filename"])
    if os.path.exists(file_path):
        os.remove(file_path)
    
    # Update history JSON
    new_history = [item for item in history if item["id"] != gen_id]
    with open(history_file, "w") as f:
        json.dump(new_history, f, indent=2)
    
    return {"success": True}

@app.get("/api/history/export")
async def export_history():
    if not os.path.exists(history_file):
        return JSONResponse(content=[])
    return FileResponse(
        history_file,
        media_type="application/json",
        filename="pocket_tts_history.json",
        headers={"Content-Disposition": 'attachment; filename="pocket_tts_history.json"'}
    )

@app.delete("/api/history/clear")
async def clear_all_history():
    # Delete all files in generations dir
    for filename in os.listdir(generations_dir):
        file_path = os.path.join(generations_dir, filename)
        if os.path.isfile(file_path):
            os.remove(file_path)
    
    # Clear history JSON
    with open(history_file, "w") as f:
        json.dump([], f, indent=2)
    
    return {"success": True}

# Serve static frontend
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
