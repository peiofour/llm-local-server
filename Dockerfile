# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copier les fichiers de configuration
COPY package*.json tsconfig.json ./

# Installer les dépendances
RUN npm ci

# Copier les sources
COPY src ./src

# Compiler TypeScript
RUN npm run build

# Stage final
FROM node:22-alpine

WORKDIR /app

# Copier package.json et le build
COPY package*.json ./
COPY --from=builder /app/dist ./dist

# Installer uniquement les dépendances de production
RUN npm ci --only=production

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["node", "dist/server.js"]