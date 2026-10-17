// =====================================================
// SERENE AI — PROFESSIONAL CLIENT CONTROLLER
// =====================================================

// Auto-detect local development vs Render production
const isLocal = window.location.hostname === "localhost" ||
                window.location.hostname === "127.0.0.1" ||
                window.location.protocol === "file:";

const BACKEND_URL = isLocal ? "http://127.0.0.1:5000" : "https://ai-mental-helath-chatbot.onrender.com";

let conversationHistory = [];
let loggedMoods = [];

// =====================================================
// INITIALIZATION
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
    // Warm-up backend ping
    fetch(`${BACKEND_URL}/health`, { method: "GET", credentials: "include" }).catch(() => {});

    // Init Theme
    initTheme();

    // Auto-resizing textarea & Enter key
    const inputArea = document.getElementById("user-input");
    if (inputArea) {
        inputArea.addEventListener("input", autoResizeTextarea);
        inputArea.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Load saved moods from localStorage
    try {
        const savedMoods = JSON.parse(localStorage.getItem("serene_logged_moods") || "[]");
        loggedMoods = savedMoods;
        renderMoodHistory();
    } catch (e) {}

    // Load any saved conversation messages
    try {
        const savedHistory = JSON.parse(localStorage.getItem("serene_chat_history") || "[]");
        if (savedHistory.length > 0) {
            hideHeroCard();
            savedHistory.forEach(msg => {
                renderMessageBubble(msg.sender, msg.text, msg.emotion, msg.source);
            });
        }
    } catch (e) {}

    // Restore sidebar state on desktop
    if (window.innerWidth > 768 && localStorage.getItem("serene_sidebar_collapsed") === "true") {
        const sidebar = document.getElementById("sidebar");
        if (sidebar) sidebar.classList.add("collapsed");
    }

    // Keyboard shortcut (Ctrl+B / Cmd+B) to toggle sidebar
    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
            e.preventDefault();
            toggleSidebar();
        }
    });
});

// =====================================================
// THEME MANAGEMENT
// =====================================================
function initTheme() {
    const savedTheme = localStorage.getItem("serene_theme") || "light";
    const themeIcon = document.getElementById("theme-icon");
    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        if (themeIcon) themeIcon.textContent = "☀️";
    } else {
        document.body.classList.remove("dark-mode");
        if (themeIcon) themeIcon.textContent = "🌙";
    }
}

function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("serene_theme", isDark ? "dark" : "light");

    const themeIcon = document.getElementById("theme-icon");
    if (themeIcon) {
        themeIcon.textContent = isDark ? "☀️" : "🌙";
    }
}

// =====================================================
// SIDEBAR TOGGLE (DESKTOP COLLAPSE + MOBILE DRAWER)
// =====================================================
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        if (sidebar) sidebar.classList.toggle("open");
        if (overlay) overlay.classList.toggle("open");
    } else {
        if (sidebar) {
            sidebar.classList.toggle("collapsed");
            const isCollapsed = sidebar.classList.contains("collapsed");
            localStorage.setItem("serene_sidebar_collapsed", isCollapsed ? "true" : "false");
        }
    }
}

// =====================================================
// CHAT & MESSAGING
// =====================================================
function autoResizeTextarea() {
    const input = document.getElementById("user-input");
    if (!input) return;
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
}

function hideHeroCard() {
    const hero = document.getElementById("hero-card");
    if (hero) hero.style.display = "none";
}

function showHeroCard() {
    const hero = document.getElementById("hero-card");
    if (hero) hero.style.display = "block";
}

async function sendMessage(customText) {
    const inputArea = document.getElementById("user-input");
    const message = customText ? customText.trim() : (inputArea ? inputArea.value.trim() : "");

    if (!message) return;

    if (inputArea) {
        inputArea.value = "";
        inputArea.style.height = "auto";
    }

    hideHeroCard();

    // Render User Message
    renderMessageBubble("user", message);
    saveMessageToStorage({ sender: "user", text: message });

    // Show Typing Bubble
    const typingBubble = showTypingBubble();

    try {
        const response = await fetch(`${BACKEND_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ message })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        if (typingBubble) typingBubble.remove();

        const reply = data.reply || (data.history && data.history.length ? data.history[data.history.length - 1].text : "I am here with you.");
        renderMessageBubble("bot", reply, data.emotion, data.source);
        saveMessageToStorage({ sender: "bot", text: reply, emotion: data.emotion, source: data.source });

    } catch (err) {
        if (typingBubble) typingBubble.remove();
        console.error("Chat error:", err);
        renderMessageBubble("bot", "⚠️ **Connection Notice:** Unable to reach the server. If this is on a free tier, it may take 30-50 seconds to wake up. Please try again in a few moments.");
    } finally {
        if (inputArea) inputArea.focus();
    }
}

function showTypingBubble() {
    const stream = document.getElementById("message-stream");
    if (!stream) return null;

    const row = document.createElement("div");
    row.className = "msg-row msg-row-bot";

    row.innerHTML = `
        <div class="msg-avatar">🌿</div>
        <div class="typing-bubble">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        </div>
    `;

    stream.appendChild(row);
    scrollToBottom();
    return row;
}

function renderMessageBubble(sender, text, emotion, source) {
    const stream = document.getElementById("message-stream");
    if (!stream) return;

    const row = document.createElement("div");
    row.className = `msg-row ${sender === "user" ? "msg-row-user" : "msg-row-bot"}`;

    if (sender === "user") {
        row.innerHTML = `
            <div class="msg-bubble">
                <div class="msg-body">${formatMarkdown(text)}</div>
            </div>
        `;
    } else {
        let metaHtml = "";
        if (emotion && emotion !== "greeting") {
            const isCrisis = emotion === "crisis";
            const emotionClass = isCrisis ? "meta-badge badge-crisis" : "meta-badge badge-emotion";
            const sourceBadge = source ? `<span class="meta-badge badge-source">${escapeHtml(source)}</span>` : "";

            metaHtml = `
                <div class="msg-meta-bar">
                    <span class="${emotionClass}">Emotion: ${escapeHtml(emotion)}</span>
                    ${sourceBadge}
                    <button class="speech-btn" onclick="toggleSpeakMessage(this)" title="Listen to voice">🔊 Speak</button>
                    <button class="copy-btn" onclick="copyMessageText(this)" title="Copy message">📋 Copy</button>
                </div>
            `;
        } else {
            metaHtml = `
                <div class="msg-meta-bar">
                    <button class="speech-btn" onclick="toggleSpeakMessage(this)" title="Listen to voice">🔊 Speak</button>
                    <button class="copy-btn" onclick="copyMessageText(this)" title="Copy message">📋 Copy</button>
                </div>
            `;
        }

        row.innerHTML = `
            <div class="msg-avatar">🌿</div>
            <div class="msg-bubble">
                <div class="msg-sender-title">Serene AI</div>
                <div class="msg-body">${formatMarkdown(text)}</div>
                ${metaHtml}
            </div>
        `;
    }

    stream.appendChild(row);
    scrollToBottom();
}

function scrollToBottom() {
    const viewport = document.getElementById("chat-viewport");
    if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
    }
}

function saveMessageToStorage(msgObj) {
    try {
        const history = JSON.parse(localStorage.getItem("serene_chat_history") || "[]");
        history.push(msgObj);
        // keep recent 30 messages
        if (history.length > 30) history.shift();
        localStorage.setItem("serene_chat_history", JSON.stringify(history));
    } catch (e) {}
}

function copyMessageText(btn) {
    const bubble = btn.closest(".msg-bubble");
    if (!bubble) return;
    const body = bubble.querySelector(".msg-body");
    if (!body) return;

    navigator.clipboard.writeText(body.innerText).then(() => {
        const originalText = btn.innerHTML;
        btn.innerHTML = "✅ Copied";
        setTimeout(() => { btn.innerHTML = originalText; }, 1800);
    }).catch(() => {});
}

// Markdown formatting helper
function formatMarkdown(text) {
    if (!text) return "";
    let safe = escapeHtml(text);

    // Bold **text**
    safe = safe.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Bullet points
    safe = safe.replace(/(?:^|\n)[•\-\*]\s+(.+)/g, "<br>• $1");

    // Line breaks
    safe = safe.replace(/\n/g, "<br>");

    return safe;
}

function escapeHtml(text) {
    if (!text) return "";
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Quick Chip Handlers
function handleChipClick(text) {
    if (text.includes("Box Breathing")) {
        openBreathingModal();
        return;
    }
    sendMessage(text);
}

// Select Mood from Hero Card
function selectMood(moodName, emoji) {
    logDailyMood(moodName, emoji);
    const starterMessage = `I'm feeling ${moodName.toLowerCase()} today ${emoji}. Can you help me reflect and find some calm?`;
    sendMessage(starterMessage);
}

// Clear Chat / New Chat
async function newChat() {
    try {
        await fetch(`${BACKEND_URL}/reset`, { method: "POST", credentials: "include" });
    } catch (e) {}

    localStorage.removeItem("serene_chat_history");

    const stream = document.getElementById("message-stream");
    if (stream) stream.innerHTML = "";

    showHeroCard();
}

// =====================================================
// ZEN MINDFUL BREATHING CONTROLLER
// =====================================================
let breathingInterval = null;
let breathingPhaseIndex = 0;
let breathingSecondsRemaining = 0;
let breathingCompletedCycles = 0;
let isBreathingActive = false;
let currentTechnique = "box";

const TECHNIQUES = {
    box: {
        name: "Box Breathing",
        goal: "Reset Nervous System",
        phases: [
            { name: "Inhale Slowly", duration: 4, action: "inhale" },
            { name: "Hold Breath", duration: 4, action: "hold" },
            { name: "Exhale Gently", duration: 4, action: "exhale" },
            { name: "Hold Breath", duration: 4, action: "hold" }
        ]
    },
    "478": {
        name: "4-7-8 Relaxing",
        goal: "Deep Sleep & Calm",
        phases: [
            { name: "Inhale Deeply", duration: 4, action: "inhale" },
            { name: "Hold Breath", duration: 7, action: "hold" },
            { name: "Exhale Completely", duration: 8, action: "exhale" }
        ]
    }
};

function openBreathingModal() {
    const modal = document.getElementById("breathing-modal");
    if (modal) modal.classList.remove("hidden");
}

function closeBreathingModal() {
    const modal = document.getElementById("breathing-modal");
    if (modal) modal.classList.add("hidden");
    pauseBreathing();
}

function selectBreathingTechnique(tech) {
    if (isBreathingActive) resetBreathing();
    currentTechnique = tech;

    document.querySelectorAll(".tech-pill").forEach(p => p.classList.remove("active"));
    const activeTab = document.getElementById(tech === "box" ? "tab-box" : "tab-478");
    if (activeTab) activeTab.classList.add("active");

    const goalEl = document.getElementById("technique-goal");
    if (goalEl) goalEl.textContent = TECHNIQUES[tech].goal;
}

function toggleBreathing() {
    if (isBreathingActive) {
        pauseBreathing();
    } else {
        startBreathing();
    }
}

function startBreathing() {
    isBreathingActive = true;
    const toggleBtn = document.getElementById("breathing-toggle-btn");
    if (toggleBtn) toggleBtn.textContent = "Pause Session";

    const tech = TECHNIQUES[currentTechnique];
    const currentPhase = tech.phases[breathingPhaseIndex];

    if (breathingSecondsRemaining <= 0) {
        breathingSecondsRemaining = currentPhase.duration;
    }

    applyPhaseVisual(currentPhase);

    breathingInterval = setInterval(() => {
        breathingSecondsRemaining--;

        const timerEl = document.getElementById("breathing-timer");
        if (timerEl) timerEl.textContent = breathingSecondsRemaining > 0 ? `${breathingSecondsRemaining}s` : "0s";

        if (breathingSecondsRemaining <= 0) {
            breathingPhaseIndex++;

            if (breathingPhaseIndex >= tech.phases.length) {
                breathingPhaseIndex = 0;
                breathingCompletedCycles++;
                const countEl = document.getElementById("cycle-count");
                if (countEl) countEl.textContent = `${breathingCompletedCycles}`;
            }

            const nextPhase = tech.phases[breathingPhaseIndex];
            breathingSecondsRemaining = nextPhase.duration;
            applyPhaseVisual(nextPhase);
        }
    }, 1000);
}

function applyPhaseVisual(phase) {
    const instructionEl = document.getElementById("breathing-instruction");
    const timerEl = document.getElementById("breathing-timer");
    const orb = document.getElementById("breathing-orb");

    if (instructionEl) instructionEl.textContent = phase.name;
    if (timerEl) timerEl.textContent = `${breathingSecondsRemaining}s`;

    if (orb) {
        orb.style.transitionDuration = `${phase.duration}s`;
        orb.className = `zen-breathing-orb ${phase.action}`;
    }
}

function pauseBreathing() {
    isBreathingActive = false;
    clearInterval(breathingInterval);
    breathingInterval = null;

    const toggleBtn = document.getElementById("breathing-toggle-btn");
    if (toggleBtn) toggleBtn.textContent = "Resume Session";
}

function resetBreathing() {
    pauseBreathing();
    breathingPhaseIndex = 0;
    breathingSecondsRemaining = 0;
    breathingCompletedCycles = 0;

    const toggleBtn = document.getElementById("breathing-toggle-btn");
    if (toggleBtn) toggleBtn.textContent = "Start Exercise";

    const instructionEl = document.getElementById("breathing-instruction");
    if (instructionEl) instructionEl.textContent = "Breathe In";

    const timerEl = document.getElementById("breathing-timer");
    if (timerEl) timerEl.textContent = "4s";

    const countEl = document.getElementById("cycle-count");
    if (countEl) countEl.textContent = "0";

    const orb = document.getElementById("breathing-orb");
    if (orb) orb.className = "zen-breathing-orb";
}

// =====================================================
// 5-4-3-2-1 GROUNDING WIZARD
// =====================================================
const GROUNDING_STEPS = [
    {
        badge: "STEP 1 OF 5",
        icon: "👁️",
        title: "Acknowledge 5 things you can SEE around you",
        desc: "Look closely at your environment. Notice colors, shadows, a pen on a table, patterns on the floor, or light coming through a window."
    },
    {
        badge: "STEP 2 OF 5",
        icon: "✋",
        title: "Acknowledge 4 things you can physically TOUCH",
        desc: "Feel the texture of your clothes, the coolness of a desk, the ground supporting your feet, or the warmth of your hands."
    },
    {
        badge: "STEP 3 OF 5",
        icon: "👂",
        title: "Acknowledge 3 things you can HEAR",
        desc: "Listen for distant sounds: traffic outside, a clock ticking, a fan humming, or the rhythm of your own breath."
    },
    {
        badge: "STEP 4 OF 5",
        icon: "👃",
        title: "Acknowledge 2 things you can SMELL",
        desc: "Notice the scent of fresh air, coffee, paper, or simply take a deep clean breath through your nose."
    },
    {
        badge: "STEP 5 OF 5",
        icon: "✨",
        title: "Acknowledge 1 positive thought or thing you can TASTE",
        desc: "Take a sip of water, notice a taste, and remind yourself: 'I am safe in this present moment. I am grounded.'"
    }
];

let currentGroundingIndex = 0;

function openGroundingModal() {
    currentGroundingIndex = 0;
    renderGroundingStep();
    const modal = document.getElementById("grounding-modal");
    if (modal) modal.classList.remove("hidden");
}

function closeGroundingModal() {
    const modal = document.getElementById("grounding-modal");
    if (modal) modal.classList.add("hidden");
}

function renderGroundingStep() {
    const step = GROUNDING_STEPS[currentGroundingIndex];
    document.getElementById("step-badge").textContent = step.badge;
    document.getElementById("step-icon").textContent = step.icon;
    document.getElementById("step-title").textContent = step.title;
    document.getElementById("step-description").textContent = step.desc;

    const prevBtn = document.getElementById("grounding-prev-btn");
    const nextBtn = document.getElementById("grounding-next-btn");

    if (prevBtn) prevBtn.style.display = currentGroundingIndex > 0 ? "block" : "none";
    if (nextBtn) {
        nextBtn.textContent = currentGroundingIndex === GROUNDING_STEPS.length - 1 ? "Complete Grounding ✨" : "Next Step →";
    }
}

function nextGroundingStep() {
    if (currentGroundingIndex < GROUNDING_STEPS.length - 1) {
        currentGroundingIndex++;
        renderGroundingStep();
    } else {
        closeGroundingModal();
        sendMessage("I just finished the 5-4-3-2-1 grounding exercise. I feel a bit more centered.");
    }
}

function prevGroundingStep() {
    if (currentGroundingIndex > 0) {
        currentGroundingIndex--;
        renderGroundingStep();
    }
}

// =====================================================
// MOOD JOURNAL LOGGING & VISUAL ANALYTICS
// =====================================================
const MOOD_SCORES = {
    "Joyful": 5,
    "Calm": 4,
    "Neutral": 3,
    "Anxious": 2,
    "Exhausted": 1
};

function openMoodModal() {
    const modal = document.getElementById("mood-modal");
    if (modal) modal.classList.remove("hidden");
    switchMoodTab("checkin");
    renderMoodHistory();
}

function closeMoodModal() {
    const modal = document.getElementById("mood-modal");
    if (modal) modal.classList.add("hidden");
}

function switchMoodTab(tabName) {
    const checkinBtn = document.getElementById("tab-mood-checkin");
    const analyticsBtn = document.getElementById("tab-mood-analytics");
    const checkinView = document.getElementById("mood-checkin-tab-view");
    const analyticsView = document.getElementById("mood-analytics-tab-view");

    if (tabName === "checkin") {
        if (checkinBtn) checkinBtn.classList.add("active");
        if (analyticsBtn) analyticsBtn.classList.remove("active");
        if (checkinView) checkinView.classList.remove("hidden");
        if (analyticsView) analyticsView.classList.add("hidden");
    } else {
        if (checkinBtn) checkinBtn.classList.remove("active");
        if (analyticsBtn) analyticsBtn.classList.add("active");
        if (checkinView) checkinView.classList.add("hidden");
        if (analyticsView) analyticsView.classList.remove("hidden");
        renderMoodAnalytics();
    }
}

function logDailyMood(name, emoji) {
    const entry = {
        name,
        emoji,
        score: MOOD_SCORES[name] || 3,
        date: new Date().toISOString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    loggedMoods.unshift(entry);
    if (loggedMoods.length > 20) loggedMoods.pop();

    try {
        localStorage.setItem("serene_logged_moods", JSON.stringify(loggedMoods));
    } catch (e) {}

    renderMoodHistory();
    renderMoodAnalytics();
}

function renderMoodHistory() {
    const container = document.getElementById("mood-history-list");
    if (!container) return;

    if (loggedMoods.length === 0) {
        container.innerHTML = '<span class="empty-note">No moods logged yet today.</span>';
        return;
    }

    container.innerHTML = loggedMoods.slice(0, 8).map(m => `
        <span class="mood-tag">${m.emoji} ${escapeHtml(m.name)} <small>(${m.time})</small></span>
    `).join("");
}

function renderMoodAnalytics() {
    const totalEl = document.getElementById("stat-total-logs");
    const topMoodEl = document.getElementById("stat-top-mood");
    const avgScoreEl = document.getElementById("stat-avg-score");
    const svgEl = document.getElementById("mood-chart-svg");

    if (!totalEl || !topMoodEl || !avgScoreEl || !svgEl) return;

    const total = loggedMoods.length;
    totalEl.textContent = total;

    if (total === 0) {
        topMoodEl.textContent = "None";
        avgScoreEl.textContent = "--";
        svgEl.innerHTML = `
            <text x="230" y="85" text-anchor="middle" fill="var(--text-muted)" font-size="13" font-family="inherit">
                Log a mood to see your emotional wave chart ✨
            </text>
        `;
        return;
    }

    // Calculate dominant mood
    const counts = {};
    let sumScore = 0;
    loggedMoods.forEach(m => {
        counts[m.name] = (counts[m.name] || 0) + 1;
        sumScore += (m.score || MOOD_SCORES[m.name] || 3);
    });

    let topMood = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    topMoodEl.textContent = topMood;
    avgScoreEl.textContent = (sumScore / total).toFixed(1) + " / 5";

    // Prepare chronological data points (max last 7)
    const pointsData = [...loggedMoods].slice(0, 7).reverse();
    renderMoodChartSvg(pointsData, svgEl);
}

function renderMoodChartSvg(data, svg) {
    const width = 460;
    const height = 150;
    const padX = 35;
    const padY = 20;

    const minScore = 1;
    const maxScore = 5;

    const numPoints = data.length;
    const stepX = numPoints > 1 ? (width - padX * 2) / (numPoints - 1) : 0;

    const coords = data.map((d, i) => {
        const score = d.score || MOOD_SCORES[d.name] || 3;
        const x = numPoints === 1 ? width / 2 : padX + i * stepX;
        const y = padY + (height - padY * 2) * (1 - (score - minScore) / (maxScore - minScore));
        return { x, y, score, name: d.name, emoji: d.emoji, time: d.time };
    });

    // Generate smooth path
    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
        const curr = coords[i];
        const next = coords[i + 1];
        const mx = (curr.x + next.x) / 2;
        pathD += ` C ${mx} ${curr.y}, ${mx} ${next.y}, ${next.x} ${next.y}`;
    }

    // Closed area path for gradient
    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

    let circlesSvg = coords.map((c, i) => `
        <g class="chart-point">
            <circle cx="${c.x}" cy="${c.y}" r="5.5" fill="var(--bg-surface)" stroke="var(--primary)" stroke-width="2.5" />
            <text x="${c.x}" y="${c.y - 10}" text-anchor="middle" font-size="12">${c.emoji}</text>
        </g>
    `).join("");

    svg.innerHTML = `
        <defs>
            <linearGradient id="moodAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.35" />
                <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.0" />
            </linearGradient>
        </defs>
        <path d="${areaD}" fill="url(#moodAreaGrad)" />
        <path d="${pathD}" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" />
        ${circlesSvg}
    `;
}

// =====================================================
// FEATURE 1: VOICE INPUT (SPEECH-TO-TEXT) & OUTPUT (TTS)
// =====================================================
let speechRecognition = null;
let isVoiceListening = false;

function toggleVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
        return;
    }

    const micBtn = document.getElementById("mic-btn");
    const inputArea = document.getElementById("user-input");

    if (isVoiceListening) {
        if (speechRecognition) speechRecognition.stop();
        setMicListeningState(false);
        return;
    }

    try {
        speechRecognition = new SpeechRecognition();
        speechRecognition.continuous = false;
        speechRecognition.interimResults = true;
        // hi-IN natively parses both Hindi & Hinglish/English smoothly
        speechRecognition.lang = "hi-IN";

        speechRecognition.onstart = () => {
            isVoiceListening = true;
            setMicListeningState(true);
            if (inputArea) inputArea.placeholder = "Listening... Speak naturally in Hindi or English";
        };

        speechRecognition.onresult = (event) => {
            let transcript = Array.from(event.results)
                .map(r => r[0].transcript)
                .join("");

            if (inputArea) {
                inputArea.value = transcript;
                autoResizeTextarea();
            }
        };

        speechRecognition.onerror = (err) => {
            console.warn("Speech error:", err);
            setMicListeningState(false);
        };

        speechRecognition.onend = () => {
            setMicListeningState(false);
            if (inputArea) {
                inputArea.placeholder = "What's weighing on your mind? Take your time...";
                inputArea.focus();
            }
        };

        speechRecognition.start();
    } catch (err) {
        console.error("Speech initialization error:", err);
        setMicListeningState(false);
    }
}

function setMicListeningState(listening) {
    isVoiceListening = listening;
    const micBtn = document.getElementById("mic-btn");
    if (!micBtn) return;

    if (listening) {
        micBtn.classList.add("listening");
        micBtn.title = "Click to stop listening";
    } else {
        micBtn.classList.remove("listening");
        micBtn.title = "Speak in Hindi/English (Voice Input)";
    }
}

// TEXT-TO-SPEECH (SPEAK MESSAGE)
let activeSpeechBtn = null;

function toggleSpeakMessage(btn) {
    if (!("speechSynthesis" in window)) {
        alert("Text-to-speech is not supported in this browser.");
        return;
    }

    // If currently speaking this message, stop it
    if (window.speechSynthesis.speaking && activeSpeechBtn === btn) {
        window.speechSynthesis.cancel();
        btn.innerHTML = "🔊 Speak";
        btn.classList.remove("speaking");
        activeSpeechBtn = null;
        return;
    }

    // Cancel any other running speech
    window.speechSynthesis.cancel();
    if (activeSpeechBtn) {
        activeSpeechBtn.innerHTML = "🔊 Speak";
        activeSpeechBtn.classList.remove("speaking");
    }

    const bubble = btn.closest(".msg-bubble");
    if (!bubble) return;
    const body = bubble.querySelector(".msg-body");
    if (!body) return;

    // Clean markdown/HTML for natural speech
    let rawText = body.innerText || "";
    rawText = rawText.replace(/[*_#•-]/g, "").replace(/\s+/g, " ").trim();

    if (!rawText) return;

    const utterance = new SpeechSynthesisUtterance(rawText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Select soothing voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.lang.includes("hi") || v.lang.includes("en-IN") || v.name.includes("Natural"));
    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onend = () => {
        btn.innerHTML = "🔊 Speak";
        btn.classList.remove("speaking");
        activeSpeechBtn = null;
    };

    utterance.onerror = () => {
        btn.innerHTML = "🔊 Speak";
        btn.classList.remove("speaking");
        activeSpeechBtn = null;
    };

    btn.innerHTML = "⏹️ Stop";
    btn.classList.add("speaking");
    activeSpeechBtn = btn;

    window.speechSynthesis.speak(utterance);
}

// =====================================================
// FEATURE 2: AMBIENT SOUND GENERATOR (WEB AUDIO API)
// =====================================================
let ambientAudioCtx = null;
let ambientSourceNode = null;
let ambientFilterNode = null;
let ambientGainNode = null;
let ambientLfoNode = null;
let currentAmbientSound = "off";
let ambientVolumeLevel = 0.35;

function toggleAmbientMenu() {
    const menu = document.getElementById("ambient-sound-menu");
    if (menu) menu.classList.toggle("hidden");
}

function initAmbientAudioContext() {
    if (!ambientAudioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        ambientAudioCtx = new AudioContext();
    }
    if (ambientAudioCtx.state === "suspended") {
        ambientAudioCtx.resume();
    }
}

function setAmbientVolume(val) {
    ambientVolumeLevel = parseFloat(val);
    if (ambientGainNode && ambientAudioCtx) {
        ambientGainNode.gain.setValueAtTime(ambientVolumeLevel, ambientAudioCtx.currentTime);
    }
}

function setAmbientSound(type) {
    currentAmbientSound = type;
    const btnLabel = document.getElementById("ambient-btn-label");
    const btnIcon = document.getElementById("ambient-btn-icon");
    const soundBtn = document.getElementById("ambient-sound-btn");

    document.querySelectorAll(".sound-option-btn").forEach(b => b.classList.remove("active"));
    const activeOpt = document.getElementById(`sound-btn-${type}`);
    if (activeOpt) activeOpt.classList.add("active");

    // Stop current sound
    stopAmbientAudio();

    if (type === "off") {
        if (btnLabel) btnLabel.textContent = "Ambient: Off";
        if (btnIcon) btnIcon.textContent = "🌧️";
        if (soundBtn) soundBtn.classList.remove("playing");
        return;
    }

    initAmbientAudioContext();
    if (soundBtn) soundBtn.classList.add("playing");

    if (type === "rain") {
        if (btnLabel) btnLabel.textContent = "Rain Playing";
        if (btnIcon) btnIcon.textContent = "🌧️";
        playRainSound();
    } else if (type === "ocean") {
        if (btnLabel) btnLabel.textContent = "Ocean Waves";
        if (btnIcon) btnIcon.textContent = "🌊";
        playOceanSound();
    } else if (type === "zen") {
        if (btnLabel) btnLabel.textContent = "Zen Noise";
        if (btnIcon) btnIcon.textContent = "🍃";
        playZenSound();
    }
}

function stopAmbientAudio() {
    try {
        if (ambientLfoNode) {
            ambientLfoNode.stop();
            ambientLfoNode.disconnect();
            ambientLfoNode = null;
        }
        if (ambientSourceNode) {
            ambientSourceNode.stop();
            ambientSourceNode.disconnect();
            ambientSourceNode = null;
        }
        if (ambientGainNode) {
            ambientGainNode.disconnect();
            ambientGainNode = null;
        }
    } catch (e) {}
}

function createNoiseBuffer(seconds, type = "pink") {
    const sampleRate = ambientAudioCtx.sampleRate;
    const bufferSize = sampleRate * seconds;
    const buffer = ambientAudioCtx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === "pink") {
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
            b6 = white * 0.115926;
        } else if (type === "brown") {
            lastOut = (lastOut + (0.02 * white)) / 1.02;
            data[i] = lastOut * 3.5;
        } else {
            data[i] = white * 0.2;
        }
    }
    return buffer;
}

function playRainSound() {
    const buffer = createNoiseBuffer(4, "pink");
    ambientSourceNode = ambientAudioCtx.createBufferSource();
    ambientSourceNode.buffer = buffer;
    ambientSourceNode.loop = true;

    // Bandpass filter for gentle rain texture
    ambientFilterNode = ambientAudioCtx.createBiquadFilter();
    ambientFilterNode.type = "bandpass";
    ambientFilterNode.frequency.value = 950;
    ambientFilterNode.Q.value = 1.1;

    ambientGainNode = ambientAudioCtx.createGain();
    ambientGainNode.gain.setValueAtTime(ambientVolumeLevel * 0.9, ambientAudioCtx.currentTime);

    ambientSourceNode.connect(ambientFilterNode);
    ambientFilterNode.connect(ambientGainNode);
    ambientGainNode.connect(ambientAudioCtx.destination);

    ambientSourceNode.start();
}

function playOceanSound() {
    const buffer = createNoiseBuffer(5, "brown");
    ambientSourceNode = ambientAudioCtx.createBufferSource();
    ambientSourceNode.buffer = buffer;
    ambientSourceNode.loop = true;

    // Lowpass filter for deep ocean rumble
    ambientFilterNode = ambientAudioCtx.createBiquadFilter();
    ambientFilterNode.type = "lowpass";
    ambientFilterNode.frequency.value = 420;

    ambientGainNode = ambientAudioCtx.createGain();
    ambientGainNode.gain.setValueAtTime(ambientVolumeLevel * 0.8, ambientAudioCtx.currentTime);

    // LFO to create oceanic swell (4-second tides)
    ambientLfoNode = ambientAudioCtx.createOscillator();
    ambientLfoNode.type = "sine";
    ambientLfoNode.frequency.value = 0.14; // ~7 sec tide cycle

    const lfoGain = ambientAudioCtx.createGain();
    lfoGain.gain.value = ambientVolumeLevel * 0.45;

    ambientLfoNode.connect(lfoGain);
    lfoGain.connect(ambientGainNode.gain);

    ambientSourceNode.connect(ambientFilterNode);
    ambientFilterNode.connect(ambientGainNode);
    ambientGainNode.connect(ambientAudioCtx.destination);

    ambientLfoNode.start();
    ambientSourceNode.start();
}

function playZenSound() {
    const buffer = createNoiseBuffer(4, "pink");
    ambientSourceNode = ambientAudioCtx.createBufferSource();
    ambientSourceNode.buffer = buffer;
    ambientSourceNode.loop = true;

    ambientFilterNode = ambientAudioCtx.createBiquadFilter();
    ambientFilterNode.type = "lowpass";
    ambientFilterNode.frequency.value = 1100;

    ambientGainNode = ambientAudioCtx.createGain();
    ambientGainNode.gain.setValueAtTime(ambientVolumeLevel * 0.7, ambientAudioCtx.currentTime);

    ambientSourceNode.connect(ambientFilterNode);
    ambientFilterNode.connect(ambientGainNode);
    ambientGainNode.connect(ambientAudioCtx.destination);

    ambientSourceNode.start();
}

// =====================================================
// FEATURE 3: CBT THOUGHT REFRAMER MODAL
// =====================================================
let latestReframedThought = "";

function openCbtModal() {
    const modal = document.getElementById("cbt-modal");
    if (modal) modal.classList.remove("hidden");
    resetCbtView();
}

function closeCbtModal() {
    const modal = document.getElementById("cbt-modal");
    if (modal) modal.classList.add("hidden");
}

function resetCbtView() {
    const inputView = document.getElementById("cbt-input-view");
    const resultView = document.getElementById("cbt-result-view");
    const thoughtInput = document.getElementById("cbt-thought-input");
    const analyzeBtn = document.getElementById("cbt-analyze-btn");

    if (inputView) inputView.classList.remove("hidden");
    if (resultView) resultView.classList.add("hidden");
    if (thoughtInput) thoughtInput.value = "";
    if (analyzeBtn) {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = "<span>✨ Analyze & Reframe Thought</span>";
    }
}

async function submitCbtReframe() {
    const thoughtInput = document.getElementById("cbt-thought-input");
    const intensitySlider = document.getElementById("cbt-intensity-slider");
    const analyzeBtn = document.getElementById("cbt-analyze-btn");

    const thought = (thoughtInput ? thoughtInput.value : "").trim();
    const intensity = intensitySlider ? parseInt(intensitySlider.value) : 80;

    if (!thought) {
        alert("Please enter the thought that is troubling you.");
        if (thoughtInput) thoughtInput.focus();
        return;
    }

    if (analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = "<span>🧠 Analyzing Thought Patterns...</span>";
    }

    try {
        const response = await fetch(`${BACKEND_URL}/cbt-reframe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ thought, intensity })
        });

        if (!response.ok) throw new Error("CBT API returned " + response.status);

        const data = await response.json();
        const analysis = data.analysis || {};

        renderCbtResults(analysis);
    } catch (err) {
        console.error("CBT analysis error:", err);
        alert("Unable to analyze thought right now. Please try again.");
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = "<span>✨ Analyze & Reframe Thought</span>";
        }
    }
}

function renderCbtResults(analysis) {
    const inputView = document.getElementById("cbt-input-view");
    const resultView = document.getElementById("cbt-result-view");

    const distortionBadge = document.getElementById("cbt-distortion-badge");
    const explanationEl = document.getElementById("cbt-explanation");
    const questionsList = document.getElementById("cbt-questions-list");
    const reframeText = document.getElementById("cbt-reframe-text");
    const actionText = document.getElementById("cbt-action-text");

    if (distortionBadge) distortionBadge.textContent = analysis.distortion || "Cognitive Distortion";
    if (explanationEl) explanationEl.textContent = analysis.explanation || "When we feel anxious, our mind often jumps to worst-case scenarios.";

    if (questionsList) {
        const qs = analysis.challenge_questions || ["Is there 100% evidence for this thought?"];
        questionsList.innerHTML = qs.map(q => `<li>${escapeHtml(q)}</li>`).join("");
    }

    latestReframedThought = analysis.reframed_thought || "This thought is just an emotion, not a factual truth.";
    if (reframeText) reframeText.textContent = latestReframedThought;
    if (actionText) actionText.textContent = analysis.micro_action || "Take 3 deep slow breaths and ground yourself in the present.";

    if (inputView) inputView.classList.add("hidden");
    if (resultView) resultView.classList.remove("hidden");
}

function sendCbtToChat() {
    closeCbtModal();
    if (latestReframedThought) {
        const message = `I just reframed an anxious thought: "${latestReframedThought}". Can you help me internalize this perspective?`;
        sendMessage(message);
    }
}

// =====================================================
// SOS EMERGENCY HELPLINES MODAL
// =====================================================
function openSosModal() {
    const modal = document.getElementById("sos-modal");
    if (modal) modal.classList.remove("hidden");
}

function closeSosModal() {
    const modal = document.getElementById("sos-modal");
    if (modal) modal.classList.add("hidden");
}

function handleModalBackdropClick(event, modalId) {
    if (event.target.id === modalId) {
        if (modalId === "breathing-modal") closeBreathingModal();
        if (modalId === "grounding-modal") closeGroundingModal();
        if (modalId === "mood-modal") closeMoodModal();
        if (modalId === "sos-modal") closeSosModal();
        if (modalId === "cbt-modal") closeCbtModal();
    }
}

