document.addEventListener('DOMContentLoaded', () => {
    // ===== DOM References =====
    const textInput = document.getElementById('text-input');
    const charCountDisplay = document.getElementById('char-count-display');
    const currentChar = document.getElementById('current-char');
    const textAreaContainer = document.getElementById('text-area-container');
    const voiceSelect = document.getElementById('voice-select');
    const generateBtn = document.getElementById('generate-btn');
    const audioOutput = document.getElementById('audio-output');
    const audioPlayer = document.getElementById('audio-player');
    const downloadLink = document.getElementById('download-link');
    const waveformCanvas = document.getElementById('waveform-canvas');

    const stabilitySlider = document.getElementById('stability-slider');
    const stabilityVal = document.getElementById('stability-val');
    const stabilityFill = document.getElementById('stability-fill');
    const speedSlider = document.getElementById('speed-slider');
    const speedVal = document.getElementById('speed-val');
    const speedFill = document.getElementById('speed-fill');
    const hfTokenInput = document.getElementById('hf-token-input');
    const hfStatus = document.getElementById('hf-status');

    const settingsTabBtn = document.getElementById('settings-tab-btn');
    const historyTabBtn = document.getElementById('history-tab-btn');
    const settingsContent = document.getElementById('settings-content');
    const historyContent = document.getElementById('history-content');
    const historyList = document.getElementById('history-list');
    const historySearch = document.getElementById('history-search');
    const settingsPanel = document.getElementById('settings-panel');

    const voiceModal = document.getElementById('voice-modal');
    const addSpeakerTrigger = document.getElementById('add-speaker-trigger');
    const closeModal = document.getElementById('close-modal');
    const voiceFileInput = document.getElementById('voice-file-input');
    const saveCloneBtn = document.getElementById('save-clone-btn');
    const clonedFileName = document.getElementById('cloned-file-name');

    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const exportHistoryBtn = document.getElementById('export-history-btn');
    const presetsBtn = document.getElementById('presets-btn');
    const presetsDropdown = document.getElementById('presets-dropdown');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIconMoon = document.getElementById('theme-icon-moon');
    const themeIconSun = document.getElementById('theme-icon-sun');

    // Sidebar
    const sidebarHome = document.getElementById('sidebar-home');
    const sidebarHistory = document.getElementById('sidebar-history');
    const sidebarSettings = document.getElementById('sidebar-settings');

    const toastContainer = document.getElementById('toast-container');

    let currentVoiceFile = null;
    let cachedHistory = [];

    // ===== Text Presets =====
    const TEXT_PRESETS = [
        {
            title: '📰 News Anchor',
            text: 'Good evening. Tonight, we bring you the latest developments from around the world. Our top story covers the groundbreaking advances in artificial intelligence that are reshaping how we live and work.'
        },
        {
            title: '📖 Storytelling',
            text: 'Once upon a time, in a kingdom far beyond the misty mountains, there lived a young inventor who dreamed of building a machine that could speak with the warmth and feeling of a human voice.'
        },
        {
            title: '🎓 Educational',
            text: 'Text-to-speech technology converts written text into natural-sounding audio. Modern TTS systems use deep learning models trained on thousands of hours of speech data to produce remarkably lifelike results.'
        },
        {
            title: '💼 Professional',
            text: 'Thank you for joining today\'s meeting. I\'d like to walk you through our quarterly results and discuss the strategic initiatives we have planned for the next fiscal year.'
        },
        {
            title: '🎭 Dramatic',
            text: 'The storm raged against the ancient lighthouse, waves crashing with thunderous fury. Inside, the keeper held the lantern steady, knowing that somewhere in that darkness, a ship was searching for the light.'
        },
        {
            title: '🧪 Quick Test',
            text: 'Hello! This is a quick test of the text-to-speech engine. One, two, three. Testing, testing.'
        }
    ];

    // Populate presets dropdown
    TEXT_PRESETS.forEach((preset, i) => {
        const item = document.createElement('div');
        item.className = 'preset-item';
        item.innerHTML = `
            <div class="preset-title">${preset.title}</div>
            <div class="preset-preview">${preset.text.substring(0, 60)}…</div>
        `;
        item.addEventListener('click', () => {
            textInput.value = preset.text;
            updateCharCount();
            presetsDropdown.classList.remove('active');
            showToast(`Loaded "${preset.title}" preset`, 'info');
        });
        presetsDropdown.appendChild(item);
    });

    presetsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        presetsDropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!presetsDropdown.contains(e.target) && e.target !== presetsBtn) {
            presetsDropdown.classList.remove('active');
        }
    });

    // ===== Toast Notification System =====
    function showToast(message, type = 'info') {
        const icons = {
            success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>',
            error: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // ===== Theme Toggle =====
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('pocket-tts-theme', theme);
        if (theme === 'light') {
            themeIconMoon.style.display = 'none';
            themeIconSun.style.display = 'block';
        } else {
            themeIconMoon.style.display = 'block';
            themeIconSun.style.display = 'none';
        }
    }

    // Load saved theme
    const savedTheme = localStorage.getItem('pocket-tts-theme') || 'dark';
    setTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        setTheme(next);
        showToast(`Switched to ${next} theme`, 'info');
    });

    // ===== Character Count with Warnings =====
    function updateCharCount() {
        const len = textInput.value.length;
        currentChar.textContent = len.toLocaleString();

        // Remove old classes
        textAreaContainer.classList.remove('char-warn', 'char-danger');
        charCountDisplay.classList.remove('warn', 'danger');

        if (len >= 4800) {
            textAreaContainer.classList.add('char-danger');
            charCountDisplay.classList.add('danger');
        } else if (len >= 4000) {
            textAreaContainer.classList.add('char-warn');
            charCountDisplay.classList.add('warn');
        }
    }

    textInput.value = '';
    updateCharCount();
    textInput.addEventListener('input', updateCharCount);

    // ===== Sidebar Navigation =====
    function activateSidebar(item) {
        [sidebarHome, sidebarHistory, sidebarSettings].forEach(el => el.classList.remove('active'));
        item.classList.add('active');
    }

    sidebarHome.addEventListener('click', () => {
        activateSidebar(sidebarHome);
        settingsTabBtn.click();
        // On mobile, close settings panel
        settingsPanel.classList.remove('open');
    });

    sidebarHistory.addEventListener('click', () => {
        activateSidebar(sidebarHistory);
        historyTabBtn.click();
        settingsPanel.classList.add('open');
    });

    sidebarSettings.addEventListener('click', () => {
        activateSidebar(sidebarSettings);
        settingsTabBtn.click();
        settingsPanel.classList.add('open');
    });

    // ===== Tab Switching =====
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

    // ===== Voice Fetch =====
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
            const specialOption = document.createElement('option');
            specialOption.value = 'cloned';
            specialOption.textContent = `🎤 Cloned: ${currentVoiceFile.name}`;
            specialOption.selected = true;
            voiceSelect.prepend(specialOption);
        }
    }

    voiceSelect.addEventListener('change', () => {
        if (voiceSelect.value !== 'cloned') {
            currentVoiceFile = null;
        }
    });

    // ===== Slider Logic with Gradient Fill =====
    function updateSliderFill(slider, fill) {
        const min = parseFloat(slider.min);
        const max = parseFloat(slider.max);
        const val = parseFloat(slider.value);
        const pct = ((val - min) / (max - min)) * 100;
        fill.style.width = pct + '%';
    }

    stabilitySlider.addEventListener('input', () => {
        stabilityVal.textContent = `${stabilitySlider.value}%`;
        updateSliderFill(stabilitySlider, stabilityFill);
    });

    speedSlider.addEventListener('input', () => {
        speedVal.textContent = `${(speedSlider.value / 100).toFixed(1)}x`;
        updateSliderFill(speedSlider, speedFill);
    });

    // Initialize slider fills
    updateSliderFill(stabilitySlider, stabilityFill);
    updateSliderFill(speedSlider, speedFill);

    // ===== HF Token =====
    hfTokenInput.addEventListener('input', () => {
        if (hfTokenInput.value.trim().startsWith('hf_')) {
            hfStatus.textContent = '✓ Custom Token Active';
            hfStatus.style.color = '#22c55e';
        } else {
            hfStatus.textContent = 'Using Default HF Token';
            hfStatus.style.color = '';
        }
    });

    // ===== Voice Clone Modal =====
    addSpeakerTrigger.addEventListener('click', () => voiceModal.style.display = 'flex');
    closeModal.addEventListener('click', () => voiceModal.style.display = 'none');

    // Close modal on backdrop click
    voiceModal.addEventListener('click', (e) => {
        if (e.target === voiceModal) voiceModal.style.display = 'none';
    });

    voiceFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            clonedFileName.textContent = `✓ ${e.target.files[0].name}`;
        }
    });

    saveCloneBtn.addEventListener('click', () => {
        if (voiceFileInput.files.length > 0) {
            currentVoiceFile = voiceFileInput.files[0];
            syncSelectedVoice();
            voiceModal.style.display = 'none';
            showToast(`Voice sample "${currentVoiceFile.name}" loaded`, 'success');
        } else {
            showToast('Please select an audio file first', 'error');
        }
    });

    // ===== History =====
    async function fetchHistory() {
        try {
            const response = await fetch('/history');
            cachedHistory = await response.json();
            renderHistory(cachedHistory);
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    }

    function renderHistory(history) {
        if (history.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 8v4l3 3"/>
                    </svg>
                    <p>No history yet. Generate some speech!</p>
                </div>`;
            return;
        }

        historyList.innerHTML = '';
        history.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-item-header">
                    <span class="history-voice">${item.voice}</span>
                    <span class="history-time">${item.timestamp}</span>
                </div>
                <div class="history-text">${escapeHtml(item.text)}</div>
                <button class="delete-item-btn" data-id="${item.id}" title="Delete">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                </button>
            `;

            div.addEventListener('click', (e) => {
                if (e.target.closest('.delete-item-btn')) return;
                playAudio(item.url, item.filename);
            });

            const deleteBtn = div.querySelector('.delete-item-btn');
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await deleteHistoryItem(item.id);
            });

            historyList.appendChild(div);
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ===== History Search =====
    historySearch.addEventListener('input', () => {
        const query = historySearch.value.toLowerCase().trim();
        if (!query) {
            renderHistory(cachedHistory);
            return;
        }
        const filtered = cachedHistory.filter(item =>
            item.text.toLowerCase().includes(query) ||
            item.voice.toLowerCase().includes(query)
        );
        renderHistory(filtered);
    });

    // ===== Delete / Clear History =====
    async function deleteHistoryItem(id) {
        try {
            const response = await fetch(`/api/history/${id}`, { method: 'DELETE' });
            if (response.ok) {
                showToast('History item deleted', 'success');
                fetchHistory();
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            showToast('Failed to delete item', 'error');
        }
    }

    clearHistoryBtn.addEventListener('click', async () => {
        if (!confirm('Clear all history and delete all generated audio files?')) return;
        try {
            const response = await fetch('/api/history/clear', { method: 'DELETE' });
            if (response.ok) {
                showToast('All history cleared', 'success');
                fetchHistory();
            }
        } catch (error) {
            console.error('Error clearing history:', error);
            showToast('Failed to clear history', 'error');
        }
    });

    // ===== Export History =====
    exportHistoryBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/history/export');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'pocket_tts_history.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast('History exported as JSON', 'success');
        } catch (error) {
            console.error('Export error:', error);
            showToast('Failed to export history', 'error');
        }
    });

    // ===== Audio Playback =====
    function playAudio(audioUrl, filename) {
        audioPlayer.src = audioUrl;
        downloadLink.dataset.filename = filename;
        downloadLink.href = `/api/download/${filename}`;
        audioOutput.classList.add('active');
        audioPlayer.play();
        drawWaveform(audioUrl);
    }

    // Programmatic download
    downloadLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const url = downloadLink.href;
        const filename = downloadLink.dataset.filename || 'speech.wav';

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Download failed');
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const tempLink = document.createElement('a');
            tempLink.href = blobUrl;
            tempLink.download = filename;
            document.body.appendChild(tempLink);
            tempLink.click();
            document.body.removeChild(tempLink);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            window.location.href = url;
        }
    });

    // ===== Waveform Visualization =====
    function drawWaveform(audioUrl) {
        const ctx = waveformCanvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const w = 120;
        const h = 36;
        waveformCanvas.width = w * dpr;
        waveformCanvas.height = h * dpr;
        waveformCanvas.style.width = w + 'px';
        waveformCanvas.style.height = h + 'px';
        ctx.scale(dpr, dpr);

        fetch(audioUrl)
            .then(r => r.arrayBuffer())
            .then(buffer => {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                return audioCtx.decodeAudioData(buffer);
            })
            .then(audioBuffer => {
                const data = audioBuffer.getChannelData(0);
                const step = Math.ceil(data.length / w);
                const amp = h / 2;

                ctx.clearRect(0, 0, w, h);

                // Gradient for waveform bars
                const grad = ctx.createLinearGradient(0, 0, w, 0);
                grad.addColorStop(0, '#6366f1');
                grad.addColorStop(1, '#a855f7');

                for (let i = 0; i < w; i++) {
                    let min = 1.0, max = -1.0;
                    for (let j = 0; j < step; j++) {
                        const datum = data[(i * step) + j] || 0;
                        if (datum < min) min = datum;
                        if (datum > max) max = datum;
                    }
                    const barH = Math.max((max - min) * amp, 1);
                    const y = (1 + min) * amp;

                    ctx.fillStyle = grad;
                    ctx.fillRect(i, y, 1, barH);
                }
            })
            .catch(() => {
                // Draw placeholder bars if decoding fails
                ctx.clearRect(0, 0, w, h);
                const grad = ctx.createLinearGradient(0, 0, w, 0);
                grad.addColorStop(0, '#6366f1');
                grad.addColorStop(1, '#a855f7');
                ctx.fillStyle = grad;
                for (let i = 0; i < w; i += 3) {
                    const barH = Math.random() * 16 + 4;
                    ctx.fillRect(i, (h - barH) / 2, 2, barH);
                }
            });
    }

    // ===== Generate Speech =====
    async function handleGenerate() {
        const text = textInput.value.trim();
        if (!text) {
            showToast('Please enter some text first', 'error');
            return;
        }

        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        generateBtn.classList.add('generating');
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
                throw new Error(err.detail || 'Generation failed');
            }

            const data = await response.json();
            playAudio(data.url, data.entry.filename);
            showToast('Speech generated successfully!', 'success');

            if (historyTabBtn.classList.contains('active')) {
                fetchHistory();
            }
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate speech';
            generateBtn.classList.remove('generating');
        }
    }

    generateBtn.addEventListener('click', handleGenerate);

    // ===== Keyboard Shortcut: Ctrl+Enter =====
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (!generateBtn.disabled) {
                handleGenerate();
            }
        }
        // Escape closes modals
        if (e.key === 'Escape') {
            voiceModal.style.display = 'none';
            presetsDropdown.classList.remove('active');
        }
    });

    // ===== Init =====
    fetchVoices();
});
