const RESEND_API = 'https://api.resend.com/emails'

export interface ResendPayload {
  from: string
  to: string
  subject: string
  html: string
  text: string
}

export interface ResendResult {
  id?: string
  error?: string
}

export async function sendEmail(
  apiKey: string,
  payload: ResendPayload
): Promise<ResendResult> {
  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: payload.from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { error: data?.message ?? `Resend error ${res.status}` }
    }

    return { id: data.id }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to send email' }
  }
}

// Converts plain-text draft body to a minimal HTML email
export function draftBodyToHtml(body: string): string {
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const paragraphs = escaped
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${p.replace(/\n/g, '<br>')}</p>`)
    .join('\n')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#111;max-width:600px;margin:0 auto;padding:24px">
${paragraphs}
</body>
</html>`
}
