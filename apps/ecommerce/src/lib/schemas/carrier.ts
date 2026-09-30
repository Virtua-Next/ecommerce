import { z } from 'zod';
import { CARRIER_TYPES, SUPPORTED_LANGUAGES } from '@/lib/constants';
import { CarrierTypes, SupportedLanguage, CountryCode } from '@/lib/types/generic';


export interface ICarrier {
    id: number;
    api_key?: string | null;
    refresh_token?: string | null;
    origin_zip?: string | null;
    free_shipping: boolean;
    free_shipping_from: number;
    price: number;
    carrier_type: CarrierTypes;
    carrier_service?: string | null;
    client_id?: string | null;
    client_secret?: string | null;
    token_expires_at?: string | null;
    calculation_method?: string | null;
    active: boolean;
    supported_countries?: string[];
}

export type ShippingCarrierType = 'melhor_envio' | 'personalized';
export interface IShippingOption {
    id: string;
    carrierId: number;
    carrierType: ShippingCarrierType;
    serviceId: string | number;
    serviceName?: string;
    carrierName: string;
    companyName?: string;
    logo?: string;
    originalPrice: number;
    price: number;
    isFreeShipping: boolean;
    time: string;
}


const LocalizedCarrierFieldsSchema = z.object({
    carrier_name: z.string().min(1),
});

export type ILocalizedCarrierFields = z.infer<typeof LocalizedCarrierFieldsSchema>;

export interface ICarrierTranslated extends ICarrier {
    carrier_name?: string;
    translation_language?: string;
    translations?: Record<(typeof SUPPORTED_LANGUAGES)[number], ILocalizedCarrierFields>;
}

export const CreateCarrierRequestSchema = z.object({
    api_key: z.string().nullable().optional(),
    refresh_token: z.string().nullable().optional(),
    origin_zip: z.string().nullable().optional(),
    free_shipping: z.boolean().default(false),
    free_shipping_from: z.number().min(0).default(0),
    price: z.number().min(0).default(0),
    carrier_type: z.enum(CARRIER_TYPES),
    carrier_service: z.string().nullable().optional(),
    client_id: z.string().nullable().optional(),
    client_secret: z.string().nullable().optional(),
    token_expires_at: z.string().nullable().optional(),
    calculation_method: z.string().nullable().optional(),
    active: z.boolean().default(true),
    translations: z.record(z.enum(SUPPORTED_LANGUAGES), LocalizedCarrierFieldsSchema),
    supported_countries: z.array(z.string().length(2)).default([]),
});

export const UpdateCarrierRequestSchema = z.object({
    api_key: z.string().nullable().optional(),
    refresh_token: z.string().nullable().optional(),
    origin_zip: z.string().nullable().optional(),
    free_shipping: z.boolean().optional(),
    free_shipping_from: z.number().min(0).optional(),
    price: z.number().min(0).optional(),
    carrier_type: z.enum(CARRIER_TYPES).optional(),
    carrier_service: z.string().nullable().optional(),
    client_id: z.string().nullable().optional(),
    client_secret: z.string().nullable().optional(),
    token_expires_at: z.string().nullable().optional(),
    calculation_method: z.string().nullable().optional(),
    active: z.boolean().optional(),
    translations: z.record(z.enum(SUPPORTED_LANGUAGES), LocalizedCarrierFieldsSchema.partial()).optional(),
    supported_countries: z.array(z.string().length(2)).optional(),
});

export type ICreateCarrierPayload = z.infer<typeof CreateCarrierRequestSchema>;
export type IUpdateCarrierPayload = z.infer<typeof UpdateCarrierRequestSchema>;

export interface CarrierFormState {
    id?: number;
    api_key: string;
    refresh_token: string;
    origin_zip: string;
    free_shipping: boolean;
    free_shipping_from: number;
    price: number;
    carrier_type: CarrierTypes;
    carrier_service: string;
    client_id: string;
    client_secret: string;
    token_expires_at: string;
    calculation_method: string;
    active: boolean;
    translations: Record<(typeof SUPPORTED_LANGUAGES)[number], ILocalizedCarrierFields>;
    supported_countries: string[],
}

const EMPTY_LOCALIZED: ILocalizedCarrierFields = { carrier_name: '' };
const EMPTY_TRANSLATIONS = SUPPORTED_LANGUAGES.reduce((acc, lang) => {
    acc[lang] = { ...EMPTY_LOCALIZED };
    return acc;
}, {} as Record<SupportedLanguage, ILocalizedCarrierFields>);

export const EMPTY_FORM: CarrierFormState = {
    id: undefined,
    api_key: '',
    refresh_token: '',
    origin_zip: '',
    free_shipping: false,
    free_shipping_from: 0,
    price: 0,
    carrier_type: CARRIER_TYPES[0],
    carrier_service: '',
    client_id: '',
    client_secret: '',
    token_expires_at: '',
    calculation_method: '',
    active: true,
    translations: EMPTY_TRANSLATIONS,
    supported_countries: [],
};
