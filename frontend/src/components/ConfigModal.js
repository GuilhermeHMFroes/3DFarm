import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCog, FaTimes } from 'react-icons/fa';



const ConfigModal = ({ onClose }) => {
  
    // Estados para os campos
    const [enabledJwtExpiration, setEnabledJwtExpiration] = useState(false);
    const [jwtDays, setJwtDays] = useState(7);
    const [inactivityTime, setInactivityTime] = useState("");

    // 1. BUSCAR DADOS AO ABRIR O MODAL
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                // Rota correta baseada no seu register_blueprint
                const response = await axios.get('/settings/data'); 
                const data = response.data;
                
                // Mapeia os dados do banco para o estado do React
                setEnabledJwtExpiration(data.experingJWTToken === 'True');
                setJwtDays(data.jwtDays || 7);
                setInactivityTime(data.inactivity_time || "2.5");
            } catch (err) {
                console.error("Erro ao buscar configurações:", err);
            }
        };
        fetchConfig();
    }, []);

    // 2. SALVAR DADOS
    const handleSave = async () => {
        try {
            const payload = {
                inactivity_time: inactivityTime,
                experingJWTToken: enabledJwtExpiration ? 'True' : 'False',
                jwtDays: jwtDays
            };

            // Rota POST definida no seu settings.py
            await axios.post('/settings/config', payload);
            
            alert("Configurações salvas com sucesso!");
            onClose(); // Fecha o modal após salvar
        } catch (err) {
            console.error("Erro ao salvar:", err);
            alert("Erro ao salvar as configurações.");
        }
    };

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

                    {/* configurações do jwt */}
                    <div>
                        <h4 className="text-white font-bold text-xl flex items-center gap-2 border-b-2 border-white-500 gap-6">Configurações do JWT</h4>

                        {/* Configurando a expiração do token do jwt */}
                        <div>
                            
                            <p>
                                <input
                                    type="checkbox"
                                    className="mr-2 transition-all hover:scale-105 hover:shadow-lg"
                                    checked={enabledJwtExpiration}
                                    onChange={(e) => setEnabledJwtExpiration(e.target.checked)}
                                >
                                </input>
                                Habilitar a expiração do token do jwt
                            </p>

                            {enabledJwtExpiration && (

                                <nav className="ml-8 mt-4 transition-all duration-900 ease-in-out border-l-2 border-white/5 pl-4">
                                    <p>Tempo de expiração do token em dias:</p>
                                    <input 
                                        type="text"
                                        inputMode="numeric"
                                        className="h-10 bg-black/40 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-farm-medium-blue transition-all"
                                        value={jwtDays}
                                        onChange={(e) => setJwtDays(e.target.value.replace(/\D/g, ''))}
                                        
                                    >
                                    </input>
                                </nav>

                            )}
                            
                        </div>

                    </div>

                    <br></br>

                    {/* configurações de api */}
                    <div>
                        <h4 className="text-white font-bold text-xl flex items-center gap-2 border-b-2 border-white-500 gap-6">Configurações da API</h4>

                        <div>
                            <p>Tempo de verificação de inatividade das impressoras</p>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={inactivityTime}
                                className="bg-black/40 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-farm-medium-blue transition-all"
                                onChange={(e) => {
                                    // Permite apenas números e UM único ponto
                                    let val = e.target.value;
                                    
                                    // 1. Remove qualquer coisa que não seja número ou ponto
                                    val = val.replace(/[^0-9.]/g, '');
                                    
                                    // 2. Impede que o usuário digite mais de um ponto (ex: 6.5.5)
                                    const parts = val.split('.');
                                    if (parts.length > 2) {
                                        val = parts[0] + '.' + parts.slice(1).join('');
                                    }
                                    
                                    setInactivityTime(val);
                                }}
                                
                            >
                            </input>
                        </div>

                    </div>

                    

                </div>

                {/* Botões de Ação */}
                <div className="flex justify-end-safe gap-4 mt-6">
                    <button 
                        onClick={handleSave}
                        className="flex items-center gap-2 py-2 px-4 bg-farm-orange text-farm-dark-blue font-bold rounded-lg duration-200 transition-all hover:scale-105 hover:shadow-lg hover:text-white">
                        <h3>Salvar</h3>
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ConfigModal;