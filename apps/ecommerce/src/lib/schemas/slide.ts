import { z } from 'zod';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';
import { SupportedLanguage } from '@/lib/types/generic';


export interface ISlide {
    id: number;
    slide_image: string;
    title_color?: string | null;
    subtitle_color?: string | null;
    button_text_color?: string | null;
    button_background?: string | null;
    button_border?: string | null;
    button_link?: string | null;
    slide_location: string[];
    slide_order: number;
    active: boolean;
}

const LocalizedSlideFieldsSchema = z.object({
    title: z.string().min(1),
    subtitle: z.string().min(1),
    button_text: z.string().min(1),
});

export type ILocalizedSlideFields = z.infer<typeof LocalizedSlideFieldsSchema>;

export interface ISlideTranslated extends ISlide {
    title: string;
    subtitle: string;
    button_text: string;
    translation_language: string;
    translations?: Record<(typeof SUPPORTED_LANGUAGES)[number], ILocalizedSlideFields>;
}

const SlideBaseRequestSchema = z.object({
    slide_image: z.string().min(1),
    title_color: z.string().nullable().optional(),
    subtitle_color: z.string().nullable().optional(),
    button_text_color: z.string().nullable().optional(),
    button_background: z.string().nullable().optional(),
    button_border: z.string().nullable().optional(),
    button_link: z.string().nullable().optional(),
    slide_location: z.array(z.string()).min(1),
    slide_order: z.number().int().default(0),
    active: z.boolean().default(true),
});

export const CreateSlideRequestSchema = SlideBaseRequestSchema.extend({
    translations: z.record(z.enum(SUPPORTED_LANGUAGES), LocalizedSlideFieldsSchema),
});

export const UpdateSlideRequestSchema = SlideBaseRequestSchema.partial().extend({
    translations: z.record(z.enum(SUPPORTED_LANGUAGES), LocalizedSlideFieldsSchema.partial()).optional(),
});

export type ICreateSlidePayload = z.infer<typeof CreateSlideRequestSchema>;
export type IUpdateSlidePayload = z.infer<typeof UpdateSlideRequestSchema>;

export interface SlideFormState {
    id?: number;
    slide_image: string;
    title_color: string;
    subtitle_color: string;
    button_text_color: string;
    button_background: string;
    button_border: string;
    button_link: string;
    slide_location: string[];
    slide_order: number;
    active: boolean;
    translations: Record<(typeof SUPPORTED_LANGUAGES)[number], ILocalizedSlideFields>;
}

const EMPTY_LOCALIZED: ILocalizedSlideFields = { title: '', subtitle: '', button_text: '' };
const EMPTY_TRANSLATIONS = SUPPORTED_LANGUAGES.reduce((acc, lang) => {
    acc[lang] = { ...EMPTY_LOCALIZED };
    return acc;
}, {} as Record<SupportedLanguage, ILocalizedSlideFields>);

export const EMPTY_FORM: SlideFormState = {
    id: undefined,
    slide_image: '',
    title_color: '',
    subtitle_color: '',
    button_text_color: '',
    button_background: '',
    button_border: '',
    button_link: '',
    slide_location: [],
    slide_order: 0,
    active: true,
    translations: EMPTY_TRANSLATIONS,
};

export interface ISlideWithTranslations extends ISlide {
    translations?: Record<string, string>;
}

export type ICreateSlide = Partial<SlideFormState>;
