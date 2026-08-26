FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=/api
ARG VITE_USAR_API=true
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_USAR_API=${VITE_USAR_API}
RUN npm run build

FROM nginx:1.29-bookworm
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 CMD curl --fail --silent http://localhost/health > /dev/null || exit 1
