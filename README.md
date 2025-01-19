# MyTinyURL - Monorepo

Este é um projeto monorepo contendo um serviço de encurtamento de URLs com backend em Node.js/Fastify e frontend em React.

## 📁 Estrutura do Projeto

```
mytinyurl/
├── apps/
│   ├── backend/         # API em Fastify
│   └── frontend/        # Interface em React
├── docker-compose.yml
└── README.md
```

## 🚀 Tecnologias Utilizadas

### Backend
- Node.js
- Fastify
- TypeScript
- Prisma (ORM)
- PostgreSQL

### Frontend
- React
- TypeScript
- Tailwind CSS
- Vite

## ⚙️ Como Executar

1. Clone o repositório:
```bash
git clone [url-do-repo]
cd mytinyurl
```

2. Configure o ambiente:
```bash
# Na pasta backend
cd apps/backend
cp .env.example .env
```

3. Inicie os containers:
```bash
# Na raiz do projeto
docker compose up -d
```

4. Acesse:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Swagger: http://localhost:3000/docs
- pgAdmin: http://localhost:5050

## 📝 Funcionalidades

- Encurtamento de URLs
- Redirecionamento automático
- Contagem de cliques
- Interface responsiva
- Modo escuro/claro
- Documentação da API via Swagger

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.