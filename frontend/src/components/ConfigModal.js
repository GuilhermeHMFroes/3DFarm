import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCog, FaTimes } from 'react-icons/fa';

const ConfigModal = ({ onClose }) => {
  

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[2000] p-4 backdrop-blur-sm">
        <div className="backdrop-blur-lg border border-farm-medium-grey p-6 rounded-xl w-full max-w-md shadow-2xl min-w-[75vh] max-w-[75vh]">

            {/* Header do Modal */}
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-bold text-xl flex items-center gap-2">
                    <FaCog className="text-farm-medium-blue animate-spin" /> Configurações do Sistema
                </h3>
                <button onClick={onClose} className="text-white hover:text-red-500 transition-colors transition-all hover:scale-105 hover:shadow-lg">
                    <FaTimes size={20} />
                </button>
            </div>

            {/* Body do Modal */}
            <div className="justify-between items-center mb-6">

                <h4 className="text-white font-bold text-xl flex items-center gap-2 border-b-2 border-white-500 gap-6">Configurações da API</h4>

                <div>
                    <p>Tempo de verificação de inatividade das impressoras</p>
                    <input
                        type="text" value="2.5"
                        className="bg-black/40 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-farm-medium-blue transition-all">
                    </input>
                </div>

            </div>

            {/* Botões de Ação */}
            <div className="flex justify-end-safe gap-4 mt-6">
                <button 
                    className="flex items-center gap-2 py-2 px-4 bg-farm-orange text-farm-dark-blue font-bold rounded-lg duration-200 transition-all hover:scale-105 hover:shadow-lg hover:text-white">
                    <h3>Salvar</h3>
                </button>
            </div>

        </div>
    </div>
  );
};

export default ConfigModal;