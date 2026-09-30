import { adminTriggerEmailByType } from '@/lib/db/email-admin';


interface ResetEmailParams {
    type: string;
    to: string;
    html: string;
    subject: string;
}

export class MailSender {
    static async sendEmail(params: ResetEmailParams) {
        try {
            const DISPARADOR = await adminTriggerEmailByType(params.type);
  
            return fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${DISPARADOR?.api_key}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from: DISPARADOR?.email,
                    to: params.to,
                    subject: params.subject,
                    html: params.html,
                }),
            });
        } catch (error) {
            console.log('ERRO ao enviar email', error)
        }
    }
}
