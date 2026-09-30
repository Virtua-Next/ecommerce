import { getDb } from '@/lib/cloudflare/context';


export interface SaleRow {
    orderId: number
    date: string;
    status: string;
    userId: number;
    userName: string;
    productCode: string;
    quantity: number;
    productsValue: number;
    costPrice: number;
    totalValue: number;
}

export async function getSalesReport(): Promise<SaleRow[]> {
    const db = getDb();

    try {
        const { results } = await db
            .prepare(`
                SELECT 
                    o.id AS orderId,
                    o.order_date AS date,
                    o.order_status AS status,
                    u.id AS userId,
                    u.user_name AS userName,
                    COALESCE(p.sku, '-') AS productCode,
                    oi.quantity AS quantity,
                    (oi.price * oi.quantity) AS productsValue,
                    (oi.cost_price * oi.quantity) AS costPrice,
                    o.total_value AS totalValue
                FROM tb_order o
                INNER JOIN user u ON u.id = o.user_id
                INNER JOIN order_item oi ON oi.order_id = o.id
                LEFT JOIN product p ON p.id = oi.product_id
                WHERE o.order_status NOT IN ('archived')
                ORDER BY o.order_date DESC`)
            .all<SaleRow>();
        
        return results;

    } catch (err: any) {
        console.error('getSalesReport database error', err);
        throw err;
    }
}
