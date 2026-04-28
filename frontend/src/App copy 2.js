// src/App.js
import React, { useState } from 'react';
import Header from './components/Header';

function App() {
  const [user, setUser] = useState({ username: "Admin", role: "admin" });

  // Funções vazias apenas para o Header não quebrar
  const setShowModal = () => {};
  const setShowChangePassModal = () => {};
  const setShowAdminUsersModal = () => {};
  const handleLogout = () => console.log("Sair");

  return (
    <div className="min-h-screen bg-gray-900">
      <Header 
        user={user} 
        setShowModal={setShowModal}
        setShowChangePassModal={setShowChangePassModal}
        setShowAdminUsersModal={setShowAdminUsersModal}
        handleLogout={handleLogout}
      />
      <main className="p-10">
        <h1 className="text-white">Se o Header apareceu, o erro estava no resto do App.js!</h1>
      </main>
    </div>
  );
}

export default App;