import {
    METADATA_TARGET_TYPES, SUPPORTED_LANGUAGES, SUPPORTED_CURRENCIES, SLIDE_LOCATIONS, FOOTER_TYPES,
    CARRIER_TYPES, TRANSLATION_ENTITY_TYPES, PAYMENT_METHODS, PAYMENT_API_PROVIDERS, EMAIL_PROVIDERS,
    EMAIL_TRIGGER_TYPES, API_ERROR_CODES, SUPPORTED_COUNTRIES, DELIVERY_OPTIONS,
    ORDER_STATUSES, STRIPE_ALLOWED_INSTALLMENTS, EMAIL_SUBJECTS
} from "@/lib/constants";

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export type CountryCode = (typeof SUPPORTED_COUNTRIES)[number];

export type TranslationEntityTypes = (typeof TRANSLATION_ENTITY_TYPES)[number];

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export type MetadataTargetType = (typeof METADATA_TARGET_TYPES)[number];

export type SlideLocationsType = (typeof SLIDE_LOCATIONS)[number];

export type FooterTypesType = (typeof FOOTER_TYPES)[number];

export type CarrierTypes = (typeof CARRIER_TYPES)[number];

export type SupportedDeliveryOptions = (typeof DELIVERY_OPTIONS)[number];

export type SupportedPaymentApiProviders = (typeof PAYMENT_API_PROVIDERS)[number];

export type SupportedStripeAllowedIstallments = (typeof STRIPE_ALLOWED_INSTALLMENTS)[number];

export type SupportedPaymentMethods = (typeof PAYMENT_METHODS)[number];

export type SupportedEmailProviders = (typeof EMAIL_PROVIDERS)[number];

export type SupportedEmailTriggerTypes = (typeof EMAIL_TRIGGER_TYPES)[number];

export type SupportedEmailSubjetcs = keyof typeof EMAIL_SUBJECTS;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type IResult<T> =
    | { success: true; data?: T, message: string, code?: string, revProdCache?: boolean }
    | { success: false; error: string; code?: string, statusDetail?: string };

