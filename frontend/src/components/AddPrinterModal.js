import React, { useState } from 'react';
import axios from 'axios'; // Mudei para axios para ser consistente com o App.js
import { FaTimes, FaCopy } from 'react-icons/fa';

// O seu app.py espera "name" e "ip"
async function generateToken(name, ip) {
  try {
    const response = await axios.post('/api/generate_token', { name, ip });
    if (response.data.success) {
      return response.data; // Retorna { success: true, token: "..." }
    } else {
      throw new Error('API retornou erro');
    }
  } catch (error) {
    console.error("Erro ao gerar token:", error);
    return { success: false, error: error.message };
  }
}

// O componente do Modal
function AddPrinterModal({ onClose, onPrinterAdded }) {
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [generatedToken, setGeneratedToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setGeneratedToken(null);

    const result = await generateToken(name, ip);

    setIsLoading(false);
    if (result.success) {
      setGeneratedToken(result.token);
      // Chama a função do App.js para atualizar a lista
      onPrinterAdded({ name, ip, token: result.token }); 
    } else {
      setErrorMessage('Não foi possível gerar o token.');
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(generatedToken);
    alert("Token copiado para a área de transferência!");
  };

  return (
    // O Fundo escurecido (Tailwind)
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50"
      onClick={onClose}
    >
      {/* O Conteúdo do Modal (Tailwind) */}
      <div 
        className="bg-farm-light-grey text-farm-dark-blue p-8 rounded-xl shadow-2xl relative max-w-md w-11/12"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão X (Tailwind) */}
        <button 
          className="absolute top-4 right-4 text-2xl text-farm-medium-grey"
          onClick={onClose}
        >
          <FaTimes />
        </button>
        
        <h2 className="text-2xl font-bold text-farm-dark-blue mt-0">
          Adicionar Impressora
        </h2>
        
        {/* Se o token AINDA NÃO foi gerado, mostra o formulário */}
        {!generatedToken && (
          <form onSubmit={handleSubmit}>
            <p>Insira os detalhes da impressora para gerar um token.</p>
            
            <div className="mb-4">
              <label htmlFor="printer-name" className="block font-bold mb-1">Nome da Impressora</label>
              <input 
                id="printer-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Impressora da Sala"
                className="w-full p-2 border border-farm-medium-grey rounded-lg text-black" // Adicionado text-black
                required
              />
            </div>

            <div className="mb-6">
              <label htmlFor="printer-ip" className="block font-bold mb-1">Endereço IP (Opcional)</label>
              <input 
                id="printer-ip"
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="Ex: 192.168.1.10"
                className="w-full p-2 border border-farm-medium-grey rounded-lg text-black" // Adicionado text-black
              />
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-farm-orange text-farm-dark-blue font-bold rounded-lg transition-all disabled:opacity-50"
            >
              {isLoading ? 'A gerar...' : 'Gerar Token'}
            </button>
            
            {errorMessage && <p className="text-red-600 text-center mt-3">{errorMessage}</p>}
          </form>
        )}
        
        {/* Se o token FOI gerado, mostra o resultado */}
        {generatedToken && (
          <div>
            <p className="font-bold">Token gerado com sucesso!</p>
            <p>Insira este token no seu plugin OctoPrint "Fazenda 3D":</p>
            
            <div className="bg-farm-dark-blue text-farm-light-grey font-mono text-base p-4 rounded-lg flex justify-between items-center my-4 break-all">
              <span>{generatedToken}</span>
              <button 
                className="text-xl text-farm-light-grey ml-2"
                onClick={copyToken}
              >
                <FaCopy />
              </button>
            </div>
            
            <p className="text-sm text-farm-orange font-bold text-center">
              Guarde este token em segurança.
            </p>
            
            <button 
              onClick={onClose}
              className="w-full mt-4 py-3 bg-farm-medium-blue text-farm-light-grey font-bold rounded-lg"
            >
              Fechar
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
}

export default AddPrinterModal;