# === FRONTEND DOCKERFILE ===
# Етап 1: Збірка React-додатку
FROM node:20-alpine AS build

WORKDIR /app

# Копіюємо package файли (кешування залежностей)
COPY package.json package-lock.json ./

# Встановлюємо залежності
RUN npm ci --ignore-scripts

# Копіюємо вихідний код
COPY . .

# Аргументи збірки для змінних оточення
ARG VITE_API_URL=/api
ARG VITE_WS_URL=
ARG VITE_SENTRY_DSN=

# Записуємо змінні в .env для Vite
RUN echo "VITE_API_URL=${VITE_API_URL}" > .env.production \
    && echo "VITE_WS_URL=${VITE_WS_URL}" >> .env.production \
    && echo "VITE_SENTRY_DSN=${VITE_SENTRY_DSN}" >> .env.production

# Збираємо проект
RUN npm run build

# Етап 2: Nginx для обслуговування статичних файлів
FROM nginx:alpine AS production

# Видаляємо стандартну конфігурацію nginx
RUN rm /etc/nginx/conf.d/default.conf

# Копіюємо нашу конфігурацію
COPY nginx/frontend.conf /etc/nginx/conf.d/default.conf

# Копіюємо зібрані файли
COPY --from=build /app/dist /usr/share/nginx/html

# Права доступу
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R 755 /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
