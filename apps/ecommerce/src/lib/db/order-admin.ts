import { getDb } from "@/lib/cloudflare/context";
import { ADMIN_PAGINATION_DEFAULT, DEFAULT_LANGUAGE } from '@/lib/constants';
import type { IOrderDetails } from '@/lib/schemas/order';
import { OrderStatus } from "../types/generic";
import { transitionOrder } from "./order-transition";
import { sendOrderStatusEmail } from "../email/order-emails";


export interface IListOrdersParams {
    status?: string;        // 'all' | 'pending' | 'confirmed' | ...
    search?: string;        // busca por ID, email, nome
    page?: number;
    limit?: number;
    language?: string;
}

export interface IListOrdersResult {
    orders: IOrderDetails[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface IUpdateOrderPayload {
    order_status?: OrderStatus;
    tracking?: string;
    observations?: string;
}

// list
export async function listOrdersAdmin(params: IListOrdersParams): Promise<IListOrdersResult> {
    const db = getDb();
    const { status = 'all', search = '', page = 1, limit = ADMIN_PAGINATION_DEFAULT, language = DEFAULT_LANGUAGE } = params;

    const offset = (page - 1) * limit;

    try {
        const conditions: string[] = [];
        const filterBibds: any[] = [];

        if (status && status !== 'all') {
            conditions.push('o.order_status = ?');
            filterBibds.push(status);
        }

        if (search) {
            conditions.push(`(
                o.id LIKE ? OR 
                u.email LIKE ? OR 
                u.user_name LIKE ?
            )`);
            const term = `%${search}%`;
            filterBibds.push(term, term, term);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await db
            .prepare(`SELECT COUNT(DISTINCT o.id) AS total FROM tb_order o INNER JOIN user u ON u.id = o.user_id ${whereClause}`)
            .bind(...filterBibds)
            .first<{ total: number }>();

        const total = countResult?.total ?? 0;

        if (total === 0) return { orders: [], total: 0, page, limit, totalPages: 1 };

        const ordersResult = await db
            .prepare(`
                SELECT 
                    o.id,
                    o.order_date,
                    o.order_status,
                    o.payment_method,
                    o.installments,
                    o.delivery_option,
                    o.products_value,
                    o.shipping_value,
                    o.base_value,
                    o.total_value,
                    o.shipping_carrier_name,
                    o.shipping_service,
                    o.interest,
                    o.observations,
                    o.tracking,
                    o.shipping_zip,
                    o.shipping_street,
                    o.shipping_number,
                    o.shipping_complement,
                    o.shipping_neighborhood,
                    o.shipping_city,
                    o.shipping_state,
                    u.user_name,
                    u.email,
                    u.phone,
                    ct.carrier_name
                FROM tb_order o
                INNER JOIN user u ON u.id = o.user_id
                LEFT JOIN carrier c ON c.id = o.carrier_id
                LEFT JOIN carrier_translation ct 
                    ON ct.carrier_id = c.id 
                    AND ct.translation_language = ?
                ${whereClause}
                ORDER BY 
                    (o.order_status = 'archived') ASC,
                    o.order_date DESC
                LIMIT ? OFFSET ?
            `)
            .bind(language, ...filterBibds, limit, offset)
            .all<any>();

        const orders = ordersResult.results ?? [];
        if (orders.length === 0) return { orders: [], total, page, limit, totalPages: Math.ceil(total / limit) };

        const orderIds = orders.map(o => o.id);
        const placeholders = orderIds.map(() => '?').join(',');

        const itemsResult = await db
            .prepare(`
                SELECT 
                    oi.id,
                    oi.order_id,
                    oi.product_name,
                    oi.quantity,
                    oi.price,
                    oi.cost_price,
                    oi.product_id,
                    p.sku,
                    pt.title,
                    pt.slug
                FROM order_item oi
                LEFT JOIN product p ON p.id = oi.product_id
                LEFT JOIN product_translation pt 
                    ON pt.product_id = oi.product_id 
                    AND pt.translation_language = ?
                WHERE oi.order_id IN (${placeholders})
                ORDER BY oi.order_id, oi.id`)
            .bind(language, ...orderIds)
            .all<any>();

        const itemsByOrder = new Map<number, any[]>();
        for (const item of itemsResult.results ?? []) {
            if (!itemsByOrder.has(item.order_id)) {
                itemsByOrder.set(item.order_id, []);
            }
            itemsByOrder.get(item.order_id)!.push({
                id: item.id,
                product_id: item.product_id,
                product_name: item.title ?? item.product_name,
                product_sku: item.sku ?? null,
                quantity: item.quantity,
                price: item.price,
                cost_price: item.cost_price,
                slug: item.slug ?? null,
            });
        }

        const mappedOrders: IOrderDetails[] = orders.map(order => ({
            id: order.id,
            order_date: order.order_date,
            order_status: order.order_status,
            payment_method: order.payment_method,
            installments: order.installments,
            delivery_option: order.delivery_option,
            products_value: order.products_value,
            shipping_value: order.shipping_value,
            base_value: order.base_value,
            total_value: order.total_value,
            interest: order.interest,
            observations: order.observations,
            tracking: order.tracking,
            carrier_name: order.carrier_name,
            shipping_carrier_name: order.shipping_carrier_name,
            shipping_service: order.shipping_service,

            customer: {
                name: order.user_name,
                email: order.email,
                phone: order.phone,
            },

            address: order.shipping_zip ? {
                zip: order.shipping_zip,
                street: order.shipping_street,
                address_number: order.shipping_number,
                complement: order.shipping_complement,
                neighborhood: order.shipping_neighborhood,
                city: order.shipping_city,
                address_state: order.shipping_state,
            } : undefined,

            items: itemsByOrder.get(order.id) ?? [],
        }));

        return {
            orders: mappedOrders,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };

    } catch (err: any) {
        console.error('listOrdersAdmin database error:', { status, search, page, limit, error: err?.message });
        throw err;
    }
}

// update
export async function updateOrderAdmin(orderId: number, data: IUpdateOrderPayload): Promise<{ success: boolean; error?: string; code?: string; message?: string; data?: any; revProdCache?: boolean }> {
    const db = getDb();

    try {
        let shouldSendEmail = false;
        let revalidate = false
        if (data.order_status) {
            const transition = await transitionOrder(orderId, data.order_status);
            if (!transition.success) return { success: false, error: transition.error, code: transition.code };
            shouldSendEmail = transition.code !== 'NO_CHANGE';
            revalidate = transition.revProdCache ?? false;
        }

        const updates: string[] = [];
        const values: any[] = [];

        if (data.tracking !== undefined) {
            updates.push('tracking = ?');
            values.push(data.tracking || null);
        }
        if (data.observations !== undefined) {
            updates.push('observations = ?');
            values.push(data.observations || null);
        }

        if (updates.length > 0) {
            await db
                .prepare(`UPDATE tb_order SET ${updates.join(', ')} WHERE id = ?`)
                .bind(...values, orderId)
                .run();
        }

        if (shouldSendEmail && data.order_status) {
            await sendOrderStatusEmail(orderId, data.order_status);
        }

        return {
            success: true,
            message: 'Order updated successfully',
            revProdCache: revalidate
        };

    } catch (err: any) {
        console.error('updateOrderAdmin database error:', orderId, err);
        throw err;
    }
}
