// src/components/MonitoringTab.js
//<FaCog className="animate-spin" /> {printer.name} - Imprimindo
import React from 'react';
import { FaCog, FaPrint, FaVideoSlash } from 'react-icons/fa';




const MonitoringTab = ({ activePrinters, idlePrinters, printers, Card, CardTitle, CameraFeed }) => {
  const onlinePrintersCount = printers.filter(p => p.last_status !== 'disconnected').length;

  return (
    /* --- NOVO CONTEÚDO DO MONITORAMENTO --- */
    <div  className="grid grid-cols-1 lg:grid-cols-3 gap-5">
    
        {activePrinters.map(printer => (
    
            <Card key={printer.id} className="overflow-hidden !border-2 !border-green-500 shadow-lg shadow-green-500/20">
                <div className="flex justify-between items-center mb-2 p-2">
                    <CardTitle className="font-bold text-green-400 flex items-center gap-2" title={printer.name + " - Imprimindo"} />
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
                    <CardTitle className="font-bold text-blue-400 flex items-center gap-2" title={printer.name + " - Ociosa"} />
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

  );
};

export default MonitoringTab;