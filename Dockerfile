# Build stage
FROM node:lts-jod AS builder

WORKDIR /app
# Installer pnpm
RUN npm install -g pnpm

# Copier les fichiers de configuration
COPY package*.json tsconfig.json ./

# Utiliser pnpm install au lieu de pnpm ci
RUN pnpm install

# Copier les sources
COPY src ./src

# Compiler TypeScript
RUN pnpm run build

# Stage final
FROM node:lts-jod

WORKDIR /app

# Installer pnpm
RUN npm install -g pnpm

# Copier package.json et le build
COPY package*.json ./
COPY --from=builder /app/dist ./dist

# Installer uniquement les dépendances de production
RUN pnpm install --prod

# Exposer le port
EXPOSE 3000

# Commande de démarrage
CMD ["node", "dist/server.js"]