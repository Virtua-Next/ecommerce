import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '@/lib/constants'
import { SupportedLanguage } from '@/lib/types/generic';
import { IEntityMetadata } from '@/lib/schemas/metadata';


export interface IPage {
  id: number;
  page_image?: string | null;
  page_order: number;
  active: boolean;
}

export interface IPageTranslated extends IPage {
  title: string;
  slug: string;
  page_description?: string | null;
  content: string;
  translation_language: string;
  translations?: Record<(typeof SUPPORTED_LANGUAGES)[number], LocalizedPageFields>;
  metadata?: IEntityMetadata | null;
}

const LocalizedPageFieldsSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  page_description: z.string().nullable().optional(),
  content: z.string().min(1),
});

export const CreatePageRequestSchema = z.object({
  page_image: z.string().nullable().optional(),
  page_order: z.number().int().default(0),
  active: z.boolean().default(true),
  translations: z.record(z.enum(SUPPORTED_LANGUAGES), LocalizedPageFieldsSchema),
});

export const UpdatePageRequestSchema = z.object({
  page_image: z.string().nullable().optional(),
  page_order: z.number().int().optional(),
  active: z.boolean().optional(),
  translations: z.record(z.enum(SUPPORTED_LANGUAGES), LocalizedPageFieldsSchema.partial()).optional(),
});

export type ICreatePagePayload = z.infer<typeof CreatePageRequestSchema>;
export type IUpdatePagePayload = z.infer<typeof UpdatePageRequestSchema>;
export type ILocalizedPageFields = z.infer<typeof LocalizedPageFieldsSchema>;

export interface LocalizedPageFields {
  title: string;
  slug: string;
  page_description: string;
  content: string;
}

export interface PageFormState {
  id?: number;
  page_image: string;
  page_order: number;
  active: boolean;
  translations: Record<(typeof SUPPORTED_LANGUAGES)[number], LocalizedPageFields>;
}

const EMPTY_LOCALIZED_PAGE: LocalizedPageFields = { title: '', slug: '', page_description: '', content: '' };
const EMPTY_PAGE_TRANSLATIONS = SUPPORTED_LANGUAGES.reduce((acc, lang) => {
  acc[lang] = { ...EMPTY_LOCALIZED_PAGE };
  return acc;
}, {} as Record<SupportedLanguage, LocalizedPageFields>);

export const EMPTY_FORM: PageFormState = {
  id: undefined,
  page_image: '',
  page_order: 0,
  active: true,
  translations: EMPTY_PAGE_TRANSLATIONS,
};

export interface IPageWithTranslations extends IPage {
  translations?: Record<string, string>;
}

export type ICreatePage = Partial<PageFormState>;
