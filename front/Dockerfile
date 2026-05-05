# Etapa de compilación
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar configuración de dependencias
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm install --legacy-peer-deps

# Copiar el resto del código
COPY . .

# Recibir variable de entorno de build
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Construir la aplicación en modo servidor (sin output: export)
RUN npm run build

# Etapa final: Servidor Node.js de Next.js (más compatible con middleware y auth)
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copiar solo lo necesario para correr en producción
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
