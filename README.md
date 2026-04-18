# Processo de instalação dos pacotes necessários

## Guia para instalar as dependências do software.

Esse sistema poder ser executado de três formas diferentes, uma forma no docker e duas formas manualmente com backend rodando junto do frontend e ambos rodando separadamente.

Esse reposositório faz parte do sistema de fazenda de impressão 3D, send necessário a utilização do octoprint e do [plugin](https://github.com/GuilhermeHMFroes/octoprint-fazenda3d) instalado no octoprint, no repositório do [plugin](https://github.com/GuilhermeHMFroes/octoprint-fazenda3d) já contêm o passo a passo de instalar e configurar o plugin.

    https://github.com/GuilhermeHMFroes/octoprint-fazenda3d

## Docker

Esse arquivo até o momento possui apenas uma forma de rodar no docker, sendo necessário importar apenas que é rodando o backend(flask) e o frontend(react) no mesmo container, isso se deve da minha necessidade pessoal ao usar um sistema de vpn dns da [cloudflare](https://developers.cloudflare.com/api/), precisando rodar tudo em um container.

Obs.: Futuramente vou adicionar a opção de rodar o backend e o frontend em containers separados

Antes de executar o container verifique no `app.py` na linha 32 se a opção front está em True:

```
def create_app():

    front = True
```

Pois ela é nescessária para executar o frontend junto com o backend.

Na pasta raiz do projeto execute o comando `docker-compose up -d --build` se for nescessário execute com o `sudo`.

Se tiver utilizando o portainer para gerenciar container docker, dá para realizar a importaçõ direto pelo github sem a nescessidade de clonar o repositório:

1. Vai em `stacks`
2. Depois em `+ Add stack`
3. Selecione a opção `Repository`
4. Dê um nome ao container em `Name` Obs.: o nome não pode ter letras maiúsculas
5. Em `Repository URL` cole o link desse repositório
6. Agora é só clicar em `Deploy the stack`. Obs.: se quiser realizar mais configurações é da sua preferência como a ferramenta de atualização dentre outras, mas sendo antes da opção deploy the stack.

Essa foi a configuração para rodar em docker.

## Manualmente

Para executar a aplicação manualmente verifique se o computador já tenha istalado o `python3`, `pip` e `npm` na última versão.

Se você quiser executar o frontend junto com o backend(sendo muito bom para ajudar no desenvolvimento), deixe a linha 32 se a opção front está em True:

```
def create_app():

    front = True
```

Se vocÊ quiser eecutar os dois separados(sendo essa opção melhor, pois se o backend ou o frontend falhar não atrapalha na execução do outro) é só deixar a opção front como false:

```
def create_app():

    front = False
```
Das duas formas é necessário realizar o build do react. Então siga os próximos passos:

### Frontend

Para instalar as dependências do react necessárias no projeto execute os seguintes comandos na pasta raiz do projeto `3DFARM/`:

1. `cd frontend/` -> para acessar a pasta do frontend<br>
2. `npm install` -> para instalar as depências<br>
3. `npm run build` -> para buildar o frontend<br>

Se for executar o frontend, junto do backend até o passo 3 é necessário, se não for realize o passo 4 abaixo.

4. `npm start` -> para iniciar o servidor react do frontend

Agora vamos executar o backend.

### Backend 

Para instalar as dependências do flask necessárias no projeto execute os seguintes comandos na pasta raiz do projeto `3DFARM/`:

1. `cd backend/` para acessar a pasta do backend<br>
2. `python3 -m venv .venv` -> para criar o ambiente virtual do python<br>
3. `source .venv/bin/activate` -> para ativar o ambiente virtual <br>
4. `pip  install -r requirements.txt` -> para instalar as dependêncas necessárias para rodas o código do backend<br>
5. `python3 app.py` -> Para iniciar o backend <br>

A única observação para o backend é a da linha 32 para rodar ou não o frotend junto.