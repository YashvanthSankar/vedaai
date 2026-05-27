# syntax=docker/dockerfile:1.7

# --- Build stage: install all deps and compile TS -> dist/
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Runtime stage: prod deps only + compiled output
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

EXPOSE 4000

# Default: run the API. Override at `docker run` / compose to run the worker:
#   command: ["npm", "run", "start:worker"]
CMD ["npm", "start"]
