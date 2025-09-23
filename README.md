# Processo de instalação dos pacotes necessários

Guia para instalar as dependências do software.
Verifique se o computador já estaaja istalado o `python3`, `pip` e `npm` na última versão.

## Linux

### Frontend

Para instalar as dependências do react necessárias no projeto execute os seguintes comandos na pasta raiz do projeto `3DFARM/`:

`cd frontend/` -> para acessar a pasta do frontend<br>
`npm install` -> para instalar as depências<br>
`npm run build` -> para buildar o frontend<br>

### Backend 

Para instalar as dependências do flask necessárias no projeto execute os seguintes comandos na pasta raiz do projeto `3DFARM/`:

`cd backend/` para acessar a pasta do backend<br>
`python3 -m venv .venv` -> para criar o ambiente virtual do python<br>
`source .venv/bin/activate` -> para ativar o ambiente virtual <br>
`pip  install -r requirements.txt` -> para instalar as dependêncas necessárias para rodas o código do backend<br>
`python3 app.py` -> Para iniciar o backend <br>

Obs.: O backend quando é iniciado já  inicia o frontend não sendo necessário iniciar o frontend manualmente. ele também já inicia sua porta sem precisar declarar