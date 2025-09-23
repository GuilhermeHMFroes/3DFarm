import React, { useEffect, useState } from "react";
import { listPrinters } from "../api";

const PrinterList = () => {
  const [printers, setPrinters] = useState([]);

  useEffect(() => {
    (async () => {
      const res = await listPrinters();
      setPrinters(res.data.printers);
    })();
  }, []);

  return (
    <div style={{ border: "1px solid #ccc", padding: 10, margin: 10 }}>
      <h3>Impressoras Registradas</h3>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>IP</th>
            <th>Token</th>
            <th>Último Status</th>
          </tr>
        </thead>
        <tbody>
          {printers.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.ip}</td>
              <td>{p.token}</td>
              <td>
                {p.last_status
                  ? JSON.stringify(JSON.parse(p.last_status).estado)
                  : "Sem dados"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PrinterList;
