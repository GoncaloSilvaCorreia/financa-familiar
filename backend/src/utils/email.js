const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Enquanto não houver domínio verificado no Resend, usa-se este remetente de teste.
// Com domínio verificado, troca para algo como 'FinançaFamiliar <naoresponder@teudominio.pt>'
const REMETENTE = process.env.EMAIL_REMETENTE || 'FinançaFamiliar <onboarding@resend.dev>';

const URL_FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── Email de confirmação de conta ───────────────────────────────────────────
async function enviarEmailConfirmacao(destinatario, nome, token) {
  const link = `${URL_FRONTEND}/confirmar-email/${token}`;

  try {
    await resend.emails.send({
      from: REMETENTE,
      to: destinatario,
      subject: 'Confirma a tua conta — Finança Familiar',
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px;">🏠</span>
            <h1 style="font-size: 18px; color: #111827; margin: 8px 0 0;">Finança Familiar</h1>
          </div>
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Olá ${nome.split(' ')[0]},
          </p>
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            Falta só um passo para começares a usar a Finança Familiar. Confirma o teu email clicando no botão abaixo:
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${link}"
               style="background: #2563eb; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
              Confirmar email
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px; line-height: 1.6;">
            Se o botão não funcionar, copia este link para o browser:<br>
            <span style="color: #2563eb;">${link}</span>
          </p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
            Se não criaste esta conta, podes ignorar este email.
          </p>
        </div>
      `
    });
  } catch (err) {
    console.error('Erro ao enviar email de confirmação:', err);
    throw err;
  }
}

// ─── Email de boas-vindas (enviado após confirmação) ─────────────────────────
async function enviarEmailBoasVindas(destinatario, nome) {
  try {
    await resend.emails.send({
      from: REMETENTE,
      to: destinatario,
      subject: 'Bem-vindo à Finança Familiar! 🎉',
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px;">🎉</span>
            <h1 style="font-size: 18px; color: #111827; margin: 8px 0 0;">Bem-vindo, ${nome.split(' ')[0]}!</h1>
          </div>
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            A tua conta está confirmada e pronta a usar. Já podes começar a organizar as finanças da tua família:
          </p>
          <ul style="color: #374151; font-size: 14px; line-height: 1.8; padding-left: 20px;">
            <li>Regista transações e acompanha os teus gastos</li>
            <li>Define metas de poupança</li>
            <li>Acompanha prazos de impostos e seguros</li>
            <li>Convida a tua família para o agregado partilhado</li>
          </ul>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${URL_FRONTEND}/login"
               style="background: #2563eb; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
              Entrar na conta
            </a>
          </div>
        </div>
      `
    });
  } catch (err) {
    // Não bloqueia o fluxo se o email de boas-vindas falhar — apenas regista o erro
    console.error('Erro ao enviar email de boas-vindas:', err);
  }
}

// ─── Email de convite para o agregado (já previsto no schema) ───────────────
async function enviarEmailConvite(destinatario, nomeConvidante, token) {
  const link = `${URL_FRONTEND}/aceitar-convite?token=${token}`;

  try {
    await resend.emails.send({
      from: REMETENTE,
      to: destinatario,
      subject: `${nomeConvidante} convidou-te para o agregado familiar`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px;">👨‍👩‍👧</span>
            <h1 style="font-size: 18px; color: #111827; margin: 8px 0 0;">Convite para o agregado</h1>
          </div>
          <p style="color: #374151; font-size: 14px; line-height: 1.6;">
            <strong>${nomeConvidante}</strong> convidou-te para fazeres parte do agregado familiar na Finança Familiar.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${link}"
               style="background: #2563eb; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
              Aceitar convite
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 12px; line-height: 1.6;">
            Se o botão não funcionar, copia este link para o browser:<br>
            <span style="color: #2563eb;">${link}</span>
          </p>
        </div>
      `
    });
  } catch (err) {
    console.error('Erro ao enviar email de convite:', err);
    throw err;
  }
}

module.exports = { enviarEmailConfirmacao, enviarEmailBoasVindas, enviarEmailConvite };