// 🔥 SUPABASE CONNECTION
const { createClient } = supabase;

const SUPABASE_URL = "https://zyafedcrfrtkdieznqhh.supabase.co";
const SUPABASE_KEY = "sb_publishable_DqhStG2Y2zKhPGnBdrxw5A_v5B-2yec";

const db = createClient(SUPABASE_URL, SUPABASE_KEY);


// 🌙 INITIAL SETUP
document.addEventListener("DOMContentLoaded", function () {

    showUser();

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


// 🔐 REGISTER
async function register() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { error } = await db.auth.signUp({ email, password });

    if (error) {
        alert(error.message);
    } else {
        alert("Registration successful! Check your email.");
    }
}


// 🔐 LOGIN
async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
        alert(error.message);
    } else {
        alert("Login successful!");

        // Reset free counter
        localStorage.removeItem("freeCount");

        window.location.href = "index.html";
    }
}


// 🔓 LOGOUT (UPDATED)
async function logout() {
    await db.auth.signOut();

    // Reset free message limit
    localStorage.removeItem("freeCount");

    // Update navbar instantly
    const navUser = document.getElementById("nav-user");
    const loginBtn = document.getElementById("login-btn");
    const logoutBtn = document.getElementById("logout-btn");

    if (navUser) navUser.innerText = "Guest";
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";

    // Redirect to chat page
    window.location.href = "index.html";
}


// 👤 SHOW USER
async function showUser() {
    const { data } = await db.auth.getUser();

    const navUser = document.getElementById("nav-user");
    const loginBtn = document.getElementById("login-btn");
    const logoutBtn = document.getElementById("logout-btn");

    if (data.user) {
        if (navUser) navUser.innerText = data.user.email;
        if (loginBtn) loginBtn.style.display = "none";
        if (logoutBtn) logoutBtn.style.display = "inline-block";
    } else {
        if (navUser) navUser.innerText = "Guest";
        if (loginBtn) loginBtn.style.display = "inline-block";
        if (logoutBtn) logoutBtn.style.display = "none";
    }
}


// 💬 SEND MESSAGE WITH FREE LIMIT
async function sendMessage() {

    const inputField = document.getElementById("user-input");
    if (!inputField) return;

    const message = inputField.value.trim();
    if (!message) return;

    const { data: userData } = await db.auth.getUser();
    const user = userData?.user;

    let freeCount = localStorage.getItem("freeCount")
        ? parseInt(localStorage.getItem("freeCount"))
        : 0;

    let remaining = 10 - freeCount;

    // 🚫 Block if limit reached
    if (!user && remaining <= 0) {
        alert("You have used all 10 free messages. Please login to continue.");
        window.location.href = "login.html";
        return;
    }

    // ⚠️ Warning when 2 left
    if (!user && remaining === 2) {
        alert("⚠️ Only 2 free messages left. Login for unlimited access.");
    }

    inputField.value = "";

    try {
        const response = await fetch("http://127.0.0.1:5000/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        });

        const data = await response.json();

        appendNewMessages(data.history, data.emotion, data.confidence);

        if (user) {
            const lastMessages = data.history.slice(-2);
            for (let msg of lastMessages) {
                await db.from("chats").insert({
                    user_id: user.id,
                    sender: msg.sender,
                    message: msg.text,
                    emotion: msg.sender === "bot" ? data.emotion : null,
                    confidence: msg.sender === "bot" ? data.confidence : null
                });
            }
        } else {
            freeCount++;
            localStorage.setItem("freeCount", freeCount);
        }

    } catch (error) {
        console.error(error);
        alert("Backend not connected.");
    }
}


// ✅ APPEND MESSAGE
function appendNewMessages(history, emotion, confidence) {

    const chatBox = document.getElementById("chat-box");
    if (!chatBox) return;

    const lastMessages = history.slice(-2);

    lastMessages.forEach((msg) => {
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
        await fetch("http://127.0.0.1:5000/reset", { method: "POST" });
    } catch (error) {
        console.error(error);
    }

    const chatBox = document.getElementById("chat-box");
    if (chatBox) chatBox.innerHTML = "";
}
