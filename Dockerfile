FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# use fast npm mirror
RUN npm config set registry https://registry.npmmirror.com

# fast, reliable installation
RUN npm ci --omit=dev --prefer-offline --no-audit --legacy-peer-deps

COPY . .

EXPOSE 5000

CMD ["node", "index.js"]
