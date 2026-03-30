import React, { useState } from 'react';
import axios from 'axios';

const ChangePassModal = ({ onClose }) => {
  const [form, setForm] = useState({ old: '', new1: '', new2: '' });
  
  const handleSave = async () => {
    if (!form.old || !form.new1) return alert("Preencha todos os campos!");
    if (form.new1 !== form.new2) return alert("As senhas novas não coincidem!");
    
    try {
      await axios.post('/auth/change-password', { 
        old_password: form.old, 
        new_password: form.new1 
      });
      alert("Senha alterada com sucesso!");
      onClose();
    } catch (e) { 
      alert(e.response?.data?.message || "Erro ao alterar senha."); 
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
      <div className="bg-farm-dark-blue border border-farm-medium-grey p-6 rounded-xl w-full max-w-sm shadow-2xl">
        <h3 className="text-white font-bold mb-4">Alterar Senha</h3>
        <div className="space-y-3">
          <input 
            type="password" placeholder="Senha Antiga" 
            className="w-full bg-black/50 p-2 rounded text-white outline-none border border-white/10 focus:border-farm-medium-blue" 
            onChange={e => setForm({...form, old: e.target.value})} 
          />
          <input 
            type="password" placeholder="Nova Senha" 
            className="w-full bg-black/50 p-2 rounded text-white outline-none border border-white/10 focus:border-farm-medium-blue" 
            onChange={e => setForm({...form, new1: e.target.value})} 
          />
          <input 
            type="password" placeholder="Confirmar Nova Senha" 
            className="w-full bg-black/50 p-2 rounded text-white outline-none border border-white/10 focus:border-farm-medium-blue" 
            onChange={e => setForm({...form, new2: e.target.value})} 
          />
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 bg-gray-600 p-2 rounded text-white text-sm hover:bg-gray-500">
            Cancelar
          </button>
          <button onClick={handleSave} className="flex-1 bg-farm-medium-blue p-2 rounded text-white text-sm font-bold hover:bg-opacity-80">
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePassModal;