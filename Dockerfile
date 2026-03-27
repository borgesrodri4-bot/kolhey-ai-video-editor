# Estágio de Build
FROM node:22-slim AS builder

WORKDIR /app

# Instalar dependências necessárias para o build
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Instalar pnpm
RUN npm install -g pnpm

# Copiar arquivos de dependências
COPY pnpm-lock.yaml package.json ./

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Copiar o resto do código
COPY . .

# Build do Frontend e Backend
RUN pnpm build

# Estágio de Produção
FROM node:22-slim AS runner

WORKDIR /app

# Instalar FFmpeg e dependências do Remotion (Chromium)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    chromium \
    fonts-noto-color-emoji \
    fonts-liberation \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Instalar pnpm
RUN npm install -g pnpm

# Copiar apenas o necessário do builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Criar pasta de uploads (será mapeada para o volume na Railway)
RUN mkdir -p /app/uploads

# Variáveis de ambiente para o Remotion encontrar o Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV REMOTION_CHROME_BIN=/usr/bin/chromium

# Expor a porta
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["node", "dist/index.js"]
