import fetch from 'node-fetch'

const RESEND_API = process.env.RESEND_API
const RESEND_BASE = 'https://api.resend.com'

export type SendEmailOptions = {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmail({ to, subject, html, from }: SendEmailOptions) {
  if (!RESEND_API) {
    console.warn('RESEND_API not configured; skipping email send')
    return { skipped: true }
  }

  const resp = await fetch(`${RESEND_BASE}/emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API}`,
    },
    body: JSON.stringify({
      from: from || 'RotaClock <noreply@rotaclock.com>',
      to: [to],
      subject,
      html,
    }),
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Resend send failed: ${resp.status} ${text}`)
  }

  return resp.json()
}

export function buildOrgVerificationEmail({ orgName, verifyUrl }: { orgName: string, verifyUrl: string }) {
  return {
    subject: `Verify your ${orgName} organization`:
    'subject' in { } ? '' : undefined,
    html: `
      <div>
        <h1>Welcome to RotaClock</h1>
        <p>Please verify your organization <strong>${orgName}</strong>.</p>
        <p><a href="${verifyUrl}">Click here to verify</a></p>
      </div>
    `,
  }
}

export function buildWelcomeEmail({ orgName, email, loginUrl }: { orgName: string, email: string, loginUrl: string }) {
  return {
    subject: `Your ${orgName} account is ready`,
    html: `
      <div>
        <h1>Welcome to ${orgName}</h1>
        <p>Your admin account (${email}) has been created.</p>
        <p>Login here: <a href="${loginUrl}">${loginUrl}</a></p>
      </div>
    `,
  }
}
