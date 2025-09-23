import React, { useState } from "react";
import UploadFile from "./components/UploadFile";
import GenerateToken from "./components/GenerateToken";
import PrinterList from "./components/PrinterList";
import EnqueueFile from "./components/EnqueueFile";

function App() {
  const [lastUploaded, setLastUploaded] = useState(null);

  return (
    <div style={{ padding: 20 }}>
      <h1>Fazenda 3D - Painel</h1>
      <GenerateToken />
      <UploadFile onUploaded={setLastUploaded} />
      {lastUploaded && (
        <p>
          Último arquivo enviado: <strong>{lastUploaded.fileName}</strong>
        </p>
      )}
      <EnqueueFile />
      <PrinterList />
    </div>
  );
}

export default App;
