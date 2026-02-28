const BACKEND_URL = "https://ai-mental-helath-chatbot.onrender.com";

// 🌙 INITIAL SETUP
document.addEventListener("DOMContentLoaded", function () {
    // 🔥 Warm-up backend
    fetch(`${BACKEND_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "warmup" })
    }).catch(() => {});

    const toggleBtn = document.getElementById("theme-toggle");
    const inputField = document.getElementById("user-input");

    // 🌙 Dark Mode
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            document.body.classList.toggle("dark-mode");

            if (document.body.classList.contains("dark-mode")) {
                toggleBtn.textContent = "☀️";
                localStorage.setItem("theme", "dark");
            } else {
                toggleBtn.textContent = "🌙";
                localStorage.setItem("theme", "light");
            }
        });

        if (localStorage.getItem("theme") === "dark") {
            document.body.classList.add("dark-mode");
            toggleBtn.textContent = "☀️";
        }
    }

    // ENTER KEY
    if (inputField) {
        inputField.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                sendMessage();
            }
        });
    }
});

// 💬 SEND MESSAGE (no database insert)
async function sendMessage() {
    const inputField = document.getElementById("user-input");
    if (!inputField) return;

    const message = inputField.value.trim();
    if (!message) return;

    inputField.value = "";

    // 🔹 Immediately show user message
    appendNewMessages([{ sender: "user", text: message }]);

    // 🔹 Show typing animation
    const typingIndicator = showTyping();

    try {
        const response = await fetch(`${BACKEND_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        });

        const data = await response.json();

        // 🔹 Remove typing animation
        if (typingIndicator) typingIndicator.remove();

        const botReply = data.history[data.history.length - 1];
        appendNewMessages([botReply], data.emotion, data.confidence);

    } catch (error) {
        if (typingIndicator) typingIndicator.remove();
        console.error(error);
        alert("Backend not connected.");
    }
}

// 🔵 Show Typing Indicator
function showTyping() {
    const chatBox = document.getElementById("chat-box");
    if (!chatBox) return null;

    const typingDiv = document.createElement("div");
    typingDiv.classList.add("message", "typing-indicator");

    typingDiv.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;

    chatBox.appendChild(typingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    return typingDiv;
}

// ✅ APPEND MESSAGE
function appendNewMessages(history, emotion, confidence) {
    const chatBox = document.getElementById("chat-box");
    if (!chatBox) return;

    history.forEach((msg) => {
        const div = document.createElement("div");
        div.classList.add("message");

        if (msg.sender === "user") {
            div.classList.add("user-message");
            div.innerHTML = `<strong>You:</strong> ${msg.text}`;
        } else {
            div.classList.add("bot-message");
            div.innerHTML = `<strong>Bot:</strong> ${msg.text}`;

            if (emotion && confidence) {
                div.innerHTML += `
                    <div class="meta-info">
                        Emotion: ${emotion} | Confidence: ${confidence}
                    </div>
                `;
            }
        }

        chatBox.appendChild(div);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
}

// 🔥 NEW CHAT
async function newChat() {
    try {
        await fetch(`${BACKEND_URL}/reset`, { method: "POST" });
    } catch (error) {
        console.error(error);
    }

    const chatBox = document.getElementById("chat-box");
    if (chatBox) chatBox.innerHTML = "";
}
// 🟢 Periodic Ping to keep backend warm
setInterval(() => {
  fetch(`${BACKEND_URL}/health`)
    .catch(() => {});
}, 10 * 60 * 1000); // हर 10 मिनट पर ping
