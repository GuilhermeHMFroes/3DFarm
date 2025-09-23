import React, { useState } from "react";
import { uploadFile } from "../api";

const UploadFile = ({ onUploaded }) => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await uploadFile(formData);
      setMessage("Upload feito com sucesso!");
      onUploaded && onUploaded(res.data);
    } catch (err) {
      console.error(err);
      setMessage("Erro no upload.");
    }
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: 10, margin: 10 }}>
      <h3>Upload de G-code</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".gcode"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <button type="submit">Enviar</button>
      </form>
      <p>{message}</p>
    </div>
  );
};

export default UploadFile;
