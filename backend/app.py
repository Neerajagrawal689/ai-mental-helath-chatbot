from flask import Flask, request, jsonify, session
from flask_cors import CORS
import csv, json, random, os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB

app = Flask(__name__)
app.secret_key = "supersecretkey"

# ✅ Enable CORS for separate frontend
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# =====================================================
# LOAD RESPONSES
# =====================================================
responses = {}
csv_path = os.path.join(BASE_DIR, "data", "mental_health_responses.csv")

try:
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            responses[row["emotion"].strip().lower()] = row["response"].strip()
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
# LOAD CRISIS SUPPORT MESSAGE
# =====================================================
crisis_support_message = ""
crisis_path = os.path.join(BASE_DIR, "data", "crisis_support.txt")

try:
    with open(crisis_path, encoding="utf-8") as f:
        crisis_support_message = f.read().strip()
except Exception as e:
    print("Crisis Support Load Error:", e)
    crisis_support_message = "Please contact emergency services immediately."

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

if training_texts:
    vectorizer = TfidfVectorizer()
    X_train = vectorizer.fit_transform(training_texts)

    model = MultinomialNB()
    model.fit(X_train, training_labels)
    print("ML Model Trained ✅")
else:
    vectorizer = None
    model = None

# =====================================================
# KEYWORDS
# =====================================================
greetings = ["hi", "hello", "hey", "hii", "good morning", "good evening"]
tip_keywords = ["tip", "advice", "suggestion", "what should i do", "how to relax"]
crisis_keywords = ["suicide", "kill myself", "end my life", "self harm", "i want to die", "hurt myself"]
end_keywords = ["bye", "goodbye", "see you", "exit", "quit", "thank you", "thanks", "talk later"]

# =====================================================
# ROUTES
# =====================================================

# ✅ API Root
@app.route("/")
def home():
    return jsonify({"message": "Mental Health Chatbot API is running 🚀"})

# ✅ Health Check Route
@app.route("/health")
def health():
    return jsonify({"status": "OK"})

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    user_message = data.get("message", "").strip().lower()

    if "history" not in session:
        session["history"] = []

    # -------- END --------
    if any(word in user_message for word in end_keywords):
        session.clear()
        return jsonify({
            "reply": "Conversation ended 😊 Start again by saying 'Hi'.",
            "emotion": None,
            "confidence": None,
            "history": []
        })

    # -------- GREETING --------
    if user_message in greetings:
        if len(session["history"]) == 0:
            bot_reply = "Hi 😊 Nice to meet you. How are you feeling today?"
        else:
            bot_reply = "Hey again 🙂 How can I help you now?"

        session["history"].append({"sender": "user", "text": user_message})
        session["history"].append({"sender": "bot", "text": bot_reply})
        session.modified = True

        return jsonify({
            "reply": bot_reply,
            "emotion": None,
            "confidence": None,
            "history": session["history"]
        })

    # -------- CRISIS --------
    if any(word in user_message for word in crisis_keywords):
        session["history"].append({"sender": "user", "text": user_message})
        session["history"].append({"sender": "bot", "text": crisis_support_message})
        session.modified = True

        return jsonify({
            "reply": crisis_support_message,
            "emotion": "crisis",
            "confidence": "High Risk",
            "history": session["history"]
        })

    # -------- NORMAL --------
    session["history"].append({"sender": "user", "text": user_message})

    wants_tip = any(word in user_message for word in tip_keywords)

    detected_emotion = "neutral"
    confidence_score = 0

    if model and vectorizer:
        try:
            user_vector = vectorizer.transform([user_message])
            probabilities = model.predict_proba(user_vector)[0]
            max_prob = max(probabilities)
            confidence_score = round(max_prob * 100, 2)
            detected_emotion = model.classes_[probabilities.argmax()]
        except:
            detected_emotion = "neutral"

    if detected_emotion not in responses:
        for emotion, keywords in sentiment_keywords.items():
            if any(keyword in user_message for keyword in keywords):
                detected_emotion = emotion
                break

    base_reply = responses.get(
        detected_emotion,
        responses.get("neutral", "I'm here to listen.")
    )

    if wants_tip and relaxation_tips:
        tip = random.choice(relaxation_tips)
        final_reply = f"{base_reply}\n\n💡 Relaxation Tip: {tip}"
    else:
        final_reply = base_reply

    session["history"].append({"sender": "bot", "text": final_reply})
    session.modified = True

    return jsonify({
        "reply": final_reply,
        "emotion": detected_emotion,
        "confidence": f"{confidence_score}%",
        "history": session["history"]
    })

# =====================================================
# RUN
# =====================================================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))  # default 5000 for local
    app.run(host="0.0.0.0", port=port, debug=True)