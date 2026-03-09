from pocket_tts import TTSModel
import scipy.io.wavfile
import torch
import os

def main():
    print("Loading model (CPU optimized)...")
    # pocket-tts is designed to run efficiently on CPU
    tts_model = TTSModel.load_model()
    
    print("Preparing voice...")
    # 'alba' is one of the built-in voices
    voice_state = tts_model.get_state_for_audio_prompt("alba")
    
    text = "My name is Amman?"
    print(f"Generating audio for: '{text}'")
    
    # Generate the audio tensor
    audio = tts_model.generate_audio(voice_state, text)
    
    output_file = "output.wav"
    # Save as 16-bit PCM WAV file
    scipy.io.wavfile.write(output_file, tts_model.sample_rate, audio.numpy())
    
    if os.path.exists(output_file):
        print(f"Success! Audio saved to {os.path.abspath(output_file)}")
    else:
        print("Error: Audio file was not generated.")

if __name__ == "__main__":
    main()
