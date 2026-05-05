FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=/api
ARG VITE_WS_URL=/ws
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN npm run build

FROM alpine:3.19
COPY --from=builder /app/dist /opt/frontend-dist
VOLUME /app/dist
CMD ["sh", "-c", "rm -rf /app/dist/* && cp -a /opt/frontend-dist/. /app/dist/"]
