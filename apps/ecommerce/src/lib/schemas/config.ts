import { z } from 'zod';
import { SUPPORTED_LANGUAGES, SUPPORTED_CURRENCIES, DEFAULT_LANGUAGE } from '@/lib/constants';

export const ConfigTranslationSchema = z.object({
    site_name: z.string().default(''),
    site_description: z.string().nullable().optional(),
});

export const MetadataSchema = z.object({
    og_image: z.string().nullable().optional(),
    x_image: z.string().nullable().optional(),
    robots_directive: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    metadata_description: z.string().nullable().optional(),
    keywords: z.string().nullable().optional(),
    og_title: z.string().nullable().optional(),
    og_description: z.string().nullable().optional(),
    x_title: z.string().nullable().optional(),
    x_description: z.string().nullable().optional(),
});

export const ConfigSchema = z.object({
    id: z.number().int().positive(),
    domain: z.string().min(1),
    currency: z.enum(SUPPORTED_CURRENCIES),
    enabled_languages: z.array(z.enum(SUPPORTED_LANGUAGES)).min(1).default([DEFAULT_LANGUAGE]),
    default_language: z.enum(SUPPORTED_LANGUAGES).default(DEFAULT_LANGUAGE),
    site_name: z.string().min(1),
    site_description: z.string().nullable().optional(),
    light_logo: z.string().nullable().optional(),
    dark_logo: z.string().nullable().optional(),
    favicon: z.string().nullable().optional(),
    cdn: z.string().nullable().optional(),
    google_analytics: z.string().nullable().optional(),
    contact_phone: z.string().nullable().optional(),
    whatsapp: z.string().nullable().optional(),
    products_per_row: z.number().int().min(1).default(4),
    products_per_page: z.number().int().min(1).default(12),
    show_price: z.boolean().default(true),
    in_store_pickup: z.boolean().default(true),
    new_address_checkout: z.boolean().default(true),
    maintenance: z.boolean().default(false),
    theme: z.string().default('theme-pastel'),
    translations: z
        .record(z.enum(SUPPORTED_LANGUAGES), ConfigTranslationSchema)
        .optional(),
    metadata: MetadataSchema.nullable().optional(),
});

export const CreateConfigSchema = ConfigSchema.omit({ id: true });
export const UpdateConfigSchema = CreateConfigSchema.partial();

export type IConfig = z.infer<typeof ConfigSchema>;
export type IConfigTranslation = z.infer<typeof ConfigTranslationSchema>;
export type IMetadata = z.infer<typeof MetadataSchema>;
export type IUpdateConfigPayload = z.infer<typeof UpdateConfigSchema>;





/**
import { z } from 'zod';
import { SUPPORTED_LANGUAGES, SUPPORTED_CURRENCIES } from '@/lib/constants'


export const ConfigTranslationSchema = z.object({
    site_name: z.string().min(1),
    site_description: z.string().nullable().optional(),
});

export const ConfigSchema = z.object({
    id: z.number().int().positive(),
    domain: z.string().min(1),
    currency: z.enum(SUPPORTED_CURRENCIES),
    site_name: z.string().min(1),
    site_description: z.string().nullable().optional(),
    light_logo: z.string().nullable().optional(),
    dark_logo: z.string().nullable().optional(),
    favicon: z.string().nullable().optional(),
    cdn: z.string().nullable().optional(),
    google_analytics: z.string().nullable().optional(),
    contact_phone: z.string().nullable().optional(),
    whatsapp: z.string().nullable().optional(),
    products_per_row: z.number().int().min(1).default(4),
    products_per_page: z.number().int().min(1).default(12),
    show_price: z.boolean().default(true),
    in_store_pickup: z.boolean().default(true),
    new_address_checkout: z.boolean().default(true),
    maintenance: z.boolean().default(false),
    theme: z.string().default('theme-pastel'),
    translations: z.record(z.enum(SUPPORTED_LANGUAGES), ConfigTranslationSchema).optional(),
});

export const CreateConfigSchema = ConfigSchema.omit({ id: true });
export const UpdateConfigSchema = CreateConfigSchema.partial();

export type IConfig = z.infer<typeof ConfigSchema>;
export type IConfigTranslation = z.infer<typeof ConfigTranslationSchema>;
export type IUpdateConfigPayload = z.infer<typeof UpdateConfigSchema>;

*/