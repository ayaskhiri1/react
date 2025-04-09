from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from PyPDF2 import PdfReader
from sentence_transformers import SentenceTransformer, util
import torch

# Initialisation de l'application Flask
app = Flask(__name__)
CORS(app)

# Dossier pour stocker les PDF uploadés
UPLOAD_FOLDER = "uploaded_files"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# Chargement du modèle d'encodage sémantique
model = SentenceTransformer('paraphrase-MiniLM-L6-v2')

# Variables globales
extracted_text = ""
pdf_sentences = []
pdf_embeddings = None

# Extraction du texte depuis le PDF
def extract_text_from_pdf(filepath):
    try:
        reader = PdfReader(filepath)
        return "\n".join(page.extract_text() for page in reader.pages if page.extract_text())
    except Exception as e:
        print(f"Erreur lors de la lecture du PDF : {e}")
        return ""

# Route pour l'upload du fichier
@app.route("/upload", methods=["POST"])
def upload_pdf():
    global extracted_text, pdf_sentences, pdf_embeddings

    if 'pdf' not in request.files:
        return jsonify({"message": "Aucun fichier PDF reçu."}), 400

    file = request.files['pdf']
    if file.filename == '':
        return jsonify({"message": "Nom de fichier invalide."}), 400

    filepath = os.path.join(app.config["UPLOAD_FOLDER"], file.filename)
    file.save(filepath)

    extracted_text = extract_text_from_pdf(filepath)
    if not extracted_text.strip():
        return jsonify({"message": "PDF lu mais aucun texte trouvé."}), 400

    # Découper le texte en phrases (simple split)
    pdf_sentences = [s.strip() for s in extracted_text.split(".") if s.strip()]
    pdf_embeddings = model.encode(pdf_sentences, convert_to_tensor=True)

    return jsonify({"message": "✅ PDF analysé avec succès 🔍"})

# Route pour poser une question
@app.route("/ask", methods=["POST"])
def ask_question():
    global pdf_embeddings, pdf_sentences

    data = request.get_json()
    question = data.get("question", "").strip()

    if not question:
        return jsonify({"answer": "❌ Aucune question fournie."}), 400

    if pdf_embeddings is None or len(pdf_sentences) == 0 or pdf_embeddings.size(0) == 0:
        return jsonify({"answer": "❗ Aucun PDF n’a encore été traité."})

    question_embedding = model.encode(question, convert_to_tensor=True)
    scores = util.cos_sim(question_embedding, pdf_embeddings)[0]

    # Seuil minimum de similarité
    threshold = 0.4

    # Filtrage des phrases utiles (ignorer les titres/généralités)
    top_results = []
    for i, score in enumerate(scores):
        text = pdf_sentences[i].strip()
        if score.item() > threshold and len(text.split()) > 5 and not text.lower().startswith(("guide", "introduction", "#")):
            top_results.append((i, score.item()))

    if not top_results:
        return jsonify({"answer": "🤔 Je ne trouve pas de réponse claire dans le PDF."})

    # Top 3 résultats triés par pertinence
    top_results = sorted(top_results, key=lambda x: x[1], reverse=True)[:3]
    answer_parts = [f"- {pdf_sentences[i].strip()}." for i, _ in top_results]
    final_answer = "\n".join(answer_parts)

    return jsonify({"answer": final_answer})

# Route de test de l'API
@app.route("/test", methods=["GET"])
def test_route():
    return jsonify({'message': '✅ API opérationnelle avec intelligence sémantique 🧠'})

# Lancement de l'application
if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)
