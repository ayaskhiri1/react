import { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [history, setHistory] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false); // Nouveau state pour activer/désactiver la voix

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const uploadFile = async () => {
    if (!file) {
      alert("Veuillez sélectionner un fichier PDF.");
      return;
    }
    const formData = new FormData();
    formData.append("pdf", file);
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/upload", formData);
      setResponse(res.data.message);
    } catch (error) {
      console.error("Erreur upload :", error);
      setResponse("❌ Erreur lors de l'upload du fichier");
    } finally {
      setLoading(false);
    }
  };

  const askQuestion = async () => {
    if (!question.trim()) {
      alert("Veuillez entrer une question.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/ask", { question });
      setResponse(res.data.answer);
      setHistory((prevHistory) => [...prevHistory, { question, answer: res.data.answer }]);
    } catch (error) {
      console.error("Erreur question :", error);
      setResponse("❌ Erreur lors de l'envoi de la question");
    } finally {
      setQuestion("");
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const exportHistory = () => {
    const blob = new Blob([history.map(item => `Question: ${item.question}\nRéponse: ${item.answer}`).join("\n\n")], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "historique.txt";
    a.click();
  };

  const speakResponse = (text) => {
    if (!voiceEnabled) return; // Ne parle que si la voix est activée
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR'; // Change to any desired language
    speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (response) {
      speakResponse(response); // Speak the response when it's available and voice is enabled
    }
  }, [response]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const toggleVoice = () => {
    setVoiceEnabled(prev => !prev); // Toggle the voice feature
  };

  return (
    <div className={`container ${darkMode ? 'dark' : ''}`}>
      <h1 className="title">Router Configuration AI</h1>

      <div className="upload-section">
        <input type="file" onChange={handleFileChange} accept="application/pdf" className="file-input" />
        <button onClick={uploadFile} className="button">📤 Upload PDF</button>
      </div>

      <div className="question-section">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Posez une question..."
          className="input"
        />
        <button onClick={askQuestion} className="button">❓ Demander</button>
      </div>

      {loading && <div className="loader">⏳ Traitement en cours...</div>}

      {!loading && response && (
        <div className="response">{response}</div>
      )}

      <div className="actions">
        <button onClick={clearHistory} className="button">🧹 Vider l’historique</button>
        <button onClick={exportHistory} className="button">📝 Exporter l’historique</button>
        <button onClick={toggleDarkMode} className="button">🌙 Mode Sombre</button>
        <button onClick={toggleVoice} className="button">
          {voiceEnabled ? "🔊 Voix Désactivée" : "🔈 Voix Activée"}
        </button>
      </div>

      {history.length > 0 && (
        <div className="history">
          <h3>Historique des questions :</h3>
          <ul>
            {history.map((entry, index) => (
              <li key={index}>
                <strong>Q:</strong> {entry.question} <br />
                <strong>A:</strong> {entry.answer}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
