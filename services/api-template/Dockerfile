# ╔═══════════════════════════════════════════════════════════════════════════════╗
# ║  DOCKERFILE TEMPLATE - Microservicio Node.js                                  ║
# ║                                                                               ║
# ║  USO: Copia esta carpeta para crear un nuevo microservicio                   ║
# ║       cp -r services/api-template services/api-tu-servicio                   ║
# ╚═══════════════════════════════════════════════════════════════════════════════╝

FROM node:20-alpine

WORKDIR /app

# Copiar package.json primero (para cache de Docker)
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Puerto expuesto (cambiar según servicio)
EXPOSE 3000

# Comando de inicio
CMD ["node", "index.js"]
