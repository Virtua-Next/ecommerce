import { IResult, OrderStatus } from "@/lib/types/generic";
import { getDb } from "@/lib/cloudflare/context";


// Final states of a "successful" order that can be archived without affecting ongoing sales reports.
export const ARCHIVABLE_FROM: OrderStatus[] = ['delivered', 'canceled', 'refunded'];

// single source of truth regarding which transitions are permitted
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    pending: ['confirmed', 'payment_error', 'canceled'],
    confirmed: ['processing', 'refunded', 'canceled'],
    processing: ['shipped', 'canceled', 'delivered'],
    shipped: ['delivered'],
    delivered: ['refunded', 'archived'],
    payment_error: ['pending', 'canceled'],
    canceled: ['archived'],
    refunded: ['archived'],
    archived: [],
};

const STATES_THAT_HELD_STOCK: OrderStatus[] = ['pending', 'confirmed'];
const RELEASE_STATES: OrderStatus[] = ['payment_error', 'canceled'];

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function transitionOrder(orderId: number, toStatus: OrderStatus): Promise<IResult<{ id: number; order_status: OrderStatus, revProdCache?: boolean }>> {
    try {
        const db = getDb();
        let revalidate = false;

        const order = await db
            .prepare(`SELECT id, order_status FROM tb_order WHERE id = ?`)
            .bind(orderId)
            .first<{ id: number; order_status: OrderStatus }>();

        if (!order) return { success: false, error: 'Order not found', code: 'NOT_FOUND' };

        if (order.order_status === toStatus) {
            // idempotência: webhook duplicado repetindo o mesmo status não é erro
            return {
                success: true,
                data: { id: order.id, order_status: order.order_status },
                message: 'Order already in this status',
                code: 'NO_CHANGE'
            };
        }

        if (!canTransition(order.order_status, toStatus)) {
            return { success: false, error: `Cannot transition order from '${order.order_status}' to '${toStatus}'`, code: 'INVALID_TRANSITION' };
        }

        // lock otimista: WHERE order_status = ? garante que ninguém mudou o status entre o SELECT e este UPDATE
        const result = await db
            .prepare(`UPDATE tb_order SET order_status = ? WHERE id = ? AND order_status = ?`)
            .bind(toStatus, orderId, order.order_status)
            .run();

        if (result.meta.changes === 0) {
            return { success: false, error: 'Order status changed concurrently, retry', code: 'ORDER_STATUS_CONFLICT' };
        }

        // centraliza: qualquer transição pending/confirmed -> payment_error/canceled devolve estoque,
        // não importa se veio do createOrder, de um webhook, ou do admin via updateOrderAdmin
        if (STATES_THAT_HELD_STOCK.includes(order.order_status) && RELEASE_STATES.includes(toStatus)) {
            const release = await releaseOrderStock(orderId);
            if (!release.success) {
                console.error(`Order ${orderId} moved to ${toStatus} but stock release failed:`, release.error);
                // status já foi commitado; loga pra reconciliação manual, não falha a transição
            }
            revalidate = true;
        }

        return { success: true, data: { id: orderId, order_status: toStatus }, message: 'Order status updated successfully', revProdCache: revalidate ?? false };

    } catch (err) {
        console.error('Database error:', err);
        return { success: false, error: 'Failed to transition order', code: 'INTERNAL_ERROR' };
    }
}

export function canArchive(status: OrderStatus): boolean {
    return ARCHIVABLE_FROM.includes(status);
}

export async function restoreStock(items: { product_id: number; quantity: number }[]): Promise<any> {
    if (items.length === 0) return { success: true };
    const db = getDb();
    try {
        await db.batch(
            items.map((item) =>
                db.prepare("UPDATE product SET stock = stock + ? WHERE id = ? AND stock IS NOT NULL")
                    .bind(item.quantity, item.product_id)
            )
        );
        return { success: true };
    } catch (err) {
        console.error('Error restoring stock:', err);
        return { success: false, error: 'Failed to restore stock.', code: 'INTERNAL_ERROR' };
    }
}

export async function reserveOrderStock(orderId: number, items: { product_id: number; quantity: number }[]): Promise<any> {
    const db = getDb();
    try {
        const results = await db.batch(
            items.map((item) =>
                db.prepare("UPDATE product SET stock = stock - ? WHERE id = ? AND (stock IS NULL OR stock >= ?)")
                    .bind(item.quantity, item.product_id, item.quantity)
            )
        );

        const failedIndexes = results
            .map((r, i) => (r.meta.changes === 0 ? i : -1))
            .filter((i) => i !== -1);

        if (failedIndexes.length > 0) {
            // batch aplica tudo mesmo com falha parcial — reverte quem teve sucesso
            const succeeded = items.filter((_, i) => !failedIndexes.includes(i));

            const rollback = await restoreStock(succeeded);
            if (!rollback.success) {
                // estoque decrementado sem pedido associado — precisa reconciliação manual urgente
                console.error(`[CRITICAL] Order ${orderId}: failed to roll back partial stock reservation for`, succeeded.map(s => s.product_id), '— manual reconciliation required');
                // opcional: disparar alerta (Sentry/Slack/etc) aqui, não só console.error
            }

            const failedIds = failedIndexes.map((i) => items[i].product_id).join(', ');
            return { success: false, error: `Insufficient stock for product(s): ${failedIds}`, code: 'VALIDATION_ERROR' };
        }

        return { success: true };
    } catch (err) {
        console.error(`Error reserving stock for order ${orderId}:`, err);
        return { success: false, error: 'Failed to reserve order stock.', code: 'INTERNAL_ERROR' };
    }
}

export async function releaseOrderStock(orderId: number): Promise<IResult<void>> {
    const db = getDb();
    try {
        const items = await db
            .prepare("SELECT product_id, quantity FROM order_item WHERE order_id = ?")
            .bind(orderId)
            .all<{ product_id: number; quantity: number }>();

        return await restoreStock(items.results ?? []);
    } catch (err) {
        console.error(`Error releasing stock for order ${orderId}:`, err);
        return { success: false, error: 'Failed to release order stock.', code: 'INTERNAL_ERROR' };
    }
}
