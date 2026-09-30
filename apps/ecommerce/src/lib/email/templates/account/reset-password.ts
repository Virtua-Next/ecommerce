import { DEFAULT_LANGUAGE } from "@/lib/constants";
import { createTranslator } from 'next-intl';

const resetPasswordTemplate = (data: { site_name: string; site_description?: string; domain: string; user_name: string; resetLink: string; language: string }, t: any) => `
<!DOCTYPE html>
<html lang="${data.language}">
  <head>
    <meta charset="UTF-8" />
    <title>${t('documentTitle')}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f6f6f6;">
    <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border: 1px solid #dddddd;">
      <tr>
        <td style="padding: 20px 30px; text-align: center; background-color: #007bff; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; color: #ffffff">${data.site_name}</h1>
        </td>
      </tr>
      <tr>
        <td style="padding: 30px;">
          <h3 style="margin-top: 0;">${t('title')}</h3>
          <p>${t('greeting', { userName: data.user_name })}</p>
          <p>${t('reason', { siteName: data.site_name })}</p>
          <p>
            ${t('notYou')}
          </p>
          <p>
            ${t('instruction')}
          </p>
          <p style="margin-top: 30px; text-align: center;">
            <a href="${data.resetLink}" style="background-color: #007bff; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              ${t('button')}
            </a>
          </p>
          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            ${t('fallbackLink')}
            <br />
            <a href="${data.resetLink}" style="color: #007bff; word-break: break-all;">${data.resetLink}</a>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px; background-color: #f0f0f0; text-align: center; font-size: 12px; color: #555;">
          <p style="margin: 0;">
            ${t('footer.automated')}
          </p>
          <p style="margin: 10px 0 0;">
            <a href="${data.domain}" style="color: #007bff; text-decoration: none; font-weight: bold;">
              ${data.site_name}${data.site_description ? ` - ${data.site_description}` : ''}
            </a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

export async function renderResetPassword(data: { site_name: string; site_description?: string; domain: string; user_name: string; resetLink: string; language: string }) {
    const locale = data.language ?? DEFAULT_LANGUAGE;
    const messages = (await import(`../../../../messages/templates/${locale}.json`)).default;

    const t = createTranslator({
        locale,
        messages: {
            ...messages,
            TemplateResetPassword: {
                ...messages.TemplateResetPassword,
            },
        },
        namespace: 'TemplateResetPassword',
    });

    return resetPasswordTemplate(data, t);
}








/* ************************** RESET DE SENHA *****************************
const resetPasswordTemplateEN = (data: { site_name: string; site_description?: string; domain: string; user_name: string; resetLink: string; }) =>
`
<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta charset="UTF-8" />
    <title>Password Change</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f6f6f6;">
    <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border: 1px solid #dddddd;">
      <tr>
        <td style="padding: 20px 30px; text-align: center; background-color: #007bff; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; color: #ffffff">${data.site_name}</h1>
        </td>
      </tr>
      <tr>
        <td style="padding: 30px;">
          <h3 style="margin-top: 0;">Password Change</h3>
          <p>Hello ${data.user_name},</p>
          <p>
            Você está recebendo este e-mail porque a recuperação de senha foi acionada no site <b>${data.site_name}</b>
          </p>
          <p>
            Se não foi você, simplesmente desconsidere esta mensagem e nada acontecerá.
          </p>
          <p>
            Se foi você, clique no link abaixo para confirmar sua nova senha.
          </p>
          <p style="margin-top: 30px;">
            <a href="${(data.resetLink)}">Recuperar</a>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px; background-color: #f0f0f0; text-align: center; font-size: 12px; color: #555;">
          <p style="margin: 0;">
            Esta é uma mensagem de e-mail automatizada, por favor não responda pois o e-mail não é monitorado.
          </p>
          <p style="margin: 10px 0 0;">
            <a href="${data.domain}" style="color: #007bff; text-decoration: none; font-weight: bold;">
              ${data.site_name}${data.site_description ? ` - ${data.site_description}` : ''}
            </a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const resetPasswordTemplateBR = (data: { site_name: string; site_description?: string; domain: string; user_name: string; resetLink: string; }) =>
`
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Alteração de Senha</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f6f6f6;">
    <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: auto; background-color: #ffffff; border: 1px solid #dddddd;">
      <tr>
        <td style="padding: 20px 30px; text-align: center; background-color: #007bff; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; color: #ffffff">${data.site_name}</h1>
        </td>
      </tr>
      <tr>
        <td style="padding: 30px;">
          <h3 style="margin-top: 0;">Alteração de Senha</h3>
          <p>Olá ${data.user_name},</p>
          <p>
            Você está recebendo este e-mail porque a recuperação de senha foi acionada no site <b>${data.site_name}</b>
          </p>
          <p>
            Se não foi você, simplesmente desconsidere esta mensagem e nada acontecerá.
          </p>
          <p>
            Se foi você, clique no link abaixo para confirmar sua nova senha.
          </p>
          <p style="margin-top: 30px;">
            <a href="${(data.resetLink)}">Recuperar</a>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px; background-color: #f0f0f0; text-align: center; font-size: 12px; color: #555;">
          <p style="margin: 0;">
            Esta é uma mensagem de e-mail automatizada, por favor não responda pois o e-mail não é monitorado.
          </p>
          <p style="margin: 10px 0 0;">
            <a href="${data.domain}" style="color: #007bff; text-decoration: none; font-weight: bold;">
              ${data.site_name}${data.site_description ? ` - ${data.site_description}` : ''}
            </a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
export function renderResetPassword(data: { site_name: string; site_description?: string; domain: string; user_name: string; resetLink: string, language: string }) {
    return data.language === 'pt-BR' ? resetPasswordTemplateBR(data) : resetPasswordTemplateEN(data);
}

*/