// src/components/Header.js
import React from 'react';
import { FaPlus, FaUserCircle, FaKey, FaUsersCog, FaCog, FaSignOutAlt } from 'react-icons/fa';
import logoPrincipal from '../assets/logoTrasnparente.png';

const Header = ({ user, setShowModal, setShowChangePassModal, setShowAdminUsersModal, handleLogout }) => {
  return (
    
    
    <header className="flex flex-col md:flex-row justify-between items-center md:gap-0 gap-5 mb-8 p-6 bg-black/20 border border-farm-medium-grey/50 rounded-xl backdrop-blur-lg relative z-[1000]">
                  
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
    
            {['admin', 'user'].includes(user?.role) && (
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

                    {['admin'].includes(user?.role) && (
                        <button onClick={() => setShowAdminUsersModal(true)} className="w-full text-left p-3 text-sm text-white hover:bg-white/10 flex items-center gap-2">
                            <FaUsersCog /> Gerenciar Usuários
                        </button>
                        )}

                    {['admin'].includes(user?.role) && (
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

  );
};

export default Header;