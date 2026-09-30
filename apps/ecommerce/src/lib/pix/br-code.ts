import QRCode from 'qrcode';


export async function pixPayloadToBase64Png(payload: string): Promise<string> {
    const dataUrl = await QRCode.toDataURL(payload, { margin: 1, width: 300 });
    return dataUrl.replace(/^data:image\/png;base64,/, '');
}

function tlv(id: string, value: string): string {
    return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

// Remove acentos e caracteres fora do padrão exigido pelo BR Code
function sanitize(value: string): string {
    return value
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
        .replace(/[^A-Za-z0-9 ]/g, '')
        .trim();
}

function crc16(payload: string): string {
    let crc = 0xffff;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
            crc &= 0xffff;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function buildPixStaticPayload(input: {
    pixKey: string;
    merchantName: string;
    merchantCity: string;
    amount: number;
    txid: string; // ex: "PEDIDO160" — só alfanumérico, sem espaço/acento
}): string {
    const merchantName = sanitize(input.merchantName).slice(0, 25) || 'LOJA';
    const merchantCity = sanitize(input.merchantCity).slice(0, 15) || 'SAO PAULO';
    const txid = input.txid.replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';

    const merchantAccountInfo =
        tlv('00', 'br.gov.bcb.pix') +
        tlv('01', input.pixKey);

    const additionalData = tlv('05', txid);

    const payloadWithoutCrc =
        tlv('00', '01') +
        tlv('26', merchantAccountInfo) +
        tlv('52', '0000') +
        tlv('53', '986') +
        tlv('54', input.amount.toFixed(2)) +
        tlv('58', 'BR') +
        tlv('59', merchantName) +
        tlv('60', merchantCity) +
        tlv('62', additionalData) +
        '6304'; // ID+tamanho fixo do próprio CRC, precisa entrar no cálculo

    return payloadWithoutCrc + crc16(payloadWithoutCrc);
}
