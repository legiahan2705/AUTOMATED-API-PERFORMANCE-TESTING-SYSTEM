# Base Node.js
FROM node:20

# Tăng heap memory cho Node.js (build NestJS)
ENV NODE_OPTIONS=--max-old-space-size=4096

# Cài k6
RUN apt-get update && apt-get install -y gnupg software-properties-common \
    && wget -q -O - https://dl.k6.io/key.gpg | gpg --dearmor | tee /usr/share/keyrings/k6-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | tee /etc/apt/sources.list.d/k6.list \
    && apt-get update && apt-get install -y k6

# Thư mục làm việc
WORKDIR /app

# Copy package.json & package-lock.json
COPY package*.json ./

# Cài dependencies
RUN npm install

# Copy code
COPY . .

# Build NestJS
RUN npm run build

# Mở port 3000
EXPOSE 3000

# Chạy backend
CMD ["node", "dist/main.js"]
