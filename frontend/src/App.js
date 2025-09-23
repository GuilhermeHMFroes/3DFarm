import React, { useState, useEffect } from "react";
import AddPrinterModal from "./components/AddPrinterModal"; //AddPrinterModal.js

function App() {
  const [printers, setPrinters] = useState([]);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Carrega lista de impressoras do Flask
  useEffect(() => {
    fetch("/api/printers")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPrinters(data.printers);
        }
      });
  }, []);

  // Upload de arquivo para o Flask
  const handleUpload = (e) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    fetch("/upload", {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setMessage("Arquivo enviado com sucesso: " + data.fileName);
        } else {
          setMessage("Erro ao enviar arquivo: " + data.message);
        }
      })
      .catch(() => setMessage("Erro ao enviar arquivo."));
  };

  const handlePrinterAdded = (printer) => {
    // adiciona nova impressora à lista
    setPrinters((prev) => [...prev, printer]);
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Fazenda 3D</h1>

      <button onClick={() => setShowModal(true)}>Adicionar Impressora</button>

      <section style={{ marginTop: "20px" }}>
        <h2>Impressoras Registradas</h2>
        <ul>
          {printers.map((p) => (
            <li key={p.id || p.token}>
              <b>{p.name}</b> – {p.ip || "sem IP"} – Token: {p.token}
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: "30px" }}>
        <h2>Upload de Arquivo G-code</h2>
        <form onSubmit={handleUpload}>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            accept=".gcode"
          />
          <button type="submit">Enviar</button>
        </form>
        {message && <p>{message}</p>}
      </section>

      {/* Modal de adição de impressora */}
      <AddPrinterModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onPrinterAdded={handlePrinterAdded}
      />
    </div>
  );
}

export default App;
