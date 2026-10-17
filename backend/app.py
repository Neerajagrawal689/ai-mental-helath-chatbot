from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
import csv, json, random, os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BASE_DIR, ".env"))
except ImportError:
    pass

import requests

# Handle scikit-learn gracefully
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.naive_bayes import MultinomialNB
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False
    TfidfVectorizer = None
    MultinomialNB = None

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "supersecretkey_dev_mode_change_for_prod")

# Enable CORS with credentials support
CORS(app, supports_credentials=True)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()

# =====================================================
# SYSTEM PROMPT FOR GENERATIVE AI COMPANION
# =====================================================
SYSTEM_PROMPT = """You are Serene, a warm, compassionate, and trauma-informed AI Mental Health Companion.
Your role is to offer supportive, non-judgmental active listening and evidence-based self-care suggestions.

CRITICAL LANGUAGE REQUIREMENT:
- MIRROR THE USER'S EXACT LANGUAGE AND SCRIPT:
  - If the user writes in Hinglish (Hindi written using English/Latin alphabet, e.g. "mai bahut dukhi mahsoos kr rha hu", "mujhe tension ho rahi hai", "kya karu", "bohot akela feel ho raha hai"):
    YOU MUST RESPOND COMPLETELY IN NATURAL, COMPASSIONATE HINGLISH!
    Example: "Mujhe sunkar sach me bura laga... Main samajh sakti hoon aapka dil is waqt kitna bhaari mehsoos kar raha hai. Main aapke saath hoon, bilkul aaram se bataiye — kis baat se aap itna dukhi mehsoos kar rahe hain?"
    Do NOT reply in pure formal English! Do NOT reply in Devanagari script when they write in English letters!
  - If the user writes in English, reply in warm English.
  - If the user writes in Hindi (Devanagari), reply in Hindi (Devanagari).
  Always speak like a loving, caring friend or counselor who deeply understands their culture and heart.

CORE PRINCIPLES:
1. Practice Active & Empathetic Listening: Acknowledge the user's emotion directly, validate what they are experiencing.
2. Gentle CBT & Mindfulness: Help reframe negative thoughts softly without toxic positivity. When suitable, gently suggest calming practices (like box breathing or grounding).
3. Conversational & Warm: Keep replies heartfelt, concise (2 short paragraphs max), and comforting.
4. End with an Open-Ended Question: Invite them to gently unpack their feelings without any pressure.
5. STRICT SAFETY BOUNDARIES:
   - You are an AI companion, NOT a doctor or therapist. Never diagnose illnesses or recommend medications.
   - If the user expresses intent for self-harm, immediately provide emergency helpline support.
"""

# =====================================================
# LOAD RESPONSES (Store all responses per emotion as a list) - Reloaded
# =====================================================
responses = {}
csv_path = os.path.join(BASE_DIR, "data", "mental_health_responses.csv")

try:
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            emotion = row["emotion"].strip().lower()
            text = row["response"].strip()
            if emotion not in responses:
                responses[emotion] = []
            responses[emotion].append(text)
    print(f"Loaded {sum(len(v) for v in responses.values())} responses for {len(responses)} emotions [OK]")
except Exception as e:
    print("Response CSV Error:", e)

# =====================================================
# LOAD SENTIMENT KEYWORDS
# =====================================================
sentiment_keywords = {}
json_path = os.path.join(BASE_DIR, "data", "sentiment_keywords.json")

try:
    with open(json_path, encoding="utf-8") as f:
        sentiment_keywords = json.load(f)
except Exception as e:
    print("Keyword JSON Error:", e)

# =====================================================
# LOAD RELAXATION TIPS
# =====================================================
relaxation_tips = []
tips_path = os.path.join(BASE_DIR, "data", "relaxation_tips.txt")

try:
    with open(tips_path, encoding="utf-8") as f:
        relaxation_tips = [line.strip() for line in f if line.strip()]
except Exception as e:
    print("Tips Load Error:", e)

# =====================================================
# LOAD COPING STRATEGIES
# =====================================================
coping_strategies = {}
coping_path = os.path.join(BASE_DIR, "data", "coping_strategies.json")

try:
    with open(coping_path, encoding="utf-8") as f:
        coping_strategies = json.load(f)
except Exception as e:
    print("Coping Strategies Load Error:", e)

# =====================================================
# LOAD CRISIS SUPPORT MESSAGE
# =====================================================
crisis_support_message = ""
crisis_path = os.path.join(BASE_DIR, "data", "crisis_support.txt")

try:
    with open(crisis_path, encoding="utf-8") as f:
        crisis_support_message = f.read().strip()
except Exception as e:
    print("Crisis Support Load Error:", e)

if not crisis_support_message:
    crisis_support_message = (
        "Please remember that you are not alone and immediate help is available:\n"
        "• India (Tele-MANAS): 14416 / 1800-891-4416 (24x7, Toll-Free)\n"
        "• India (KIRAN): 1800-599-0019\n"
        "• Vandrevala Foundation: 9999 666 555\n"
        "• US & Canada: Call or Text 988\n"
        "• UK: 111 (NHS) / Text SHOUT to 85258"
    )

# =====================================================
# TRAIN ML MODEL
# =====================================================
training_texts = []
training_labels = []
train_path = os.path.join(BASE_DIR, "data", "training_data.csv")

try:
    with open(train_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            training_texts.append(row["text"].lower())
            training_labels.append(row["emotion"].lower())
except Exception as e:
    print("Training Data Error:", e)

if HAS_SKLEARN and training_texts:
    try:
        vectorizer = TfidfVectorizer()
        X_train = vectorizer.fit_transform(training_texts)

        model = MultinomialNB()
        model.fit(X_train, training_labels)
        print("ML Model Trained [OK]")
    except Exception as e:
        print("ML Model Training Error:", e)
        vectorizer = None
        model = None
else:
    vectorizer = None
    model = None

# =====================================================
# KEYWORDS & SAFETY
# =====================================================
greetings = ["hi", "hello", "hey", "hii", "good morning", "good evening", "namaste", "hola"]
tip_keywords = ["tip", "advice", "suggestion", "what should i do", "how to relax", "coping", "calm down", "help me"]
crisis_keywords = ["suicide", "kill myself", "end my life", "self harm", "i want to die", "hurt myself", "dying", "cutting myself", "end it all"]
end_keywords = ["bye", "goodbye", "see you", "exit", "quit", "thank you", "thanks", "talk later"]

# =====================================================
# GEMINI GENERATIVE AI HELPER
# =====================================================
def generate_gemini_reply(user_message, history):
    """
    Calls Google Gemini API with conversational context and safety prompt.
    Returns generated string on success, or None on failure/missing key.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "").strip() or GEMINI_API_KEY
    if not api_key:
        return None

    # Supported fast models in order of priority (flash-lite provides sub-second responses)
    models = ["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-3.8-flash"]

    # Construct conversation history (limit to last 6 messages to stay lightweight)
    contents = []
    # Avoid duplicating current message if already in history
    prior_history = history[:-1] if (history and history[-1].get("text") == user_message) else (history or [])
    recent_history = prior_history[-6:]
    for msg in recent_history:
        role = "user" if msg.get("sender") == "user" else "model"
        text = (msg.get("text") or "").strip()
        if text:
            contents.append({"role": role, "parts": [{"text": text}]})

    contents.append({"role": "user", "parts": [{"text": user_message}]})

    payload = {
        "system_instruction": {
            "parts": [{"text": SYSTEM_PROMPT}]
        },
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "topP": 0.95,
            "maxOutputTokens": 500
        }
    }

    for model_name in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        try:
            res = requests.post(url, json=payload, timeout=18)
            if res.status_code == 200:
                data = res.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        return parts[0].get("text", "").strip()
            else:
                print(f"Gemini API ({model_name}) error code {res.status_code}: {res.text[:120]}")
        except Exception as err:
            print(f"Gemini API request error ({model_name}):", err)

    return None

def generate_cbt_reframe(thought, intensity=75):
    """
    Analyzes an automatic negative thought (ANT) using CBT principles and returns
    distortion diagnosis, challenge questions, reframed thought, and micro action.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "").strip() or GEMINI_API_KEY
    cbt_prompt = (
        "You are an empathetic, clinical Cognitive Behavioral Therapy (CBT) expert.\n"
        "A user has shared an Automatic Negative Thought (ANT):\n"
        f"Thought: \"{thought}\"\n"
        f"Belief Intensity: {intensity}%\n\n"
        "Your task: Analyze this thought with compassion and structure. Match the user's language (if Hinglish, respond in warm, natural Hinglish; if English, respond in English; if Hindi, Hindi).\n"
        "Return valid JSON with keys:\n"
        "- distortion: Name of primary cognitive distortion (e.g. Mind Reading, Catastrophizing, All-or-Nothing, Personalization, Fortune Telling, Emotional Reasoning).\n"
        "- explanation: 1-2 empathetic sentences explaining how our mind falls into this trap.\n"
        "- challenge_questions: A list of 2 short, powerful Socratic questions to challenge this thought.\n"
        "- reframed_thought: A balanced, compassionate, and realistic replacement statement.\n"
        "- micro_action: One immediate 2-minute actionable self-care or grounding step.\n"
    )

    if api_key:
        models = ["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-3.8-flash"]
        payload = {
            "contents": [{"role": "user", "parts": [{"text": cbt_prompt}]}],
            "generationConfig": {
                "temperature": 0.4,
                "topP": 0.95,
                "response_mime_type": "application/json"
            }
        }
        for model_name in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            try:
                res = requests.post(url, json=payload, timeout=18)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            raw_json = parts[0].get("text", "").strip()
                            if raw_json.startswith("```json"):
                                raw_json = raw_json[7:]
                            if raw_json.startswith("```"):
                                raw_json = raw_json[3:]
                            if raw_json.endswith("```"):
                                raw_json = raw_json[:-3]
                            return json.loads(raw_json.strip())
            except Exception as e:
                print(f"CBT Gemini API error ({model_name}):", e)

    # Compassionate Fallback
    return {
        "distortion": "Catastrophizing & Mind Reading (अति-चिंता और अनुमान लगाना)",
        "explanation": "Hamara dimag aksar sabse bura scenario imagine kar leta hai ya bina kisi thos saboot ke yeh maan leta hai ki sab hamare khilaaf hain.",
        "challenge_questions": [
            "Kya mere paas is baat ka 100% pakka aur sachha saboot hai?",
            "Agar mera koi pyara dost aisi baat bolta, toh main usse kya kehta?"
        ],
        "reframed_thought": "Yeh sirf mere man ka ek dar ya vichar hai, vastavik sachayi nahi. Main is pal mein surakshit hoon aur dheere-dheere ise sambhal sakta hoon.",
        "micro_action": "Ek gehra lamba saans lein (4 sec inhale, 4 sec exhale) aur apne kandhe thode dheele chhodein."
    }

# =====================================================
# ROUTES
# =====================================================

@app.route("/")
def home():
    # If accessed from a web browser, serve the interactive web UI
    if "text/html" in request.headers.get("Accept", ""):
        if os.path.exists(os.path.join(FRONTEND_DIR, "index.html")):
            return send_from_directory(FRONTEND_DIR, "index.html")

    has_gemini = bool(os.environ.get("GEMINI_API_KEY", "").strip() or GEMINI_API_KEY)
    return jsonify({
        "message": "Mental Health Chatbot API is running [OK]",
        "status": "healthy",
        "ai_engine": "Gemini Flash Lite" if has_gemini else "Local ML & Coping Engine",
        "ml_ready": model is not None,
        "gemini_active": has_gemini
    })

@app.route("/<path:filename>")
def serve_static(filename):
    if os.path.exists(os.path.join(FRONTEND_DIR, filename)):
        return send_from_directory(FRONTEND_DIR, filename)
    return jsonify({"error": "Resource not found"}), 404

@app.route("/health")
def health():
    return jsonify({"status": "OK"})

@app.route("/reset", methods=["POST", "GET"])
def reset():
    session.clear()
    return jsonify({
        "message": "Conversation history cleared successfully",
        "status": "OK"
    })

@app.route("/cbt-reframe", methods=["POST"])
def cbt_reframe():
    data = request.get_json(silent=True) or {}
    thought = (data.get("thought") or "").strip()
    intensity = data.get("intensity", 75)

    if not thought:
        return jsonify({"error": "Thought is required"}), 400

    result = generate_cbt_reframe(thought, intensity)
    return jsonify({
        "status": "success",
        "thought": thought,
        "intensity": intensity,
        "analysis": result
    })

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = data.get("message", "").strip()

    if not user_message:
        return jsonify({
            "reply": "I'm here whenever you'd like to share. How are you feeling today?",
            "emotion": "neutral",
            "confidence": "N/A",
            "source": "Local System",
            "history": session.get("history", [])
        })

    msg_lower = user_message.lower()

    if "history" not in session:
        session["history"] = []

    # -------- END CONVERSATION --------
    if any(word in msg_lower for word in end_keywords):
        end_reply = "Conversation ended 😊 Take care! You can start again anytime by saying 'Hi'."
        session.clear()
        return jsonify({
            "reply": end_reply,
            "emotion": "neutral",
            "confidence": "N/A",
            "source": "Local System",
            "history": [{"sender": "user", "text": user_message}, {"sender": "bot", "text": end_reply}]
        })

    # -------- GREETING (Only static if Gemini is not available) --------
    has_api_key = bool(os.environ.get("GEMINI_API_KEY", "").strip() or GEMINI_API_KEY)
    if not has_api_key and any(msg_lower == g or msg_lower.startswith(g + " ") for g in greetings):
        if len(session["history"]) == 0:
            bot_reply = "Hi 😊 Nice to meet you. I'm Serene, your mental health companion. How are you feeling today?"
        else:
            bot_reply = "Hey again 🙂 How can I support you right now?"

        session["history"].append({"sender": "user", "text": user_message})
        session["history"].append({"sender": "bot", "text": bot_reply})
        session.modified = True

        return jsonify({
            "reply": bot_reply,
            "emotion": "greeting",
            "confidence": "100%",
            "source": "Local System",
            "history": session["history"]
        })

    # -------- ZERO-LATENCY CRISIS GUARDRAIL --------
    if any(phrase in msg_lower for phrase in crisis_keywords):
        session["history"].append({"sender": "user", "text": user_message})
        session["history"].append({"sender": "bot", "text": crisis_support_message})
        session.modified = True

        return jsonify({
            "reply": crisis_support_message,
            "emotion": "crisis",
            "confidence": "High Risk",
            "source": "Emergency Safety Protocol",
            "history": session["history"]
        })

    # -------- EMOTION DETECTION (LOCAL ML & KEYWORDS) --------
    session["history"].append({"sender": "user", "text": user_message})

    wants_tip = any(word in msg_lower for word in tip_keywords)
    detected_emotion = "neutral"
    confidence_score = None

    # Step 1: ML Model prediction
    if model and vectorizer:
        try:
            user_vector = vectorizer.transform([msg_lower])
            probabilities = model.predict_proba(user_vector)[0]
            max_prob = max(probabilities)
            if max_prob >= 0.25:
                detected_emotion = model.classes_[probabilities.argmax()]
                confidence_score = f"{round(max_prob * 100, 1)}%"
        except Exception as e:
            print("Prediction error:", e)

    # Step 2: Fallback to keyword matching if ML didn't detect strong emotion
    if detected_emotion == "neutral" or detected_emotion not in responses:
        for emotion, keywords in sentiment_keywords.items():
            if any(keyword in msg_lower for keyword in keywords):
                detected_emotion = emotion
                confidence_score = "Keyword Match"
                break

    if not confidence_score:
        confidence_score = "Moderate"

    # Step 3: GENERATIVE AI (Gemini) with Fallback
    gemini_reply = generate_gemini_reply(user_message, session["history"])

    if gemini_reply:
        final_reply = gemini_reply
        source_engine = "Gemini AI"
    else:
        # Fallback to local response database & coping strategies
        source_engine = "Local ML Engine"
        default_neutral = ["I'm here to listen. Tell me more about how you're feeling."]
        available_responses = responses.get(detected_emotion, responses.get("neutral", default_neutral))
        if isinstance(available_responses, list) and available_responses:
            base_reply = random.choice(available_responses)
        elif isinstance(available_responses, str):
            base_reply = available_responses
        else:
            base_reply = "I'm listening. Please take your time."

        tip_text = None
        emotion_coping = coping_strategies.get(detected_emotion) or coping_strategies.get(
            "sad" if detected_emotion == "sadness" else ("anger" if detected_emotion == "angry" else None)
        )

        if wants_tip:
            if emotion_coping:
                tip_text = random.choice(emotion_coping)
            elif relaxation_tips:
                tip_text = random.choice(relaxation_tips)

        if tip_text:
            final_reply = f"{base_reply}\n\n💡 Coping Suggestion: {tip_text}"
        else:
            final_reply = base_reply

    session["history"].append({"sender": "bot", "text": final_reply})
    session.modified = True

    return jsonify({
        "reply": final_reply,
        "emotion": detected_emotion,
        "confidence": confidence_score,
        "source": source_engine,
        "history": session["history"]
    })

# =====================================================
# RUN
# =====================================================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)