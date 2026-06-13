FROM node:22-alpine AS build
WORKDIR /app
COPY package.json .
RUN npm config set registry https://registry.npmmirror.com && npm install
COPY . .
RUN npm run build

FROM alpine:latest
COPY --from=build /app/dist /app/dist
VOLUME /app/dist
CMD ["true"]
