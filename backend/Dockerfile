FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund && mkdir -p uploads var/mail && chown -R node:node uploads var
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3010
CMD ["npm", "run", "start:deploy"]
