// API Configuration - Backend proxy handles the actual API key
// The key is now stored securely in .env and never exposed in frontend code
const API_PROXY_URL = 'http://localhost:3000/api/chat';

const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// New UI elements for history and clearing
const clearBtn = document.getElementById('clearBtn');
const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const imageBtn = document.getElementById('imageBtn');
const imageInput = document.getElementById('imageInput');
const fontSlider = document.getElementById('fontSlider');
const voiceBtn = document.getElementById('voiceBtn');
const leftToggle = document.getElementById('leftToggle');
const leftPanel = document.getElementById('leftPanel');
const historyListLeft = document.getElementById('historyListLeft');
const imagesListLeft = document.getElementById('imagesListLeft');
const voiceSelect = document.getElementById('voiceSelect');
const voiceSpeed = document.getElementById('voiceSpeed');
const speedValue = document.getElementById('speedValue');
const clearHistoryLeftBtn = document.getElementById('clearHistoryLeftBtn');

let voices = [];
let currentSpeech = null;

let conversationHistory = [];
let savedConversations = [];

const STORAGE_CURRENT = 'current_conversation_v1';
const STORAGE_HISTORY = 'conversations_history_v1';

// Initialize
function init() {
  setupThemeToggle();
  setupTextareaAutoResize();
  updateSendButtonState();
  setupHistoryUI();
  loadSavedState();
  setupVoiceOptions();
}

// Add message to chat
function addMessage(text, sender, type = 'text') {
  // Remove welcome message if present
  const welcomeMsg = chatBox.querySelector('.welcome-message');
  if (welcomeMsg) {
    welcomeMsg.remove();
  }

  const msg = document.createElement("div");
  msg.classList.add("message", sender);

  if (sender === "bot" && text === "Typing...") {
    msg.classList.add("typing");
  }

  if (type === 'image') {
    const img = document.createElement('img');
    img.src = text;
    img.alt = 'sent image';
    img.loading = 'lazy';
    img.className = 'message-image';
    msg.appendChild(img);
  } else {
    msg.textContent = text;
    // Add speaker icon for bot messages
    if (sender === 'bot' && text !== 'Typing...') {
      const speakerBtn = document.createElement('button');
      speakerBtn.className = 'speaker-btn';
      speakerBtn.title = 'Listen';
      speakerBtn.textContent = '🔊';
      speakerBtn.addEventListener('click', () => {
        speakerBtn.classList.add('playing');
        speakMessage(text);
        setTimeout(() => speakerBtn.classList.remove('playing'), 100);
      });
      msg.appendChild(speakerBtn);
    }
  }

  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Persist current conversation after each message
  persistCurrentConversation();

  return msg;
}

// Send message
async function sendMessage() {
  const userText = userInput.value.trim();
  if (!userText) return;

  // Disable send button during processing
  sendBtn.disabled = true;

  // Add user message
  addMessage(userText, "user");
  conversationHistory.push({ role: "user", content: userText, type: 'text' });

  // Clear input
  userInput.value = "";
  userInput.style.height = 'auto';
  updateSendButtonState();

  // Show typing indicator
  const typingMsg = addMessage("Typing...", "bot");

  try {
    const response = await fetch(API_PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: conversationHistory
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Remove typing indicator
    typingMsg.remove();

    // Add bot response
    const botMessage = data.choices[0].message.content;
    addMessage(botMessage, "bot");
    conversationHistory.push({ role: "assistant", content: botMessage, type: 'text' });

  } catch (error) {
    console.error("Error:", error);
    typingMsg.remove();
    addMessage("Sorry, I encountered an error. Please try again.", "bot");
  } finally {
    sendBtn.disabled = false;
  }
}

// Persist current conversation to localStorage
function persistCurrentConversation() {
  try {
    if (conversationHistory && conversationHistory.length) {
      localStorage.setItem(STORAGE_CURRENT, JSON.stringify(conversationHistory));
    } else {
      localStorage.removeItem(STORAGE_CURRENT);
    }
  } catch (e) {
    console.warn('Could not persist conversation:', e);
  }
}

// Load saved state (current conversation and history)
function loadSavedState() {
  try {
    const cur = localStorage.getItem(STORAGE_CURRENT);
    if (cur) {
      conversationHistory = JSON.parse(cur);
      // render messages
      chatBox.innerHTML = '';
      conversationHistory.forEach(item => {
        addMessage(item.content, item.role === 'user' ? 'user' : 'bot', item.type || 'text');
      });
    }

    const hist = localStorage.getItem(STORAGE_HISTORY);
    if (hist) {
      savedConversations = JSON.parse(hist);
    }
  } catch (e) {
    console.warn('Could not load saved conversations:', e);
  }
  renderHistoryList();
  renderLeftPanel();
}

// Clear current chat (moves it to history if non-empty)
function clearChat() {
  if (conversationHistory && conversationHistory.length) {
    // push snapshot to savedConversations with timestamp
    savedConversations.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      messages: conversationHistory.slice()
    });
    // keep at most 50 items
    if (savedConversations.length > 50) savedConversations.pop();
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(savedConversations));
  }

  conversationHistory = [];
  chatBox.innerHTML = '';
  // re-add welcome message
  const welcomeDiv = document.createElement('div');
  welcomeDiv.className = 'welcome-message';
  welcomeDiv.innerHTML = `<svg class="welcome-icon" width="48" height="48" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 3L3 9.5V22.5L16 29L29 22.5V9.5L16 3Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="16" r="4" fill="currentColor"/></svg><h2>How can I help you today?</h2>`;
  chatBox.appendChild(welcomeDiv);
  localStorage.removeItem(STORAGE_CURRENT);
  renderHistoryList();
}

// Image upload handling
if (imageBtn && imageInput) {
  imageBtn.addEventListener('click', () => imageInput.click());
  imageInput.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    // limit size to ~3MB for demo
    const maxSize = 3 * 1024 * 1024;
    if (file.size > maxSize) {
      addMessage('Image too large (max 3MB).', 'bot');
      imageInput.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      addMessage(dataUrl, 'user', 'image');
      conversationHistory.push({ role: 'user', content: dataUrl, type: 'image' });
      persistCurrentConversation();
      renderLeftPanel();
      imageInput.value = '';
    };
    reader.readAsDataURL(file);
  });
}

if (voiceBtn) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceBtn.disabled = true;
    voiceBtn.title = 'Voice input not supported';
  } else {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    voiceBtn.addEventListener('click', () => {
      voiceBtn.classList.add('recording');
      recognition.start();
    });

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      userInput.value = (userInput.value + ' ' + transcript).trim();
      userInput.style.height = 'auto';
      userInput.style.height = Math.min(userInput.scrollHeight, 200) + 'px';
      updateSendButtonState();
      voiceBtn.classList.remove('recording');
    };

    recognition.onerror = (event) => {
      console.error('Voice error:', event.error);
      voiceBtn.classList.remove('recording');
    };

    recognition.onend = () => {
      voiceBtn.classList.remove('recording');
    };
  }
}

// Voice output (text-to-speech)
function setupVoiceOptions() {
  const synth = window.speechSynthesis;
  
  const updateVoices = () => {
    voices = synth.getVoices();
    if (voiceSelect) {
      voiceSelect.innerHTML = '<option value="">Default</option>';
      voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        voiceSelect.appendChild(option);
      });
    }
  };
  
  updateVoices();
  synth.onvoiceschanged = updateVoices;

  if (voiceSpeed) {
    voiceSpeed.addEventListener('input', (e) => {
      if (speedValue) speedValue.textContent = e.target.value + 'x';
      localStorage.setItem('voice_speed_v1', e.target.value);
    });
    const stored = localStorage.getItem('voice_speed_v1');
    if (stored) {
      voiceSpeed.value = stored;
      if (speedValue) speedValue.textContent = stored + 'x';
    }
  }
}

function speakMessage(text) {
  const synth = window.speechSynthesis;
  
  // Cancel any currently playing speech
  synth.cancel();
  voiceBtn?.classList.remove('playing');
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = parseFloat(voiceSpeed?.value || 1);
  
  if (voiceSelect?.value) {
    const selectedVoice = voices.find(v => v.name === voiceSelect.value);
    if (selectedVoice) utterance.voice = selectedVoice;
  }
  
  utterance.onstart = () => {
    voiceBtn?.classList.add('playing');
  };
  
  utterance.onend = () => {
    voiceBtn?.classList.remove('playing');
  };
  
  synth.speak(utterance);
  currentSpeech = utterance;
}

if (fontSlider) {
  const stored = localStorage.getItem('msg_font_size_v1');
  if (stored) fontSlider.value = stored;
  applyFontSize(fontSlider.value);
  fontSlider.addEventListener('input', (e) => {
    applyFontSize(e.target.value);
    localStorage.setItem('msg_font_size_v1', e.target.value);
  });
}

function applyFontSize(val) {
  document.documentElement.style.setProperty('--message-font-size', val + 'px');
}

// left panel events
if (leftToggle) leftToggle.addEventListener('click', () => { toggleLeftPanel(); renderLeftPanel(); });

// Setup history UI event handlers
function setupHistoryUI() {
  if (clearBtn) clearBtn.addEventListener('click', () => {
    clearChat();
  });
  if (closeHistoryBtn) closeHistoryBtn.addEventListener('click', () => {
    toggleHistory(false);
  });
  if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', () => {
    savedConversations = [];
    localStorage.removeItem(STORAGE_HISTORY);
    renderLeftPanel();
  });
  if (clearHistoryLeftBtn) clearHistoryLeftBtn.addEventListener('click', () => {
    if (!confirm('Clear all saved conversations? This cannot be undone.')) return;
    savedConversations = [];
    localStorage.removeItem(STORAGE_HISTORY);
    renderLeftPanel();
    renderHistoryList();
  });
}

function toggleHistory(show) {
  if (!historyPanel) return;
  historyPanel.setAttribute('aria-hidden', show ? 'false' : 'true');
  historyPanel.style.display = show ? 'block' : 'none';
  if (show) renderHistoryList();
}

function renderHistoryList() {
  if (!historyList) return;
  historyList.innerHTML = '';
  if (!savedConversations || !savedConversations.length) {
    historyList.innerHTML = '<p class="muted">No saved conversations.</p>';
    return;
  }

  savedConversations.forEach((conv, idx) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    const date = new Date(conv.timestamp).toLocaleString();
    const preview = conv.messages.slice(-1)[0];
    const previewText = preview ? (preview.content.slice(0, 120) + (preview.content.length > 120 ? '...' : '')) : '—';
    item.innerHTML = `<div class="history-meta"><strong>${date}</strong></div><div class="history-preview">${previewText}</div>`;
    item.addEventListener('click', () => {
      // load this conversation
      conversationHistory = conv.messages.slice();
      chatBox.innerHTML = '';
      conversationHistory.forEach(m => addMessage(m.content, m.role === 'user' ? 'user' : 'bot'));
      persistCurrentConversation();
      toggleHistory(false);
    });
    historyList.appendChild(item);
  });
}

function renderLeftPanel() {
  // render history section on left
  if (historyListLeft) {
    historyListLeft.innerHTML = '';
    if (!savedConversations || !savedConversations.length) {
      historyListLeft.innerHTML = '<p class="muted">No saved conversations.</p>';
    } else {
      savedConversations.forEach(conv => {
        const item = document.createElement('div');
        item.className = 'history-item';
        const date = new Date(conv.timestamp).toLocaleString();
        item.innerHTML = `<div class="history-meta">${date}</div>`;
        item.addEventListener('click', () => {
          conversationHistory = conv.messages.slice();
          chatBox.innerHTML = '';
          conversationHistory.forEach(m => addMessage(m.content, m.role === 'user' ? 'user' : 'bot', m.type || 'text'));
          persistCurrentConversation();
          toggleLeftPanel(false);
        });
        historyListLeft.appendChild(item);
      });
    }
  }

  // render images gallery on left
  if (imagesListLeft) {
    imagesListLeft.innerHTML = '';
    const images = [];
    (savedConversations || []).forEach(conv => {
      conv.messages.forEach(m => { if (m.type === 'image') images.push({src: m.content, ts: conv.timestamp}); });
    });
    (conversationHistory || []).forEach(m => { if (m.type === 'image') images.push({src: m.content, ts: Date.now()}); });

    if (!images.length) {
      imagesListLeft.innerHTML = '<p class="muted">No images yet.</p>';
    } else {
      images.forEach(img => {
        const wrap = document.createElement('div');
        wrap.className = 'left-thumb-wrap';

        const el = document.createElement('img');
        el.src = img.src;
        el.className = 'left-thumb';
        el.loading = 'lazy';
        el.addEventListener('click', () => {
          addMessage(img.src, 'user', 'image');
          conversationHistory.push({role: 'user', content: img.src, type: 'image'});
          persistCurrentConversation();
          toggleLeftPanel(false);
        });

        const del = document.createElement('button');
        del.className = 'left-thumb-delete';
        del.title = 'Delete image from gallery';
        del.textContent = '✕';
        del.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!confirm('Delete this image from the gallery?')) return;
          // remove image occurrences from saved conversations only
          savedConversations.forEach(conv => {
            conv.messages = conv.messages.filter(m => !(m.type === 'image' && m.content === img.src));
          });
          // drop empty conversations
          savedConversations = savedConversations.filter(conv => conv.messages && conv.messages.length);
          localStorage.setItem(STORAGE_HISTORY, JSON.stringify(savedConversations));
          renderLeftPanel();
        });

        wrap.appendChild(el);
        wrap.appendChild(del);
        imagesListLeft.appendChild(wrap);
      });
    }
  }
}

function toggleLeftPanel(show) {
  if (!leftPanel) return;
  const isOpen = leftPanel.getAttribute('aria-hidden') === 'false';
  const newState = show !== undefined ? show : !isOpen;
  
  if (newState) {
    leftPanel.setAttribute('aria-hidden', 'false');
    leftPanel.style.transform = 'translateX(0)';
    chatBox.parentElement.classList.add('panel-open');
  } else {
    leftPanel.setAttribute('aria-hidden', 'true');
    leftPanel.style.transform = '';
    chatBox.parentElement.classList.remove('panel-open');
  }
}

// Update send button state
function updateSendButtonState() {
  sendBtn.disabled = !userInput.value.trim();
}

// Auto-resize textarea
function setupTextareaAutoResize() {
  userInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 200) + 'px';
    updateSendButtonState();
  });
}

// Event listeners
sendBtn.addEventListener("click", sendMessage);

userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (userInput.value.trim()) {
      sendMessage();
    }
  }
});

// Theme toggle
function setupThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;

  // Load saved theme or use system preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

  applyTheme(initialTheme);

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.body.classList.contains('light') ? 'light' : 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  });
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light');
  } else {
    document.body.classList.remove('light');
  }
}

// Initialize app
init();
