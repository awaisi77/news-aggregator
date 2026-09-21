# --- Build stage -----------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first so this layer is cached across code-only changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines VITE_* variables at BUILD time. NewsAPI's real key stays off
# the client (see NEWSAPI_KEY at runtime); VITE_NEWSAPI_ENABLED just turns
# the source on in the UI.
ARG VITE_NEWSAPI_KEY=""
ARG VITE_NEWSAPI_ENABLED=""
ARG VITE_GUARDIAN_API_KEY=""
ARG VITE_NYTIMES_API_KEY=""
ENV VITE_NEWSAPI_KEY=${VITE_NEWSAPI_KEY} \
    VITE_NEWSAPI_ENABLED=${VITE_NEWSAPI_ENABLED} \
    VITE_GUARDIAN_API_KEY=${VITE_GUARDIAN_API_KEY} \
    VITE_NYTIMES_API_KEY=${VITE_NYTIMES_API_KEY}

RUN npm run build

# --- Runtime stage -----------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ || exit 1

CMD ["/docker-entrypoint.sh"]
