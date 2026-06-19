# E2E Webhook Runner

Servidor separado que escuta pushes do GitHub e roda os testes Playwright automaticamente.

## Como funciona

```
Push na main do seu projeto
        │
        ▼
  GitHub dispara webhook
        │
        ▼
  Este servidor (Render.com)
        ├── git clone do seu projeto
        ├── npm ci
        ├── npx playwright test
        │
        ├── Passou → silêncio (ou email de recuperação)
        └── Falhou → 📧 email com detalhes
```

## Configuração no Render.com

### Variáveis de ambiente (Environment Variables)

| Variável | Valor |
|---|---|
| `WEBHOOK_SECRET` | Texto secreto (ex: `minhaempresa2024xpto`) |
| `PORT` | `10000` |
| `WATCH_BRANCH` | `main` |
| `EMAIL_FROM` | Conta Gmail remetente |
| `EMAIL_PASSWORD` | Senha de App do Gmail |
| `EMAIL_TO` | Destinatários separados por vírgula |
| `PROJECT_NAME` | Nome do projeto nos emails |

### Webhook no GitHub do seu projeto

- Payload URL: `https://seu-runner.onrender.com/webhook`
- Content type: `application/json`
- Secret: mesmo valor do `WEBHOOK_SECRET`
- Evento: `Just the push event`
