import { createServer } from 'http'
import { validarAssinatura, parsearPayload } from './webhook.js'
import { rodarTestes } from './testes.js'
import { enviarAlertaFalha, enviarAlertaRecuperacao } from './email.js'

const PORT           = process.env.PORT           ?? 10000
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? ''
const WATCH_BRANCH   = process.env.WATCH_BRANCH   ?? 'main'

let ultimoResultado = { passou: true }
let rodandoAgora = false

const servidor = createServer((req, res) => {

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', rodandoAgora }))
    return
  }

  if (req.method !== 'POST' || req.url !== '/webhook') {
    res.writeHead(404); res.end('Not found')
    return
  }

  let body = ''
  req.on('data', chunk => body += chunk)
  req.on('end', async () => {

    if (!validarAssinatura(body, req.headers['x-hub-signature-256'], WEBHOOK_SECRET)) {
      console.warn('[webhook] Assinatura inválida — ignorado')
      res.writeHead(401); res.end('Unauthorized')
      return
    }

    if (req.headers['x-github-event'] !== 'push') {
      res.writeHead(200); res.end('Evento ignorado')
      return
    }

    const info = parsearPayload(body)
    if (!info) {
      res.writeHead(400); res.end('Payload inválido')
      return
    }

    if (info.branch !== WATCH_BRANCH) {
      console.log(`[webhook] Branch "${info.branch}" ignorada`)
      res.writeHead(200); res.end('Branch ignorada')
      return
    }

    // Responde imediatamente — não bloqueia o deploy
    res.writeHead(202); res.end('Accepted')

    if (rodandoAgora) {
      console.log(`[testes] Já rodando — push ${info.commit} ignorado`)
      return
    }

    rodarEmBackground(info)
  })
})

servidor.listen(PORT, () => {
  console.log(`[server] Rodando na porta ${PORT}`)
  console.log(`[server] Aguardando pushes na branch "${WATCH_BRANCH}"`)
})

// Mantém o processo vivo durante testes longos
servidor.keepAliveTimeout = 620000
servidor.headersTimeout = 620000

async function rodarEmBackground(info) {
  rodandoAgora = true

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`[testes] Iniciando — commit ${info.commit} por ${info.autor}`)
  console.log(`[testes] "${info.commitMsg.split('\n')[0]}"`)

  try {
    const resultado = await rodarTestes(info.cloneUrl, WATCH_BRANCH)

    if (resultado.passou) {
      console.log(`[testes] ✅ Passou — ${resultado.total ?? '?'} testes em ${resultado.duracao}s`)
      if (!ultimoResultado.passou) {
        await enviarAlertaRecuperacao({ info, resultado })
      }
    } else {
      console.log(`[testes] ❌ ${resultado.falharam ?? '?'} teste(s) falharam em ${resultado.duracao}s`)
      resultado.erros?.forEach(e => console.log(`         ✗ ${e.teste}`))
      await enviarAlertaFalha({ info, resultado })
    }

    ultimoResultado = resultado

  } catch (err) {
    console.error('[testes] Erro inesperado:', err)
  } finally {
    rodandoAgora = false
    console.log(`${'─'.repeat(60)}\n`)
  }
}
