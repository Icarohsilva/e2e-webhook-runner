import { exec } from 'child_process'
import { readFile, unlink } from 'fs/promises'

const PROJETO_DIR = '/tmp/projeto-e2e'
const RESULTADO_JSON = '/tmp/playwright-result.json'

export function rodarTestes(cloneUrl, branch) {
  return new Promise((resolve) => {
    const token = process.env.GITHUB_TOKEN ?? ''
    const urlComToken = cloneUrl.replace('https://', `https://${token}@`)

    const cmd = [
      `rm -rf ${PROJETO_DIR}`,
      `git clone --depth=1 --branch ${branch} ${urlComToken} ${PROJETO_DIR}`,
      `cd ${PROJETO_DIR}`,
      `npm ci --ignore-scripts`,
      `npx playwright install chromium --with-deps`,
      `npx playwright test --reporter=json 2>&1 | tee ${RESULTADO_JSON}`,
    ].join(' && ')

    const inicio = Date.now()

    exec(cmd, { maxBuffer: 10 * 1024 * 1024, timeout: 10 * 60 * 1000 }, async (err, stdout, stderr) => {
      const duracao = Math.round((Date.now() - inicio) / 1000)
      const passou = !err

      console.log('[testes] stdout:', stdout?.slice(0, 2000))
      console.log('[testes] stderr:', stderr?.slice(0, 2000))
      if (err) console.log('[testes] err:', err?.message?.slice(0, 1000))

      let detalhes = {
        passou,
        duracao,
        testes: [],
        erros: [],
        rawOutput: stdout || stderr,
      }

      try {
        const raw = await readFile(RESULTADO_JSON, 'utf-8')
        const jsonStart = raw.indexOf('{')
        if (jsonStart !== -1) {
          const resultado = JSON.parse(raw.slice(jsonStart))
          detalhes = parsearResultadoPlaywright(resultado, duracao, passou)
        }
      } catch { /* usa fallback */ }

      try { await unlink(RESULTADO_JSON) } catch { }

      resolve(detalhes)
    })
  })
}

function parsearResultadoPlaywright(resultado, duracao, passou) {
  const testes = []
  const erros = []

  for (const suite of resultado.suites ?? []) {
    coletarTestes(suite, testes, erros)
  }

  return {
    passou,
    duracao,
    total: resultado.stats?.expected ?? testes.length,
    passaram: resultado.stats?.expected ?? testes.filter(t => t.status === 'passed').length,
    falharam: resultado.stats?.unexpected ?? testes.filter(t => t.status === 'failed').length,
    pulados: resultado.stats?.skipped ?? 0,
    testes,
    erros,
  }
}

function coletarTestes(suite, testes, erros, path = '') {
  const suiteNome = path ? `${path} › ${suite.title}` : suite.title

  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const status = test.results?.[0]?.status ?? 'unknown'
      const erro = test.results?.[0]?.error

      testes.push({
        nome: `${suiteNome} › ${spec.title}`,
        status,
        duracao: test.results?.[0]?.duration ?? 0,
        arquivo: suite.file ?? '',
      })

      if (status === 'failed' && erro) {
        erros.push({
          teste: `${suiteNome} › ${spec.title}`,
          mensagem: erro.message ?? '',
          stack: erro.stack ?? '',
          arquivo: suite.file ?? '',
        })
      }
    }
  }

  for (const sub of suite.suites ?? []) {
    coletarTestes(sub, testes, erros, suiteNome)
  }
}