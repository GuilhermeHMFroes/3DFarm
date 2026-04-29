// src/App.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import AddPrinterModal from './components/AddPrinterModal'; // <-- Importa o modal de criar uma impressora
import axios from 'axios'; // Para o upload e API

import SelectFileModal from './components/SelectFileModal'; // <--- Importa o Modal para imprimir os g-code

import MonitorModal from './components/MonitorModal'; // <--- Importa o Modal para Monitorar a impressora

import ChangePassModal from './components/ChangePassModal';
import AdminUsersModal from './components/AdminUsersModal';

import Footer from './components/Footer';
import DashboardTab from './components/DashboardTab';
import MonitoringTab from './components/MonitoringTab';
import LoadingPage from './components/LoadingPage';
import Header from './components/Header';

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

const CardTitle = ({ icon, title  }) => (
  <h2 className={'flex items-center gap-3 text-xl font-bold border-b-2 border-farm-medium-blue pb-3 mb-4 mt-0'}>
    {icon} {title}
  </h2>
);



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
        
        <LoadingPage />
        
      ) : (
    
      <div className="  flex flex-col min-h-screen">

        <div className="max-w-screen-2xl mx-auto w-full flex-1 p-5">

          <div>
        
            {/* Cabeçalho */}
            
            <Header 
              user={user} 
              setShowModal={setShowModal}
              setShowChangePassModal={setShowChangePassModal}
              setShowAdminUsersModal={setShowAdminUsersModal}
              handleLogout={handleLogout}
            />

            {/* Menu de Abas */}

            {['admin', 'user'].includes(user?.role) && (
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
                  onClick={() => setActiveTab('monitor')}
                  className={`pb-2 text-lg font-bold transition-all ${
                    activeTab === 'monitor' 
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

              
              
              {activeTab === 'dashboard' && user?.role !== 'monitor' ? (

                

                <DashboardTab 
                  // Dados (Estados)
                  printers={printers}
                  files={files}
                  activePrinters={activePrinters}
                  idlePrinters={idlePrinters}
                  disconnectedPrinters={disconnectedPrinters}
                  
                  // Funções de Ação
                  handleCopyToken={handleCopyToken}
                  handleDeletePrinter={handleDeletePrinter}
                  handleDeleteFile={handleDeleteFile}
                  
                  // Upload e Drag-and-Drop
                  isDragging={isDragging}
                  handleDragOver={handleDragOver}
                  handleDragLeave={handleDragLeave}
                  handleDrop={handleDrop}
                  handleFileChange={handleFileChange}
                  selectedFile={selectedFile}
                  setSelectedFile={setSelectedFile}
                  handleUpload={handleUpload}
                  uploadMessage={uploadMessage}
                  
                  // Modais e Monitoramento
                  handleOpenPrintModal={handleOpenPrintModal}
                  setSelectedPrinterForMonitor={setSelectedPrinterForMonitor}

                  // Componentes de Estilo (se você os manteve no App.js)
                  Card={Card}
                  CardTitle={CardTitle}

                />

              ):(


                <MonitoringTab 
                  activePrinters={activePrinters}
                  idlePrinters={idlePrinters}
                  disconnectedPrinters={disconnectedPrinters}
                  printers={printers}
                  Card={Card}
                  CardTitle={CardTitle}
                  CameraFeed={CameraFeed}
                />



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