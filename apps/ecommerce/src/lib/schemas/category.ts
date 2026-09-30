import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import { SupportedLanguage } from '@/lib/types/generic';
import { IEntityVersion, IEntityMetadata } from '@/lib/schemas/metadata';


export interface ICategory {
    id: number;
    category_image?: string | null;
    active: boolean;
}

const LocalizedCategoryFieldsSchema = z.object({
    title: z.string().min(1),
    category_description: z.string().nullable().optional(),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

export type ILocalizedCategoryFields = z.infer<typeof LocalizedCategoryFieldsSchema>;

export interface ICategoryTranslated extends ICategory {
    title: string;
    category_description?: string | null;
    slug: string;
    translation_language: string;
    translations?: Record<(typeof SUPPORTED_LANGUAGES)[number], ILocalizedCategoryFields>;
    metadata?: IEntityMetadata | null;
    versions?: IEntityVersion[];
}

export const CreateCategoryRequestSchema = z.object({
    category_image: z.string().nullable().optional(),
    active: z.boolean().default(true),
    translations: z.record(z.enum(SUPPORTED_LANGUAGES), LocalizedCategoryFieldsSchema),
});

export const UpdateCategoryRequestSchema = z.object({
    category_image: z.string().nullable().optional(),
    active: z.boolean().optional(),
    translations: z.record(z.enum(SUPPORTED_LANGUAGES), LocalizedCategoryFieldsSchema.partial()).optional(),
});

export type ICreateCategoryPayload = z.infer<typeof CreateCategoryRequestSchema>;
export type IUpdateCategoryPayload = z.infer<typeof UpdateCategoryRequestSchema>;

export interface CategoryFormState {
    id?: number;
    category_image: string;
    active: boolean;
    translations: Record<(typeof SUPPORTED_LANGUAGES)[number], ILocalizedCategoryFields>;
}

const EMPTY_LOCALIZED: ILocalizedCategoryFields = { title: '', category_description: '', slug: '' };
const EMPTY_TRANSLATIONS = SUPPORTED_LANGUAGES.reduce((acc, lang) => {
    acc[lang] = { ...EMPTY_LOCALIZED };
    return acc;
}, {} as Record<SupportedLanguage, ILocalizedCategoryFields>);

export const EMPTY_FORM: CategoryFormState = {
    id: undefined,
    category_image: '',
    active: true,
    translations: EMPTY_TRANSLATIONS,
};

export interface ICategoryWithTranslations extends ICategory {
    translations?: Record<string, string>;
}

export type ICreateCategory = Partial<CategoryFormState>;
