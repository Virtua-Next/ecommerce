'use client';
import { formatPrice, formatDate } from '@/lib/utils';
import { IOrderDetails } from '@/lib/schemas/order';
import type { SupportedLanguage, SupportedCurrency } from '@/lib/types/generic';
import { useTranslations } from 'next-intl';
import { DEFAULT_CURRENCY, DEFAULT_LANGUAGE } from '@/lib/constants';


interface OrderReceiptProps {
    order: IOrderDetails;
    config: any;
    locale?: SupportedLanguage;
    currency?: SupportedCurrency;
}

export default function OrderReceipt({ order, config, locale = DEFAULT_LANGUAGE, currency = DEFAULT_CURRENCY }: OrderReceiptProps) {
    const t = useTranslations('OrderAdmin');
    const tStatus = useTranslations('OrderStatus');

    if (!order) return null;

    const baseFont = 'Arial, sans-serif';
    const smallFontSize = '12px';

    const headingStyle: React.CSSProperties = { fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' };
    const labelStyle: React.CSSProperties = { fontWeight: 'bold' };
    const tableHeaderStyle: React.CSSProperties = { borderBottom: '1px solid #000', padding: '4px 0', fontSize: smallFontSize, textAlign: 'left' };
    const tableCellStyle: React.CSSProperties = { padding: '4px 0', fontSize: smallFontSize };

    return (
        <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto', fontFamily: baseFont, fontSize: smallFontSize, color: '#333' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '12px', borderBottom: '1px solid #ccc', paddingBottom: '8px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 4px' }}>
                    {config?.site_name}
                </h1>
                {config?.domain ? <p style={{ margin: '2px 0' }}>{config.domain}</p> : null}
                {config?.contact_phone ? <p style={{ margin: '2px 0' }}>{config.contact_phone}</p> : null}
            </div>

            <h2 style={{ textAlign: 'center', fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>{t('receipt.title')}</h2>

            {/* Grouped informations */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', gap: '24px' }}>
                {/* Customer */}
                <div style={{ flex: 1 }}>
                    <h3 style={headingStyle}>{t('receipt.sections.customer')}</h3>
                    <p><span style={labelStyle}>{t('receipt.fields.name')}: </span>{order.customer?.name}</p>
                    <p><span style={labelStyle}>{t('receipt.fields.email')}: </span>{order.customer?.email}</p>
                    {order.customer?.phone ? (
                        <p><span style={labelStyle}>{t('receipt.fields.phone')}: </span>{order.customer.phone}</p>
                    ) : null}
                </div>

                {/* Shipping */}
                <div style={{ flex: 1 }}>
                    <h3 style={headingStyle}>{t('receipt.sections.delivery')}</h3>
                    {order.delivery_option === 'delivery' ? (
                        <>
                            {order.carrier_name ? (
                                <p><span style={labelStyle}>{t('receipt.fields.carrier')}: </span>{order.shipping_carrier_name}</p>
                            ) : null}
                            {order.address ? (
                                <p>
                                    <span style={labelStyle}>{t('receipt.fields.address')}: </span>
                                    {order.address.street}, {order.address.address_number}
                                    {order.address.complement ? `, ${order.address.complement}` : ''}<br />
                                    {order.address.neighborhood ? `${order.address.neighborhood}, ` : ''}
                                    {order.address.city}/{order.address.address_state} - {order.address.zip}
                                </p>
                            ) : null}
                        </>
                    ) : (
                        <p><span style={labelStyle}>{t('receipt.pickup')}</span></p>
                    )}
                </div>

                {/* Order */}
                <div style={{ flex: 1 }}>
                    <h3 style={headingStyle}>{t('receipt.sections.order')}</h3>
                    <p><span style={labelStyle}>{t('receipt.fields.orderNumber')}: </span>#{order.id}</p>
                    <p><span style={labelStyle}>{t('receipt.fields.date')}: </span>{formatDate(order.order_date as string, locale)}</p>
                    <p><span style={labelStyle}>{t('receipt.fields.status')}: </span>{tStatus(order.order_status)}</p>
                    <p><span style={labelStyle}>{t('receipt.fields.payment')}: </span>{t(`paymentMethods.${order.payment_method}` as any)}</p>
                </div>
            </div>

            {/* Items */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
                <thead>
                    <tr>
                        <th style={tableHeaderStyle}>{t('items.sku')}</th>
                        <th style={tableHeaderStyle}>{t('items.product')}</th>
                        <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>{t('receipt.fields.price')}</th>
                        <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>{t('items.quantity')}</th>
                        <th style={{ ...tableHeaderStyle, textAlign: 'right' }}>{t('items.total')}</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items?.map((item, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={tableCellStyle}>{item.product_sku ?? '-'}</td>
                            <td style={tableCellStyle}>{item.product_name}</td>
                            <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                                {formatPrice(item.price, locale, currency)}
                            </td>
                            <td style={{ ...tableCellStyle, textAlign: 'right' }}>{item.quantity}</td>
                            <td style={{ ...tableCellStyle, textAlign: 'right' }}>
                                {formatPrice(item.price * item.quantity, locale, currency)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div style={{ textAlign: 'right', marginBottom: '12px' }}>
                <p>
                    <span style={labelStyle}>{t('totals.subtotal')}</span>{' '}
                    {formatPrice(order.products_value, locale, currency)}
                </p>

                {(order.shipping_value ?? 0) > 0 ? (
                    <p>
                        <span style={labelStyle}>{t('totals.shipping')}</span>{' '}
                        {formatPrice(order.shipping_value ?? 0, locale, currency)}
                    </p>
                ) : null}

                {(order.interest ?? 0) > 0 ? (
                    <p>
                        <span style={labelStyle}>{t('totals.interest')}</span>{' '}
                        {formatPrice(order.interest ?? 0, locale, currency)}
                    </p>
                ) : null}

                {order.installments > 1 ? (
                    <p>
                        <span style={labelStyle}>{t('totals.installments')}</span>{' '}
                        {t('totals.installmentFormat', {
                            count: order.installments,
                            value: formatPrice(order.total_value / order.installments, locale, currency),
                        })}
                    </p>
                ) : null}

                <p style={{ fontWeight: 'bold', fontSize: '14px', marginTop: '6px' }}>
                    {t('totals.total')} {formatPrice(order.total_value, locale, currency)}
                </p>
            </div>

            {/* Observations */}
            {order.observations ? (
                <div style={{ marginBottom: '12px' }}>
                    <h3 style={headingStyle}>{t('fields.observations')}</h3>
                    <p>{order.observations}</p>
                </div>
            ) : null}

            {/* Footer */}
            <div style={{ textAlign: 'center', fontSize: '11px', color: '#888', borderTop: '1px solid #ccc', paddingTop: '12px' }}>
                <p>{t('receipt.footer.thanks')}</p>
                <p>{new Date().getFullYear()} © {config?.site_name || t('receipt.footer.fallbackSiteName')}</p>
            </div>
        </div>
    );
}
