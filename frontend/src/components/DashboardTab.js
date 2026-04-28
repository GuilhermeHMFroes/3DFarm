// src/components/DashboardTab.js
import React from 'react';
import { FaPrint, FaCopy, FaTrash, FaFileCode, FaUpload, FaCog, FaEye, FaCheckCircle, FaExclamationTriangle, FaPlay } from 'react-icons/fa';


const DashboardTab = ({ 
  printers, files, activePrinters, idlePrinters, disconnectedPrinters,
  handleCopyToken, handleDeletePrinter, handleDeleteFile, 
  isDragging, handleDragOver, handleDragLeave, handleDrop, handleFileChange,
  selectedFile, setSelectedFile, handleUpload, uploadMessage,
  handleOpenPrintModal, setSelectedPrinterForMonitor, Card, CardTitle
}) => {
  return (
    
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

  );
};

export default DashboardTab;