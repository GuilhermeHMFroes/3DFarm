import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaTrash, FaTimes, FaUserPlus, FaUsersCog } from 'react-icons/fa';

const AdminUsersModal = ({ onClose }) => {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'user' });
  const [loading, setLoading] = useState(false);

  // Função para buscar a lista atualizada
  const fetchUsers = async () => {
    try {
      const res = await axios.get('/auth/users');
      setUsers(res.data);
    } catch (err) {
      console.error("Erro ao buscar usuários");
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // Função para salvar novo usuário
  const handleAddUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/auth/register', newUser);
      alert("Usuário cadastrado com sucesso!");
      setNewUser({ username: '', password: '', role: 'user' }); // Limpa o formulário
      fetchUsers(); // Atualiza a lista
    } catch (err) {
      alert(err.response?.data?.message || "Erro ao cadastrar usuário");
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id, name) => {
    if (window.confirm(`Tem certeza que deseja remover ${name}?`)) {
      try {
        await axios.delete(`/auth/users/${id}`);
        fetchUsers();
      } catch (err) {
        alert("Erro ao remover usuário");
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] p-4 backdrop-blur-sm">
      <div className="bg-farm-dark-blue border border-farm-medium-grey p-6 rounded-xl w-full max-w-md shadow-2xl">
        
        {/* Header do Modal */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-white font-bold text-xl flex items-center gap-2">
            <FaUsersCog className="text-farm-medium-blue" /> Gestão de Acesso
          </h3>
          <button onClick={onClose} className="text-white hover:text-red-500 transition-colors">
            <FaTimes size={20} />
          </button>
        </div>

        {/* Formulário de Cadastro Rápido */}
        <form onSubmit={handleAddUser} className="bg-black/30 p-4 rounded-lg border border-white/5 mb-6 space-y-3">
          <h4 className="text-[10px] text-farm-medium-blue font-black uppercase tracking-widest mb-2">Cadastrar Novo Membro</h4>
          <div className="grid grid-cols-2 gap-2">
            <input 
              className="bg-black/40 p-2 rounded text-sm text-white border border-white/10 outline-none focus:border-farm-medium-blue"
              placeholder="Username" required
              value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}
            />
            <input 
              className="bg-black/40 p-2 rounded text-sm text-white border border-white/10 outline-none focus:border-farm-medium-blue"
              type="password" placeholder="Senha" required
              value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
            />
          </div>
          <div className="flex gap-2">
            <select 
              className="flex-1 bg-black/40 p-2 rounded text-sm text-white border border-white/10 outline-none cursor-pointer"
              value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
            >
              <option value="user">Nível: Usuário Comum</option>
              <option value="admin">Nível: Administrador</option>
              <option value="monitor">Nível: Monitor</option>
            </select>
            <button 
              type="submit" disabled={loading}
              className="bg-farm-medium-blue px-4 rounded text-white hover:bg-opacity-80 disabled:opacity-50 transition-all flex items-center gap-2 font-bold text-xs"
            >
              <FaUserPlus /> {loading ? '...' : 'ADD'}
            </button>
          </div>
        </form>

        {/* Lista de Usuários Existentes */}
        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          <h4 className="text-[10px] text-farm-light-grey font-bold uppercase mb-2">Usuários Ativos</h4>
          {users.map(u => (
            <div key={u.id} className="flex justify-between items-center bg-white/5 p-3 rounded border border-transparent hover:border-white/10 transition-all">
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium">{u.username}</span>
                <span className="text-[9px] text-farm-medium-blue uppercase font-bold">{u.role}</span>
              </div>
              <button 
                onClick={() => deleteUser(u.id, u.username)}
                className="text-red-500/50 p-2 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <FaTrash size={14}/>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminUsersModal;