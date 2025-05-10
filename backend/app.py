from flask import Flask, request, jsonify
from flask_cors import CORS
from langdetect import detect
import os
import torch
import re
import fitz  # PyMuPDF
import requests
from transformers import AutoTokenizer, AutoModel

# Variable globale
pdf_lang = "en"

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploaded_files"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# === Modèle léger pour embeddings ===
MODEL_NAME = "sentence-transformers/paraphrase-MiniLM-L6-v2"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModel.from_pretrained(MODEL_NAME)

extracted_text = ""
pdf_sections = []
pdf_embeddings = None

# Lecture optimisée du texte PDF
def extract_text_from_pdf(filepath, max_pages=None):
    try:
        doc = fitz.open(filepath)
        pages = doc[:max_pages] if max_pages else doc
        return "\n".join(page.get_text("text") for page in pages if page.get_text("text"))
    except Exception as e:
        print(f"Erreur lecture PDF : {e}")
        return ""

# Divise le texte par blocs de 800 caractères (au lieu de titres)
def split_text_into_chunks(text, chunk_size=800):
    text = re.sub(r"\s+", " ", text)
    return [text[i:i+chunk_size].strip() for i in range(0, len(text), chunk_size) if len(text[i:i+chunk_size].strip()) > 50]

def clean_question(text):
    return text.strip()

def mean_pooling(model_output, attention_mask):
    token_embeddings = model_output[0]
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size())
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

def encode(texts):
    if isinstance(texts, str):
        texts = [texts]
    inputs = tokenizer(texts, padding=True, truncation=True, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs)
    return mean_pooling(outputs, inputs['attention_mask'])

def call_llama3(prompt):
    response = requests.post(
        "http://localhost:11434/api/generate",
        json={"model": "llama3", "prompt": prompt, "stream": False}
    )
    return response.json().get("response", "No response generated.").strip()

@app.route("/upload", methods=["POST"])
def upload_pdf():
    global extracted_text, pdf_sections, pdf_embeddings, pdf_lang

    if 'pdf' not in request.files:
        return jsonify({"message": "No PDF file received."}), 400

    file = request.files['pdf']
    if file.filename == '':
        return jsonify({"message": "Invalid filename."}), 400

    filepath = os.path.join(app.config["UPLOAD_FOLDER"], file.filename)
    file.save(filepath)

    extracted_text = extract_text_from_pdf(filepath)
    if not extracted_text.strip():
        return jsonify({"message": "PDF is empty or unreadable."}), 400

    try:
        pdf_lang = detect(extracted_text[:1000])
    except Exception:
        pdf_lang = "en"  # fallback

    pdf_sections = split_text_into_chunks(extracted_text)
    if not pdf_sections:
        return jsonify({"message": "No useful content found in PDF."}), 400

    pdf_embeddings = encode(pdf_sections)
    return jsonify({"message": "✅ PDF successfully analyzed."})

@app.route("/ask", methods=["POST"])
def ask_question():
    global pdf_embeddings, pdf_sections, pdf_lang

    data = request.get_json()
    question = data.get("question", "").strip()
    if not question:
        return jsonify({"answer": "❌ No question provided."}), 400

    if pdf_embeddings is None or len(pdf_sections) == 0:
        return jsonify({"answer": "❗ No document has been processed yet."}), 400

    question_embedding = encode(f"query: {question}")[0]
    scores = torch.nn.functional.cosine_similarity(pdf_embeddings, question_embedding.unsqueeze(0)).squeeze()

    best_idx = torch.argmax(scores).item()
    best_score = scores[best_idx].item()
    threshold = 0.4

    if best_score < threshold:
        return jsonify({"answer": "No relevant answer found in the document."})

    context = pdf_sections[best_idx]

    if pdf_lang.startswith("fr"):
        prompt = f"### CONTEXTE :\n{context}\n\n### QUESTION :\n{question}\n\n### RÉPONSE EN FRANÇAIS :"
    else:
        prompt = f"### CONTEXT:\n{context}\n\n### QUESTION:\n{question}\n\n### ANSWER IN ENGLISH:"

    answer = call_llama3(prompt)
    return jsonify({"answer": answer})

@app.route("/test", methods=["GET"])
def test():
    return jsonify({"message": "✅ API running with lightweight PDF processing."})

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)