import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTimes, FaPause, FaPlay, FaStop, FaThermometerHalf, FaTerminal, FaArrowRight, FaFire } from 'react-icons/fa';

const MonitorModal = ({ printer: initialPrinterData, onClose }) => {
  const [printer, setPrinter] = useState(initialPrinterData);
  const [nozzleTarget, setNozzleTarget] = useState(0);
  const [bedTarget, setBedTarget] = useState(0);
  const [terminalCmd, setTerminalCmd] = useState("");
  const [cmdLog, setCmdLog] = useState([]); // Histórico local de comandos enviados

  const serverUrl = window.location.origin;
  const webcamUrl = `${serverUrl}/api/proxy/webcam/${printer.token}`;

  // Atualiza os dados da impressora (temperaturas) a cada 2 segundos
  useEffect(() => {
    const fetchStatus = () => {
      axios.get('/api/printers')
        .then(res => {
          if (res.data.success) {
            const updated = res.data.printers.find(p => p.token === initialPrinterData.token);
            if (updated) setPrinter(updated);
          }
        })
        .catch(console.error);
    };
    const interval = setInterval(fetchStatus, 2000); // Polling mais rápido para monitorar temp
    return () => clearInterval(interval);
  }, [initialPrinterData.token]);

  // Função genérica de envio
  const sendCommand = (cmd, desc) => {
    axios.post('/api/printer/command', {
      token: printer.token,
      command: cmd
    })
    .then(() => {
      // Adiciona ao log visual
      const time = new Date().toLocaleTimeString();
      setCmdLog(prev => [`[${time}] > ${cmd}`, ...prev]);
    })
    .catch(err => alert("Erro ao enviar comando."));
  };

  // Funções de Temperatura
  const setNozzleTemp = () => sendCommand(`M104 S${nozzleTarget}`, `Definir Bico ${nozzleTarget}°C`);
  const setBedTemp = () => sendCommand(`M140 S${bedTarget}`, `Definir Mesa ${bedTarget}°C`);
  const coolDown = () => {
    sendCommand("M104 S0");
    sendCommand("M140 S0");
    setNozzleTarget(0);
    setBedTarget(0);
  };

  // Função do Terminal
  const handleTerminalSubmit = (e) => {
    e.preventDefault();
    if (!terminalCmd) return;
    sendCommand(terminalCmd); // Envia o texto exato (ex: G28 X)
    setTerminalCmd("");
  };

  // Parse das temperaturas (O OctoPrint envia JSON dentro de string no banco)
  let temps = { tool: { actual: 0, target: 0 }, bed: { actual: 0, target: 0 } };
  try {
    if (printer.last_status) {
      const status = JSON.parse(printer.last_status);
      if (status.temperaturas && status.temperaturas.tool0) {
        temps.tool = status.temperaturas.tool0;
      }
      if (status.temperaturas && status.temperaturas.bed) {
        temps.bed = status.temperaturas.bed;
      }
    }
  } catch (e) {}

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-farm-dark-blue border border-farm-medium-grey rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-4 border-b border-farm-medium-grey bg-black/20">
          <h2 className="text-xl font-bold text-farm-light-grey">
            Monitorando: <span className="text-farm-medium-blue">{printer.name}</span>
          </h2>
          <button onClick={onClose} className="text-2xl text-farm-medium-grey hover:text-white"><FaTimes /></button>
        </div>

        {/* Corpo Principal */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col lg:flex-row gap-4">
          
          {/* COLUNA ESQUERDA: Câmera */}
          <div className="lg:w-1/2 flex flex-col gap-4">
            <div className="bg-black rounded-lg flex items-center justify-center aspect-video relative overflow-hidden border border-farm-medium-grey/50 shadow-inner">
              <img 
                src={webcamUrl} 
                alt="Carregando Câmera..." 
                className="w-full h-full object-contain"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
              <div className="hidden absolute inset-0 flex-col items-center justify-center text-farm-medium-grey bg-gray-900">
                <p>Sem sinal de vídeo</p>
              </div>
            </div>
            
             {/* Controles de Impressão Rápidos */}
             <div className="grid grid-cols-3 gap-2">
                <button onClick={() => {if(window.confirm('Pausar?')) sendCommand('pause')}} className="flex flex-col items-center gap-1 p-3 bg-yellow-600/20 text-yellow-500 rounded hover:bg-yellow-600/40 border border-yellow-600/50 transition-all">
                  <FaPause /> <span className="text-xs font-bold">PAUSAR</span>
                </button>
                <button onClick={() => {if(window.confirm('Resumir?')) sendCommand('resume')}} className="flex flex-col items-center gap-1 p-3 bg-green-600/20 text-green-500 rounded hover:bg-green-600/40 border border-green-600/50 transition-all">
                  <FaPlay /> <span className="text-xs font-bold">RESUMIR</span>
                </button>
                <button onClick={() => {if(window.confirm('CANCELAR IMPRESSÃO?')) sendCommand('cancel')}} className="flex flex-col items-center gap-1 p-3 bg-red-600/20 text-red-500 rounded hover:bg-red-600/40 border border-red-600/50 transition-all">
                  <FaStop /> <span className="text-xs font-bold">CANCELAR</span>
                </button>
              </div>
          </div>

          {/* COLUNA DIREITA: Controles e Terminal */}
          <div className="lg:w-1/2 flex flex-col gap-4">
            
            {/* Painel de Temperatura */}
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                <h3 className="font-bold text-farm-light-grey flex items-center gap-2"><FaThermometerHalf /> Temperaturas</h3>
                <button onClick={coolDown} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/40">Resfriar Tudo (OFF)</button>
              </div>

              {/* Bico / Nozzle */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/20 rounded text-red-500"><FaFire /></div>
                    <div>
                        <p className="text-xs text-farm-medium-grey">Bico (Nozzle)</p>
                        <p className="text-xl font-mono text-white">
                            {temps.tool.actual.toFixed(1)}° <span className="text-sm text-gray-500">/ {temps.tool.target}°</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <input type="number" className="w-16 bg-black/30 border border-farm-medium-grey rounded px-2 text-white text-center" 
                           value={nozzleTarget} onChange={e => setNozzleTarget(e.target.value)} />
                    <button onClick={setNozzleTemp} className="bg-farm-orange text-farm-dark-blue font-bold px-3 py-1 rounded hover:opacity-90">Set</button>
                </div>
              </div>

              {/* Mesa / Bed */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded text-blue-500"><div className="w-4 h-1 bg-current rounded-sm"></div></div>
                    <div>
                        <p className="text-xs text-farm-medium-grey">Mesa (Bed)</p>
                        <p className="text-xl font-mono text-white">
                            {temps.bed.actual.toFixed(1)}° <span className="text-sm text-gray-500">/ {temps.bed.target}°</span>
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <input type="number" className="w-16 bg-black/30 border border-farm-medium-grey rounded px-2 text-white text-center" 
                           value={bedTarget} onChange={e => setBedTarget(e.target.value)} />
                    <button onClick={setBedTemp} className="bg-farm-medium-blue text-white font-bold px-3 py-1 rounded hover:opacity-90">Set</button>
                </div>
              </div>
            </div>

            {/* Terminal de Comandos */}
            <div className="flex-1 flex flex-col bg-black rounded-lg border border-farm-medium-grey/50 overflow-hidden">
              <div className="bg-farm-medium-grey/10 p-2 text-xs font-bold text-farm-medium-grey border-b border-farm-medium-grey/20 flex items-center gap-2">
                <FaTerminal /> Terminal de Envio (G-Code)
              </div>
              
              {/* Log do Terminal (Apenas envio) */}
              <div className="flex-1 p-2 overflow-y-auto font-mono text-xs space-y-1 h-32">
                {cmdLog.length === 0 && <p className="text-gray-600 italic">Histórico vazio...</p>}
                {cmdLog.map((log, i) => (
                    <div key={i} className="text-green-500 border-b border-green-900/30 pb-1">{log}</div>
                ))}
              </div>

              {/* Input do Terminal */}
              <form onSubmit={handleTerminalSubmit} className="flex border-t border-farm-medium-grey/30">
                <input 
                  type="text" 
                  className="flex-1 bg-transparent text-white font-mono text-sm p-3 focus:outline-none"
                  placeholder="Digite um comando G-code (Ex: G28, M106 S255)..."
                  value={terminalCmd}
                  onChange={e => setTerminalCmd(e.target.value)}
                />
                <button type="submit" className="bg-farm-medium-grey/20 text-farm-light-grey px-4 hover:bg-farm-orange hover:text-farm-dark-blue transition-colors">
                  <FaArrowRight />
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitorModal;