// src/App.js

import React, { useState, useEffect, useCallback } from 'react';
import AddPrinterModal from './components/AddPrinterModal'; // <-- Importa o modal de criar uma impressora
import axios from 'axios'; // Para o upload e API

import SelectFileModal from './components/SelectFileModal'; // <--- Importa o Modal para imprimir os g-code

import MonitorModal from './components/MonitorModal'; // <--- Importa o Modal para Monitorar a impressora

import ChangePassModal from './components/ChangePassModal';
import AdminUsersModal from './components/AdminUsersModal';

// Ícones (Instale com: npm install react-icons)
import { 
  FaPrint, FaList, FaPlus, FaUpload, FaFileCode, FaTrash, FaCopy, 
  FaCheckCircle, FaCog, FaExclamationTriangle, FaPlay, FaEye,
  FaUserCircle, FaKey, FaUsersCog, FaSignOutAlt 
} from 'react-icons/fa';

// Logo
import logoIcon from './assets/icon-3dfarm.png'; 
import logoPrincipal from './assets/logoTrasnparente.png'; 

// --- Componentes de UI Reutilizáveis ---

const Card = ({ children }) => (
  <div className="bg-farm-dark-blue/80 p-6 rounded-xl border border-farm-medium-grey/50 backdrop-blur-lg ">
    {children}
  </div>
);

const CardTitle = ({ icon, title }) => (
  <h2 className="flex items-center gap-3 text-xl font-bold border-b-2 border-farm-medium-blue pb-3 mb-4 mt-0">
    {icon} {title}
  </h2>
);
// ----------------------------------------


function App() {

  // --- Estados de Autenticação ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState({ username: '', role: '' });
  const [setupRequired, setSetupRequired] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [authLoading, setAuthLoading] = useState(true);

  // --- Estados originais do seu sistema ---

  const [printers, setPrinters] = useState([]);
  const [queue, setQueue] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activePrinters, setActivePrinters] = useState([]);
  const [idlePrinters, setIdlePrinters] = useState([]);
  const [disconnectedPrinters, setDisconnectedPrinters] = useState([]);
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedPrinterForPrint, setSelectedPrinterForPrint] = useState(null);
  const [selectedPrinterForMonitor, setSelectedPrinterForMonitor] = useState(null);

  // Estados para os novos modais de usuário
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [showAdminUsersModal, setShowAdminUsersModal] = useState(false);

  // --- LÓGICA DE DADOS ---

  // useCallback "memoriza" a função para que ela não seja recriada
  const fetchPrinters = useCallback(() => {
    // Usando o endpoint do seu app.py
    axios.get('/printers/lists')
      .then(response => {
        if (response.data.success) {
          setPrinters(response.data.printers);

          const allPrinters = response.data.printers;

          setPrinters(allPrinters);

          categorizePrinters(allPrinters);
        }
      })
      .catch(error => console.error("Erro ao buscar impressoras:", error));
  }, []); // Array vazio = a função nunca muda

  const fetchQueue = useCallback(() => {
    axios.get('/dashboard/queue')
      .then(response => {
        if (response.data.success) {
          setQueue(response.data.queue);
        }
      })
      .catch(error => console.error("Erro ao buscar fila:", error));
  }, []);

  // Lista os arquivos G-code Carregados
  const fetchFiles = useCallback(() => {
    axios.get('/dashboard/files')
      .then(response => {
        if (response.data.success) {
          setFiles(response.data.files);
        }
      })
      .catch(error => console.error("Erro ao buscar arquivos:", error));
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // 1. Verifica se precisa de Setup (primeiro admin)
        const setupRes = await axios.get('/auth/check-setup');
        if (setupRes.data.setup_required) {
          setSetupRequired(true);
        } else {
          // 2. Se não precisa de setup, verifica se tem token no localStorage
          const token = localStorage.getItem('token');
          const savedUser = localStorage.getItem('user');
          if (token && savedUser) {
            setIsLoggedIn(true);
            setUser(JSON.parse(savedUser));
            // Configura o axios para enviar o token em todas as chamadas futuras
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          }
        }
      } catch (err) {
        console.error("Erro na autenticação", err);
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    fetchPrinters();
    fetchFiles();
    fetchQueue();

    const interval = setInterval(() => {
      fetchPrinters();
      fetchFiles();
      fetchQueue();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchPrinters, fetchFiles]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/auth/login', loginForm);
      if (res.data.success) {
        const { token, role, username } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({ username, role }));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        setUser({ username, role });
        setIsLoggedIn(true);
        setSetupRequired(false); // Caso tenha sido o primeiro cadastro
      }
    } catch (err) {
      alert(err.response?.data?.message || "Erro ao entrar");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setIsLoggedIn(false);
    window.location.reload(); // Limpa todos os estados
  };

  

  // Função que o Modal vai chamar
  const handlePrinterAdded = (newPrinter) => {
    // Adiciona a nova impressora à lista local
    setPrinters(prevPrinters => [...prevPrinters, newPrinter]);
    // Fecha o modal
    setShowModal(false);
  };

  

  // --- LÓGICA DE UPLOAD ---

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setUploadMessage('');
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    setUploadMessage('Enviando...');

    // 1. Envia o ficheiro para a pasta /uploads
    axios.post('/dashboard/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then(response => {
      // Sucesso!
      setUploadMessage(`Sucesso: ${response.data.fileName} carregado!`);
      setSelectedFile(null); // Limpa o ficheiro do input
      
      // IMPORTANTE: Removemos a chamada para /dashboard/enqueue aqui.
      // Agora apenas atualizamos a lista visual de arquivos.
      fetchFiles(); 
    })
    .catch(error => {
      setUploadMessage('Erro ao enviar o ficheiro.');
      console.error('Erro no upload:', error);
    });
  };

  const handleDeletePrinter = (printerId, printerName) => {
    // 1. Pede confirmação ao usuário
    if (!window.confirm(`Tem certeza que deseja excluir a impressora "${printerName}"?`)) {
      return; // Se o usuário clicar "Cancelar", a função para aqui
    }

    // 2. Chama a função de DELETE
    axios.delete(`/printers/delete/<int:printer_id>${printerId}`)
      .then(response => {
        if (response.data.success) {
          // 3. Sucesso! Remove a impressora da lista na tela (sem recarregar)
          setPrinters(prevPrinters => 
            prevPrinters.filter(p => p.id !== printerId)
          );
        } else {
          // Mostra um erro se o backend falhar
          alert("Erro ao excluir impressora: " + response.data.message);
        }
      })
      .catch(error => {
        // Mostra um erro de rede
        console.error("Erro de rede ao excluir:", error);
        alert("Erro de rede ao tentar excluir impressora.");
      });
  };

  //Função de  copiar o token
  const handleCopyToken = (token) => {
    // Tenta o método moderno (só funciona em HTTPS ou localhost)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(token)
        .then(() => alert("Token copiado!"))
        .catch(() => copyToClipboardFallback(token)); // Se falhar, tenta o método antigo
    } else {
      // Se o navegador não suportar o moderno, vai direto para o antigo
      copyToClipboardFallback(token);
    }
  };

  // Função auxiliar para o método "antigo" (funciona em HTTP)
  const copyToClipboardFallback = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Torna a caixa invisível para o usuário, mas visível para o navegador
    textArea.style.position = "fixed"; 
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        alert("Token copiado!");
      } else {
        alert("Falha ao copiar o token.");
      }
    } catch (err) {
      console.error("Erro ao copiar: ", err);
      alert("Erro ao copiar. Por favor, copie manualmente.");
    }

    document.body.removeChild(textArea);
  };

  //Sistemade sepação das impressoras nos cards de acordo com os seus status

  const categorizePrinters = (printerList) => {
    const now = new Date();
    const active = [];
    const idle = [];
    const disconnected = [];

    printerList.forEach(printer => {
      // 1. Verifica se está desconectada (sem sinal há mais de 2 min)
      const lastSeenDate = printer.last_seen ? new Date(printer.last_seen + "Z") : null;
      
      if (!lastSeenDate || (now - lastSeenDate > 120000)) { 
        disconnected.push(printer);
        return; 
      }

      // 2. Lê o status
      let statusData = {};
      try {
        if (printer.last_status) {
          statusData = JSON.parse(printer.last_status);
        }
      } catch (e) {
        console.error("Erro ao ler status", e);
      }

      // 3. Verifica se está imprimindo (CORREÇÃO AQUI)
      // Convertemos tudo para MAIÚSCULAS para garantir que funciona sempre
      const rawState = statusData.estado || "";
      const state = rawState.toUpperCase(); 

      // Lista de estados que consideramos "ATIVOS"
      if (state === "PRINTING" || state === "PAUSED" || state === "PAUSING" || state === "RESUMING" || state === "FINISHING") {
        active.push(printer);
      } else {
        // Se não está imprimindo nem desconectada, está Ociosa (OPERATIONAL)
        idle.push(printer);
      }
    });

    setActivePrinters(active);
    setIdlePrinters(idle);
    setDisconnectedPrinters(disconnected);
  };

  

  // Abre o modal e guarda qual impressora foi selecionada
  const handleOpenPrintModal = (printer) => {
    setSelectedPrinterForPrint(printer);
    setShowFileModal(true);
  };

  // Quando o usuário escolhe o arquivo no modal
  const handleStartPrint = (filename) => {
    if (!selectedPrinterForPrint) return;

    // Envia para a API /dashboard/enqueue com o target_token da impressora específica
    axios.post('/dashboard/enqueue', {
      fileName: filename,
      target_token: selectedPrinterForPrint.token // <--- O PULO DO GATO: Envia direto para esta impressora
    })
    .then(response => {
      if (response.data.success) {
        alert(`Arquivo "${filename}" enviado para ${selectedPrinterForPrint.name}!`);
        setShowFileModal(false); // Fecha o modal
        setSelectedPrinterForPrint(null);
        fetchQueue(); // Atualiza a fila
      } else {
        alert("Erro: " + response.data.message);
      }
    })
    .catch(error => {
      console.error(error);
      alert("Erro ao enviar comando de impressão.");
    });
  };

  // Função para apagar arquivo G-code
  const handleDeleteFile = (filename) => {
    if (!window.confirm(`Tem certeza que deseja apagar o arquivo "${filename}"?`)) {
      return;
    }

    axios.delete(`/dashboard/files/${filename}`)
      .then(response => {
        if (response.data.success) {
          fetchFiles(); // Atualiza a lista
        }
      })
      .catch(error => {
        console.error("Erro ao apagar arquivo:", error);
        alert("Erro ao apagar arquivo.");
      });
  };

  const [isDragging, setIsDragging] = useState(false);

  // Quando o arquivo entra na área ou está em cima dela
  const handleDragOver = (e) => {
    e.preventDefault(); // IMPORTANTE: Impede o navegador de abrir a aba
    setIsDragging(true);
  };

  // Quando o arquivo sai da área
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Quando você solta o arquivo
  const handleDrop = (e) => {
    e.preventDefault(); // IMPORTANTE: Impede o navegador de abrir a aba
    setIsDragging(false);
    
    // Pega o arquivo que foi solto
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
      setUploadMessage('');
    }
  };

  if (authLoading) return <div className="h-screen bg-farm-dark-blue flex items-center justify-center text-white">Carregando...</div>;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-farm-dark-blue flex items-center justify-center p-4">

        <div className="fixed inset-0 z-0 bg-farm-bg bg-cover bg-center bg-no-repeat">
          {/* Overlay escuro para garantir legibilidade, similar ao dashboard */}
          <div className="absolute inset-0 bg-black/50"></div>
        </div>

        <div className="backdrop-blur p-8 rounded-2xl border border-farm-medium-grey w-full max-w-md backdrop-blur-xl">

          <img src={logoPrincipal} alt="3DFarm" className="w-48 mx-auto mb-8" />

          <h2 className="text-white text-center text-xl font-bold mb-6">
            {setupRequired ? "Configuração Inicial: Criar Admin" : "3D Farm - Login"}
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">

            <input 
              type="text" placeholder="Utilizador" required
              className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-farm-medium-blue transition-all"
              onChange={e => setLoginForm({...loginForm, username: e.target.value})}
            />

            <input 
              type="password" placeholder="Senha" required
              className="w-full bg-black/40 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-farm-medium-blue transition-all"
              onChange={e => setLoginForm({...loginForm, password: e.target.value})}
            />

            <button type="submit" className="w-full bg-farm-orange p-3 rounded-lg text-white font-bold hover:bg-opacity-80">
              {setupRequired ? "CRIAR CONTA ADMIN" : "ENTRAR"}
            </button>

          </form>

        </div>
        
      </div>
    );
  }

  return (
    <>
      {/* Modal */}

      {showChangePassModal && (
        <ChangePassModal 
          onClose={() => setShowChangePassModal(false)} />
      )}
      
      {showAdminUsersModal && (
        <AdminUsersModal 
        onClose={() => setShowAdminUsersModal(false)} />
      )}

      {/* O Modal (agora controlado pelo state 'showModal') */}
      {showModal && (
        <AddPrinterModal
          onClose={() => setShowModal(false)}
          onPrinterAdded={handlePrinterAdded}
        />
      )}

      {/* Modal de Seleção de Arquivo */}
      {showFileModal && selectedPrinterForPrint && (
        <SelectFileModal 
          printerName={selectedPrinterForPrint.name}
          onClose={() => setShowFileModal(false)}
          onSelectFile={handleStartPrint}
        />
      )}

      {/* Modal de monitoramento de impressora */}
      {selectedPrinterForMonitor && (
        <MonitorModal 
          printer={selectedPrinterForMonitor} 
          onClose={() => setSelectedPrinterForMonitor(null)} 
        />
      )}
    
      <div className="max-w-7xl mx-auto p-5">
        
        {/* Cabeçalho */}
        <header className="
          flex flex-col md:flex-row justify-between items-center md:gap-0 gap-5 mb-8 p-6 bg-black/20 border border-farm-medium-grey/50 rounded-xl backdrop-blur-lg relative z-[1000]">
          
          <div className="flex items-center gap-4">
            <img src={logoPrincipal} alt="3D Farm Logo" className="h-10" />
            <h1 className="text-2xl font-bold text-farm-light-grey m-0">
              3D Print Farm
            </h1>
          </div>
          

          <div className="flex items-center gap-4 relative z-[1000]">

            {/* BOTÃO DE ADICIONARIMPRESSORA */}
            <button 
              className="flex items-center gap-2 py-2 px-4 bg-farm-orange text-farm-dark-blue font-bold rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg"
              onClick={() => setShowModal(true)} // Abre o modal de adicionar impressora
            >
              <FaPlus /> Adicionar Impressora
            </button>

            {/* BOTÃO DE PERFIL */}
            <div className="relative group z-[100]">
              <button className="p-3 bg-farm-medium-grey/20 text-white rounded-full border border-white/10 hover:bg-farm-medium-grey/40 transition-all">
                <FaUserCircle size={20} />
              </button>
              
              {/* Menu Dropdown */}
              <div className="absolute right-0 pt-2 w-52 bg-farm-dark-blue border border-farm-medium-grey rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] hidden group-hover:block z-[1100] overflow-hidden">
                <div className="p-3 border-b border-white/10 text-xs text-farm-light-grey">
                  Olá, <b>{user.username}</b> ({user.role})
                </div>
                <button onClick={() => setShowChangePassModal(true)} className="w-full text-left p-3 text-sm text-white hover:bg-white/10 flex items-center gap-2">
                  <FaKey /> Mudar Senha
                </button>
                {user.role === 'admin' && (
                  <button onClick={() => setShowAdminUsersModal(true)} className="w-full text-left p-3 text-sm text-white hover:bg-white/10 flex items-center gap-2">
                    <FaUsersCog /> Gerir Utilizadores
                  </button>
                )}
                <button onClick={handleLogout} className="w-full text-left p-3 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                  <FaSignOutAlt /> Sair
                </button>
              </div>
            </div>

          </div>

        </header>

        {/* --- TELA PRINCIPAL (GRID COM 3 COLUNAS) --- */}
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* Card 1: Impressoras Conectadas */}
          <Card>
            <CardTitle icon={<FaPrint />} title="Impressoras Cadastradas" />
            <ul className="space-y-3 max-h-96 overflow-y-auto">
              
              {printers.length === 0 && <p className="text-farm-medium-grey">Nenhuma impressora registrada.</p>}
              
              {printers.map(printer => (
                <li key={printer.id} className="flex justify-between items-center py-2 border-b border-dashed border-farm-medium-grey">
                  
                  {/* Lado Esquerdo: Nome */}
                  <span className='truncate'>{printer.name || 'Impressora Sem Nome'}</span>
                  
                  {/* Lado Direito: Wrapper para Status e Botões */}
                  <div className="flex items-center gap-4 flex-shrink-0"> {/* Aumentei o 'gap-3' para 'gap-4' */}
                    
                    {/* Status (Token) */}
                    <span className={`font-mono text-xs text-farm-medium-blue`}>
                      ...{printer.token.slice(-6)}
                    </span>
                    
                    {/* --- O NOVO BOTÃO DE COPIAR --- */}
                    <button 
                      onClick={() => handleCopyToken(printer.token)}
                      className="text-farm-medium-blue hover:text-farm-light-grey transition-colors"
                      title="Copiar Token Inteiro"
                    >
                      <FaCopy />
                    </button>
                    
                    {/* Botão de Apagar (Já existente) */}
                    <button 
                      onClick={() => handleDeletePrinter(printer.id, printer.name)}
                      className="text-red-500 hover:text-red-400 transition-colors"
                      title="Excluir Impressora"
                    >
                      <FaTrash />
                    </button>

                  </div>
                </li>
              ))}
            </ul>
          </Card>

          
          
          {/* Card 2: Fila de Impressão */}
          <Card>
            <CardTitle icon={<FaFileCode />} title="Arquivos Carregados" />
            <ul className="space-y-3 max-h-96 overflow-y-auto">
              {files.length === 0 && <p className="text-farm-medium-grey">Nenhum arquivo.</p>}
              
              {files.map((filename, index) => (
                <li key={index} className="flex items-center justify-between p-2 bg-farm-dark-blue rounded-lg group border-b border-dashed border-farm-medium-grey">
                  <div className="flex items-center gap-3 truncate">
                    <FaFileCode className="text-farm-medium-blue flex-shrink-0" />
                    <span className="truncate" title={filename}>{filename}</span>
                  </div>
                  
                  {/* Botão de Excluir Arquivo */}
                  <button 
                    onClick={() => handleDeleteFile(filename)}
                    className="text-red-500 hover:text-red-300 p-2 transition-colors"
                    title="Apagar Arquivo"
                  >
                    <FaTrash />
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {/* Card 3: Upload de G-code */}
          <Card>
            <CardTitle icon={<FaUpload />} title="Upload de G-code" />
            
            <label 
              htmlFor="file-upload" 
              // Adicionamos os eventos aqui
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                flex flex-col items-center justify-center w-full h-48 px-4 
                border-2 border-dashed rounded-lg cursor-pointer transition-colors
                ${isDragging 
                  ? 'border-farm-orange bg-farm-orange/20' // Cor quando arrasta por cima
                  : 'border-farm-medium-grey bg-farm-dark-blue/50 hover:bg-farm-dark-blue'
                }
              `}
            >
              <FaUpload className={`text-4xl mb-2 transition-colors ${isDragging ? 'text-farm-orange' : 'text-farm-medium-grey'}`} />
              
              <p className="text-farm-medium-grey font-medium">
                {isDragging ? "Solte o arquivo aqui!" : "Arraste um G-code"}
              </p>
              
              {!isDragging && <p className="text-xs text-farm-medium-grey mt-1">ou clique para selecionar</p>}
            </label>
            
            <input id="file-upload" type="file" className="hidden" accept=".gcode,.gco" onChange={handleFileChange} />
            
            {/* Visualização do arquivo selecionado */}
            {selectedFile && (
              <div className="flex justify-between items-center mt-4 p-3 bg-farm-dark-blue border border-farm-medium-grey/30 rounded-lg">
                <div className="flex items-center gap-2 truncate">
                   <FaFileCode className="text-farm-orange flex-shrink-0" />
                   <span className="text-farm-light-grey truncate text-sm">{selectedFile.name}</span>
                </div>
                <button onClick={() => setSelectedFile(null)} className="text-red-500 font-bold ml-2 hover:bg-red-500/10 rounded px-2">X</button>
              </div>
            )}
            
            <button 
              onClick={handleUpload} 
              disabled={!selectedFile} 
              className="w-full mt-4 py-3 bg-farm-orange text-farm-dark-blue font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-[1.02]"
            >
              Carregar G-Code
            </button>
            
            {uploadMessage && <p className="text-center mt-3 font-bold text-farm-orange text-sm animate-pulse">{uploadMessage}</p>}
          </Card>
          
          {/* Card 4 : Impressoras Ativas */}
          
          {/* {activePrinters.length === 0 && <p className="text-farm-medium-grey text-sm">Nenhuma impressora está imprimindo.</p>}

              {activePrinters.map(p => (
                <li key={p.id} className="truncate border-b border-dashed border-farm-medium-grey">
                  <span className="truncate flex-1" title={p.name}>
                    {p.name || 'Impressora Sem Nome'}
                  </span>
                </li>
              ))} */}

          <Card className="border-t-4 border-t-green-500">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-lg flex items-center gap-2 text-green-400">
                <FaCog className="animate-spin" /> Imprimindo
              </h3>
              <span className="text-3xl font-bold">{activePrinters.length}</span>
            </div>
            <ul className="space-y-2 text-sm text-farm-light-grey/70 max-h-40 overflow-y-auto">
              {activePrinters.map(p => (
                <li key={p.id} className="flex justify-between items-center border-b border-farm-medium-grey/30 py-2">
                  <div className="flex flex-col truncate pr-2">
                    <span className="font-bold text-white truncate">{p.name}</span>
                    <span className="text-xs text-farm-medium-blue truncate flex items-center gap-1">
                      <FaFileCode size={10} /> {p.jobName}
                    </span>
                  </div>
                  
                  <button 
                    onClick={() => setSelectedPrinterForMonitor(p)}
                    className="p-2 bg-farm-medium-blue/20 text-farm-medium-blue rounded-full hover:bg-farm-medium-blue hover:text-white transition-all"
                    title="Monitorar Câmera e Controles"
                  >
                    <FaEye />
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {/* Card 5: Impressoras Ociosas */}
          <Card className="border-t-4 border-t-farm-medium-blue">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-lg flex items-center gap-2 text-farm-medium-blue">
                <FaCheckCircle /> Ociosas
              </h3>
              <span className="text-3xl font-bold">{idlePrinters.length}</span>
            </div>
            
            <ul className="space-y-2 max-h-40 overflow-y-auto">
              {idlePrinters.length === 0 && <p className="text-farm-medium-grey text-sm">Nenhuma impressora ociosa.</p>}
              
              {idlePrinters.map(p => (
                <li key={p.id} className="text-sm flex justify-between items-center border-b border-farm-medium-grey/30 py-1 pr-1">
                  <span className="truncate flex-1" title={p.name}>
                    {p.name || 'Sem Nome'}
                  </span>
                  
                  <div className="flex items-center gap-2 ml-2">

                    {/* BOTÃO DE IMPRIMIR */}
                    <button 
                      onClick={() => handleOpenPrintModal(p)}
                      className="ml-2 bg-farm-medium-blue text-white p-2 rounded hover:bg-blue-600 transition-colors"
                      title="Imprimir nesta impressora"
                    >
                      <FaPlay size={10} />
                    </button>

                    <button 
                      onClick={() => setSelectedPrinterForMonitor(p)}
                      className="p-2 bg-farm-medium-blue/20 text-farm-medium-blue rounded-full hover:bg-farm-medium-blue hover:text-white transition-all"
                      title="Monitorar Câmera e Controles"
                    >
                      <FaEye />
                    </button>

                  </div>

                </li>
              ))}
            </ul>
          </Card>

          {/* Card 6: Impressoras Desconectadas */}
          <Card className="border-t-4 border-t-red-500">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-lg flex items-center gap-2 text-red-500">
                <FaExclamationTriangle /> Desconectadas
              </h3>
              <span className="text-3xl font-bold">{disconnectedPrinters.length}</span>
            </div>
            <ul className="space-y-1 text-sm text-farm-light-grey/70 max-h-24 overflow-y-auto">
              {disconnectedPrinters.length === 0 && <p className="text-farm-medium-grey text-sm">Nenhuma impressora desconectada.</p>}

              {disconnectedPrinters.map(p => (
                <li key={p.id} className="truncate border-b border-dashed border-farm-medium-grey">
                  <span className="truncate flex-1" title={p.name}>
                    {p.name || 'Impressora Sem Nome'}
                  </span>
                </li>
              ))}

            </ul>
          </Card>

        </main>
      </div>
    </>
  );
}

export default App;