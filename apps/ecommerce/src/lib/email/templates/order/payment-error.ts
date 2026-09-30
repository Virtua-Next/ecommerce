import { DEFAULT_LANGUAGE } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/utils";
import { createTranslator } from 'next-intl';

const orderPaymentErrorTemplate = (data: any, t: any) => `
<!DOCTYPE html>
<html lang="${data.language}">
  <head>
    <meta charset="UTF-8">
    <title>${t('documentTitle', { orderId: data.orderId })}</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: Arial, sans-serif;
        color: #000;
        background-color: white;
        font-size: 12px;
        width: 100%;
        height: 100%;
      }

      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        padding: 15mm;
        background-color: white;
        box-shadow: 0 0 5px rgba(0,0,0,0.1);
      }

      h1, h2, h3, h4 {
        margin: 0;
        color: #333;
      }

      .header {
        text-align: center;
        margin-bottom: 12px;
        border-bottom: 1px solid #ddd;
        padding-bottom: 8px;
      }

      .main-title {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 4px;
        color: #222;
      }

      .section-title {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 6px;
        color: #444;
        border-bottom: 1px solid #eee;
        padding-bottom: 2px;
      }

      .bold {
        font-weight: bold;
      }

      .captalize {
        text-transform: capitalize;
      }

      .info-container {
        display: flex;
        justify-content: space-between;
        margin-bottom: 12px;
        gap: 24px;
      }

      .info-section {
        flex: 1;
        padding: 8px;
        background-color: #f9f9f9;
        border-radius: 4px;
        border: 1px solid #eee;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 16px;
        background-color: white;
      }

      th {
        border-bottom: 2px solid #ddd;
        padding: 6px 0;
        text-align: left;
        background-color: #f5f5f5;
      }

      td {
        padding: 6px 0;
        border-bottom: 1px solid #eee;
      }

      .text-right {
        text-align: right;
      }

      .footer {
        text-align: center;
        font-size: 10px;
        color: #666;
        border-top: 1px solid #ddd;
        padding-top: 10px;
        margin-top: 20px;
      }

      .error-box {
        background-color: #ffebee;
        border: 1px solid #ef9a9a;
        border-radius: 4px;
        padding: 16px;
        text-align: center;
        margin: 16px 0;
      }

      .error-code {
        font-family: monospace;
        font-size: 14px;
        font-weight: bold;
        color: #c62828;
        letter-spacing: 1px;
        margin: 12px 0;
        padding: 10px;
        background-color: white;
        border-radius: 4px;
        border: 1px solid #ef9a9a;
      }

      .retry-link {
        display: inline-block;
        padding: 10px 20px;
        background-color: #c62828;
        color: white;
        text-decoration: none;
        border-radius: 4px;
        font-weight: bold;
        margin-top: 8px;
      }

      .retry-link:hover {
        background-color: #b71c1c;
      }

      .status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
        background-color: #ffebee;
        color: #c62828;
        border: 1px solid #ef9a9a;
      }

      .totals {
        text-align: right;
        margin-bottom: 16px;
        padding: 10px;
        background-color: #f9f9f9;
        border-radius: 4px;
        border: 1px solid #eee;
      }

      .total-amount {
        font-weight: bold;
        font-size: 14px;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #ddd;
      }

      @media print {
        body {
          padding: 0;
          background-color: #FFFFFF;
        }
        .page {
          box-shadow: none;
          margin: 0;
          padding: 15mm;
        }
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
        ${t('orderPaymentError')}
      </h2>

      <p style="text-align:center; margin-bottom:16px;">
        <span class="status-badge">${t('status.paymentError')}</span>
      </p>

      <div class="info-container">
        <!-- Cliente -->
        <div class="info-section">
          <h3 class="section-title">${t('sections.customer')}</h3>
          <p><strong>${t('fields.name')}:</strong> ${data.customerName}</p>
          <p><strong>${t('fields.email')}:</strong> ${data.customerEmail}</p>
          ${data.customerPhone ? `<p><strong>${t('fields.phone')}:</strong> ${data.customerPhone}</p>` : ''}
        </div>

        <!-- Pedido -->
        <div class="info-section">
          <h3 class="section-title">${t('sections.order')}</h3>
          <p><strong>${t('fields.number')}:</strong> #${data.orderId}</p>
          <p><strong>${t('fields.date')}:</strong> ${formatDate(data.orderDate as string, data.language)}</p>
          <p class="captalize"><strong>${t('fields.status')}:</strong> ${t('status.paymentError')}</p>
          <p class="captalize"><strong>${t('fields.payment')}:</strong> ${data.paymentMethod}</p>
        </div>
      </div>

      <!-- Destaque do erro -->
      <div class="error-box">
        <h3 style="font-size: 14px; color: #c62828; margin-bottom: 8px;">
          ${t('paymentError.title')}
        </h3>
        <p style="color: #555; margin-bottom: 8px;">
          ${t('paymentError.instruction')}
        </p>
        ${data.errorCode ? `
          <div class="error-code">
            ${t('fields.errorCode')}: ${data.errorCode}
          </div>
        ` : ''}
        ${data.retryUrl ? `
          <a href="${data.retryUrl}" class="retry-link" target="_blank">
            ${t('paymentError.retryButton')}
          </a>
        ` : ''}
        ${data.supportEmail || data.SitePhone ? `
          <p style="margin-top: 12px; color: #555;">
            <strong>${t('paymentError.supportText')}</strong>
            ${data.supportEmail ? `<br>${t('fields.email')}: ${data.supportEmail}` : ''}
            ${data.SitePhone ? `<br>${t('fields.phone')}: ${data.SitePhone}` : ''}
          </p>
        ` : ''}
      </div>

      <!-- Entrega -->
      ${data.delivery === 'delivery' ? `
        <div class="info-section" style="margin-bottom:16px;">
          <h3 class="section-title">${t('sections.delivery')}</h3>
          <p><strong>${t('fields.address')}:</strong><br>
            ${data.shippingStreet}, ${data.shippingNumber}<br>
            ${data.shippingComplement ? data.shippingComplement + '<br>' : ''}
            ${data.shippingNeighborhood}<br>
            ${data.shippingCity}/${data.shippingState}<br>
            ${t('fields.zip')}: ${data.shippingZip}
          </p>
        </div>
      ` : ''}

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

      <!-- Totais -->
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

        ${data.interest && data.interest > 0 ? `
          <p>
            <span class="bold">${t('totals.interest')}:</span>
            <span style="margin-left:10px;">${formatPrice(data.interest, data.language, data.currency)}</span>
          </p>
        ` : ''}

        ${data.installments && data.installments > 1 ? `
          <p>
            <span class="bold">${t('totals.installments')}:</span>
            <span style="margin-left:10px;">${data.installments}x ${formatPrice(data.installmentPrice, data.language, data.currency)}</span>
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

      <!-- Observações -->
      ${data.observations ? `
        <div style="margin-bottom:16px; padding:8px; background:#f9f9f9; border-radius:4px; border:1px solid #eee;">
          <h3 class="section-title">${t('observations')}</h3>
          <p>${data.observations}</p>
        </div>
      ` : ''}

      <!-- Rodapé -->
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

export async function renderOrderPaymentErrorTemplate(data: any) {
    const locale = data.language ?? DEFAULT_LANGUAGE;
    const messages = (await import(`../../../../messages/templates/${locale}.json`)).default;

    const t = createTranslator({
        locale,
        messages: {
            ...messages,
            TemplateOrderPaymentError: {
                ...messages.TemplateOrderCommon,
                ...messages.TemplateOrderPaymentError,
                sections: {
                    ...messages.TemplateOrderCommon?.sections,
                    ...messages.TemplateOrderPaymentError?.sections,
                },
                fields: {
                    ...messages.TemplateOrderCommon?.fields,
                    ...messages.TemplateOrderPaymentError?.fields,
                },
                status: {
                    ...messages.TemplateOrderCommon?.status,
                    ...messages.TemplateOrderPaymentError?.status,
                },
                table: {
                    ...messages.TemplateOrderCommon?.table,
                    ...messages.TemplateOrderPaymentError?.table,
                },
                totals: {
                    ...messages.TemplateOrderCommon?.totals,
                    ...messages.TemplateOrderPaymentError?.totals,
                },
                footer: {
                    ...messages.TemplateOrderCommon?.footer,
                    ...messages.TemplateOrderPaymentError?.footer,
                },
                paymentError: {
                    ...messages.TemplateOrderCommon?.paymentError,
                    ...messages.TemplateOrderPaymentError?.paymentError,
                },
            },
        },
        namespace: 'TemplateOrderPaymentError',
    });

    return orderPaymentErrorTemplate(data, t);
}
