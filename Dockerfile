FROM node:26.13.1-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY backend/prisma backend/prisma
COPY frontend/package.json frontend/package.json
RUN npm ci

COPY backend backend
COPY frontend frontend

RUN npm run build

ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_URL=file:/data/cronograma.db
RUN mkdir -p /data

EXPOSE 4000
VOLUME ["/data"]

CMD ["sh", "-c", "npm --workspace backend run db:push && node backend/dist/seed.js && node backend/dist/index.js"]
