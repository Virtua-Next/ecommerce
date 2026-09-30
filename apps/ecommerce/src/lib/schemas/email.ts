import { z } from 'zod';
import { EMAIL_PROVIDERS, EMAIL_TRIGGER_TYPES } from '@/lib/constants';


// Email API


export interface IEmailApi {
    id: number;
    api_server: (typeof EMAIL_PROVIDERS)[number];
    api_key: string;
    active: boolean;
}

// Interface simplificada sem traduções
export interface IEmailApiTranslated extends IEmailApi {
    title: string; // Será preenchido com api_server
    translation_language: string;
}

export const CreateEmailApiRequestSchema = z.object({
    api_server: z.enum(EMAIL_PROVIDERS),
    api_key: z.string().min(1),
    active: z.boolean().default(true),
});

export const UpdateEmailApiRequestSchema = z.object({
    api_server: z.enum(EMAIL_PROVIDERS).optional(),
    api_key: z.string().min(1).optional(),
    active: z.boolean().optional(),
});

export type ICreateEmailApiPayload = z.infer<typeof CreateEmailApiRequestSchema>;
export type IUpdateEmailApiPayload = z.infer<typeof UpdateEmailApiRequestSchema>;

export interface EmailApiFormState {
    id?: number;
    api_server: string;
    api_key: string;
    active: boolean;
}

export const EMPTY_EMAIL_API_FORM: EmailApiFormState = {
    id: undefined,
    api_server: '',
    api_key: '',
    active: true,
};

export interface IEmailApiWithTranslations extends IEmailApi {
    translations?: Record<string, string>;
}

export type ICreateEmailApi = Partial<EmailApiFormState>;


// Trigger Email


export interface ITriggerEmail {
    id: number;
    trigger_type: (typeof EMAIL_TRIGGER_TYPES)[number];
    email: string;
    api_id: number;
    active: boolean;
}

export const CreateTriggerEmailRequestSchema = z.object({
    trigger_type: z.enum(EMAIL_TRIGGER_TYPES),
    email: z.string().email(),
    api_id: z.number().int().positive(),
    active: z.boolean().default(true),
});

export const UpdateTriggerEmailRequestSchema = z.object({
    trigger_type: z.enum(EMAIL_TRIGGER_TYPES).optional(),
    email: z.string().email().optional(),
    api_id: z.number().int().positive().optional(),
    active: z.boolean().optional(),
});

export type ICreateTriggerEmailPayload = z.infer<typeof CreateTriggerEmailRequestSchema>;
export type IUpdateTriggerEmailPayload = z.infer<typeof UpdateTriggerEmailRequestSchema>;

export interface TriggerEmailFormState {
    id?: number;
    trigger_type: string;
    email: string;
    api_id: number;
    active: boolean;
}

export const EMPTY_TRIGGER_EMAIL_FORM: TriggerEmailFormState = {
    id: undefined,
    trigger_type: '',
    email: '',
    api_id: 0,
    active: true,
};

export type ICreateTriggerEmail = Partial<TriggerEmailFormState>;
