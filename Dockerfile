FROM node:20-alpine

ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

# Stamped by the pipeline with the git SHA, shown on / and /health
ARG APP_VERSION=local
ENV APP_VERSION=$APP_VERSION

USER node
EXPOSE 8080
CMD ["node", "src/server.js"]
