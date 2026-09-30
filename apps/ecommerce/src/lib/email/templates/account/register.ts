import { DEFAULT_LANGUAGE } from "@/lib/constants";
import { createTranslator } from 'next-intl';

const registerTemplate = (data: { site_name: string; site_description?: string; domain: string; user_name: string; confirmLink: string; language: string; }, t: any) => `
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
          <p>
            ${t('thankYou', {siteName: data.site_name})}
          </p>
          <p>
            ${t('instruction')}
          </p>
          <p style="margin-top: 30px; text-align: center;">
            <a href="${data.confirmLink}" style="background-color: #007bff; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              ${t('button')}
            </a>
          </p>
          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            ${t('fallbackLink')}
            <br />
            <a href="${data.confirmLink}" style="color: #007bff; word-break: break-all;">${data.confirmLink}</a>
          </p>
          <p style="margin-top: 30px; font-size: 14px; color: #999;">
            ${t('ignore')}
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

export async function renderRegisterTemplate(data: { site_name: string; site_description?: string; domain: string; user_name: string; confirmLink: string; language: string }) {
    const locale = data.language ?? DEFAULT_LANGUAGE;
    const messages = (await import(`../../../../messages/templates/${locale}.json`)).default;

    const t = createTranslator({
        locale,
        messages: {
            ...messages,
            TemplateRegister: {
                ...messages.TemplateRegister,
            },
        },
        namespace: 'TemplateRegister',
    });

    return registerTemplate(data, t);
}







/* ************************** REGISTER *****************************
const confirmRegistrationTemplateEN = (data: { site_name: string; site_description?: string; domain: string; user_name: string; confirmLink: string; }) =>
    `
<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta charset="UTF-8" />
    <title>Confirm Registration</title>
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
          <h3 style="margin-top: 0;">Confirm Your Registration</h3>
          <p>Hello ${data.user_name},</p>
          <p>
            Thank you for registering on <b>${data.site_name}</b>.
          </p>
          <p>
            To complete your registration and activate your account, please click the link below:
          </p>
          <p style="margin-top: 30px; text-align: center;">
            <a href="${data.confirmLink}" style="background-color: #007bff; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Confirm Registration
            </a>
          </p>
          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            If the button doesn't work, copy and paste this link into your browser:
            <br />
            <a href="${data.confirmLink}" style="color: #007bff; word-break: break-all;">${data.confirmLink}</a>
          </p>
          <p style="margin-top: 30px; font-size: 14px; color: #999;">
            If you didn't request this registration, please ignore this email.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 20px; background-color: #f0f0f0; text-align: center; font-size: 12px; color: #555;">
          <p style="margin: 0;">
            This is an automated email message, please do not reply as the email is not monitored.
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

const confirmRegistrationTemplateBR = (data: { site_name: string; site_description?: string; domain: string; user_name: string; confirmLink: string; }) =>
    `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Confirme seu Cadastro</title>
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
          <h3 style="margin-top: 0;">Confirme seu Cadastro</h3>
          <p>Olá ${data.user_name},</p>
          <p>
            Obrigado por se cadastrar no <b>${data.site_name}</b>.
          </p>
          <p>
            Para completar seu cadastro e ativar sua conta, clique no link abaixo:
          </p>
          <p style="margin-top: 30px; text-align: center;">
            <a href="${data.confirmLink}" style="background-color: #007bff; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Confirmar Cadastro
            </a>
          </p>
          <p style="margin-top: 20px; font-size: 14px; color: #666;">
            Se o botão não funcionar, copie e cole este link no seu navegador:
            <br />
            <a href="${data.confirmLink}" style="color: #007bff; word-break: break-all;">${data.confirmLink}</a>
          </p>
          <p style="margin-top: 30px; font-size: 14px; color: #999;">
            Se você não solicitou este cadastro, por favor ignore este e-mail.
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

export function renderConfirmRegistration(data: { site_name: string; site_description?: string; domain: string; user_name: string; confirmLink: string; language: string; }) {
    return data.language === 'pt-BR' ? confirmRegistrationTemplateBR(data) : confirmRegistrationTemplateEN(data);
}

*/