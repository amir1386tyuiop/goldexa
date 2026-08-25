FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

RUN mkdir -p uploads && chown -R node:node /app

USER node

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
