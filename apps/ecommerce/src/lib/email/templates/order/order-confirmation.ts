import { DEFAULT_LANGUAGE } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/utils";
import { createTranslator } from 'next-intl';

const orderConfirmationTemplate = (data: any, t: any) => `
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
        ${t('orderReceipt')}
      </h2>

      <div class="info-container">
        <!-- Cliente -->
        <div class="info-section">
          <h3 class="section-title">${t('sections.customer')}</h3>
          <p><strong>${t('fields.name')}:</strong> ${data.customerName}</p>
          <p><strong>${t('fields.email')}:</strong> ${data.customerEmail}</p>
          ${data.customerPhone ? `<p><strong>${t('fields.phone')}:</strong> ${data.customerPhone}</p>` : ''}
        </div>

        <!-- Entrega -->
        <div class="info-section">
          <h3 class="section-title">${t('sections.delivery')}</h3>
          ${data.delivery === 'delivery' ? `
            <p><strong>${t('fields.carrier')}:</strong> ${data.carrierName}</p>
            <p><strong>${t('fields.address')}:</strong><br>
              ${data.shippingStreet}, ${data.shippingNumber}<br>
              ${data.shippingComplement ? data.shippingComplement + '<br>' : ''}
              ${data.shippingNeighborhood}<br>
              ${data.shippingCity}/${data.shippingState}<br>
              ${t('fields.zip')}: ${data.shippingZip}
            </p>
          ` : `<p><strong>${t('fields.pickup')}</strong></p>`}
        </div>

        <!-- Pedido -->
        <div class="info-section">
          <h3 class="section-title">${t('sections.order')}</h3>
          <p><strong>${t('fields.number')}:</strong> #${data.orderId}</p>
          <p><strong>${t('fields.date')}:</strong> ${formatDate(data.orderDate as string, data.language)}</p>
          <p class="captalize"><strong>${t('fields.status')}:</strong> ${data.orderStatus || t('status.pending')}</p>
          <p class="captalize"><strong>${t('fields.payment')}:</strong> ${data.paymentMethod}</p>
        </div>
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

      <!-- Dados bancários (só para transferência) -->
        ${data.bankInfo ? `
            <div style="margin-bottom:16px; padding:10px; background:#fff8e1; border-radius:4px; border:1px solid #ffe082;">
                <h3 class="section-title">${t('sections.bankInfo')}</h3>
                <p>${t('bankInfo.instruction')}</p>
                <p style="white-space: pre-wrap; font-family: monospace; padding:8px; background:#fff; border-radius:4px; border:1px solid #eee;">${data.bankInfo}</p>
                <p><strong>${t('bankInfo.totalToPay')}:</strong> ${formatPrice(data.totalValue, data.language, data.currency)}</p>
            </div>
        ` : ''}

    
    <!-- Dados do pix -->
        ${data.pixInfo ? `
        <div style="margin-bottom:16px; padding:12px; background:#f0fdf4; border-radius:4px; border:1px solid #bbf7d0;">
            <h3 class="section-title">${t('sections.pixInfo')}</h3>
            <p style="margin-bottom:12px;">${t('pixInfo.instruction')}</p>

    ${data.pixInfo.qrCodeBase64 ? `
      <div style="text-align:center; margin:12px 0;">
        <img
          src="data:image/png;base64,${data.pixInfo.qrCodeBase64}"
          alt="${t('pixInfo.qrCodeAlt')}"
          width="180"
          height="180"
          style="display:inline-block; border:1px solid #eee; border-radius:4px; padding:6px; background:#fff;"
        />
      </div>
    ` : ''}

    ${data.pixInfo.copyPaste ? `
      <p style="margin-bottom:4px;"><strong>${t('pixInfo.copyPasteLabel')}:</strong></p>
      <p style="
        white-space: pre-wrap;
        word-break: break-all;
        font-family: monospace;
        font-size: 10px;
        line-height: 1.4;
        padding:8px;
        background:#fff;
        border-radius:4px;
        border:1px solid #eee;
        margin:0 0 12px 0;
      ">${data.pixInfo.copyPaste}</p>
    ` : ''}

    <table style="width:100%; margin-bottom:8px;">
      <tr>
        <td style="border:none; padding:2px 0;"><strong>${t('pixInfo.keyLabel')}:</strong></td>
        <td style="border:none; padding:2px 0; text-align:right; font-family:monospace; font-size:11px; word-break:break-all;">${data.pixInfo.pixKey}</td>
      </tr>
      <tr>
        <td style="border:none; padding:2px 0;"><strong>${t('pixInfo.holderLabel')}:</strong></td>
        <td style="border:none; padding:2px 0; text-align:right;">${data.pixInfo.merchantName}</td>
      </tr>
      <tr>
        <td style="border:none; padding:2px 0;"><strong>${t('pixInfo.txidLabel')}:</strong></td>
        <td style="border:none; padding:2px 0; text-align:right; font-family:monospace; font-size:11px;">${data.pixInfo.txid}</td>
      </tr>
      <tr>
        <td style="border:none; padding:6px 0 0 0; border-top:1px solid #bbf7d0;"><strong>${t('pixInfo.totalToPay')}:</strong></td>
        <td style="border:none; padding:6px 0 0 0; border-top:1px solid #bbf7d0; text-align:right; font-weight:bold;">${formatPrice(data.totalValue, data.language, data.currency)}</td>
      </tr>
    </table>

    ${data.pixInfo.expiresAt ? `
      <p style="margin:8px 0 0 0; color:#b45309; font-size:11px;">
        <strong>${t('pixInfo.expiresAt')}:</strong> ${formatDate(data.pixInfo.expiresAt, data.language)}
      </p>
    ` : ''}
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

export async function renderOrderConfirmationTemplate(data: any) {
    const locale = data.language ?? DEFAULT_LANGUAGE;
    const messages = (await import(`../../../../messages/templates/${locale}.json`)).default;

    const t = createTranslator({
        locale,
        messages: {
            ...messages,
            TemplateOrderConfirmation: {
                ...messages.TemplateOrderCommon,
                ...messages.TemplateOrderConfirmation,
                sections: {
                    ...messages.TemplateOrderCommon?.sections,
                    ...messages.TemplateOrderConfirmation?.sections,
                },
                bankInfo: {
                    ...messages.TemplateOrderCommon?.bankInfo,
                    ...messages.TemplateOrderConfirmation?.bankInfo,
                },
                fields: {
                    ...messages.TemplateOrderCommon?.fields,
                    ...messages.TemplateOrderConfirmation?.fields,
                },
                status: {
                    ...messages.TemplateOrderCommon?.status,
                    ...messages.TemplateOrderConfirmation?.status,
                },
                table: {
                    ...messages.TemplateOrderCommon?.table,
                    ...messages.TemplateOrderConfirmation?.table,
                },
                totals: {
                    ...messages.TemplateOrderCommon?.totals,
                    ...messages.TemplateOrderConfirmation?.totals,
                },
                footer: {
                    ...messages.TemplateOrderCommon?.footer,
                    ...messages.TemplateOrderConfirmation?.footer,
                },
            },
        },
        namespace: 'TemplateOrderConfirmation',
    });

    return orderConfirmationTemplate(data, t);
}


















/**
import { DEFAULT_LANGUAGE } from "@/lib/constants";
import { formatDate, formatPrice } from "@/lib/utils";
import { createTranslator } from 'next-intl';

const orderConfirmationTemplate = (data: any, t: any) => `
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
        ${t('orderReceipt')}
      </h2>

      <div class="info-container">
        <!-- Cliente -->
        <div class="info-section">
          <h3 class="section-title">${t('sections.customer')}</h3>
          <p><strong>${t('fields.name')}:</strong> ${data.customerName}</p>
          <p><strong>${t('fields.email')}:</strong> ${data.customerEmail}</p>
          ${data.customerPhone ? `<p><strong>${t('fields.phone')}:</strong> ${data.customerPhone}</p>` : ''}
        </div>

        <!-- Entrega -->
        <div class="info-section">
          <h3 class="section-title">${t('sections.delivery')}</h3>
          ${data.delivery === 'delivery' ? `
            <p><strong>${t('fields.carrier')}:</strong> ${data.carrierName}</p>
            <p><strong>${t('fields.address')}:</strong><br>
              ${data.shippingStreet}, ${data.shippingNumber}<br>
              ${data.shippingComplement ? data.shippingComplement + '<br>' : ''}
              ${data.shippingNeighborhood}<br>
              ${data.shippingCity}/${data.shippingState}<br>
              ${t('fields.zip')}: ${data.shippingZip}
            </p>
          ` : `<p><strong>${t('fields.pickup')}</strong></p>`}
        </div>

        <!-- Pedido -->
        <div class="info-section">
          <h3 class="section-title">${t('sections.order')}</h3>
          <p><strong>${t('fields.number')}:</strong> #${data.orderId}</p>
          <p><strong>${t('fields.date')}:</strong> ${formatDate(data.orderDate as string, data.language)}</p>
          <p class="captalize"><strong>${t('fields.status')}:</strong> ${data.orderStatus || t('status.pending')}</p>
          <p class="captalize"><strong>${t('fields.payment')}:</strong> ${data.paymentMethod}</p>
        </div>
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

      <!-- Dados bancários (só para transferência) -->
        ${data.bankInfo ? `
            <div style="margin-bottom:16px; padding:10px; background:#fff8e1; border-radius:4px; border:1px solid #ffe082;">
                <h3 class="section-title">${t('sections.bankInfo')}</h3>
                <p>${t('bankInfo.instruction')}</p>
                <p style="white-space: pre-wrap; font-family: monospace; padding:8px; background:#fff; border-radius:4px; border:1px solid #eee;">${data.bankInfo}</p>
                <p><strong>${t('bankInfo.totalToPay')}:</strong> ${formatPrice(data.totalValue, data.language, data.currency)}</p>
            </div>
        ` : ''}

    
    <!-- Dados do pix -->
        ${data.pixInfo ? `
        <div style="margin-bottom:16px; padding:12px; background:#f0fdf4; border-radius:4px; border:1px solid #bbf7d0;">
            <h3 class="section-title">${t('sections.pixInfo')}</h3>
            <p style="margin-bottom:12px;">${t('pixInfo.instruction')}</p>

    ${data.pixInfo.qrCodeBase64 ? `
      <div style="text-align:center; margin:12px 0;">
        <img
          src="data:image/png;base64,${data.pixInfo.qrCodeBase64}"
          alt="${t('pixInfo.qrCodeAlt')}"
          width="180"
          height="180"
          style="display:inline-block; border:1px solid #eee; border-radius:4px; padding:6px; background:#fff;"
        />
      </div>
    ` : ''}

    ${data.pixInfo.copyPaste ? `
      <p style="margin-bottom:4px;"><strong>${t('pixInfo.copyPasteLabel')}:</strong></p>
      <p style="
        white-space: pre-wrap;
        word-break: break-all;
        font-family: monospace;
        font-size: 10px;
        line-height: 1.4;
        padding:8px;
        background:#fff;
        border-radius:4px;
        border:1px solid #eee;
        margin:0 0 12px 0;
      ">${data.pixInfo.copyPaste}</p>
    ` : ''}

    <table style="width:100%; margin-bottom:8px;">
      <tr>
        <td style="border:none; padding:2px 0;"><strong>${t('pixInfo.keyLabel')}:</strong></td>
        <td style="border:none; padding:2px 0; text-align:right; font-family:monospace; font-size:11px; word-break:break-all;">${data.pixInfo.pixKey}</td>
      </tr>
      <tr>
        <td style="border:none; padding:2px 0;"><strong>${t('pixInfo.holderLabel')}:</strong></td>
        <td style="border:none; padding:2px 0; text-align:right;">${data.pixInfo.merchantName}</td>
      </tr>
      <tr>
        <td style="border:none; padding:2px 0;"><strong>${t('pixInfo.txidLabel')}:</strong></td>
        <td style="border:none; padding:2px 0; text-align:right; font-family:monospace; font-size:11px;">${data.pixInfo.txid}</td>
      </tr>
      <tr>
        <td style="border:none; padding:6px 0 0 0; border-top:1px solid #bbf7d0;"><strong>${t('pixInfo.totalToPay')}:</strong></td>
        <td style="border:none; padding:6px 0 0 0; border-top:1px solid #bbf7d0; text-align:right; font-weight:bold;">${formatPrice(data.totalValue, data.language, data.currency)}</td>
      </tr>
    </table>

    ${data.pixInfo.expiresAt ? `
      <p style="margin:8px 0 0 0; color:#b45309; font-size:11px;">
        <strong>${t('pixInfo.expiresAt')}:</strong> ${formatDate(data.pixInfo.expiresAt, data.language)}
      </p>
    ` : ''}
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

export async function renderOrderConfirmationTemplate(data: any) {
    const locale = data.language ?? DEFAULT_LANGUAGE;
    const messages = (await import(`../../../../messages/templates/${locale}.json`)).default;

    const t = createTranslator({
        locale,
        messages: {
            ...messages,
            TemplateOrderConfirmation: {
                ...messages.TemplateOrderCommon,
                ...messages.TemplateOrderConfirmation,
                sections: {
                    ...messages.TemplateOrderCommon?.sections,
                    ...messages.TemplateOrderConfirmation?.sections,
                },
                bankInfo: {
                    ...messages.TemplateOrderCommon?.bankInfo,
                    ...messages.TemplateOrderConfirmation?.bankInfo,
                },
                fields: {
                    ...messages.TemplateOrderCommon?.fields,
                    ...messages.TemplateOrderConfirmation?.fields,
                },
                status: {
                    ...messages.TemplateOrderCommon?.status,
                    ...messages.TemplateOrderConfirmation?.status,
                },
                table: {
                    ...messages.TemplateOrderCommon?.table,
                    ...messages.TemplateOrderConfirmation?.table,
                },
                totals: {
                    ...messages.TemplateOrderCommon?.totals,
                    ...messages.TemplateOrderConfirmation?.totals,
                },
                footer: {
                    ...messages.TemplateOrderCommon?.footer,
                    ...messages.TemplateOrderConfirmation?.footer,
                },
            },
        },
        namespace: 'TemplateOrderConfirmation',
    });

    return orderConfirmationTemplate(data, t);
}

*/
