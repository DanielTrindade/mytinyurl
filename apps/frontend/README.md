# MyTinyURL Frontend

Interface web do serviço de encurtamento de URLs MyTinyURL.

## 🛠️ Tecnologias

- React 18
- TypeScript
- Tailwind CSS
- Vite
- Heroicons

## 🔧 Configuração

1. Instale as dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## 🎨 Features

- Interface responsiva e moderna
- Tema claro/escuro
- Notificações de feedback
- Copiar para área de transferência
- Validação de URLs
- Layout adaptativo

## 📱 Componentes

- `UrlShortener`: Componente principal para encurtar URLs
- `ThemeProvider`: Gerenciamento do tema claro/escuro
- Cards informativos
- Feedback visual de ações

## 🔗 Integração com Backend

O frontend se comunica com o backend através de:
- POST /api/shorten: Criar URL curta
- GET /{shortCode}: Redirecionamento
- GET /api/stats/{shortCode}: Estatísticas

## 🎯 Scripts Disponíveis

- `npm run dev`: Inicia servidor de desenvolvimento
- `npm run build`: Build para produção
- `npm run preview`: Visualiza build local

## 🖥️ Ambiente de Desenvolvimento

### VSCode
Extensões recomendadas:
- Tailwind CSS IntelliSense
- ESLint
- Prettier

### Docker
Para rodar com Docker:
```bash
docker compose up frontend
```