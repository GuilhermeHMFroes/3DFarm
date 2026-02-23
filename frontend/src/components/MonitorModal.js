import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client'; // Importa o cliente socket

import { FaTimes, FaPause, FaPlay, FaStop, FaThermometerHalf, FaTerminal, FaArrowRight, 
  FaFire, FaVideoSlash, FaArrowsAlt, FaCaretUp, FaCaretDown, FaCaretLeft, FaCaretRight, 
  FaHome } from 'react-icons/fa';

const MonitorModal = ({ printer: initialPrinterData, onClose }) => {
  const [printer, setPrinter] = useState(initialPrinterData);
  const [nozzleTarget, setNozzleTarget] = useState(0);
  const [bedTarget, setBedTarget] = useState(0);
  const [terminalCmd, setTerminalCmd] = useState("");
  const [cmdLog, setCmdLog] = useState([]);
  
  // Estado para a imagem da câmera
  const [imageSrc, setImageSrc] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Refs para gerenciar o socket e URLs de objeto sem causar re-renders
  const socketRef = useRef(null);
  const lastUrlRef = useRef(null);

  const [moveStep, setMoveStep] = useState(10); // Passo de movimentação (1, 10, 100mm)
  const terminalEndRef = useRef(null); // Referência para o scroll do terminal

  // URL do Backend (ajusta automaticamente se for localhost ou nuvem)
  // Se estiver rodando local, window.location.origin pode ser localhost:3000, 
  // então forçamos a porta 5000 se necessário, ou usa a URL da API configurada.
  const SERVER_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : window.location.origin;

  // --- 1. LÓGICA DO WEBSOCKET (VÍDEO) ---
  useEffect(() => {
    // Criamos a instância do socket
    const socket = io(SERVER_URL, {
      transports: ['websocket'],
      upgrade: false
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log("Frontend conectado ao Socket!");
      setIsConnected(true);
      
      if(printer.token) {
        socket.emit('join_stream', { token: printer.token });
      }
    });

    socket.on('render_frame', (data) => {
      try {
        const blob = new Blob([data.image], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        
        setImageSrc(url);

        if (lastUrlRef.current) {
          URL.revokeObjectURL(lastUrlRef.current);
        }
        lastUrlRef.current = url;
      } catch (err) {
        console.error("Erro ao processar frame:", err);
      }
    });

    socket.on('disconnect', () => {
      console.log("Socket desconectado");
      setIsConnected(false);
      setImageSrc(null);
    });

    // LIMPEZA: Só ocorre quando o modal fecha ou o token muda
    return () => {
      if (socket) {
        socket.emit('leave_stream', { token: printer.token });
        socket.disconnect();
      }
      if (lastUrlRef.current) {
        URL.revokeObjectURL(lastUrlRef.current);
      }
    };
    // REMOVIDO 'isConnected' daqui para evitar o loop infinito!
  }, [printer.token, SERVER_URL]);


  // --- 2. LÓGICA DE DADOS (TEMPERATURA) ---
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
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [initialPrinterData.token]);

  //Scroll do terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [cmdLog]);

  // --- 3. ENVIO DE COMANDOS (Via HTTP para o Backend converter em Socket) ---
  const sendCommand = (cmd, desc) => {
    // Mantemos o envio via HTTP POST, pois o Backend já trata isso e manda via socket pra impressora
    axios.post('/api/printer/command', {
      token: printer.token,
      command: cmd
    })
    .then(() => {
      const time = new Date().toLocaleTimeString();
      setCmdLog(prev => [...prev, `[${time}] > ${cmd}`]); // Isso joga no final
    })
    .catch(err => alert("Erro ao enviar comando."));
  };

  const setNozzleTemp = () => sendCommand(`M104 S${nozzleTarget}`, `Definir Bico ${nozzleTarget}°C`);
  const setBedTemp = () => sendCommand(`M140 S${bedTarget}`, `Definir Mesa ${bedTarget}°C`);
  const coolDown = () => {
    sendCommand("M104 S0"); sendCommand("M140 S0");
    setNozzleTarget(0); setBedTarget(0);
  };
  const handleTerminalSubmit = (e) => {
    e.preventDefault();
    if (!terminalCmd) return;
    sendCommand(terminalCmd);
    setTerminalCmd("");
  };

  // Parse das temperaturas
  let temps = { tool: { actual: 0, target: 0 }, bed: { actual: 0, target: 0 } };
  try {
    if (printer.last_status) {
      const status = JSON.parse(printer.last_status);
      if (status.temperaturas && status.temperaturas.tool0) temps.tool = status.temperaturas.tool0;
      if (status.temperaturas && status.temperaturas.bed) temps.bed = status.temperaturas.bed;
    }
  } catch (e) {}

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-farm-dark-blue border border-farm-medium-grey rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center p-4 border-b border-farm-medium-grey bg-black/20">
          <h2 className="text-xl font-bold text-farm-light-grey">
            Monitorando: <span className="text-farm-medium-blue">{printer.name}</span>
            {isConnected ? <span className="text-xs text-green-500 ml-2">● Ao Vivo</span> : <span className="text-xs text-red-500 ml-2">● Conectando...</span>}
          </h2>
          <button onClick={onClose} className="text-2xl text-farm-medium-grey hover:text-white"><FaTimes /></button>
        </div>

        {/* Corpo Principal */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col lg:flex-row gap-4">
          
          {/* COLUNA ESQUERDA: Câmera (Socket Image) */}
          <div className="lg:w-1/2 flex flex-col gap-4">
            <div className="bg-black rounded-lg flex items-center justify-center aspect-video relative overflow-hidden border border-farm-medium-grey/50 shadow-inner group">
              
              {imageSrc ? (
                <img 
                  src={imageSrc} 
                  alt="Stream Ao Vivo" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-farm-medium-grey/50 animate-pulse">
                   <FaVideoSlash size={40} />
                   <p className="mt-2 text-sm">Aguardando vídeo da impressora...</p>
                   <p className="text-xs text-farm-medium-grey/30">O plugin deve iniciar o envio em instantes</p>
                </div>
              )}
              
            </div>
            
             {/* Controles de Impressão */}
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

            {/* Painel de Temperatura */}
            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
              <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                <h3 className="font-bold text-farm-light-grey flex items-center gap-2"><FaThermometerHalf /> Temperaturas</h3>
                <button onClick={coolDown} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-500/40">Resfriar Tudo (OFF)</button>
              </div>
              {/* Bico */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/20 rounded text-red-500"><FaFire /></div>
                    <div>
                        <p className="text-xs text-farm-medium-grey">Bico (Nozzle)</p>
                        <p className="text-xl font-mono text-white">{temps.tool.actual.toFixed(1)}° <span className="text-sm text-gray-500">/ {temps.tool.target}°</span></p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <input type="number" className="w-16 bg-black/30 border border-farm-medium-grey rounded px-2 text-white text-center" value={nozzleTarget} onChange={e => setNozzleTarget(e.target.value)} />
                    <button onClick={setNozzleTemp} className="bg-farm-orange text-farm-dark-blue font-bold px-3 py-1 rounded hover:opacity-90">Set</button>
                </div>
              </div>
              {/* Mesa */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded text-blue-500"><div className="w-4 h-1 bg-current rounded-sm"></div></div>
                    <div>
                        <p className="text-xs text-farm-medium-grey">Mesa (Bed)</p>
                        <p className="text-xl font-mono text-white">{temps.bed.actual.toFixed(1)}° <span className="text-sm text-gray-500">/ {temps.bed.target}°</span></p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <input type="number" className="w-16 bg-black/30 border border-farm-medium-grey rounded px-2 text-white text-center" value={bedTarget} onChange={e => setBedTarget(e.target.value)} />
                    <button onClick={setBedTemp} className="bg-farm-medium-blue text-white font-bold px-3 py-1 rounded hover:opacity-90">Set</button>
                </div>
              </div>
            </div>

          </div>

          {/* COLUNA DIREITA: Controles e Terminal (Mantido igual) */}
          <div className="lg:w-1/2 flex flex-col gap-4">
            

            {/* Terminal de Comandos com Altura Fixa com Scroll */}
            <div className="flex-1 flex flex-col bg-black rounded-lg border border-farm-medium-grey/50 overflow-hidden" style={{ minHeight: '370px', maxHeight: '370px' }}>
              <div className="bg-farm-medium-grey/10 p-2 text-[10px] font-bold text-farm-medium-grey border-b border-farm-medium-grey/20 flex items-center gap-2 uppercase">
                <FaTerminal /> Console G-Code
              </div>
              <div className="flex-1 p-2 overflow-y-auto font-mono text-[10px] space-y-1">
                {cmdLog.map((log, i) => (
                  <div key={i} className="text-green-500/80 border-b border-green-900/10 pb-1">{log}</div>
                ))}
                {/* A âncora DEVE estar aqui, depois do map */}
                <div ref={terminalEndRef} /> 
              </div>
              <form onSubmit={handleTerminalSubmit} className="flex border-t border-farm-medium-grey/30">
                <input type="text" className="flex-1 bg-transparent text-white font-mono text-xs p-2 focus:outline-none uppercase" placeholder="Comando..." value={terminalCmd} onChange={e => setTerminalCmd(e.target.value)} />
                <button type="submit" className="px-4 text-farm-medium-grey hover:text-farm-orange transition-colors"><FaArrowRight /></button>
              </form>
            </div>


              {/* Controles de Movimento Estilo OctoPrint */}
            <div className="bg-white/5 p-3 rounded-lg border border-white/10 mt-2">
               <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-bold text-farm-medium-grey uppercase flex items-center gap-2"><FaArrowsAlt /> Movimentação</span>
                  <div className="flex gap-1">
                    {[1, 10, 100].map(step => (
                      <button key={step} onClick={() => setMoveStep(step)} className={`text-[10px] px-2 py-0.5 rounded border ${moveStep === step ? 'bg-farm-medium-blue border-farm-medium-blue text-white' : 'border-white/10 text-farm-light-grey'}`}>{step}mm</button>
                    ))}
                  </div>
               </div>
               
               <div className="flex justify-around items-center gap-2">
                  {/* Pad XY */}
                  <div className="grid grid-cols-3 gap-1">
                    <div />
                    <button onClick={() => sendCommand(`G91\nG1 Y${moveStep} F3000\nG90`)} className="p-2 bg-white/10 rounded hover:bg-white/20 text-white"><FaCaretUp /></button>
                    <div />
                    <button onClick={() => sendCommand(`G91\nG1 X-${moveStep} F3000\nG90`)} className="p-2 bg-white/10 rounded hover:bg-white/20 text-white"><FaCaretLeft /></button>
                    <button onClick={() => sendCommand('G28 X Y')} className="p-2 bg-farm-medium-blue/20 text-farm-medium-blue rounded hover:bg-farm-medium-blue/40"><FaHome /></button>
                    <button onClick={() => sendCommand(`G91\nG1 X${moveStep} F3000\nG90`)} className="p-2 bg-white/10 rounded hover:bg-white/20 text-white"><FaCaretRight /></button>
                    <div />
                    <button onClick={() => sendCommand(`G91\nG1 Y-${moveStep} F3000\nG90`)} className="p-2 bg-white/10 rounded hover:bg-white/20 text-white"><FaCaretDown /></button>
                    <div />
                  </div>

                  {/* Eixo Z */}
                  <div className="flex flex-col gap-1 items-center border-l border-white/10 pl-4">
                    <button onClick={() => sendCommand(`G91\nG1 Z${moveStep} F200\nG90`)} className="p-2 bg-white/10 rounded hover:bg-white/20 text-white"><FaCaretUp /></button>
                    <button onClick={() => sendCommand('G28 Z')} className="p-2 bg-farm-medium-blue/20 text-farm-medium-blue rounded text-[10px] font-bold uppercase">Z</button>
                    <button onClick={() => sendCommand(`G91\nG1 Z-${moveStep} F200\nG90`)} className="p-2 bg-white/10 rounded hover:bg-white/20 text-white"><FaCaretDown /></button>
                  </div>

                  {/* Extrusora */}
                  <div className="flex flex-col gap-2 pl-4 border-l border-white/10">
                    <button onClick={() => sendCommand(`G91\nG1 E${moveStep} F300\nG90`)} className="px-2 py-1 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded text-[9px] font-bold hover:bg-orange-500/20 uppercase">Extrusar</button>
                    <button onClick={() => sendCommand(`G91\nG1 E-${moveStep} F300\nG90`)} className="px-2 py-1 bg-white/5 text-white rounded text-[9px] font-bold hover:bg-white/20 uppercase">Retrair</button>
                  </div>
               </div>
            </div>



          </div>


          
        </div>


      </div>
    </div>
  );
};

export default MonitorModal;