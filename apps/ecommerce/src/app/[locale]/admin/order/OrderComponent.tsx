'use client';
import { useConfig } from '@/context/ConfigContext';
import OrderReceipt from './OrderReceipt';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FaPencilAlt, FaPrint, FaEllipsisV, FaSave } from 'react-icons/fa';
import TableBuilder from '@/components/TableBuilder/TableBuilder';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import AdminSearch from '@/components/Features/admin-search';
import { useTranslations, useLocale } from 'next-intl';
import { useToast } from '@/components/ToastSystem';
import { useRouter } from '@/i18n/navigation';
import { IOrderDetails } from '@/lib/schemas/order';
import { apiFetch, extractData, formatPrice, resolveApiErrorKey } from '@/lib/utils';
import { OrderStatus, SupportedLanguage } from '@/lib/types/generic';
import Pagination from '@/components/Pagination/Pagination';
import { ORDER_STATUSES, ADMIN_PAGINATION_DEFAULT } from '@/lib/constants';
import { STATUS_TO_EMAIL } from '@/lib/email/order-emails';
import { Button } from '@/components/ui/button';
import { loginHref } from '@/i18n/routing';


function OrderComponent() {
    const t = useTranslations('OrderAdmin');
    const tCommon = useTranslations('AdminCatalog');
    const tErrors = useTranslations('Errors');
    const { config, loading } = useConfig();
    const locale = useLocale() as SupportedLanguage;
    const { showAlert } = useToast();
    const router = useRouter();
    const { searchTerm } = useGlobalSearch();
    const [menuOpenedId, setMenuOpenedId] = useState<number | null>(null);
    const [saveLoading, setSaveLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [orders, setOrders] = useState<IOrderDetails[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [orderEditing, setOrderEditing] = useState<IOrderDetails | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [limit, setLimit] = useState<number>(ADMIN_PAGINATION_DEFAULT);
    const receiptRef = useRef<HTMLDivElement>(null);
    const [orderToPrint, setOrderToPrint] = useState<IOrderDetails | null>(null);
    const isMountedRef = useRef(true);
    const abortControllerRef = useRef<AbortController | null>(null);

    const loadData = useCallback(async (pageNum: number, limitNum: number, status: string) => {
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            setLoadingData(true);
            const data = await apiFetch(`/api/admin/order?status=${status}&locale=${locale}&page=${pageNum}&limit=${limitNum}`, { method: 'GET', signal: abortController.signal });
            const result = extractData(data, 'object') as {
                orders: IOrderDetails[];
                total: number;
                page: number;
                limit: number;
                totalPages: number;
            };

            if (isMountedRef.current) {
                setOrders(result.orders || []);
                setTotal(result.total || 0);
                setTotalPages(result.totalPages || 1);
                setPage(result.page || 1);
                setLimit(result.limit || ADMIN_PAGINATION_DEFAULT);
            }
        } catch (err: any) {
            if (err.name === 'AbortError' || !isMountedRef.current) return;

            const status = err.status || 500;
            const key = resolveApiErrorKey(err.code);
            const message = key ? tErrors(key) : err.message;

            if (status === 401 || status === 403) {
                showAlert('danger', message, () => {
                    router.push(loginHref('/admin/order'));
                });
                return;
            }
            showAlert(status === 400 || status === 404 ? 'warning' : 'danger', message);
        } finally {
            if (isMountedRef.current) setLoadingData(false);
        }

    }, [locale, showAlert, tErrors, router]);

    useEffect(() => {
        isMountedRef.current = true;
        if (!loading) loadData(page, limit, statusFilter);

        return () => {
            isMountedRef.current = false;
            abortControllerRef.current?.abort();
        };
    }, [loading, page, limit, statusFilter, loadData]);

    const goToPage = useCallback((newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
            setPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [page, totalPages]);

    const handleLimitChange = useCallback((newLimit: number) => {
        setLimit(newLimit);
        setPage(1);
    }, []);

    const handleStatusChange = useCallback((newStatus: string) => {
        setStatusFilter(newStatus);
        setPage(1);
    }, []);

    const openEditModal = useCallback((order: IOrderDetails) => {
        setOrderEditing({ ...order });
        setShowModal(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleSalvarPedido = useCallback(async () => {
        if (!orderEditing) return;
        setSaveLoading(true);

        try {
            await apiFetch(`/api/admin/order/${orderEditing.id}?locale=${locale}`, {
                method: 'PUT',
                body: JSON.stringify({
                    order_status: orderEditing.order_status,
                    tracking: orderEditing.tracking,
                    observations: orderEditing.observations,
                }),
            });

            if (isMountedRef.current) {
                setOrders(prev => prev.map(o => o.id === orderEditing.id ? orderEditing : o));
                setShowModal(false);
                setOrderEditing(null);
                showAlert('success', t('alerts.saveSuccess'));
                setPage(1);
            }
        } catch (err: any) {
            if (!isMountedRef.current) return;

            const status = err.status || 500;
            const key = resolveApiErrorKey(err.code);
            const message = key ? tErrors(key) : err.message;

            if (status === 401 || status === 403) {
                showAlert('danger', message, () => {
                    router.push(loginHref('/admin/order'));
                });
                return;
            }
            showAlert(status === 400 || status === 404 ? 'warning' : 'danger', message);
        } finally {
            if (isMountedRef.current) setSaveLoading(false);
        }
    }, [orderEditing, showAlert, t, tErrors, router]);

    const filteredOrders = useMemo(() => {
        if (!searchTerm) return orders;
        const term = searchTerm.toLowerCase();

        return orders.filter(order => {
            return (
                order.id?.toString().includes(term) ||
                order.customer?.email?.toLowerCase().includes(term) ||
                order.customer?.name?.toLowerCase().includes(term)
            );
        });
    }, [orders, searchTerm]);

    const handlePrint = useCallback(() => {
        if (!receiptRef.current) return;
        const content = receiptRef.current.innerHTML;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) return;

        doc.open();

        const pdfTitle = `${t('receipt.title')} #${orderToPrint?.id}`;
        doc.writeln(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>${pdfTitle}</title>
                    <style>
                        @page { size: auto; margin: 10mm; }
                        body {
                            font-family: Arial, sans-serif;
                            font-size: 12px;
                            color: #333;
                            padding: 20px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                        }
                        th, td {
                            padding: 4px;
                            text-align: left;
                            border-bottom: 1px solid #ddd;
                        }
                        .text-right { text-align: right; }
                    </style>
                </head>
                <body>
                    ${content}
                </body>
            </html>
        `);
        doc.close();

        const originalTitle = document.title;
        document.title = `Order-#${orderToPrint?.id}`;
        setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            document.title = originalTitle;
            document.body.removeChild(iframe);

        }, 300);
    }, [orderToPrint]);

    useEffect(() => {
        if (orderToPrint?.id && receiptRef.current) {
            const timer = setTimeout(() => handlePrint(), 300);
            return () => clearTimeout(timer);
        }
    }, [orderToPrint, handlePrint]);

    const columns = useMemo(() => [
        { key: 'id', header: 'ID' },
        {
            key: 'email',
            header: t('fields.email'),
            render: (_: any, row: IOrderDetails) => row.customer.email,
        },
        {
            key: 'order_date',
            header: t('fields.date'),
            render: (_: any, row: IOrderDetails) => new Date(row.order_date).toLocaleString(locale),
        },
        {
            key: 'payment_method',
            header: t('fields.paymentMethod'),
            render: (_: any, row: IOrderDetails) => t(`paymentMethods.${row.payment_method}` as any),
        },
        {
            key: 'shipping_carrier_name',
            header: t('fields.carrier'),
            render: (_: any, row: IOrderDetails) => row.shipping_carrier_name || t('pickup'),
        },
        {
            key: 'shipping_service',
            header: t('fields.service'),
            render: (_: any, row: IOrderDetails) => row.shipping_service || t('pickup'),
        },
        {
            key: 'total_value',
            header: t('fields.total'),
            render: (_: any, row: IOrderDetails) => formatPrice(row.total_value, locale, config?.currency),
        },
        {
            key: 'order_status',
            header: t('fields.status'),
            render: (_: any, row: IOrderDetails) => (
                <span className={getStatusClasses(row.order_status)}>
                    {tStatus(row.order_status)}
                </span>
            ),
        },
        {
            key: 'actions',
            header: tCommon('actions'),
            className: 'text-right',
            render: (_: any, row: IOrderDetails) => (
                <div className="relative">
                    <button className="text-gray-600 hover:text-gray-800">
                        <FaEllipsisV
                            className="h-5 w-5"
                            onClick={() => setMenuOpenedId(prev => (prev === row.id ? null : row.id))}
                        />
                    </button>
                    {menuOpenedId === row.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md border border-gray-200 z-50" >
                            <div className="py-1">
                                <button onClick={() => { setOrderToPrint({ ...row }); setMenuOpenedId(null); }} className="text-purple-600 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100">
                                    <FaPrint className="inline h-4 w-4 mr-2" />
                                    {t('actions.print')}
                                </button>
                                <button onClick={() => { openEditModal(row); setMenuOpenedId(null); }} className="text-blue-600 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100">
                                    <FaPencilAlt className="inline h-4 w-4 mr-2" />
                                    {t('actions.edit')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ),
        },
    ], [openEditModal, menuOpenedId, locale, config, t, tCommon]);

    const tStatus = useTranslations('OrderStatus');

    const getStatusClasses = (status: string) => {
        const base = 'text-xs font-medium py-1 px-3 rounded-full whitespace-nowrap';
        switch (status) {
            case 'pending': return `${base} bg-amber-100  text-amber-800  border border-amber-200`;
            case 'confirmed': return `${base} bg-blue-100   text-blue-800   border border-blue-200`;
            case 'processing': return `${base} bg-violet-100 text-violet-800 border border-violet-200`;
            case 'shipped': return `${base} bg-teal-100   text-teal-800   border border-teal-200`;
            case 'delivered': return `${base} bg-emerald-100 text-emerald-800 border border-emerald-200`;
            case 'archived': return `${base} bg-gray-100   text-gray-500   border border-gray-200 opacity-60`;
            default: return `${base} bg-red-100    text-red-800    border border-red-200`;
        }
    };

    if (loading || loadingData) return <div>{tCommon('loading')}</div>;

    return (
        <div className="max-w-[100vw]">
            <div className="block lg:hidden max-w-fit p-3">
                <AdminSearch />
            </div>

            <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                <div className="ml-4">
                    <select className="block w-fit text-sm pl-3 pr-10 py-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-md" value={statusFilter} onChange={(e) => handleStatusChange(e.target.value)}>
                        <option key='all' value='all'>{tStatus('all')}</option>
                        {ORDER_STATUSES.map((item) => (
                            <option key={item} value={item}>
                                {tStatus(item)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold">{t('pageTitle')}</h1>
            </div>

            <div className="max-w-screen">
                <TableBuilder data={filteredOrders} columns={columns} emptyMessage={t('noEntities')} />

                <Pagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={limit} onPageChange={goToPage} onItemsPerPageChange={handleLimitChange} itemsPerPageOptions={[20, 50, 100]} showItemsPerPage={true} showTotalItems={true} />
            </div>

            {showModal && orderEditing && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-6xl max-h-[calc(100vh-4rem)] overflow-y-auto">
                        <h2 className="text-xl text-center font-bold mb-4">
                            {t('modal.title', { id: orderEditing.id })}
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('fields.customer')}</label>
                                <div className="w-full p-2 border rounded">{orderEditing.customer.name}</div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('fields.email')}</label>
                                <div className="w-full p-2 border rounded">{orderEditing.customer.email}</div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('fields.phone')}</label>
                                <div className="w-full p-2 border rounded">{orderEditing.customer.phone}</div>
                            </div>

                            {orderEditing.delivery_option === 'delivery' && orderEditing.address && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('fields.carrier')}</label>
                                        <div className="w-full p-2 border rounded">
                                            <p>{orderEditing.shipping_carrier_name}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">{t('fields.address')}</label>
                                        <div className="w-full p-2 border rounded">
                                            <p>
                                                {orderEditing.address.zip} - {orderEditing.address.street} {orderEditing.address.address_number}, {orderEditing.address.neighborhood}
                                                <br />
                                                {orderEditing.address.city}/{orderEditing.address.address_state}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('fields.date')}</label>
                                <div className="w-full p-2 border rounded">
                                    {new Date(orderEditing.order_date).toLocaleString(locale)}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('fields.paymentMethod')}</label>
                                <div className="w-full p-2 border rounded">
                                    {t(`paymentMethods.${orderEditing.payment_method}` as any)}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('fields.status')}</label>
                                <select className="w-full p-2 border rounded" value={orderEditing.order_status} onChange={(e) => setOrderEditing({ ...orderEditing, order_status: e.target.value as OrderStatus })}>
                                    {ORDER_STATUSES.map((item) => (
                                        <option key={item} value={item}>
                                            {tStatus(item)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{t('fields.tracking')}</label>
                                <input type="text" className="w-full p-2 border rounded" value={orderEditing.tracking || ''} onChange={(e) => setOrderEditing({ ...orderEditing, tracking: e.target.value })} />
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-2">{t('items.title')}</h3>
                            <div className="border rounded overflow-hidden dark:border-gray-700">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium uppercase">{t('items.sku')}</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium uppercase">{t('items.product')}</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium uppercase">{t('items.quantity')}</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium uppercase">{t('items.costPrice')}</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium uppercase">{t('items.salePrice')}</th>
                                            <th className="px-4 py-2 text-left text-xs font-medium uppercase">{t('items.total')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {orderEditing.items?.map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-2">{item.product_sku}</td>
                                                <td className="px-4 py-2">{item.product_name}</td>
                                                <td className="px-4 py-2">{item.quantity}</td>
                                                <td className="px-4 py-2">{formatPrice(item.cost_price, locale, config?.currency)}</td>
                                                <td className="px-4 py-2">{formatPrice(item.price, locale, config?.currency)}</td>
                                                <td className="px-4 py-2">{formatPrice(item.price * item.quantity, locale, config?.currency)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <td colSpan={5} className="px-4 py-2 text-right font-medium">{t('totals.subtotal')}</td>
                                            <td className="px-4 py-2 font-medium">
                                                {formatPrice(orderEditing.products_value, locale, config?.currency)}
                                            </td>
                                        </tr>

                                        {orderEditing && (orderEditing.shipping_value ?? 0) > 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-2 text-right font-medium">{t('totals.shipping')}</td>
                                                <td className="px-4 py-2 font-medium">
                                                    {formatPrice(orderEditing.shipping_value || 0, locale, config?.currency)}
                                                </td>
                                            </tr>
                                        ) : null}

                                        {orderEditing && orderEditing?.installments > 1 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-2 text-right font-medium">{t('totals.interest')}</td>
                                                <td className="px-4 py-2 font-medium">
                                                    {formatPrice(orderEditing.interest || 0, locale, config?.currency)}
                                                </td>
                                            </tr>
                                        ) : null}

                                        {orderEditing && orderEditing?.installments > 1 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-2 text-right font-medium">{t('totals.installments')}</td>
                                                <td className="px-4 py-2 font-medium">
                                                    {t('totals.installmentFormat', {
                                                        count: orderEditing.installments,
                                                        value: formatPrice(orderEditing.total_value / orderEditing.installments, locale, config?.currency),
                                                    })}
                                                </td>
                                            </tr>
                                        ) : null}

                                        <tr>
                                            <td colSpan={5} className="px-4 py-2 text-right font-medium">{t('totals.total')}</td>
                                            <td className="px-4 py-2 font-bold">
                                                {formatPrice(orderEditing.total_value, locale, config?.currency)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-2">{t('fields.observations')}</h3>
                            <p className="text-sm text-gray-500 mt-2">{t('observationsEmailNotice')}</p>
                            <textarea className="w-full p-2 border rounded" rows={3} value={orderEditing.observations || ''} onChange={(e) => setOrderEditing({ ...orderEditing, observations: e.target.value })} />
                            <p className="text-sm text-amber-600 mt-1">
                                <span>{t('statusEmailNotice')} </span>{Object.keys(STATUS_TO_EMAIL).map((status) => tStatus(status)).join(', ')}
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant={'outline'} size={'default'} onClick={() => setShowModal(false)}>{tCommon('cancel')}</Button>
                            <Button variant={'theme'} size={'default'} onClick={handleSalvarPedido} disabled={saveLoading}>
                                <FaSave className="h-4 w-4 mx-1" />
                                {saveLoading ? tCommon('saving') : tCommon('save')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {orderToPrint && (
                <div ref={receiptRef} style={{ position: 'fixed', left: '-10000px', top: 'auto' }}>
                    <OrderReceipt order={orderToPrint} config={config} />
                </div>
            )}
        </div>
    );
}

export default OrderComponent;
