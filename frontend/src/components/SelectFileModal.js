// src/components/SelectFileModal.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTimes, FaFileCode, FaPrint } from 'react-icons/fa';

const SelectFileModal = ({ onClose, onSelectFile, printerName }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Busca a lista de arquivos disponíveis no backend
  useEffect(() => {
    axios.get('/api/files')
      .then(res => {
        if (res.data.success) {
          setFiles(res.data.files);
        }
      })
      .catch(err => console.error("Erro ao listar arquivos", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-farm-light-grey text-farm-dark-blue p-6 rounded-xl shadow-2xl relative max-w-md w-11/12 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="absolute top-4 right-4 text-2xl text-farm-medium-grey hover:text-farm-dark-blue"
          onClick={onClose}
        >
          <FaTimes />
        </button>
        
        <h2 className="text-xl font-bold text-farm-dark-blue mt-0 mb-4 pr-8">
          Imprimir em: <span className="text-farm-medium-blue">{printerName}</span>
        </h2>
        
        <p className="mb-2 text-sm text-farm-medium-grey">Selecione um arquivo para iniciar:</p>

        {loading ? (
          <p className="text-center py-4">Carregando arquivos...</p>
        ) : (
          <div className="overflow-y-auto flex-1 pr-2">
            {files.length === 0 && <p className="text-center text-farm-orange">Nenhum arquivo G-code encontrado.</p>}
            
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li key={index}>
                  <button
                    onClick={() => onSelectFile(file)}
                    className="w-full flex items-center justify-between p-3 bg-white border border-farm-medium-grey/30 rounded-lg hover:bg-farm-medium-blue hover:text-white transition-colors group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FaFileCode className="text-farm-medium-grey group-hover:text-white" />
                      <span className="truncate text-sm font-medium">{file}</span>
                    </div>
                    <FaPrint className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectFileModal;