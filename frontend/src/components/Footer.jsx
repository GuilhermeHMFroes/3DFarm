import React from 'react';

const Footer = () => {
  return (
    <footer className="w-full py-4 backdrop-blur-lg border-t border-gray-800 text-gray-100">
      <div className="container mx-auto px-4 text-center">

        <p className="text-xs md:text-sm tracking-wide m-0">
          Desenvolvido por <a href="https://github.com/GuilhermeHMFroes" target="_blank" rel="noopener noreferrer"><span className="text-orange-500 font-medium">Guilherme Froes</span></a> — 
          Disponível em <a href="https://github.com/GuilhermeHMFroes/3dfarm" target="_blank" rel="noopener noreferrer"><span className="text-orange-500 font-medium">3D Farm</span></a>
        </p>

        <p className="text-xs md:text-sm tracking-wide m-0">
          IFNMG Januária - BridgeLab (Laboratório de Pesquisa em Infraestrutura e Tecnologia da Informação)
        </p>

      </div>
    </footer>
  );
};

export default Footer;