// src/App.js

import React, { useState, useEffect, useCallback } from 'react';
import AddPrinterModal from './components/AddPrinterModal';
import axios from 'axios'; // Para o upload e API

// Ícones (Instale com: npm install react-icons)
import { FaPrint, FaList, FaPlus, FaUpload, FaFileCode, FaTrash, FaCopy } from 'react-icons/fa';

// Logo (O caminho está correto, baseado na sua imagem)
import logoIcon from './assets/icon-3dfarm.png'; 
import logoPrincipal from './assets/logoTrasnparente.png'; 

// --- Componentes de UI Reutilizáveis ---
// (Podemos mantê-los aqui ou movê-los para a pasta /components)

const Card = ({ children }) => (
  <div className="bg-farm-dark-blue/80 p-6 rounded-xl border border-farm-medium-grey/50 backdrop-blur-lg">
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
  const [printers, setPrinters] = useState([]);
  const [queue, setQueue] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [showModal, setShowModal] = useState(false);

  // --- LÓGICA DE DADOS ---

  // useCallback "memoriza" a função para que ela não seja recriada
  const fetchPrinters = useCallback(() => {
    // Usando o endpoint do seu app.py
    axios.get('/api/printers')
      .then(response => {
        if (response.data.success) {
          setPrinters(response.data.printers);
        }
      })
      .catch(error => console.error("Erro ao buscar impressoras:", error));
  }, []); // Array vazio = a função nunca muda

  const fetchQueue = useCallback(() => {
    axios.get('/api/queue')
      .then(response => {
        if (response.data.success) {
          setQueue(response.data.queue);
        }
      })
      .catch(error => console.error("Erro ao buscar fila:", error));
  }, []);

  // Executa as funções quando o componente carrega
  useEffect(() => {
    fetchPrinters();
    fetchQueue();
  }, [fetchPrinters, fetchQueue]); // Re-executa se estas funções mudarem

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

    // 1. Envia o ficheiro para /upload
    axios.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then(response => {
      // 2. Se o upload funcionou, envia para a fila /api/enqueue
      setUploadMessage(`Sucesso: ${response.data.fileName} enviado!`);
      setSelectedFile(null); // Limpa o ficheiro
      
      return axios.post('/api/enqueue', {
        fileName: response.data.fileName
      });
    })
    .then(enqueueResponse => {
      // 3. Se entrou na fila, atualiza a lista da fila
      console.log('Adicionado à fila:', enqueueResponse.data);
      fetchQueue(); // Atualiza a lista
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

    // 2. Chama a nova API de DELETE
    axios.delete(`/api/printer/delete/${printerId}`)
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

  const handleCopyToken = (token) => {
    // A API 'clipboard.writeText' é a forma moderna de copiar
    navigator.clipboard.writeText(token)
      .then(() => {
        // Sucesso!
        alert("Token copiado para a área de transferência!");
      })
      .catch(err => {
        // Erro (pode acontecer se o site não for 'localhost' ou 'https')
        console.error("Falha ao copiar o token: ", err);
        alert("Falha ao copiar o token.");
      });
  };

  return (
    <>
      {/* O Modal (agora controlado pelo state 'showModal') */}
      {showModal && (
        <AddPrinterModal
          onClose={() => setShowModal(false)}
          onPrinterAdded={handlePrinterAdded}
        />
      )}
    
      <div className="max-w-7xl mx-auto p-5">
        
        {/* Cabeçalho */}
        <header className="
          flex flex-col md:flex-row justify-between items-center md:gap-0 gap-5 
          mb-8 p-6 
          bg-black/20 border border-farm-medium-grey/50 
          rounded-xl backdrop-blur-lg">
          
          <div className="flex items-center gap-4">
            <img src={logoPrincipal} alt="3D Farm Logo" className="h-10" />
            <h1 className="text-2xl font-bold text-farm-light-grey m-0">
              3D Print Farm
            </h1>
          </div>
          
          <button 
            className="flex items-center gap-2 py-2 px-4 bg-farm-orange text-farm-dark-blue font-bold rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg"
            onClick={() => setShowModal(true)} // Abre o modal
          >
            <FaPlus /> Adicionar Impressora
          </button>
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
            <CardTitle icon={<FaList />} title="Fila de Impressão" />
            <ul className="space-y-3 max-h-96 overflow-y-auto">
              {queue.length === 0 && <p className="text-farm-medium-grey">Fila vazia.</p>}
              {queue.map(item => (
                <li key={item.id} className="flex items-center justify-between p-2 bg-farm-dark-blue rounded-lg">
                  <div className="flex items-center gap-3 truncate">
                    <FaFileCode className="text-farm-medium-blue flex-shrink-0" />
                    <span className="truncate">{item.filename}</span>
                  </div>
                  <span className="text-xs px-2 py-1 bg-farm-orange text-farm-dark-blue rounded-full font-bold">
                    {item.status}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Card 3: Upload de G-code */}
          <Card>
            <CardTitle icon={<FaUpload />} title="Upload de G-code" />
            
            <label 
              htmlFor="file-upload" 
              className="flex flex-col items-center justify-center w-full h-48 px-4 border-2 border-dashed border-farm-medium-grey rounded-lg cursor-pointer bg-farm-dark-blue/50 hover:bg-farm-dark-blue"
            >
              <FaUpload className="text-4xl text-farm-medium-grey" />
              <p className="mt-2 text-farm-medium-grey">Arraste um ficheiro G-code</p>
              <p className="text-xs text-farm-medium-grey">ou clique para selecionar</p>
            </label>
            
            <input 
              id="file-upload" 
              type="file" 
              className="hidden" 
              accept=".gcode,.gco" 
              onChange={handleFileChange}
            />

            {selectedFile && (
              <div className="flex justify-between items-center mt-4 p-2 bg-farm-dark-blue rounded-lg">
                <span className="text-farm-light-grey truncate">{selectedFile.name}</span>
                <button 
                  onClick={() => setSelectedFile(null)} 
                  className="text-red-500 font-bold ml-2 flex-shrink-0"
                >
                  X
                </button>
              </div>
            )}
            
            <button 
              onClick={handleUpload}
              disabled={!selectedFile}
              className="w-full mt-4 py-3 bg-farm-orange text-farm-dark-blue font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enviar para a Fila
            </button>
            
            {uploadMessage && (
              <p className="text-center mt-3 font-bold text-farm-orange">
                {uploadMessage}
              </p>
            )}
          </Card>

        </main>
      </div>
    </>
  );
}

export default App;