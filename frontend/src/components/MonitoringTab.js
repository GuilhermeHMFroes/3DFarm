// src/components/MonitoringTab.js
//<FaCog className="animate-spin" /> {printer.name} - Imprimindo
import React from 'react';
import { FaCog, FaPrint, FaVideoSlash, FaExclamationTriangle } from 'react-icons/fa';




const MonitoringTab = ({ activePrinters, idlePrinters, disconnectedPrinters, printers, Card, CardTitle, CameraFeed }) => {
  const onlinePrintersCount = printers.filter(p => p.last_status !== 'disconnected').length;

  return (
    /* --- NOVO CONTEÚDO DO MONITORAMENTO --- */
    <div  className="grid grid-cols-1 lg:grid-cols-3 gap-5">
    
        {activePrinters.map(printer => (
    
            <Card key={printer.id} className="overflow-hidden !border-2 !border-green-500 shadow-lg shadow-green-500/20">
                <div className="flex justify-between items-center mb-2 p-2">
                    <h2 className="border-b-2 border-green-500 font-bold flex items-center gap-3 pb-3 mb-4 mt-">{printer.name}  - Imprimindo</h2>
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
                    <h2 className="border-b-2 border-blue-500 font-bold flex items-center gap-3 pb-3 mb-4 mt-">{printer.name}  - Ociosa</h2>
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


        {(disconnectedPrinters.length > 0 && idlePrinters.length === 0 && activePrinters.length === 0) ? (
            
            <div className="backdrop-blur-lg col-span-full py-20 text-center border-2 border-gray-800 rounded-xl">
                <div className="animate-bounce">
                    <FaExclamationTriangle className="mx-auto text-8xl text-red-700 mb-4 animate-pulse shadow-[0_0_50px_rgba(255,0,0,1)]" />
                </div>
                <p className="text-farm-medium-grey text-lg">Todas as {disconnectedPrinters.length} impressoras estão desconectadas. Contate o administrador.</p>
            </div>
        
        ):(


            <Card className="overflow-hidden !border-2 !border-red-500 shadow-lg shadow-red-500/20">
                <div className="flex items-center text-xl gap-3 justify-between mb-2 p-2">
                    <h2 className="border-b-2 border-red-500 font-bold flex items-center gap-3 pb-3 mb-4 mt-">Impressoras desconectadas</h2>
                    <FaExclamationTriangle className="mx-auto text-2xl text-red-500 border-2 border-red-500 mb-4 animate-pulse shadow-[0_0_50px_rgba(255,0,0,1)]" />
                </div>
    
                {/* Componente que gerencia o Socket de vídeo para cada card */}
                <div className=" items-center">
                    <h3 className=" text-red-500 font-bold text-center ">Alerta!</h3>
                </div>

                <h3>Tem {disconnectedPrinters.length} impressoras desconectadas, avise ao adiministrador!</h3>
            </Card>


        )}
                            
    
    </div>

  );
};

export default MonitoringTab;