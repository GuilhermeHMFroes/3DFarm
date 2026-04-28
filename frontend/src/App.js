// src/App.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import AddPrinterModal from './components/AddPrinterModal'; // <-- Importa o modal de criar uma impressora
import axios from 'axios'; // Para o upload e API

import SelectFileModal from './components/SelectFileModal'; // <--- Importa o Modal para imprimir os g-code

import MonitorModal from './components/MonitorModal'; // <--- Importa o Modal para Monitorar a impressora

import ChangePassModal from './components/ChangePassModal';
import AdminUsersModal from './components/AdminUsersModal';

import Footer from './components/Footer';
import io from 'socket.io-client'; // Importa o cliente socket

// Ícones (Instale com: npm install react-icons)
import { 
  FaPrint, FaList, FaPlus, FaUpload, FaFileCode, FaTrash, FaCopy, 
  FaCheckCircle, FaCog, FaExclamationTriangle, FaPlay, FaEye,
  FaUserCircle, FaKey, FaUsersCog, FaSignOutAlt, FaVideoSlash 
} from 'react-icons/fa';

// Biblioteca dos ícones do react:  https://react-icons.github.io/react-icons/icons/fa/

// Logo
import logoIcon from './assets/icon-3dfarm.png'; 
import logoPrincipal from './assets/logoTrasnparente.png'; 

// --- Componentes de UI Reutilizáveis ---

// Se estiver rodando o comando 'npm start', o process.env.NODE_ENV é 'development'
export const API_BASE_URL = process.env.NODE_ENV === 'development' 
  //? 'http://192.168.3.79:5000' 
  ? `http://${window.location.hostname}:5000`
  : window.location.origin

// Configure o Axios para usar essa base automaticamente
axios.defaults.baseURL = API_BASE_URL;


const Card = ({ children, className = "" }) => (
  <div className={`backdrop-blur-lg border border-gray-800 rounded-xl p-4 shadow-xl ${className}`}>
    {children}
  </div>
);

const CardTitle = ({ icon, title }) => (
  <h2 className="flex items-center gap-3 text-xl font-bold border-b-2 border-farm-medium-blue pb-3 mb-4 mt-0">
    {icon} {title}
  </h2>
);
// ---------------------------------------- border border-farm-medium-grey/50 bg-farm-dark-blue/50



const CameraFeed = React.memo(({ printer }) => {

  // Estado para a imagem da câmera
    const [imageSrc, setImageSrc] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    
    // Refs para gerenciar o socket e URLs de objeto sem causar re-renders
    const socketRef = useRef(null);
    const lastUrlRef = useRef(null);
  
    const [moveStep, setMoveStep] = useState(10); // Passo de movimentação (1, 10, 100mm)
    const terminalEndRef = useRef(null); // Referência para o scroll do terminal

  useEffect(() => {
    
    // Criamos a instância do socket
    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
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

      const webcamUrl = `${API_BASE_URL}/api/proxy/webcam/${printer.token}`;
      
    // Se o dado vier como string Base64 (recomendado para fluidez)
      if (typeof data.image === 'string') {
          setImageSrc(`data:image/jpeg;base64,${data.image}`);
      } 
      // Caso você prefira manter o envio como binário (Blob)
      else {
          try {
              const blob = new Blob([data.image], { type: 'image/jpeg' });
              const url = URL.createObjectURL(blob);
              setImageSrc(url);
              if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
              lastUrlRef.current = url;
          } catch (err) {
              console.error("Erro ao processar frame binário:", err);
          }
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
  }, [printer.token]);

  return (
    <div className="aspect-video bg-black rounded flex items-center justify-center overflow-hidden border border-white/10 relative">
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

    


  );
});



function App() {

  const isFirstLoad = useRef(true);
  const [loading, setLoading] = useState(true);

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


  // Estado para controlar qual aba está ativa (Dashboard ou Monitoramento)
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' ou 'monitor'

  // --- LÓGICA DE DADOS ---

  // useCallback "memoriza" a função para que ela não seja recriada
  const fetchPrinters = useCallback(() => {


    if (isFirstLoad.current) {
      setLoading(true);
    }


    // Usando o endpoint do seu app.py
    axios.get('/printers/lists')
      .then(response => {
        if (response.data.success) {
          setPrinters(response.data.printers);

          const allPrinters = response.data.printers;

          setPrinters(allPrinters);

          categorizePrinters(allPrinters);


          // Após o primeiro sucesso, marcamos como falso para nunca mais mostrar o loading
          if (isFirstLoad.current) {
            isFirstLoad.current = false;
            setLoading(false);
          }


        }
      })
      .catch(error => {
        console.error("Erro ao buscar impressoras:", error);
      })
      .finally(() => {
        setTimeout(() => setLoading(false), 1000); // 2. Termina o carregamento (sucesso ou erro)
      });
    
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


    if (isFirstLoad.current) {
      setLoading(true);
    }



    axios.get('/dashboard/files')
      .then(response => {
        if (response.data.success) {
          setFiles(response.data.files);


          // Após o primeiro sucesso, marcamos como falso para nunca mais mostrar o loading
          if (isFirstLoad.current) {
            isFirstLoad.current = false;
            setLoading(false);
          }




        }
      })
      .catch(error => {
        console.error("Erro ao buscar arquivos:", error);
      })
      .finally(() => {
        setTimeout(() => setLoading(false), 1000); // 2. Termina o carregamento (sucesso ou erro)
      });



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

            // Configura o axios para enviar o token em todas as chamadas futuras
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            try {

              await axios.get('/auth/verify');

              setIsLoggedIn(true);
              setUser(JSON.parse(savedUser));

              const parsedUser = JSON.parse(savedUser);

              // Se a role for monitor, define a aba ativa como monitoramento
              if (parsedUser.role === 'monitor') {
                setActiveTab('monitor');
              }

              fetchPrinters();
              fetchFiles();

            }catch (verifyErr) {
              // Se cair aqui, o token existe mas é inválido ou expirou
              console.warn("Token expirado, deslogando...");
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setIsLoggedIn(false);
            }



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

        fetchPrinters();
        fetchFiles();

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

  const handleTabChange = (tabName) => {
    const savedUser = JSON.parse(localStorage.getItem('user'));
    
    if (savedUser?.role === 'monitor') {
      setActiveTab('monitor'); // Força a permanência
    } else {
      setActiveTab(tabName); // Permite a troca para outros usuários
    }
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

    const token = localStorage.getItem('token');

    const formData = new FormData();
    formData.append('file', selectedFile);

    setUploadMessage('Enviando...');

    // 1. Envia o ficheiro para a pasta /uploads
    axios.post('/dashboard/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      'Authorization': `Bearer ${token}`
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
      // Se o erro for 401, o token provavelmente expirou
      if (error.response && error.response.status === 401) {
        setUploadMessage('Sessão expirada. Faça login novamente.');
      } else {
        setUploadMessage('Erro ao enviar o ficheiro.');
      }
      console.error('Erro no upload:', error);
    });
  };

  const handleDeletePrinter = (printerId, printerName) => {
    // 1. Pede confirmação ao usuário
    if (!window.confirm(`Tem certeza que deseja excluir a impressora "${printerName}"?`)) {
      return; // Se o usuário clicar "Cancelar", a função para aqui
    }

    // 2. Chama a função de DELETE
    axios.delete(`/printers/delete/${printerId}`)
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


      



      <nav>

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

      </nav>

      {/* Se o sistema ainda estiver validando o login ou buscando impressoras */}
      {(authLoading || loading) && isLoggedIn ? (
        <div className="h-screen w-full bg-farm-black flex flex-col items-center justify-center text-white">
          {/* Você pode usar a sua logo aqui para ficar profissional */}
          <img src={logoIcon} alt="Logo" className="w-16 h-16 mb-4 animate-bounce" />
          <h2 className="text-xl font-semibold animate-pulse">
            Carregando dashboard, aguarde alguns instantes...
          </h2>
        </div>
      ) : (
    
      <div className="  flex flex-col min-h-screen">

        <div className="max-w-screen-2xl mx-auto w-full flex-1 p-5">

          <div>
        
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

                {/* BOTÃO que redireciona para instalar o plugin */}

                <a href="https://github.com/GuilhermeHMFroes/octoprint-fazenda3d" target="_blank" rel="noopener noreferrer">
                  <button 
                    className="flex items-center gap-2 py-2 px-4 bg-farm-orange text-farm-dark-blue font-bold rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg">
                    <FaPlus /> Instalar Plugin
                  </button>
                </a>

                {user.role === 'admin' || user.role === 'user' && (
                  <button 
                    className="flex items-center gap-2 py-2 px-4 bg-farm-orange text-farm-dark-blue font-bold rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg"
                    onClick={() => setShowModal(true)} // Abre o modal de adicionar impressora
                  >
                    <FaPlus /> Adicionar Impressora
                  </button>
                )}

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
                        <FaUsersCog /> Gerenciar Usuários
                      </button>
                    )}
                    {user.role === 'admin' && (
                      <button onClick={() => setShowAdminUsersModal(true)} className="w-full text-left p-3 text-sm text-white hover:bg-white/10 flex items-center gap-2">
                        <FaCog/> Configurações 
                      </button>
                    )}
                    <button onClick={handleLogout} className="w-full text-left p-3 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2">
                      <FaSignOutAlt /> Sair
                    </button>
                  </div>
                </div>

              </div>

            </header>


            {/* Menu de Abas */}

            {user.role === 'admin' || user.role === 'user' && (
              <div className="flex gap-10 mb-10 border-b border-farm-orange/60 px-6">
              
              
                    
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`pb-2 text-lg font-bold transition-all ${
                    activeTab === 'dashboard' 
                    ? 'border-b-2 border-orange-500 text-orange-500' 
                    : 'text-farm-light-grey/50 hover:text-white'
                  }`}
                >
                  Dashboard
                </button>

              

                <button
                  onClick={() => setActiveTab('monitoramento')}
                  className={`pb-2 text-lg font-bold transition-all ${
                    activeTab === 'monitoramento' 
                    ? 'border-b-2 border-orange-500 text-orange-500' 
                    : 'text-farm-light-grey/50 hover:text-white'
                  }`}
                >
                  Monitoramento
                </button>
                
              </div>

            )}
            

            {/* --- TELA PRINCIPAL (GRID COM 3 COLUNAS) --- */}
            <main>


              <div>

              

              {activeTab === 'dashboard' ? (


              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              
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

                <Card className="border-t-4 border-t-green-500 border-green-500">
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
                <Card className="border-t-4 border-t-farm-medium-blue border-farm-medium-blue">
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
                <Card className="border-t-4 border-t-red-500 border-red-500">
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

              </div>
              

              ):(


                  /* --- NOVO CONTEÚDO DO MONITORAMENTO --- */
                      <div  className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                        {activePrinters.map(printer => (

                          <Card key={printer.id} className="overflow-hidden !border-2 !border-green-500 shadow-lg shadow-green-500/20">
                            <div className="flex justify-between items-center mb-2 p-2">
                              <h3 className="font-bold text-green-400 flex items-center gap-2">
                                <FaCog className="animate-spin" /> {printer.name} - Imprimindo
                              </h3>
                              <span className="text-xs text-red-500 ml-2 border-2 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse px-1">
                                 ● Ao Vivo 
                              </span>
                            </div>

                            {/* Componente que gerencia o Socket de vídeo para cada card */}
                            <CameraFeed printer={printer} />
                          </Card>

                        ))}

                        {idlePrinters.map(printer => (
                          
                          <Card key={printer.id} className="overflow-hidden !border-2 !border-blue-500 shadow-lg shadow-blue-500/20">
                            <div className="flex justify-between items-center mb-2 p-2">
                              <h3 className="font-bold text-blue-400 flex items-center gap-2">
                                <FaPrint className="text-xs" /> {printer.name} - Ociosa
                              </h3>
                              <span className="text-xs text-red-500 ml-2 border-2 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse px-1">
                                 ● Ao Vivo 
                              </span>
                            </div>

                            {/* Componente que gerencia o Socket de vídeo para cada card */}
                            <CameraFeed printer={printer} />
                          </Card>

                        ))}

                        {printers.filter(p => p.last_status !== 'disconnected').length === 0 && (
                          <div className="backdrop-blur-lg col-span-full py-20 text-center border-2 border-gray-800 rounded-xl">
                            <FaVideoSlash className="mx-auto text-4xl text-white-700 mb-4 animate-pulse shadow-[0_0_50px_rgba(255,255,255,1)]" />
                            <p className="text-farm-medium-grey text-lg">Nenhuma impressora online para monitorar.</p>
                          </div>
                        )}

                        

                      </div>



                  )

                }

              </div>



            </main>

          </div>

        </div>

        <Footer />

      </div>

      )}

    </>
    
  );
}

export default App;