import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import { METADATA_TARGET_TYPES } from '../constants';
import { SupportedLanguage } from '../types/generic';


const LocalizedMetadataFieldsSchema = z.object({
    title: z.string().nullable().optional(),
    metadata_description: z.string().nullable().optional(),
    keywords: z.string().nullable().optional(),
    og_title: z.string().nullable().optional(),
    og_description: z.string().nullable().optional(),
    x_title: z.string().nullable().optional(),
    x_description: z.string().nullable().optional()
});

const MetadataBaseRequestSchema = z.object({
    target_type: z.enum(METADATA_TARGET_TYPES),
    target_id: z.number().int().positive(),
    robots_directive: z.string().nullable().optional(),
    og_image: z.string().nullable().optional(),
    x_image: z.string().nullable().optional(),
});

export const CreateMetadataRequestSchema = MetadataBaseRequestSchema.extend({
    translations: z.record(z.enum(SUPPORTED_LANGUAGES), LocalizedMetadataFieldsSchema),
});

export const UpdateMetadataRequestSchema = MetadataBaseRequestSchema
    .omit({ target_type: true, target_id: true })
    .partial()
    .extend({
        translations: z.record(z.enum(SUPPORTED_LANGUAGES), LocalizedMetadataFieldsSchema.partial()).optional(),
    });

export interface MetadataFormState {
    robots_directive: string;
    og_image: string;
    x_image: string;
    translations: Record<SupportedLanguage, ILocalizedMetadataFields>;
}

const EMPTY_LOCALIZED: ILocalizedMetadataFields = {
    title: '',
    metadata_description: '',
    keywords: '',
    og_title: '',
    og_description: '',
    x_title: '',
    x_description: '',
};

const EMPTY_TRANSLATIONS = SUPPORTED_LANGUAGES.reduce((acc, lang) => {
    acc[lang] = { ...EMPTY_LOCALIZED };
    return acc;
}, {} as Record<SupportedLanguage, ILocalizedMetadataFields>);

export const EMPTY_FORM: MetadataFormState = {
    robots_directive: 'index, follow',
    og_image: '',
    x_image: '',
    translations: EMPTY_TRANSLATIONS,
};

export type MetadataTargetType = (typeof METADATA_TARGET_TYPES)[number];

export type CreateMetadataRequestInput = z.infer<typeof CreateMetadataRequestSchema>;
export type UpdateMetadataRequestInput = z.infer<typeof UpdateMetadataRequestSchema>;

export interface ILocalizedMetadataFields {
    title?: string | null;
    metadata_description?: string | null;
    keywords?: string | null;
    og_title?: string | null;
    og_description?: string | null;
    x_title?: string | null;
    x_description?: string | null;
}

export interface IMetadataTranslated extends ILocalizedMetadataFields {
    id: number;
    target_type: MetadataTargetType;
    target_id: number;
    robots_directive?: string | null;
    og_image?: string | null;
    x_image?: string | null;
    created_at: string;
    updated_at: string;
    translation_language: string;
}

export interface IMetadataOutput {
    id: number;
    target_type: MetadataTargetType;
    target_id: number;
    robots_directive?: string | null;
    og_image?: string | null;
    x_image?: string | null;
    created_at?: string;
    updated_at?: string;
    translations: Record<SupportedLanguage, ILocalizedMetadataFields>;
}

export interface IEntityVersion {
    translation_language: string;
    slug: string;
}

export interface RobotsDirective {
    index: boolean;
    follow: boolean;
    nocache: boolean;
    googleBot: {
        index: boolean;
        follow: boolean;
    };
}

export interface IEntityMetadata {
    robots_directive: RobotsDirective | null;
    og_image: string | null;
    x_image: string | null;
    title: string | null;
    metadata_description: string | null;
    keywords: string | null;
    og_title: string | null;
    og_description: string | null;
    x_title: string | null;
    x_description: string | null;
    translation_language: string;
}
