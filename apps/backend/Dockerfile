FROM node:22-alpine

WORKDIR /app/backend

COPY package*.json ./

# Instala as dependências
RUN npm install --include=dev

# Copia o resto dos arquivos
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]