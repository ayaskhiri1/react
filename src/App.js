import { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [file, setFile] = useState(null);
  const [response, setResponse] = useState("");
  const [question, setQuestion] = useState("");

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
    try {
      const res = await axios.post("http://localhost:5000/upload", formData);
      setResponse(res.data.message);
    } catch (error) {
      console.error("Erreur lors de l'upload du fichier", error);
      setResponse("Erreur lors de l'upload du fichier");
    }
  };

  const askQuestion = async () => {
    if (!question.trim()) {
      alert("Veuillez entrer une question.");
      return;
    }
    try {
      const res = await axios.post("http://localhost:5000/ask", { question });
      setResponse(res.data.answer);
    } catch (error) {
      console.error("Erreur lors de l'envoi de la question", error);
      setResponse("Erreur lors de l'envoi de la question");
    }
  };

  return (
    <div className="container">
      <h1 className="title">Router Configuration AI</h1>
      <div className="upload-section">
        <input type="file" onChange={handleFileChange} accept="application/pdf" className="file-input" />
        <button onClick={uploadFile} className="button">Upload PDF</button>
      </div>
      <div className="question-section">
        <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Posez une question..." className="input" />
        <button onClick={askQuestion} className="button">Demander</button>
      </div>
      <p className="response">{response}</p>
    </div>
  );
}

export default App;
