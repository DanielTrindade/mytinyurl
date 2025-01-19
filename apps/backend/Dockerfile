FROM node:22-alpine

WORKDIR /app/backend

COPY package*.json ./

# Instala todas as dependências
RUN npm install --include=dev

# Copia o resto dos arquivos
COPY . .

# Gera o cliente do Prisma
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "dev"] 