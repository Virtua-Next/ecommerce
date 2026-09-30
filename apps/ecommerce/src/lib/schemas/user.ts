import { z } from 'zod';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, SUPPORTED_COUNTRIES, DEFAULT_COUNTRY } from '@/lib/constants'


// Address


export const AddressSchema = z.object({
    id: z.number().int().positive(),
    country_code: z.string().trim().toUpperCase().pipe(z.string().regex(/^[A-Z]{2}$/)),
    zip: z.string().min(1),
    street: z.string().min(1),
    address_number: z.string().min(1),
    complement: z.string().nullable().optional(),
    neighborhood: z.string().nullable().optional(),
    city: z.string().min(1),
    address_state: z.string().min(1),
    address_primary: z.boolean().default(true),
    user_id: z.number().int().positive()
});

export const CreateAddressSchema = AddressSchema.omit({ id: true });
export const UpdateAddressSchema = CreateAddressSchema.partial();

export type IAddress = z.infer<typeof AddressSchema>;
export type ICreateAddress = z.infer<typeof CreateAddressSchema>;
export type IUpdateAddress = z.infer<typeof UpdateAddressSchema>;

export const AddressFormSchema = CreateAddressSchema.omit({ user_id: true });
export type AddressFormState = z.infer<typeof AddressFormSchema>;

export const EMPTY_ADDRESS: AddressFormState = {
    country_code: '',
    zip: '',
    street: '',
    address_number: '',
    complement: '',
    neighborhood: '',
    city: '',
    address_state: '',
    address_primary: false,
};


// User


export const UserSchema = z.object({
    id: z.number().int().positive(),
    uuid: z.uuid(),
    user_name: z.string().min(1),
    country: z.enum(SUPPORTED_COUNTRIES).default(DEFAULT_COUNTRY),
    tax_id: z.string().nullable().optional(), // CPF/CNPJ, SSN, NIF... genérico por país
    email: z.email(),
    phone: z.string().min(1).nullable().optional(),
    user_password: z.string().min(8),
    active: z.boolean().default(true),
    profile_id: z.number().int().positive().default(2),
    preferred_language: z.enum(SUPPORTED_LANGUAGES).default(DEFAULT_LANGUAGE),
    addresses: z.array(AddressSchema).optional()
});

export const CreateUserSchema = UserSchema.omit({
    id: true,
    uuid: true,
    addresses: true
});

export const UpdateUserSchema = CreateUserSchema.partial();

export type IUser = z.infer<typeof UserSchema>;
export type ICreateUser = z.infer<typeof CreateUserSchema>;
export type IUpdateUser = z.infer<typeof UpdateUserSchema>;

// Change Password
export const ChangePasswordSchema = z.object({
    current_password: z.string().min(1),
    new_password: z.string().min(8)
});
export type IChangePassword = z.infer<typeof ChangePasswordSchema>;

export const EMPTY_USER: ICreateUser = {
    user_name: '',
    email: '',
    country: DEFAULT_COUNTRY,
    tax_id: '',
    phone: '',
    user_password: '',
    preferred_language: DEFAULT_LANGUAGE,
    profile_id: 2,
    active: true
};

export const RegisterPayloadSchema = z.object({
    newUser: CreateUserSchema,
    address: AddressFormSchema,
});

export interface CreateUserInput {
    user: ICreateUser;
    address: Omit<ICreateAddress, 'user_id'>;
}

export interface PaginatedCustomersOptions {
    page: number;
    limit: number;
}

export interface PaginatedCustomersResult {
    customers: IUser[];
    addresses: IAddress[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
