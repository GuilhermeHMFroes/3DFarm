import React, { useState } from "react";

const AddPrinterModal = ({ show, onClose, onPrinterAdded }) => {
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);

  if (!show) return null; // não mostra se modal fechado

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/generate_token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ip }),
      });
      const data = await resp.json();
      if (data.success) {
        setToken(data.token);
        onPrinterAdded && onPrinterAdded({ name, ip, token: data.token });
      } else {
        setError(data.message || "Erro ao gerar token");
      }
    } catch (err) {
      setError("Erro de rede");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "2rem",
          borderRadius: "8px",
          width: "400px",
          position: "relative",
        }}
      >
        {/* Botão X */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "transparent",
            border: "none",
            fontSize: "1.5rem",
            cursor: "pointer",
          }}
        >
          ×
        </button>

        <h2>Adicionar Impressora</h2>
        <form onSubmit={handleSubmit}>
          <label>Nome da impressora</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: "100%", marginBottom: "10px" }}
          />
          <label>IP (opcional)</label>
          <input
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            style={{ width: "100%", marginBottom: "10px" }}
          />
          {loading && <p>Gerando token...</p>}
          {error && <p style={{ color: "red" }}>{error}</p>}
          {token && (
            <p>
              Token gerado: <strong>{token}</strong>
            </p>
          )}
          <div style={{ marginTop: "10px" }}>
            <button type="submit" disabled={loading}>
              Gerar Token
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ marginLeft: "10px" }}
            >
              Fechar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPrinterModal;
