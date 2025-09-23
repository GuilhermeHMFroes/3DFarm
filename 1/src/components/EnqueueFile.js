import React, { useState } from "react";
import { enqueueFile } from "../api";

const EnqueueFile = () => {
  const [fileName, setFileName] = useState("");
  const [targetToken, setTargetToken] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await enqueueFile({ fileName, target_token: targetToken });
      setMessage("Arquivo enfileirado!");
    } catch (err) {
      console.error(err);
      setMessage("Erro ao enfileirar arquivo.");
    }
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: 10, margin: 10 }}>
      <h3>Enfileirar Arquivo para Impressora</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Nome do arquivo (já enviado)"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Token da impressora (opcional)"
          value={targetToken}
          onChange={(e) => setTargetToken(e.target.value)}
        />
        <button type="submit">Enfileirar</button>
      </form>
      <p>{message}</p>
    </div>
  );
};

export default EnqueueFile;
