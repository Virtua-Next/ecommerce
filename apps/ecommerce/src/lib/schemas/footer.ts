import { z } from 'zod';
import { FOOTER_TYPES, SUPPORTED_LANGUAGES } from '@/lib/constants';


export interface IFooter {
    id: number;
    footer_type: string;
    footer_order: number;
    active: boolean;
}

const LocalizedFooterFieldsSchema = z.object({
    title: z.string().min(1),
    content: z.string().min(1).refine(
        (val) => {
            try {
                JSON.parse(val);
                return true;
            } catch {
                return false;
            }
        },
        { message: 'Content must be valid JSON' }
    ),
});

export type ILocalizedFooterFields = z.infer<typeof LocalizedFooterFieldsSchema>;

export interface IFooterTranslated extends IFooter {
    title: string;
    content: string;
    translation_language: string;
    translations?: Record<(typeof SUPPORTED_LANGUAGES)[number], ILocalizedFooterFields>;
}

const FooterBaseRequestSchema = z.object({
    footer_type: z.enum(FOOTER_TYPES),
    footer_order: z.number().int().default(0),
    active: z.boolean().default(true),
});

export const CreateFooterRequestSchema = FooterBaseRequestSchema.extend({
    translations: z.record(z.enum(SUPPORTED_LANGUAGES), LocalizedFooterFieldsSchema),
});

export const UpdateFooterRequestSchema = FooterBaseRequestSchema.partial().extend({
    translations: z.record(z.enum(SUPPORTED_LANGUAGES), LocalizedFooterFieldsSchema.partial()).optional(),
});

export type ICreateFooterPayload = z.infer<typeof CreateFooterRequestSchema>;
export type IUpdateFooterPayload = z.infer<typeof UpdateFooterRequestSchema>;

export interface IFooterWithTranslations extends IFooter {
    translations?: Record<string, string>;
}

export const parseFooterContent = (footer: ILocalizedFooterFields) => {
    try {
        return JSON.parse(footer.content);
    } catch {
        return footer.content;
    }
};
