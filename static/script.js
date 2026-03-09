document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text-input');
    const charCount = document.getElementById('current-char');
    const voiceSelect = document.getElementById('voice-select');
    const voiceDisplay = document.getElementById('voice-display');
    const selectedVoiceName = document.getElementById('selected-voice-name');
    const generateBtn = document.getElementById('generate-btn');
    const audioOutput = document.getElementById('audio-output');
    const audioPlayer = document.getElementById('audio-player');
    const downloadLink = document.getElementById('download-link');

    const stabilitySlider = document.getElementById('stability-slider');
    const stabilityVal = document.getElementById('stability-val');
    const speedSlider = document.getElementById('speed-slider');
    const speedVal = document.getElementById('speed-val');
    const hfTokenInput = document.getElementById('hf-token-input');
    const hfStatus = document.getElementById('hf-status');

    const settingsTabBtn = document.getElementById('settings-tab-btn');
    const historyTabBtn = document.getElementById('history-tab-btn');
    const settingsContent = document.getElementById('settings-content');
    const historyContent = document.getElementById('history-content');
    const historyList = document.getElementById('history-list');

    const voiceModal = document.getElementById('voice-modal');
    const addSpeakerTrigger = document.getElementById('add-speaker-trigger');
    const closeModal = document.getElementById('close-modal');
    const voiceFileInput = document.getElementById('voice-file-input');
    const saveCloneBtn = document.getElementById('save-clone-btn');
    const clonedFileName = document.getElementById('cloned-file-name');

    let currentVoiceFile = null;

    // Load default text
    textInput.value = "This plan outlines the creation of a premium web interface for the Pocket TTS engine, mimicking the aesthetic and functionality of ElevenLabs.";
    updateCharCount();

    function updateCharCount() {
        const len = textInput.value.length;
        charCount.textContent = len.toLocaleString();
    }

    textInput.addEventListener('input', updateCharCount);

    // Sidebar/Tab Logic
    settingsTabBtn.addEventListener('click', () => {
        settingsTabBtn.classList.add('active');
        historyTabBtn.classList.remove('active');
        settingsContent.style.display = 'flex';
        historyContent.style.display = 'none';
    });

    historyTabBtn.addEventListener('click', () => {
        historyTabBtn.classList.add('active');
        settingsTabBtn.classList.remove('active');
        historyContent.style.display = 'block';
        settingsContent.style.display = 'none';
        fetchHistory();
    });

    // Voice Fetch
    async function fetchVoices() {
        try {
            const response = await fetch('/voices');
            const voices = await response.json();
            voiceSelect.innerHTML = '';
            voices.forEach(voice => {
                const option = document.createElement('option');
                option.value = voice;
                option.textContent = voice.charAt(0).toUpperCase() + voice.slice(1);
                voiceSelect.appendChild(option);
            });
            syncSelectedVoice();
        } catch (error) {
            console.error('Error fetching voices:', error);
        }
    }

    function syncSelectedVoice() {
        if (currentVoiceFile) {
            selectedVoiceName.textContent = `Cloned: ${currentVoiceFile.name}`;
        } else {
            const val = voiceSelect.value;
            selectedVoiceName.textContent = val ? (val.charAt(0).toUpperCase() + val.slice(1)) : "Select Voice";
        }
    }

    voiceDisplay.addEventListener('click', () => {
        const voices = Array.from(voiceSelect.options).map(o => o.value);
        const val = prompt("Select Voice: " + voices.join(", "), voiceSelect.value);
        if (val && voices.includes(val)) {
            voiceSelect.value = val;
            currentVoiceFile = null;
            syncSelectedVoice();
        }
    });

    // Sliders
    stabilitySlider.addEventListener('input', () => {
        stabilityVal.textContent = `${stabilitySlider.value}%`;
    });

    speedSlider.addEventListener('input', () => {
        speedVal.textContent = `${(speedSlider.value / 100).toFixed(1)}x`;
    });

    // HF Token
    hfTokenInput.addEventListener('input', () => {
        if (hfTokenInput.value.trim().startsWith('hf_')) {
            hfStatus.textContent = "Custom Token Active";
            hfStatus.style.color = "#4ade80";
        } else {
            hfStatus.textContent = "Using Default HF Token";
            hfStatus.style.color = "#94a3b8";
        }
    });

    // Modal
    addSpeakerTrigger.addEventListener('click', () => voiceModal.style.display = 'flex');
    closeModal.addEventListener('click', () => voiceModal.style.display = 'none');

    voiceFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            clonedFileName.textContent = `File: ${e.target.files[0].name}`;
        }
    });

    saveCloneBtn.addEventListener('click', () => {
        if (voiceFileInput.files.length > 0) {
            currentVoiceFile = voiceFileInput.files[0];
            syncSelectedVoice();
            voiceModal.style.display = 'none';
        } else {
            alert("Select a wav file first.");
        }
    });

    // History
    async function fetchHistory() {
        try {
            const response = await fetch('/history');
            const history = await response.json();
            renderHistory(history);
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    }

    function renderHistory(history) {
        if (history.length === 0) {
            historyList.innerHTML = '<p class="setting-desc" style="text-align: center;">No history yet.</p>';
            return;
        }

        historyList.innerHTML = '';
        history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <span style="font-weight: 600; font-size: 0.9rem;">${item.voice}</span>
                    <span style="font-size: 0.75rem; color: var(--text-dim);">${item.timestamp}</span>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                    ${item.text}
                </div>
            `;

            div.addEventListener('click', () => {
                playAudio(item.url, item.filename);
            });

            historyList.appendChild(div);
        });
    }

    function playAudio(audioUrl, filename) {
        audioPlayer.src = audioUrl;
        // Use the dedicated download endpoint to avoid "weird network file" errors
        downloadLink.href = `/api/download/${filename}`;
        audioOutput.classList.add('active');
        audioPlayer.play();
    }

    // Generate
    async function handleGenerate() {
        const text = textInput.value.trim();
        if (!text) return;

        generateBtn.disabled = true;
        generateBtn.textContent = "Generating...";
        audioOutput.classList.remove('active');

        const formData = new FormData();
        formData.append('text', text);
        formData.append('voice', voiceSelect.value);
        formData.append('stability', stabilitySlider.value / 100);
        formData.append('speed', speedSlider.value / 100);

        if (hfTokenInput.value.trim()) {
            formData.append('hf_token', hfTokenInput.value.trim());
        }

        if (currentVoiceFile) {
            formData.append('voice_file', currentVoiceFile);
        }

        try {
            const response = await fetch('/generate', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || "Generation failed");
            }

            const data = await response.json();
            playAudio(data.url, data.entry.filename);

            if (historyTabBtn.classList.contains('active')) {
                fetchHistory();
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = "Generate speech";
        }
    }

    generateBtn.addEventListener('click', handleGenerate);
    fetchVoices();
});
