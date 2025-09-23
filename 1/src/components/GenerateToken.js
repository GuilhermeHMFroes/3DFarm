import React, { useState } from "react";
import { generateToken } from "../api";

const GenerateToken = () => {
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [token, setToken] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await generateToken({ name, ip });
      setToken(res.data.token);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: 10, margin: 10 }}>
      <h3>Gerar Token para Impressora</h3>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Nome da Impressora"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="text"
          placeholder="IP (opcional)"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
        />
        <button type="submit">Gerar</button>
      </form>
      {token && (
        <p>
          <strong>Token gerado:</strong> {token}
        </p>
      )}
    </div>
  );
};

export default GenerateToken;
