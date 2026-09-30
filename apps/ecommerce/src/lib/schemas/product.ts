import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '@/lib/constants'
import { SupportedLanguage } from '@/lib/types/generic';
import { IEntityMetadata, IEntityVersion } from '@/lib/schemas/metadata'


const ProductImageSchema = z.object({
    image_path: z.url(),
    image_order: z.number().int().min(0).optional(),
    image_primary: z.boolean().optional(),
});

export interface IProductImage {
    id: number;
    image_path: string;
    image_order: number;
    image_primary: boolean;
    product_id: number;
}

const ProductBaseRequestSchema = z.object({
    sku: z.string().min(1),
    cost_price: z.number().min(0),
    price: z.number().min(0),
    promotional_price: z.number().min(0).nullable().optional(),
    stock: z.number().int().min(0).nullable().optional(),
    product_length: z.number().positive().nullable().optional(),
    width: z.number().positive().nullable().optional(),
    height: z.number().positive().nullable().optional(),
    product_weight: z.number().positive().nullable().optional(),
    active: z.boolean().default(true),
    category_id: z.number().int().positive(),
    brand_id: z.number().int().positive(),
});

export interface IProduct {
    id: number;
    sku: string;
    cost_price: number;
    price: number;
    promotional_price: number | null;
    stock: number | null;
    product_length: number | null;
    width: number | null;
    height: number | null;
    product_weight: number | null;
    active: boolean;
    category_id: number;
    brand_id: number;
    images?: IProductImage[];
}

const LocalizedProductFieldsSchema = z.object({
    title: z.string().min(1),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
    product_description: z.string().nullable().optional(),
    specification: z.string().nullable().optional(),
});

export type ILocalizedProductFields = z.infer<typeof LocalizedProductFieldsSchema>;

export interface IProductTranslated extends IProduct {
    title: string;
    slug: string;
    product_description?: string | null;
    specification?: string | null;
    translation_language: string;
    category_title?: string;
    category_slug?: string;
    brand_title?: string;
    brand_slug?: string; //
    translations?: Record<SupportedLanguage, ILocalizedProductFields>;
    metadata?: IEntityMetadata | null
    versions?: IEntityVersion[]
}

export const CreateProductRequestSchema = ProductBaseRequestSchema.extend({
    translations: z.record(z.enum(SUPPORTED_LANGUAGES), LocalizedProductFieldsSchema),
    images: z.array(ProductImageSchema).optional(),
}).refine((data) => !data.promotional_price || data.promotional_price < data.price, {
    message: 'Promotional price must be less than regular price',
    path: ['promotional_price'],
});

export type ICreateProductPayload = z.infer<typeof CreateProductRequestSchema>;


export const UpdateProductRequestSchema = ProductBaseRequestSchema.partial().extend({
    translations: z.record(z.enum(SUPPORTED_LANGUAGES), LocalizedProductFieldsSchema.partial()).optional(),
    images: z.array(ProductImageSchema).optional(),
    price_change_reason: z.string().optional(),
});

export type IUpdateProductPayload = z.infer<typeof UpdateProductRequestSchema>;

export interface LocalizedProductFields {
    title: string;
    slug: string;
    product_description: string;
    specification: string;
}

export interface ProductFormState {
    id?: number;
    sku: string;
    cost_price: number | null;
    price: number | null;
    promotional_price: number | null;
    stock: number | null;
    product_length: number | null;
    width: number | null;
    height: number | null;
    product_weight: number | null;
    active: boolean;
    category_id?: number;
    brand_id?: number;
    images: IProductImage[];
    translations: Record<SupportedLanguage, LocalizedProductFields>;
}

const EMPTY_LOCALIZED: LocalizedProductFields = {
    title: '',
    slug: '',
    product_description: '',
    specification: '',
};

const EMPTY_TRANSLATIONS = SUPPORTED_LANGUAGES.reduce((acc, lang) => {
    acc[lang] = { ...EMPTY_LOCALIZED };
    return acc;
}, {} as Record<SupportedLanguage, LocalizedProductFields>);

export const EMPTY_FORM: ProductFormState = {
    id: undefined,
    sku: '',
    cost_price: null,
    price: null,
    promotional_price: null,
    stock: null,
    product_length: null,
    width: null,
    height: null,
    product_weight: null,
    active: true,
    category_id: undefined,
    brand_id: undefined,
    images: [],
    translations: EMPTY_TRANSLATIONS,
};

export interface IProductWithTranslations extends IProduct {
    translations?: Record<string, string>;
}

export type ICreateProduct = Partial<ProductFormState>;
