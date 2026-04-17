# ESTÁGIO 1: Build do React
FROM node:22 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ESTÁGIO 2: Backend + Frontend unificados
FROM python:3.10-slim
WORKDIR /app

# Instala dependências Python
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o conteúdo da pasta backend para a raiz /app do container
COPY backend/ .

# MÁGICA: Copia o build do React para a pasta 'static' dentro do backend
# O seu app.py com a função docker_dist vai encontrar essa pasta automaticamente
COPY --from=frontend-build /app/frontend/build ./static

# Criar a pasta de uploads caso não exista (importante para os G-codes)
RUN mkdir -p uploads

EXPOSE 5000
CMD ["python", "app.py"]
