import { z } from 'zod';
import { PAYMENT_API_PROVIDERS, PAYMENT_METHODS } from '@/lib/constants';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import { SupportedLanguage } from '@/lib/types/generic';


// Payment API


export interface IPaymentApi {
    id: number;
    api_provider: (typeof PAYMENT_API_PROVIDERS)[number];
    public_key: string;
    private_key: string;
    webhook?: string | null;
    webhook_secret?: string | null;
    webhook_id?: string | null;
    account_id?: string | null;
    supports_installments: boolean;
    active: boolean;
}

const LocalizedPaymentApiFieldsSchema = z.object({
    title: z.string().min(1),
});

export type ILocalizedPaymentApiFields = z.infer<typeof LocalizedPaymentApiFieldsSchema>;

export interface IPaymentApiTranslated extends IPaymentApi {
    title: string;
    translation_language: string;
    translations?: Record<(typeof SUPPORTED_LANGUAGES)[number], ILocalizedPaymentApiFields>;
}

export const CreatePaymentApiRequestSchema = z.object({
    api_provider: z.enum(PAYMENT_API_PROVIDERS),
    public_key: z.string().nullable().optional(),
    private_key: z.string().nullable().optional(),
    webhook: z.string().nullable().optional(),
    webhook_secret: z.string().nullable().optional(),
    webhook_id: z.string().nullable().optional(),
    account_id: z.string().nullable().optional(),
    supports_installments: z.boolean().default(false),
    active: z.boolean().default(true),
    translations: z.record(z.enum(SUPPORTED_LANGUAGES), LocalizedPaymentApiFieldsSchema),
});

export const UpdatePaymentApiRequestSchema = z.object({
    api_provider: z.enum(PAYMENT_API_PROVIDERS).optional(),
    public_key: z.string().nullable().optional(),
    private_key: z.string().nullable().optional(),
    webhook: z.string().nullable().optional(),
    webhook_secret: z.string().nullable().optional(),
    webhook_id: z.string().nullable().optional(),
    account_id: z.string().nullable().optional(),
    supports_installments: z.boolean().optional(),
    active: z.boolean().optional(),
    translations: z.record(z.enum(SUPPORTED_LANGUAGES), LocalizedPaymentApiFieldsSchema.partial()).optional(),
});

export type ICreatePaymentApiPayload = z.infer<typeof CreatePaymentApiRequestSchema>;
export type IUpdatePaymentApiPayload = z.infer<typeof UpdatePaymentApiRequestSchema>;

export interface PaymentApiFormState {
    id?: number;
    api_provider: string;
    public_key: string;
    private_key: string;
    webhook: string;
    webhook_secret: string;
    webhook_id: string;
    account_id: string;
    supports_installments: boolean;
    active: boolean;
    translations: Record<(typeof SUPPORTED_LANGUAGES)[number], ILocalizedPaymentApiFields>;
}

const EMPTY_LOCALIZED_PAYMENT_API: ILocalizedPaymentApiFields = { title: '' };
const EMPTY_PAYMENT_API_TRANSLATIONS = SUPPORTED_LANGUAGES.reduce((acc, lang) => {
    acc[lang] = { ...EMPTY_LOCALIZED_PAYMENT_API };
    return acc;
}, {} as Record<SupportedLanguage, ILocalizedPaymentApiFields>);

export const EMPTY_PAYMENT_API_FORM: PaymentApiFormState = {
    id: undefined,
    api_provider: '',
    public_key: '',
    private_key: '',
    webhook: '',
    webhook_secret: '',
    webhook_id: '',
    account_id: '',
    supports_installments: false,
    active: true,
    translations: EMPTY_PAYMENT_API_TRANSLATIONS,
};

export interface IPaymentApiWithTranslations extends IPaymentApi {
    translations?: Record<string, string>;
}

export type ICreatePaymentApi = Partial<PaymentApiFormState>;


// Payment Method


export interface IPaymentMethod {
    id: number;
    method_type: (typeof PAYMENT_METHODS)[number];
    account_data?: string | null;
    api_id: number;
    installment_sale: boolean;
    max_installments: number;
    active: boolean;
    discount_percent: number;
    icon?: string | null;
}

const LocalizedPaymentMethodFieldsSchema = z.object({
    title: z.string().min(1),
    method_description: z.string().nullable().optional(),
});

export type ILocalizedPaymentMethodFields = z.infer<typeof LocalizedPaymentMethodFieldsSchema>;

export interface IPaymentMethodTranslated extends IPaymentMethod {
    title: string;
    method_description?: string | null;
    translation_language: string;
    translations?: Record<(typeof SUPPORTED_LANGUAGES)[number], ILocalizedPaymentMethodFields>;
}

export const CreatePaymentMethodRequestSchema = z.object({
    method_type: z.enum(PAYMENT_METHODS),
    account_data: z.string().nullable().optional(),
    api_id: z.number().int().positive(),
    installment_sale: z.boolean().default(true),
    max_installments: z.number().int().min(1).default(1),
    active: z.boolean().default(true),
    discount_percent: z.number().min(0).default(0),
    icon: z.string().nullable().optional(),
    translations: z.record(z.enum(SUPPORTED_LANGUAGES), LocalizedPaymentMethodFieldsSchema),
});

export const UpdatePaymentMethodRequestSchema = z.object({
    method_type: z.enum(PAYMENT_METHODS).optional(),
    account_data: z.string().nullable().optional(),
    api_id: z.number().int().positive().optional(),
    installment_sale: z.boolean().optional(),
    max_installments: z.number().int().min(1).optional(),
    active: z.boolean().optional(),
    discount_percent: z.number().min(0).optional(),
    icon: z.string().nullable().optional(),
    translations: z.record(z.enum(SUPPORTED_LANGUAGES), LocalizedPaymentMethodFieldsSchema.partial()).optional(),
});

export type ICreatePaymentMethodPayload = z.infer<typeof CreatePaymentMethodRequestSchema>;
export type IUpdatePaymentMethodPayload = z.infer<typeof UpdatePaymentMethodRequestSchema>;

export interface PaymentMethodFormState {
    id?: number;
    method_type: string;
    account_data: string | null;
    api_id: number;
    installment_sale: boolean;
    max_installments: number;
    active: boolean;
    discount_percent: number;
    icon: string | null;
    translations: Record<(typeof SUPPORTED_LANGUAGES)[number], ILocalizedPaymentMethodFields>;
}

const EMPTY_LOCALIZED_PAYMENT_METHOD: ILocalizedPaymentMethodFields = { title: '', method_description: '' };
const EMPTY_PAYMENT_METHOD_TRANSLATIONS = SUPPORTED_LANGUAGES.reduce((acc, lang) => {
    acc[lang] = { ...EMPTY_LOCALIZED_PAYMENT_METHOD };
    return acc;
}, {} as Record<SupportedLanguage, ILocalizedPaymentMethodFields>);

export const EMPTY_PAYMENT_METHOD_FORM: PaymentMethodFormState = {
    id: undefined,
    method_type: '',
    account_data: null,
    api_id: 0,
    installment_sale: true,
    max_installments: 1,
    active: true,
    discount_percent: 0,
    icon: null,
    translations: EMPTY_PAYMENT_METHOD_TRANSLATIONS,
};

export interface IPaymentMethodWithTranslations extends IPaymentMethod {
    translations?: Record<string, string>;
}

export type ICreatePaymentMethod = Partial<PaymentMethodFormState>;
