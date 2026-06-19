import { createHmac } from 'crypto'

export function validarAssinatura(body, signature, secret) {
  if (!signature || !secret) return false

  const esperado = `sha256=${createHmac('sha256', secret)
    .update(body)
    .digest('hex')}`

  const bufA = Buffer.from(signature)
  const bufB = Buffer.from(esperado)
  if (bufA.length !== bufB.length) return false

  return bufA.equals(bufB)
}

export function parsearPayload(rawBody) {
  try {
    const payload = JSON.parse(rawBody)
    return {
      branch: payload.ref?.replace('refs/heads/', '') ?? '',
      commit: payload.head_commit?.id?.slice(0, 7) ?? 'unknown',
      commitMsg: payload.head_commit?.message ?? '',
      commitUrl: payload.head_commit?.url ?? '',
      autor: payload.pusher?.name ?? 'desconhecido',
      repositorio: payload.repository?.full_name ?? '',
      cloneUrl: payload.repository?.clone_url ?? '',
    }
  } catch {
    return null
  }
}
