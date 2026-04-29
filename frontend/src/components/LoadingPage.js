// src/components/MonitoringTab.js
//<FaCog className="animate-spin" /> {printer.name} - Imprimindo
import React from 'react';
import { FaCog, FaPrint, FaVideoSlash } from 'react-icons/fa';

import logoIcon from '../assets/logoTrasnparente.png';


const LoadingPage = ({}) => {

  return (
    
    <div className="py-40 w-full bg-farm-black flex flex-col items-center justify-center text-white border border-farm-medium-grey/50 rounded-xl backdrop-blur-lg">
        {/* Você pode usar a sua logo aqui para ficar profissional */}
        <img src={logoIcon} alt="Logo" className="w-20 h-20 mb-4 animate-bounce" />
        <h2 className="text-xl font-semibold animate-pulse">
            Carregando dashboard, aguarde alguns instantes...
        </h2>
    </div>

  );
};

export default LoadingPage;