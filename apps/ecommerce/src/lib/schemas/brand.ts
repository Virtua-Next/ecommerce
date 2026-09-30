import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import { SupportedLanguage } from '@/lib/types/generic';
import { IEntityMetadata, IEntityVersion } from '@/lib/schemas/metadata';


export interface IBrand {
    id: number;
    brand_image?: string | null;
    active: boolean;
}

const LocalizedBrandFieldsSchema = z.object({
    title: z.string().min(1),
    brand_description: z.string().nullable().optional(),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

export type ILocalizedBrandFields = z.infer<typeof LocalizedBrandFieldsSchema>;

export interface IBrandTranslated extends IBrand {
    title: string;
    brand_description?: string | null;
    slug: string;
    translation_language: string;
    translations?: Record<(typeof SUPPORTED_LANGUAGES)[number], ILocalizedBrandFields>;
    metadata?: IEntityMetadata | null
    versions?: IEntityVersion[]
}

export const CreateBrandRequestSchema = z.object({
    brand_image: z.string().nullable().optional(),
    active: z.boolean().default(true),
    translations: z.record(z.enum(SUPPORTED_LANGUAGES), LocalizedBrandFieldsSchema),
});

export const UpdateBrandRequestSchema = z.object({
    brand_image: z.string().nullable().optional(),
    active: z.boolean().optional(),
    translations: z.record(z.enum(SUPPORTED_LANGUAGES), LocalizedBrandFieldsSchema.partial()).optional(),
});

export type ICreateBrandPayload = z.infer<typeof CreateBrandRequestSchema>;
export type IUpdateBrandPayload = z.infer<typeof UpdateBrandRequestSchema>;

export interface BrandFormState {
    id?: number;
    brand_image: string;
    active: boolean;
    translations: Record<(typeof SUPPORTED_LANGUAGES)[number], ILocalizedBrandFields>;
}

const EMPTY_LOCALIZED: ILocalizedBrandFields = { title: '', brand_description: '', slug: '' };
const EMPTY_TRANSLATIONS = SUPPORTED_LANGUAGES.reduce((acc, lang) => {
    acc[lang] = { ...EMPTY_LOCALIZED };
    return acc;
}, {} as Record<SupportedLanguage, ILocalizedBrandFields>);

export const EMPTY_FORM: BrandFormState = {
    id: undefined,
    brand_image: '',
    active: true,
    translations: EMPTY_TRANSLATIONS,
};

export interface IBrandWithTranslations extends IBrand {
    translations?: Record<string, string>;
}

export type ICreateBrand = Partial<BrandFormState>;
