'use client';
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslations, useLocale } from 'next-intl';
import { useConfig } from '@/context/ConfigContext';
import { IProductTranslated } from '@/lib/schemas/product';
import { formatPrice } from '@/lib/utils';
import type { SaleRow } from '@/lib/db/sale-admin';


interface MonthlyPoint { name: string; uv: number }
interface ProductPerformancePoint { name: string; uv: number }
interface UserOrderSummary {
    userId: number;
    userName: string;
    pending: number;
    confirmed: number;
    processing: number;
    delivered: number;
    canceled: number;
    totalOrders: number;
}

interface DashboardStats {
    totalSales: number;
    canceledSales: number;
    totalProfit: number;
    averageMonthlySales: number;
    totalPending: number;
    totalConfirmed: number;
    totalPaymentError: number;
    monthlySales: MonthlyPoint[];
    monthlyProfit: MonthlyPoint[];
    productPerformance: ProductPerformancePoint[];
    ordersByUser: UserOrderSummary[];
}

function computeStats(sales: SaleRow[], locale: string): DashboardStats {
    let totalSales = 0;
    let canceledSales = 0;
    let totalProfit = 0;
    let totalPending = 0;
    let totalConfirmed = 0;
    let totalPaymentError = 0;

    const salesByMonth: Record<string, number> = {};
    const profitByMonth: Record<string, number> = {};
    const performanceByProduct: Record<string, number> = {};
    const ordersByUserMap: Record<string, UserOrderSummary> = {};

    const seenOrderStatus = new Set<string>();
    const seenUserOrderStatus = new Set<string>();

    sales.forEach((sale) => {
        const month = new Date(sale.date).toLocaleString(locale, { month: 'short', year: 'numeric' });

        salesByMonth[month] = (salesByMonth[month] ?? 0) + sale.productsValue;
        profitByMonth[month] = profitByMonth[month] ?? 0;
        performanceByProduct[sale.productCode] = (performanceByProduct[sale.productCode] ?? 0) + sale.quantity;

        const userKey = String(sale.userId);
        if (!ordersByUserMap[userKey]) {
            ordersByUserMap[userKey] = {
                userId: sale.userId,
                userName: sale.userName,
                pending: 0,
                confirmed: 0,
                processing: 0,
                delivered: 0,
                canceled: 0,
                totalOrders: 0,
            };
        }
        const userSummary = ordersByUserMap[userKey];

        if (sale.status === 'delivered') {
            totalSales += sale.productsValue;
            totalProfit += sale.productsValue - sale.costPrice;
            profitByMonth[month] += sale.productsValue - sale.costPrice;
        }
        if (sale.status === 'canceled') {
            canceledSales += sale.productsValue;
        }

        const orderKey = String(sale.orderId);
        const userOrderKey = `${userKey}-${orderKey}`;

        if (!seenUserOrderStatus.has(userOrderKey)) {
            seenUserOrderStatus.add(userOrderKey);
            switch (sale.status) {
                case 'delivered':
                    userSummary.delivered++;
                    break;
                case 'canceled':
                    userSummary.canceled++;
                    break;
                case 'pending':
                    userSummary.pending++;
                    break;
                case 'processing':
                    userSummary.processing++;
                    break;
                case 'confirmed':
                    userSummary.confirmed++;
                    break;
            }
        }

        if (!seenOrderStatus.has(orderKey)) {
            seenOrderStatus.add(orderKey);
            switch (sale.status) {
                case 'pending':
                    totalPending++;
                    break;
                case 'confirmed':
                    totalConfirmed++;
                    break;
                case 'payment_error':
                    totalPaymentError++;
                    break;
            }
        }
    });

    const monthlySales = Object.entries(salesByMonth).map(([name, value]) => ({ name, uv: Number(value.toFixed(2)) }));
    const monthlyProfit = Object.entries(profitByMonth).map(([name, value]) => ({ name, uv: Number(value.toFixed(2)) }));
    const productPerformance = Object.entries(performanceByProduct).map(([name, uv]) => ({ name, uv }));

    const ordersByUser = Object.values(ordersByUserMap).map((u) => ({ ...u, totalOrders: u.pending + u.confirmed + u.processing + u.delivered + u.canceled })).sort((a, b) => b.totalOrders - a.totalOrders);

    const monthCount = Object.keys(salesByMonth).length;
    const averageMonthlySales = monthCount > 0 ? totalSales / monthCount : 0;

    return {
        totalSales,
        canceledSales,
        totalProfit,
        averageMonthlySales,
        totalPending,
        totalConfirmed,
        totalPaymentError,
        monthlySales,
        monthlyProfit,
        productPerformance,
        ordersByUser,
    };
}

interface DashboardProps {
    initialSales: SaleRow[];
}

export default function Dashboard({ initialSales }: DashboardProps) {
    const t = useTranslations('Dashboard');
    const locale = useLocale();
    const { products, config } = useConfig();

    const stats = useMemo(
        () => computeStats(initialSales, locale),
        [initialSales, locale]
    );

    const lowStockList = useMemo<IProductTranslated[]>(
        () => (products ? [...products].sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0)) : []),
        [products]
    );

    const money = (value: number) => formatPrice(value, locale, config?.currency);

    return (
        <div className="font-sans min-h-screen p-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* New Orders card */}
            <div className="p-4 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] col-span-1">
                <h3 className="text-lg text-center mb-4">{t('newOrders.title')}</h3>
                <div className="flex flex-wrap justify-center items-center">
                    <span className='pr-2 text-gray-500 dark:text-gray-400'>{t('newOrders.pending')}</span>
                    <span className="px-3 py-1 border border-orange-700 rounded-full bg-orange-300 text-black">
                        {stats.totalPending}
                    </span>
                </div>
                <div className="flex flex-wrap justify-center items-center mt-2">
                    <span className='pr-2 text-gray-500 dark:text-gray-400'>{t('newOrders.confirmed')}</span>
                    <span className="px-3 py-1 border border-blue-700 rounded-full bg-blue-100 text-black">
                        {stats.totalConfirmed}
                    </span>
                </div>
                <div className="flex flex-wrap justify-center items-center mt-2">
                    <span className='pr-2 text-gray-500 dark:text-gray-400'>{t('newOrders.paymentError')}</span>
                    <span className="px-3 py-1 border border-red-700 rounded-full bg-red-300 text-black">
                        {stats.totalPaymentError}
                    </span>
                </div>
            </div>

            {/* Total Sales card */}
            <div className="p-4 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] col-span-1">
                <h3 className="text-lg text-center mb-4">{t('totalSales.title')}</h3>
                <div className="flex flex-wrap justify-center items-center">
                    <span className='pr-2 text-gray-500 dark:text-gray-400'>{t('totalSales.delivered')}</span>
                    <span className="text-2xl font-bold text-green-500">{money(stats.totalSales)}</span>
                </div>
                <div className="flex flex-wrap justify-center items-center mt-2">
                    <span className='pr-2 text-gray-500 dark:text-gray-400'>{t('totalSales.canceled')}</span>
                    <span className="text-2xl font-bold text-red-500">{money(stats.canceledSales)}</span>
                </div>
            </div>

            {/* Average Monthly Sales card */}
            <div className="p-4 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] col-span-1">
                <h3 className="text-lg text-center">{t('averageMonthly.title')}</h3>
                <p className='text-center mb-4 text-gray-500 dark:text-gray-400'>{t('averageMonthly.subtitle')}</p>
                <div className="flex flex-wrap justify-center items-center">
                    <span className="text-2xl font-bold text-blue-500">{money(stats.averageMonthlySales)}</span>
                </div>
            </div>

            {/* Profit card */}
            <div className="p-4 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] col-span-1">
                <h3 className="text-lg text-center">{t('profit.title')}</h3>
                <p className="text-center mb-4 text-gray-500 dark:text-gray-400">{t('profit.subtitle')}</p>
                <div className="flex flex-wrap justify-center items-center">
                    <span className="text-2xl font-bold text-teal-500">{money(stats.totalProfit)}</span>
                </div>
            </div>

            {/* Monthly sales chart */}
            <div className="p-2 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] col-span-1 md:col-span-3 lg:col-span-4">
                <h2 className="text-xl text-center mb-4">{t('monthlyFlow.title')}</h2>
                <p className='pr-2 text-gray-500 dark:text-gray-400 text-center'>{t('monthlyFlow.subtitle')}</p>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.monthlySales}>
                        <CartesianGrid strokeDasharray="5 5" stroke="#8a888895" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8d8d8d' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8d8d8d' }} />
                        <Tooltip
                            itemStyle={{ fontSize: '16px', fontWeight: 'bold', color: '#00a2ff' }}
                            contentStyle={{ backgroundColor: '#333', color: '#fff', borderRadius: '5px', padding: '10px' }}
                            cursor={false}
                            formatter={(value) => [money(Number(value)), t('monthlyFlow.legend')]}
                        />
                        <Legend wrapperStyle={{ bottom: 0, left: '50%', transform: 'translateX(-50%)', marginTop: 10 }} />
                        <Bar type="monotone" dataKey="uv" fill="rgba(0, 170, 255, 0.57)" barSize={40} radius={[5, 5, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Monthly profit chart */}
            <div className="p-2 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] col-span-1 md:col-span-3 lg:col-span-4">
                <h2 className="text-xl text-center mb-4">{t('monthlyProfit.title')}</h2>
                <p className='pr-2 text-gray-500 dark:text-gray-400 text-center'>{t('monthlyProfit.subtitle')}</p>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.monthlyProfit}>
                        <CartesianGrid strokeDasharray="5 5" stroke="#8a888895" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8d8d8d' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8d8d8d' }} />
                        <Tooltip
                            itemStyle={{ fontSize: '16px', fontWeight: 'bold', color: '#00a2ff' }}
                            contentStyle={{ backgroundColor: '#333', color: '#fff', borderRadius: '5px', padding: '10px' }}
                            cursor={false}
                            formatter={(value) => [money(Number(value)), t('monthlyFlow.legend')]}
                        />
                        <Legend wrapperStyle={{ bottom: 0, left: '50%', transform: 'translateX(-50%)', marginTop: 10 }} />
                        <Bar type="monotone" dataKey="uv" fill="rgba(0, 255, 217, 0.57)" barSize={40} radius={[5, 5, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Product performance chart */}
            <div className="p-2 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] col-span-1 md:col-span-3 lg:col-span-4">
                <h2 className="text-xl text-center mb-4">{t('productPerformance.title')}</h2>
                <p className='pr-2 text-gray-500 dark:text-gray-400 text-center'>{t('productPerformance.subtitle')}</p>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.productPerformance}>
                        <CartesianGrid strokeDasharray="5 5" stroke="#8a888895" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8d8d8d' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8d8d8d' }} />
                        <Tooltip
                            itemStyle={{ fontSize: '16px', fontWeight: 'bold', color: '#00a2ff' }}
                            contentStyle={{ backgroundColor: '#333', color: '#fff', borderRadius: '5px', padding: '10px' }}
                            cursor={false}
                            labelFormatter={(label) => t('productPerformance.codeLabel', { code: String(label ?? '') })}
                            formatter={(value) => [value, t('productPerformance.units')]}
                        />
                        <Legend wrapperStyle={{ bottom: 0, left: '50%', transform: 'translateX(-50%)', marginTop: 10 }} />
                        <Bar type="monotone" dataKey="uv" fill="rgba(237, 64, 156, 0.47)" barSize={40} radius={[5, 5, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Orders by user card */}
            <div className="p-4 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] col-span-1 md:col-span-3">
                <h3 className="text-lg text-center mb-4">{t('ordersByUser.title')}</h3>
                <div className="max-h-[800px] overflow-y-auto">
                    <table className="min-w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-3">{t('ordersByUser.user')}</th>
                                <th className="px-6 py-3">{t('ordersByUser.pending')}</th>
                                <th className="px-6 py-3">{t('ordersByUser.confirmed')}</th>
                                <th className="px-6 py-3">{t('ordersByUser.processing')}</th>
                                <th className="px-6 py-3">{t('ordersByUser.delivered')}</th>
                                <th className="px-6 py-3">{t('ordersByUser.canceled')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.ordersByUser.length > 0 ? (
                                stats.ordersByUser.map((user) => (
                                    <tr key={user.userId} className="border-b">
                                        <td className="px-6 py-3">{user.userName}</td>
                                        <td className="px-6 py-3"><span className='px-2.5 py-1 border border-orange-700 rounded-full bg-orange-300 text-black'>{user.pending}</span></td>
                                        <td className="px-6 py-3"><span className='px-2.5 py-1 border border-blue-700 rounded-full bg-blue-100 text-black'>{user.confirmed}</span></td>
                                        <td className="px-6 py-3"><span className='px-2.5 py-1 border border-blue-700 rounded-full bg-blue-300 text-black'>{user.processing}</span></td>
                                        <td className="px-6 py-3"><span className='px-2.5 py-1 border border-green-700 rounded-full bg-green-300 text-black'>{user.delivered}</span></td>
                                        <td className="px-6 py-3"><span className='px-2.5 py-1 border border-red-700 rounded-full bg-red-300 text-black'>{user.canceled}</span></td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="text-center px-6 py-3">
                                        {t('ordersByUser.empty')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Stock card */}
            <div className="p-4 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.15)] dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] col-span-1">
                <h3 className="text-lg text-center mb-4">{t('stock.title')}</h3>
                <div className="max-h-[800px] overflow-y-auto">
                    {lowStockList.length > 0 ? (
                        <div>
                            <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-600 border-b py-2">
                                <span>{t('stock.code')}</span>
                                <span>{t('stock.name')}</span>
                                <span>{t('stock.stock')}</span>
                            </div>
                            <ul className="space-y-2">
                                {lowStockList.map((prod, index) => {
                                    const stock = prod.stock ?? 0;

                                    return (
                                        <li key={index} className="grid grid-cols-3 gap-4 items-center p-2 border-b">
                                            <span className="text-gray-400">{prod.sku}</span>
                                            <span className="text-gray-400">{prod.title}</span>
                                            <span
                                                className={
                                                    stock === 0
                                                        ? "text-red-500 font-semibold"
                                                        : stock <= 2
                                                            ? "text-amber-400 font-semibold"
                                                            : "text-green-500"
                                                }
                                            >
                                                {stock}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500">{t('stock.empty')}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
