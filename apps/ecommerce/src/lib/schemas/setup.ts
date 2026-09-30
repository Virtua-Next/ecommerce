import { z } from "zod";
import { SUPPORTED_CURRENCIES, SUPPORTED_LANGUAGES } from '@/lib/constants';


const LocalizedSetupFieldsSchema = z.object({
    site_name: z.string().min(1),
    site_description: z.string().optional(),
});

const TranslationsSchema = z.object(
    Object.fromEntries(
        SUPPORTED_LANGUAGES.map((lang) => [lang, LocalizedSetupFieldsSchema])
    ) as Record<(typeof SUPPORTED_LANGUAGES)[number], typeof LocalizedSetupFieldsSchema>
);

export const CreateSetupRequestSchema = z.object({
    domain: z.string().min(1),
    currency: z.enum(SUPPORTED_CURRENCIES),
    user_name: z.string().min(1),
    email: z.email(),
    user_password: z.string().min(8),
    translations: TranslationsSchema,
});

export type ISetup = z.infer<typeof CreateSetupRequestSchema>;
