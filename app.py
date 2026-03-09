import gradio as gr
from pocket_tts import TTSModel
import scipy.io.wavfile
import torch
from huggingface_hub import login
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Programmatic login using the provided token to enable voice cloning
TOKEN = os.getenv("HF_TOKEN")

if TOKEN:
    login(token=TOKEN)

model = None

def get_model():
    global model
    if model is None:
        model = TTSModel.load_model()
    return model

def tts_fn(text, voice_name_or_path):
    model = get_model()
    # If the user provides a path to a custom wav file, it will used as the prompt
    # Otherwise, it uses one of the internal voices (e.g., 'alba')
    voice_state = model.get_state_for_audio_prompt(voice_name_or_path)
    audio_tensor = model.generate_audio(voice_state, text)
    
    output_path = "output.wav"
    scipy.io.wavfile.write(output_path, model.sample_rate, audio_tensor.numpy())
    return output_path

# UI Logic
with gr.Blocks(title="Pocket TTS - Premium Clone") as demo:
    gr.Markdown("# 🗣️ Pocket TTS: Voice Cloning & Speech Synthesis")
    gr.Markdown("CPU-optimized, high-quality TTS inspired by ElevenLabs.")
    
    with gr.Row():
        with gr.Column():
            text_input = gr.Textbox(
                label="Text to Synthesize",
                placeholder="Enter text here...",
                lines=5,
                value="The quick brown fox jumps over the lazy dog."
            )
            voice_input = gr.Dropdown(
                choices=["alba", "marius", "javert", "jean", "fantine", "cosette", "eponine", "azelma"],
                value="alba",
                label="Select Preset Voice"
            )
            gr.Markdown("---")
            gr.Markdown("### 🎤 Voice Cloning (Optional)")
            cloning_audio = gr.Audio(label="Upload Audio for Cloning", type="filepath")
            
            generate_btn = gr.Button("Generate Speech", variant="primary")
            
        with gr.Column():
            audio_output = gr.Audio(label="Generated Speech")

    def run_tts(text, preset_voice, cloning_file):
        # Priority: Cloning file > Preset Voice
        voice = cloning_file if cloning_file is not None else preset_voice
        return tts_fn(text, voice)

    generate_btn.click(
        run_tts, 
        inputs=[text_input, voice_input, cloning_audio], 
        outputs=audio_output
    )

if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)
