# MyTinyURL - Serviço de Encurtamento de URLs

## Sobre o Projeto
MyTinyURL é um serviço de encurtamento de URLs construído com Node.js, TypeScript, Fastify e PostgreSQL, seguindo os princípios de DDD (Domain-Driven Design) e Clean Architecture.

## Arquitetura

O projeto foi estruturado seguindo DDD e Clean Architecture com as seguintes camadas:

### Domain Layer (Core)
- Contém as regras de negócio e entidades principais
- Independente de frameworks e bibliotecas externas
- Define interfaces para repositórios

### Application Layer
- Implementa os casos de uso da aplicação
- Orquestra o fluxo de dados entre as camadas
- Contém DTOs e validações

### Infrastructure Layer
- Implementa os detalhes técnicos
- Contém adaptadores para frameworks e bancos de dados
- Gerencia configurações e dependências

## Decisões Arquiteturais
Autorização vs Autenticação
Este projeto utiliza apenas autorização (via API Key) em vez de autenticação completa pelos seguintes motivos:

Simplicidade:

Como é um projeto pessoal/estudo, não há necessidade de gerenciamento complexo de usuários
API Key única para acesso administrativo é suficiente para o escopo atual


Separação de Responsabilidades:

Rotas públicas: criação de URLs curtas e redirecionamento
Rotas protegidas: apenas endpoints administrativos (estatísticas)


Segurança Adequada ao Propósito:

URLs curtas precisam ser públicas por natureza
Apenas operações sensíveis (visualização de estatísticas) são protegidas
API Key oferece proteção suficiente para o caso de uso atual


Extensibilidade:

A arquitetura permite fácil adição de autenticação completa no futuro
O middleware de autorização pode ser expandido conforme necessidade


Para adicionar autenticação no futuro, seria necessário:

Implementar registro e login de usuários
Adicionar JWT ou similar para sessões
Criar relacionamento entre URLs e usuários
Expandir as políticas de autorização

## Modelagem de Dados

### Schemas

```prisma
// Schema Prisma para salvar as urls
model Url {
  id          String      @id @default(uuid())
  originalUrl String      @db.Text
  shortCode   String      @unique @db.VarChar(10)
  visits      Int         @default(0)
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
  expiresAt   DateTime?
  isActive    Boolean     @default(true)

  @@index([shortCode])
}
```

```prisma
// Schema Prisma para salvar as informações sobre o click na url
model Click {
  id        String    @id @default(uuid())
  url       Url       @relation(fields: [urlId], references: [id])
  urlId     String
  createdAt DateTime  @default(now())

  @@index([urlId])
  @@index([createdAt])
  @@map("clicks")
}
```
## Funcionalidades

### 1. Criar URL Curta
- Endpoint: `POST /api/shorten`
- Recebe uma URL original e opcionalmente uma data de expiração
- Retorna um código curto único

Exemplo de Request:
```json
{
  "originalUrl": "https://www.exemplo.com/pagina-muito-longa",
  "expiresAt": "2025-01-20T00:00:00Z"  // opcional
}
```

### 2. Redirecionar para URL Original
- Endpoint: `GET /{shortCode}`
- Redireciona para a URL original
- Incrementa contador de visitas

### 3. Visualizar Estatísticas
- Endpoint: `GET /api/stats/{shortCode}`
- Requer autenticação via API Key
- Retorna informações sobre a URL

## Como Executar

### Pré-requisitos
- Docker
- Docker Compose

### Passos para Execução

1. Clone o repositório:
```bash
git clone [url-do-repositorio]
cd mytinyurl
```

2. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

3. Inicie os containers:
```bash
docker compose up -d
```

4. Execute as migrações do banco:
```bash
docker compose exec app npx prisma migrate dev
```

## Configuração do pgAdmin

Após iniciar os containers, configure o acesso ao banco de dados no pgAdmin:

1. Acesse http://localhost:5050
2. Faça login com as credenciais:
   - Email: admin@admin.com
   - Senha: admin

3. Adicione um novo servidor:
   - Clique com botão direito em 'Servers' -> 'Register' -> 'Server'
   - Na aba 'General':
     - Name: MyTinyURL (ou nome de sua preferência)
   
   - Na aba 'Connection':
     - Host name/address: postgres (nome do serviço no docker-compose)
     - Port: 5432
     - Maintenance database: mytinyurl
     - Username: user (definido no .env)
     - Password: password (definido no .env)

4. Clique em 'Save'

Agora você poderá:
- Visualizar as tabelas do banco
- Executar queries SQL
- Monitorar o banco de dados
- Gerenciar os dados diretamente pela interface

A API estará disponível em:
- API: http://localhost:3000
- Documentação Swagger: http://localhost:3000/docs
- PgAdmin: http://localhost:5050
- Prisma Studio: http://localhost:5555

## Exemplos de Uso

### Criar URL Curta
```bash
curl -X POST http://localhost:3000/api/shorten \
-H "Content-Type: application/json" \
-d '{"originalUrl": "https://www.exemplo.com/pagina-muito-longa"}'
```

### Acessar Estatísticas
```bash
curl -X GET http://localhost:3000/api/stats/abc123 \
-H "x-api-key: sua-api-key"
```

## Documentação da API

A documentação completa da API está disponível através do Swagger UI em:
```
http://localhost:3000/docs
```

Aqui você pode:
- Ver todos os endpoints disponíveis
- Testar as requisições diretamente pela interface
- Verificar os schemas e modelos de dados
- Ver exemplos de requests e responses

## Variáveis de Ambiente

```env
# Database
DATABASE_URL="postgresql://user:password@postgres:5432/mytinyurl"

# API
API_KEY="sua-api-key-secreta"
APP_URL="http://localhost:3000"

# PostgreSQL
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=mytinyurl

# PgAdmin
PGADMIN_DEFAULT_EMAIL=admin@admin.com
PGADMIN_DEFAULT_PASSWORD=admin
```

## Estrutura do Projeto
```
src/
├── domain/
│   ├── entities/
│   │   └── Url.ts
│   └── repositories/
│       └── IUrlRepository.ts
├── application/
│   ├── dtos/
│   ├── usecases/
│   └── interfaces/
├── infrastructure/
│   ├── http/
│   ├── database/
│   └── container/
└── shared/
    ├── errors/
    └── utils/
```