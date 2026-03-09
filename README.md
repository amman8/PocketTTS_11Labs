# Pocket TTS Premium 🗣️

A high-performance, CPU-optimized Text-to-Speech (TTS) web application inspired by ElevenLabs. Built using the `pocket-tts` engine, FastAPI, and vanilla web technologies.

![UI Preview](file:///C:/Users/nabee/.gemini/antigravity/brain/e2add7eb-9481-4c7e-b224-656a209586c1/main_ui_check_1773069093019.png)

## Features

- **Premium UI**: Dark-themed, responsive interface modeled after ElevenLabs.
- **Voice Cloning**: Zero-shot voice cloning from short audio samples (5-10s).
- **Generation History**: Automatically tracks and saves past generations for replay and download.
- **Reliable Downloads**: Secure, named WAV downloads directly from the browser.
- **CPU Optimized**: Runs efficiently on standard hardware without requiring a GPU.
- **Dual Interface**: Includes both a premium FastAPI web app and a Gradio-based alternative.

## Prerequisites

- **Python 3.9+**
- **Hugging Face Token**: Required for accessing gated models and cloning. Obtain one at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).

## Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd pocket-tts-setup
   ```

2. **Create and activate a virtual environment**:
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```powershell
   pip install -r requirements.txt
   # Or manually:
   pip install gradio pocket-tts scipy torch huggingface-hub fastapi uvicorn python-multipart python-dotenv
   ```

4. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   HF_TOKEN=your_hugging_face_token_here
   ```

## Running the Application

### Option 1: Premium Web Interface (Recommended)
This launches the custom FastAPI server with the full ElevenLabs-style UI and History feature.
```powershell
python main.py
```
Visit: **`http://localhost:8000`**

### Option 2: Gradio UI (Alternative)
A simpler interface focused on functional verification.
```powershell
python app.py
```
Visit: **`http://localhost:7860`**

## Project Structure

- `main.py`: FastAPI backend and API logic.
- `static/`: Frontend assets (HTML, CSS, JS).
- `generations/`: Permanent storage for generated audio files.
- `history.json`: Metadata for generation history.
- `app.py`: Gradio-based interface.
- `.env`: (Local only) Secrets and tokens.

## License
MIT
