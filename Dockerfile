FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --production

COPY . .

EXPOSE 3000

ENV PORT=3000
ENV OLLAMA_HOST=http://host.docker.internal:11434
ENV OLLAMA_MODEL=qwen3:8b

CMD ["node", "server.js"]
