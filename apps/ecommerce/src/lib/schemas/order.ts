import { z } from 'zod';
import { ORDER_STATUSES, DELIVERY_OPTIONS } from '@/lib/constants'


export type IOrderStatus = (typeof ORDER_STATUSES)[number];
export type DeliveryOption = (typeof DELIVERY_OPTIONS)[number];

export interface IOrder {
    id: number;
    order_date: string;
    order_status: IOrderStatus;
    payment_method: string;
    installments: number;
    delivery_option: DeliveryOption;
    products_value: number;
    shipping_value: number;
    base_value: number;
    interest?: number | null;
    total_value: number;
    observations?: string | null;
    tracking?: string | null;
    user_id?: number | null;
    address_id?: number | null;
    api_id?: number | null;
    carrier_id?: number | null;
}

export interface IOrderItem {
    id: number;
    quantity: number;
    price: number;
    cost_price: number;
    order_id: number | null;
    product_id: number | null;
    product_name?: string | null;
    product_sku?: string | null;
}

export interface IOrderCustomer {
    name: string;
    email: string;
    phone?: string | null;
}

export interface IOrderAddress {
    zip: string;
    street: string;
    address_number: string;
    complement?: string | null;
    neighborhood: string;
    city: string;
    address_state: string;
}

export interface IOrderDetails extends IOrder {
    carrier_name?: string | null;
    discount_value?: number; 
    shipping_carrier_name?: string | null;
    shipping_service?: string | null;
    customer: IOrderCustomer;
    address?: IOrderAddress;
    items: IOrderItem[];
}

export const OrderSchema = z.object({
    id: z.number().int().positive(),
    order_date: z.iso.datetime().default(() => new Date().toISOString()),
    order_status: z.enum(ORDER_STATUSES),
    payment_method: z.string().min(1),
    installments: z.number().int().min(1).default(1),
    delivery_option: z.enum(DELIVERY_OPTIONS),
    products_value: z.number().min(0),
    shipping_value: z.number().min(0).default(0),
    base_value: z.number().min(0),
    interest: z.number().nullable().optional(),
    total_value: z.number().min(0),
    observations: z.string().nullable().optional(),
    tracking: z.string().nullable().optional(),
    user_id: z.number().int().positive().nullable().optional(),
    address_id: z.number().int().positive().nullable().optional(),
    api_id: z.number().int().positive().nullable().optional(),
    carrier_id: z.number().int().positive().nullable().optional(),
});

export const CreateOrderSchema = OrderSchema.omit({ id: true, order_date: true });
export const UpdateOrderSchema = CreateOrderSchema.partial();

export const OrderItemSchema = z.object({
    id: z.number().int().positive(),
    quantity: z.number().int().positive(),
    price: z.number().min(0),
    cost_price: z.number().min(0),
    order_id: z.number().int().positive().nullable(),
    product_id: z.number().int().positive().nullable(),
});

export const CreateOrderItemSchema = OrderItemSchema.omit({ id: true, order_id: true });
