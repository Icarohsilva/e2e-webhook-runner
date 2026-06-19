async function enviarEmail({ assunto, html }) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'CI Bot <onboarding@resend.dev>',
      to: process.env.EMAIL_TO.split(',').map(e => e.trim()),
      subject: assunto,
      html,
    }),
  })

  if (!response.ok) {
    const erro = await response.text()
    throw new Error(`Resend erro: ${erro}`)
  }

  console.log(`[email] Enviado para ${process.env.EMAIL_TO}`)
}

export async function enviarAlertaFalha({ info, resultado }) {
  const projeto = process.env.PROJECT_NAME ?? info.repositorio
  await enviarEmail({
    assunto: `🔴 [E2E] Falha nos testes — ${projeto} (${info.branch} · ${info.commit})`,
    html: gerarHTMLFalha({ info, resultado, projeto }),
  })
}

export async function enviarAlertaRecuperacao({ info, resultado }) {
  const projeto = process.env.PROJECT_NAME ?? info.repositorio
  await enviarEmail({
    assunto: `✅ [E2E] Testes recuperados — ${projeto} (${info.branch} · ${info.commit})`,
    html: gerarHTMLRecuperacao({ info, resultado, projeto }),
  })
}

function gerarHTMLFalha({ info, resultado, projeto }) {
  const errosHTML = (resultado.erros ?? []).map(e => `
    <div style="margin-bottom:24px;background:#fff8f8;border-left:4px solid #e53935;border-radius:4px;padding:16px;">
      <div style="font-weight:600;color:#c62828;margin-bottom:8px;font-size:14px;">✗ ${escapar(e.teste)}</div>
      <div style="font-size:13px;color:#555;margin-bottom:8px;">📁 ${escapar(e.arquivo)}</div>
      <pre style="background:#1e1e1e;color:#f8f8f2;padding:12px;border-radius:4px;font-size:12px;overflow-x:auto;white-space:pre-wrap;margin:0;">${escapar(e.stack || e.mensagem)}</pre>
    </div>
  `).join('')

  const resumo = resultado.testes
    ? `<strong>${resultado.falharam}</strong> falharam de <strong>${resultado.total}</strong> testes (${resultado.duracao}s)`
    : 'Erro ao executar os testes'

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:640px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#e53935;padding:24px 32px;">
      <div style="font-size:22px;font-weight:700;color:#fff;">🔴 Falha nos testes E2E</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:4px;">${escapar(projeto)}</div>
    </div>
    <div style="padding:24px 32px;border-bottom:1px solid #f0f0f0;">
      <table style="width:100%;font-size:14px;border-collapse:collapse;">
        <tr><td style="color:#888;padding:4px 0;width:100px;">Branch</td><td style="font-weight:500;">${escapar(info.branch)}</td></tr>
        <tr><td style="color:#888;padding:4px 0;">Commit</td><td><a href="${info.commitUrl}" style="color:#1a73e8;font-family:monospace;">${escapar(info.commit)}</a> <span style="color:#555;">${escapar(info.commitMsg.split('\n')[0])}</span></td></tr>
        <tr><td style="color:#888;padding:4px 0;">Autor</td><td>${escapar(info.autor)}</td></tr>
        <tr><td style="color:#888;padding:4px 0;">Resultado</td><td style="color:#c62828;">${resumo}</td></tr>
      </table>
    </div>
    <div style="padding:24px 32px;">
      <div style="font-size:16px;font-weight:600;margin-bottom:16px;">Testes que falharam</div>
      ${errosHTML || '<p style="color:#888;font-size:14px;">Não foi possível extrair detalhes.</p>'}
    </div>
    <div style="background:#f9f9f9;padding:16px 32px;font-size:12px;color:#999;border-top:1px solid #f0f0f0;">
      Enviado automaticamente · ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
    </div>
  </div>
</body></html>`
}

function gerarHTMLRecuperacao({ info, resultado, projeto }) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:640px;margin:32px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#2e7d32;padding:24px 32px;">
      <div style="font-size:22px;font-weight:700;color:#fff;">✅ Testes recuperados</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:4px;">${escapar(projeto)}</div>
    </div>
    <div style="padding:24px 32px;">
      <table style="width:100%;font-size:14px;border-collapse:collapse;">
        <tr><td style="color:#888;padding:4px 0;width:100px;">Branch</td><td style="font-weight:500;">${escapar(info.branch)}</td></tr>
        <tr><td style="color:#888;padding:4px 0;">Commit</td><td><a href="${info.commitUrl}" style="color:#1a73e8;font-family:monospace;">${escapar(info.commit)}</a> <span style="color:#555;">${escapar(info.commitMsg.split('\n')[0])}</span></td></tr>
        <tr><td style="color:#888;padding:4px 0;">Autor</td><td>${escapar(info.autor)}</td></tr>
        <tr><td style="color:#888;padding:4px 0;">Resultado</td><td style="color:#2e7d32;"><strong>${resultado.total ?? '?'}</strong> testes passaram em ${resultado.duracao}s</td></tr>
      </table>
    </div>
    <div style="background:#f9f9f9;padding:16px 32px;font-size:12px;color:#999;border-top:1px solid #f0f0f0;">
      Enviado automaticamente · ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
    </div>
  </div>
</body></html>`
}

function escapar(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}