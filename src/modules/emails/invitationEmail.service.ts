type InvitationRecipient = {
  name: string
  email: string
  cpf: string | null
}

function normalizeCpf(cpf: string | null) {
  return String(cpf || "").replace(/\D/g, "")
}

function getInitialPassword(cpf: string | null) {
  const normalizedCpf = normalizeCpf(cpf)
  if (normalizedCpf.length !== 11) {
    throw new Error("CPF inválido para gerar senha inicial")
  }

  return normalizedCpf.slice(-5)
}

function getVotingUrl() {
  return process.env.VOTING_SITE_URL || "https://votacao-sc.vercel.app"
}

function getMailConfig() {
  const apiKey = process.env.SENDGRID_API_KEY
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.GMAIL_USER

  if (!apiKey || !fromEmail) {
    throw new Error("Configure SENDGRID_API_KEY e SENDGRID_FROM_EMAIL no .env para enviar emails")
  }

  return { apiKey, fromEmail }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function buildInvitationEmail(recipient: InvitationRecipient) {
  const votingUrl = getVotingUrl()
  const password = getInitialPassword(recipient.cpf)
  const safeName = escapeHtml(recipient.name)
  const safeEmail = escapeHtml(recipient.email)
  const safePassword = escapeHtml(password)

  const subject = "Convite para participação na votação online"

  const text = [
    `Prezado(a) ${recipient.name},`,
    "",
    "Você está convidado(a) a participar do processo de votação online.",
    "",
    `Para acessar o sistema, entre no endereço: ${votingUrl}`,
    "",
    "Suas credenciais de acesso são:",
    `Email: ${recipient.email}`,
    `Senha inicial: ${password}`,
    "",
    "A senha inicial corresponde somente aos números dos 5 últimos dígitos do CPF cadastrado junto ao Sindicato.",
    "",
    "Recomendamos que o acesso seja realizado com atenção aos dados informados nesta mensagem.",
    "",
    "Atenciosamente,",
    "Sindicato dos Profissionais de Jornalismo de Santa Catarina"
  ].join("\n")

  const html = `
    <div style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
      <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
        <div style="background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;padding:28px;">
          <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;color:#18181b;">
            Convite para participação na votação online
          </h1>

          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
            Prezado(a) <strong>${safeName}</strong>,
          </p>

          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
            Você está convidado(a) a participar do processo de votação online.
          </p>

          <p style="margin:0 0 20px;font-size:16px;line-height:1.6;">
            Para acessar o sistema, utilize o endereço abaixo:
          </p>

          <p style="margin:0 0 24px;">
            <a href="${votingUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:6px;">
              Acessar sistema de votação
            </a>
          </p>

          <div style="border:1px solid #dbeafe;background:#eff6ff;border-radius:8px;padding:18px;margin:0 0 20px;">
            <p style="margin:0 0 10px;font-size:15px;font-weight:bold;color:#1e3a8a;">
              Credenciais de acesso
            </p>
            <p style="margin:0 0 8px;font-size:15px;line-height:1.5;">
              <strong>Email:</strong> ${safeEmail}
            </p>
            <p style="margin:0;font-size:15px;line-height:1.5;">
              <strong>Senha inicial:</strong> ${safePassword}
            </p>
          </div>

          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">
            A senha inicial corresponde somente aos números dos 5 últimos dígitos do CPF cadastrado junto ao Sindicato.
          </p>

          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#3f3f46;">
            Recomendamos que o acesso seja realizado com atenção aos dados informados nesta mensagem.
          </p>

          <p style="margin:0;font-size:15px;line-height:1.6;">
            Atenciosamente,<br />
            <strong>Sindicato dos Profissionais de Jornalismo de Santa Catarina</strong>
          </p>
        </div>
      </div>
    </div>
  `

  return { subject, text, html }
}

export class InvitationEmailService {
  async sendInvitation(recipient: InvitationRecipient) {
    const { apiKey, fromEmail } = getMailConfig()
    const { subject, text, html } = buildInvitationEmail(recipient)

    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: recipient.email }] }],
        from: {
          email: fromEmail,
          name: "Sindicato dos Profissionais de Jornalismo de Santa Catarina"
        },
        subject,
        content: [
          { type: "text/plain", value: text },
          { type: "text/html", value: html }
        ]
      })
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Falha ao enviar email via SendGrid (${response.status}): ${errorBody}`)
    }
  }
}
