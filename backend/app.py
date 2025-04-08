from flask import Flask, request, jsonify
import PyPDF2
import tensorflow as tf
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Permet les requêtes cross-origin

# Route de test pour vérifier si l'API fonctionne
@app.route('/test', methods=['GET'])
def test_route():
    return jsonify({'message': 'Route fonctionne ! 🎉'})


# Route pour télécharger un PDF et en extraire le texte
@app.route('/upload', methods=['POST'])
def upload_pdf():
    file = request.files.get('pdf')  # Récupère le fichier PDF envoyé
    if file:
        try:
            pdf_text = extract_text_from_pdf(file)  # Extraire le texte du PDF
            # Tu peux ajouter la partie AI ici pour traiter le PDF avec un modèle de deep learning
            return jsonify({"message": "PDF téléchargé avec succès et traité."})
        except Exception as e:
            return jsonify({"message": f"Erreur lors du traitement du PDF: {str(e)}"}), 500
    else:
        return jsonify({"message": "Erreur lors du téléchargement du PDF"}), 400


# Route pour poser une question et obtenir une réponse générée par AI
@app.route('/ask', methods=['POST'])
def ask_question():
    data = request.get_json()  # Récupère les données JSON envoyées
    question = data.get("question")
    if question:
        try:
            answer = process_question_with_ai(question)  # Traite la question avec AI
            return jsonify({"answer": answer})
        except Exception as e:
            return jsonify({"answer": f"Erreur lors du traitement de la question: {str(e)}"}), 500
    else:
        return jsonify({"answer": "Aucune question reçue"}), 400


# Fonction pour extraire le texte d'un fichier PDF
def extract_text_from_pdf(file):
    reader = PyPDF2.PdfReader(file)
    text = ""
    for page in reader.pages:
        text += page.extract_text()
    return text


# Fonction pour traiter la question avec AI (exemple de réponse pour l'instant)
def process_question_with_ai(question):
    # Remplace ceci par ton modèle de deep learning ou une logique personnalisée pour répondre aux questions
    return "Réponse générée par AI pour la question : " + question


if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)
