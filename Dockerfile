FROM node:22-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY backend/package*.json ./backend/
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --workspace backend; else npm install --omit=dev --workspace backend; fi

COPY backend/src ./backend/src

EXPOSE 8080
WORKDIR /app/backend
CMD ["node", "src/server.js"]
