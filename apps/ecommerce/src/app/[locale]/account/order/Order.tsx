'use client'
import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl';
import { formatDate, formatPrice } from '@/lib/utils'
import { IOrderDetails } from '@/lib/schemas/order'
import { Link } from '@/i18n/navigation'
import { useConfig } from '@/context/ConfigContext';
import { Button } from '@/components/ui/button';


interface OrderListProps {
    initialOrders: IOrderDetails[];
}

export default function OrderList({ initialOrders }: OrderListProps) {
    const { config, loading } = useConfig();
    const t = useTranslations('AccountOrder');
    const tStatus = useTranslations('OrderStatus');
    const locale = useLocale();
    const [showModal, setShowModal] = useState(false)
    const [orderDetail, setOrderDetail] = useState<IOrderDetails | null>(null)


    const openDetailModal = (order: IOrderDetails) => {
        setOrderDetail(order)
        setShowModal(true)
    }

    const getStatusClasses = (status: string) => {
        const baseClasses = "text-xs font-medium py-1 px-3 rounded-full whitespace-nowrap"

        switch (status) {
            case 'pending': return `${baseClasses} bg-amber-100  text-amber-800  border border-amber-200`;
            case 'confirmed': return `${baseClasses} bg-blue-100   text-blue-800   border border-blue-200`;
            case 'processing': return `${baseClasses} bg-violet-100 text-violet-800 border border-violet-200`;
            case 'shipped': return `${baseClasses} bg-teal-100   text-teal-800   border border-teal-200`;
            case 'delivered': return `${baseClasses} bg-emerald-100 text-emerald-800 border border-emerald-200`;
            case 'archived': return `${baseClasses} bg-gray-100   text-gray-500   border border-gray-200 opacity-60`;
            default: return `${baseClasses} bg-red-100    text-red-800    border border-red-200`;
        }
    }

    const statusLabel = (status: string) => {
        return tStatus.has(status) ? tStatus(status) : status;
    }

    if (loading) {
        return (
            <div className="text-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4">{t('loading')}</p>
            </div>
        )
    }
    
    if (initialOrders.length === 0) {
        return <div className="text-center py-10">
            <div className="max-w-md mx-auto p-6 bg-card border border-border rounded-lg shadow-sm">
                <p className="text-lg mb-4">{t('empty')}</p>
                <Link prefetch={false} href="/">
                    <Button variant={'theme'} size={'default'}>
                        {t('backToStore')}
                    </Button>
                </Link>
            </div>
        </div>
    }

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
            <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border">
                    <h1 className="text-2xl font-bold">{t('title')}</h1>
                    <p className="text-muted-foreground mt-1">
                        {t('subtitle')}
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-card">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('table.orderNumber')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('table.date')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('table.status')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">{t('table.total')}</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">{t('table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {initialOrders.map((order) => (
                                <tr key={order.id} className="hover:bg-hover/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">#{order.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(order.order_date, locale)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><span className={getStatusClasses(order.order_status as string)}>{statusLabel(order.order_status as string)}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{formatPrice(order.total_value, locale, config?.currency)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"><button onClick={() => openDetailModal(order)} className="text-primary hover:text-primary/80 transition-colors">{t('table.viewDetails')}</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {showModal && orderDetail && (
                    <div className="fixed inset-0 bg-bg bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <h3 className="text-sm font-medium mb-1">{t('detail.customer')}</h3>
                                        <p className="p-2 bg-gray-50 dark:bg-gray-700 rounded">{orderDetail.customer.name}</p>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-medium mb-1">{t('detail.email')}</h3>
                                        <p className="p-2 bg-gray-50 dark:bg-gray-700 rounded">{orderDetail.customer.email}</p>
                                    </div>

                                    {orderDetail.customer.phone ? (
                                        <div>
                                            <h3 className="text-sm font-medium mb-1">{t('detail.phone')}</h3>
                                            <p className="p-2 bg-gray-50 dark:bg-gray-700 rounded">{orderDetail.customer.phone ?? t('detail.notProvided')}</p>
                                        </div>
                                    ) : null}

                                    <div>
                                        <h3 className="text-sm font-medium mb-1">{t('detail.orderDate')}</h3>
                                        <p className="p-2 bg-gray-50 dark:bg-gray-700 rounded">{new Date(orderDetail.order_date).toLocaleString(locale)}</p>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-medium mb-1">{t('detail.paymentMethod')}</h3>
                                        <p className="p-2 bg-gray-50 dark:bg-gray-700 rounded">{orderDetail.payment_method}</p>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-medium mb-1">{t('detail.status')}</h3>
                                        <p className="p-2 bg-gray-50 dark:bg-gray-700 rounded"><span className={getStatusClasses(orderDetail.order_status as string)}>{statusLabel(orderDetail.order_status as string)}</span></p>
                                    </div>

                                    {orderDetail.delivery_option === 'delivery' ? (
                                        <>
                                            <div>
                                                <h3 className="text-sm font-medium mb-1">{t('detail.carrier')}</h3>
                                                <p className="p-2 bg-gray-50 dark:bg-gray-700 rounded">{orderDetail.shipping_carrier_name ?? t('detail.pickup')}</p>
                                            </div>

                                            <div>
                                                <h3 className="text-sm font-medium mb-1">{t('detail.shippingCost')}</h3>
                                                <p className="p-2 bg-gray-50 dark:bg-gray-700 rounded">{formatPrice(orderDetail.shipping_value ?? 0, locale, config?.currency)}</p>
                                            </div>

                                            <div className="md:col-span-2">
                                                <h3 className="text-sm font-medium mb-1">{t('detail.deliveryAddress')}</h3>
                                                <p className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                                    {t('detail.zipLabel')} {orderDetail.address?.zip} - {orderDetail.address?.street} {orderDetail.address?.address_number}, {orderDetail.address?.neighborhood}
                                                    {orderDetail.address?.complement && `, ${orderDetail.address.complement}`}
                                                    <br />
                                                    {orderDetail.address?.city}/{orderDetail.address?.address_state}
                                                </p>
                                            </div>
                                            {orderDetail.tracking ? (
                                                <div className="md:col-span-2">
                                                    <h3 className="text-sm font-medium mb-1">{t('detail.trackingCode')}</h3>
                                                    <p className="p-2 bg-gray-50 dark:bg-gray-700 rounded">{orderDetail.tracking}</p>
                                                </div>
                                            ) : null}
                                        </>

                                    ) : (
                                        <div className="md:col-span-2">
                                            <h3 className="text-sm font-medium mb-1">{t('detail.deliveryType')}</h3>
                                            <p className="p-2 bg-gray-50 dark:bg-gray-700 rounded">{t('detail.pickup')}</p>
                                        </div>
                                    )}

                                </div>

                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold mb-2">{t('detail.items')}</h3>
                                    <div className="border dark:border-gray-500 rounded overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-500">
                                            <thead className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">{t('detail.product')}</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">{t('detail.qty')}</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">{t('detail.unitPrice')}</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">{t('detail.total')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-500">
                                                {orderDetail.items?.map((item, index) => (
                                                    <tr key={index}>
                                                        <td className="px-4 py-2">
                                                            <div className="font-medium">{item.product_name}</div>
                                                            <div className="text-sm text-muted-foreground">{t('detail.code')}: {item.product_sku}</div>
                                                        </td>
                                                        <td className="px-4 py-2">{item.quantity}</td>
                                                        <td className="px-4 py-2">{formatPrice(item.price, locale, config?.currency)}</td>
                                                        <td className="px-4 py-2 font-medium">{formatPrice(item.price * item.quantity, locale, config?.currency)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-gray-50 dark:bg-gray-700">
                                                <tr>
                                                    <td colSpan={3} className="px-4 py-2 text-right font-medium">{t('detail.subtotal')}</td>
                                                    <td className="px-4 py-2 font-medium">{formatPrice(orderDetail.products_value as number, locale, config?.currency)}</td>
                                                </tr>

                                                {orderDetail.shipping_value && orderDetail.shipping_value > 0 ? (
                                                    <tr>
                                                        <td colSpan={3} className="px-4 py-2 text-right font-medium">{t('detail.shipping')}</td>
                                                        <td className="px-4 py-2 font-medium">{formatPrice(orderDetail.shipping_value, locale, config?.currency)}</td>
                                                    </tr>
                                                ) : null}

                                                {orderDetail.installments && orderDetail.installments > 1 ? (
                                                    <tr>
                                                        <td colSpan={3} className="px-4 py-2 text-right font-medium">{t('detail.installments')}</td>
                                                        <td className="px-4 py-2 font-medium">{t('detail.installmentsValue', { count: orderDetail.installments, value: formatPrice(orderDetail.total_value / orderDetail.installments, locale, config?.currency) })}</td>
                                                    </tr>
                                                ) : null}

                                                {orderDetail.discount_value && orderDetail.discount_value > 1 ? (
                                                    <tr>
                                                        <td colSpan={3} className="px-4 py-2 text-right font-medium">{t('detail.discount')}</td>
                                                        <td className="px-4 py-2 font-medium">{formatPrice(orderDetail.discount_value, locale, config?.currency)}</td>
                                                    </tr>
                                                ) : null}

                                                <tr>
                                                    <td colSpan={3} className="px-4 py-2 text-right font-medium">{t('detail.total')}</td>
                                                    <td className="px-4 py-2 font-bold">{formatPrice(orderDetail.total_value, locale, config?.currency)}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>

                                {orderDetail.interest ? (
                                    <div className="mb-6">
                                        <h3 className="text-lg font-semibold mb-2">{t('detail.notes')}</h3>
                                        <p className="p-3 bg-gray-50 dark:bg-gray-700 rounded">{orderDetail.interest}</p>
                                    </div>
                                ) : null}

                                <div className="flex justify-end">
                                    <Button variant={'theme'} size={'default'} onClick={() => setShowModal(false)} className="px-4 py-2 bg-button hover:bg-buttonHover border border-border text-white rounded">{t('detail.close')}</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
