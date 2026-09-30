import { DEFAULT_LANGUAGE } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/utils";
import { createTranslator } from 'next-intl';

const paymentInstructionsTemplate = (data: any, t: any) => {
    const isPix = data.paymentMethod === 'pix';
    const isBoleto = data.paymentMethod === 'boleto';

    const pixQrSrc = data.pix?.qrCodeBase64
        ? (data.pix.qrCodeBase64.startsWith('data:')
            ? data.pix.qrCodeBase64
            : `data:image/png;base64,${data.pix.qrCodeBase64}`)
        : null;

    return `
<!DOCTYPE html>
<html lang="${data.language}">
  <head>
    <meta charset="UTF-8">
    <title>${t('documentTitle', { orderId: data.orderId })}</title>
    <style>
      body {
        margin: 0; padding: 0;
        font-family: Arial, sans-serif;
        color: #000; background-color: white;
        font-size: 12px; width: 100%; height: 100%;
      }
      .page {
        width: 210mm; min-height: 297mm;
        margin: 0 auto; padding: 15mm;
        background-color: white;
        box-shadow: 0 0 5px rgba(0,0,0,0.1);
      }
      h1, h2, h3, h4 { margin: 0; color: #333; }
      .header {
        text-align: center; margin-bottom: 12px;
        border-bottom: 1px solid #ddd; padding-bottom: 8px;
      }
      .main-title { font-size: 18px; font-weight: bold; margin-bottom: 4px; color: #222; }
      .section-title {
        font-size: 14px; font-weight: bold; margin-bottom: 6px;
        color: #444; border-bottom: 1px solid #eee; padding-bottom: 2px;
      }
      .bold { font-weight: bold; }
      .captalize { text-transform: capitalize; }
      .info-container {
        display: flex; justify-content: space-between;
        margin-bottom: 12px; gap: 24px;
      }
      .info-section {
        flex: 1; padding: 8px; background-color: #f9f9f9;
        border-radius: 4px; border: 1px solid #eee;
      }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; background-color: white; }
      th {
        border-bottom: 2px solid #ddd; padding: 6px 0;
        text-align: left; background-color: #f5f5f5;
      }
      td { padding: 6px 0; border-bottom: 1px solid #eee; }
      .text-right { text-align: right; }
      .footer {
        text-align: center; font-size: 10px; color: #666;
        border-top: 1px solid #ddd; padding-top: 10px; margin-top: 20px;
      }
      .totals {
        text-align: right; margin-bottom: 16px;
        padding: 10px; background-color: #f9f9f9;
        border-radius: 4px; border: 1px solid #eee;
      }
      .total-amount {
        font-weight: bold; font-size: 14px; margin-top: 8px;
        padding-top: 8px; border-top: 1px solid #ddd;
      }
      .payment-box {
        margin: 24px 0; padding: 16px;
        background: #fff8e1; border: 1px solid #ffe082;
        border-radius: 6px;
      }
      .payment-box .section-title { border-bottom: 1px solid #ffe082; }
      .mono-box {
        font-family: 'Courier New', monospace; font-size: 12px;
        padding: 10px; background: white; border: 1px solid #eee;
        border-radius: 4px; word-break: break-all;
        letter-spacing: 1px; color: #222;
      }
      .cta {
        display: inline-block; padding: 10px 20px; background: #222;
        color: #fff !important; text-decoration: none;
        border-radius: 4px; font-weight: bold;
      }
      @media print {
        body { padding: 0; background-color: #FFFFFF; }
        .page { box-shadow: none; margin: 0; padding: 15mm; }
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="header">
        <h1 class="main-title">${data.siteName || t('fallbackSiteName')}</h1>
        ${data.siteDomain ? `<p>${data.siteDomain}</p>` : ''}
        ${data.SitePhone ? `<p>${data.SitePhone}</p>` : ''}
      </div>

      <h2 class="section-title" style="text-align:center; margin-bottom:16px;">
        ${t('paymentInstructions')}
      </h2>

      <div class="info-container">
        <div class="info-section">
          <h3 class="section-title">${t('sections.customer')}</h3>
          <p><strong>${t('fields.name')}:</strong> ${data.customerName}</p>
          <p><strong>${t('fields.email')}:</strong> ${data.customerEmail}</p>
          ${data.customerPhone ? `<p><strong>${t('fields.phone')}:</strong> ${data.customerPhone}</p>` : ''}
        </div>

        <div class="info-section">
          <h3 class="section-title">${t('sections.order')}</h3>
          <p><strong>${t('fields.number')}:</strong> #${data.orderId}</p>
          <p><strong>${t('fields.date')}:</strong> ${formatDate(data.orderDate as string, data.language)}</p>
          <p class="captalize"><strong>${t('fields.payment')}:</strong> ${data.paymentMethod}</p>
          <p class="captalize"><strong>${t('fields.status')}:</strong> ${data.orderStatus || t('status.pending')}</p>
        </div>
      </div>

      <!-- BLOCO DE PAGAMENTO -->
      <div class="payment-box">
        <h3 class="section-title">
          ${isPix ? t('payment.pix.title') : t('payment.boleto.title')}
        </h3>

        <p>${isPix ? t('payment.pix.instructions') : t('payment.boleto.instructions')}</p>

        ${isPix && pixQrSrc ? `
          <div style="text-align:center; margin: 16px 0;">
            <img src="${pixQrSrc}" alt="PIX QR Code" width="220" height="220"
                 style="display:inline-block; border:1px solid #eee; border-radius:6px; padding:6px; background:#fff;" />
          </div>
        ` : ''}

        ${isPix && data.pix?.qrCode ? `
          <p style="margin-top:12px;"><strong>${t('payment.pix.copyPasteLabel')}</strong></p>
          <div class="mono-box">${data.pix.qrCode}</div>
        ` : ''}

        ${isBoleto && data.boleto?.barcode ? `
          <p style="margin-top:12px;"><strong>${t('payment.boleto.barcodeLabel')}</strong></p>
          <div class="mono-box" style="font-size:13px;">${data.boleto.barcode}</div>
        ` : ''}

        ${isBoleto && data.boleto?.ticketUrl ? `
          <p style="margin-top:16px; text-align:center;">
            <a href="${data.boleto.ticketUrl}" class="cta" target="_blank" rel="noopener">
              ${t('payment.boleto.downloadButton')}
            </a>
          </p>
        ` : ''}

        ${data.expiresAt ? `
          <p style="margin-top:16px; font-size:11px; color:#8a6d3b;">
            ⏰ ${t('payment.expiresAt', { date: formatDate(data.expiresAt, data.language) })}
          </p>
        ` : ''}

        <p style="margin-top:16px; font-size:15px;">
          <span class="bold">${t('payment.amountToPay')}:</span>
          <span style="margin-left:8px;">${formatPrice(data.totalValue, data.language, data.currency)}</span>
        </p>
      </div>

      <!-- Itens -->
      <table>
        <thead>
          <tr>
            <th>${t('table.sku')}</th>
            <th>${t('table.product')}</th>
            <th class="text-right">${t('table.unitPrice')}</th>
            <th class="text-right">${t('table.quantity')}</th>
            <th class="text-right">${t('table.total')}</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map((item: any) => `
            <tr>
              <td>${item.sku}</td>
              <td>${item.product_name}</td>
              <td class="text-right">${formatPrice(item.price, data.language, data.currency)}</td>
              <td class="text-right">${item.quantity}</td>
              <td class="text-right">${formatPrice(item.price * item.quantity, data.language, data.currency)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <p>
          <span class="bold">${t('totals.subtotal')}:</span>
          <span style="margin-left:10px;">${formatPrice(data.productsValue, data.language, data.currency)}</span>
        </p>

        ${data.shippingValue && data.shippingValue > 0 ? `
          <p>
            <span class="bold">${t('totals.shipping')}:</span>
            <span style="margin-left:10px;">${formatPrice(data.shippingValue, data.language, data.currency)}</span>
          </p>
        ` : ''}

        ${data.discountValue && data.discountValue > 0 ? `
          <p>
            <span class="bold">${t('totals.discount')}:</span>
            <span style="margin-left:10px;">${formatPrice(data.discountValue, data.language, data.currency)}</span>
          </p>
        ` : ''}

        <p class="total-amount">
          <span class="bold">${t('totals.total')}:</span>
          <span style="margin-left:10px;">${formatPrice(data.totalValue, data.language, data.currency)}</span>
        </p>
      </div>

      <div class="footer">
        <p>${t('footer.thanks')}</p>
        <p>${t('footer.rights', {
        year: new Date().getFullYear(),
        siteName: data.siteName || t('fallbackSiteName')
    })}</p>
      </div>
    </div>
  </body>
</html>
`;
};

export async function renderPaymentInstructionsTemplate(data: any) {
    const locale = data.language ?? DEFAULT_LANGUAGE;
    const messages = (await import(`../../../../messages/templates/${locale}.json`)).default;

    const t = createTranslator({
        locale,
        messages: {
            ...messages,
            TemplatePaymentInstructions: {
                ...messages.TemplateOrderCommon,
                ...messages.TemplatePaymentInstructions,
                sections: {
                    ...messages.TemplateOrderCommon?.sections,
                    ...messages.TemplatePaymentInstructions?.sections,
                },
                fields: {
                    ...messages.TemplateOrderCommon?.fields,
                    ...messages.TemplatePaymentInstructions?.fields,
                },
                status: {
                    ...messages.TemplateOrderCommon?.status,
                    ...messages.TemplatePaymentInstructions?.status,
                },
                table: {
                    ...messages.TemplateOrderCommon?.table,
                    ...messages.TemplatePaymentInstructions?.table,
                },
                totals: {
                    ...messages.TemplateOrderCommon?.totals,
                    ...messages.TemplatePaymentInstructions?.totals,
                },
                footer: {
                    ...messages.TemplateOrderCommon?.footer,
                    ...messages.TemplatePaymentInstructions?.footer,
                },
                payment: {
                    ...messages.TemplatePaymentInstructions?.payment,
                },
            },
        },
        namespace: 'TemplatePaymentInstructions',
    });

    return paymentInstructionsTemplate(data, t);
}