// === FRONTEND (React App.jsx) professionnel style ChatGPT + touche Entrée ===

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("No file selected");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [history, setHistory] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setFileName(selectedFile ? selectedFile.name : "No file selected");
  };

  const uploadFile = async () => {
    if (!file) {
      alert("Please select a PDF file.");
      return;
    }
    const formData = new FormData();
    formData.append("pdf", file);
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/upload", formData);
      setResponse(res.data.message);
    } catch (error) {
      console.error("Upload error:", error);
      setResponse("❌ Error uploading file");
    } finally {
      setLoading(false);
    }
  };

  const askQuestion = async () => {
    if (!question.trim()) {
      alert("Please enter a question.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:5000/ask", { question });
      setResponse(res.data.answer);
      setHistory((prev) => [...prev, { question, answer: res.data.answer }]);
    } catch (error) {
      console.error("Question error:", error);
      setResponse("❌ Error sending the question");
    } finally {
      setQuestion("");
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      askQuestion();
    }
  };

  const clearHistory = () => setHistory([]);

  const exportHistory = () => {
    const blob = new Blob([
      history.map(h => `Question: ${h.question}\nAnswer: ${h.answer}`).join("\n\n")
    ], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chat_history.txt";
    a.click();
  };
const speakResponse = useCallback((text) => {
  if (!voiceEnabled) return;

  // Arrêter toute lecture en cours
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // Détection simple de l'anglais (absence d'accents et présence de mots typiques)
  const isEnglish = /[a-z]{3,}/i.test(text) && !/[éèàçù]/i.test(text);

  const voices = speechSynthesis.getVoices();
  const selectedVoice = voices.find(voice =>
    isEnglish ? voice.lang.startsWith("en") : voice.lang.startsWith("fr")
  );

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  } else {
    utterance.lang = isEnglish ? "en-US" : "fr-FR";
  }

  speechSynthesis.speak(utterance);
}, [voiceEnabled]);

useEffect(() => {
  if (!response || !voiceEnabled) return;

  const voicesLoaded = () => {
    speechSynthesis.cancel();
    speakResponse(response);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (speechSynthesis.getVoices().length === 0) {
    speechSynthesis.onvoiceschanged = voicesLoaded;
  } else {
    voicesLoaded();
  }

  return () => {
    speechSynthesis.onvoiceschanged = null;
  };
}, [response, voiceEnabled, speakResponse]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);
  const toggleVoice = () => {
  setVoiceEnabled((prev) => {
    const newValue = !prev;
    if (!newValue) {
      speechSynthesis.cancel(); // ⛔ Stop current speech
    }
    return newValue;
  });
};


  return (
    <div className={`container ${darkMode ? 'dark' : ''}`}>
      <header className="header">
  <img src="/logo.png" alt="Logo" className="logo" />
  <div>
    <h1 className="title">PDF-Chatbot</h1>
    <p className="subtitle">Ask questions from your PDF manuals</p>
  </div>
</header>


      <div className="upload-section">
        <div className="custom-file-upload">
          <label htmlFor="pdf-upload" className="button">📁 Choose File</label>
          <input
            id="pdf-upload"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <span className="file-name">{fileName}</span>
        </div>
        <button onClick={uploadFile} className="button">📤 Upload PDF</button>
      </div>

      <div className="question-section">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a technical question..."
          className="input"
        />
        <button onClick={askQuestion} className="button">❓ Ask</button>
      </div>

      {loading && <div className="loader">⏳ Processing...</div>}

      {!loading && response && (
        <div className="response">
          <h3>🧠 Answer:</h3>
          {response.split("\n").map((line, idx) => <p key={idx}>{line}</p>)}
        </div>
      )}

      <div className="actions">
        <button onClick={clearHistory} className="button">🧹 Clear History</button>
        <button onClick={exportHistory} className="button">💾 Export History</button>
        <button onClick={toggleDarkMode} className="button">{darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}</button>
        <button onClick={toggleVoice} className="button">
          {voiceEnabled ? "🔇 Voice Off" : "🔈 Voice On"}
        </button>
      </div>

      {history.length > 0 && (
        <div className="history">
          <h3>📜 Chat History:</h3>
          <ul>
            {history.map((entry, idx) => (
              <li key={idx}>
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