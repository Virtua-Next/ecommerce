import { CountryCode } from "@/lib/types/generic";
import { SUPPORTED_COUNTRIES } from "@/lib/constants";
import { cpf, cnpj } from 'cpf-cnpj-validator';


export type AddressFieldKey = | 'zip' | 'street' | 'address_number' | 'complement' | 'neighborhood' | 'city' | 'address_state';
export const REQUIRED_FIELDS: AddressFieldKey[] = ['zip', 'street', 'address_number', 'city', 'address_state'];
export const CONDITIONALLY_REQUIRED: AddressFieldKey[] = ['neighborhood'];


export interface CountryConfig {
    countryCode: CountryCode

    /** Rótulo de cada campo de endereço nesse país */
    addressLabels: Partial<Record<AddressFieldKey, string>>;

    /** Quais campos de endereço esse país usa (ordem de exibição) */
    addressFields: AddressFieldKey[];

    /** Nome do "documento fiscal" (CPF/CNPJ, SSN, NIF...) */
    taxIdLabel: string;

    /** Se o documento é obrigatório no cadastro */
    taxIdRequired: boolean;

    /** Valida o valor limpo (sem máscara) do documento fiscal */
    validateTaxId: (value: string) => boolean;

    /** Aplica máscara enquanto o usuário digita */
    formatTaxId: (value: string) => string;

    /** Aplica máscara de telefone enquanto o usuário digita */
    formatPhone: (value: string) => string;

    /** Se existe busca automática de endereço por CEP/ZIP nesse país */
    hasZipLookup: boolean;
    requiredFields: AddressFieldKey[];
}

function formatCpfOrCnpj(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) {
        return digits
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1-$2')
            .slice(0, 14);
    }
    return digits
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .slice(0, 18);
}

// ---------- Known configurations ----------
const KNOWN_CONFIGS: Partial<Record<CountryCode, CountryConfig>> = {
    BR: {
        countryCode: 'BR',
        addressLabels: {
            zip: 'CEP',
            street: 'Logradouro',
            address_number: 'Número',
            complement: 'Complemento',
            neighborhood: 'Bairro',
            city: 'Cidade',
            address_state: 'Estado (UF)',
        },
        addressFields: ['zip', 'street', 'address_number', 'complement', 'neighborhood', 'city', 'address_state'],
        requiredFields: ['zip', 'street', 'address_number', 'neighborhood', 'city', 'address_state'],
        taxIdLabel: 'CPF/CNPJ',
        taxIdRequired: false,
        validateTaxId: (value) => value.length === 11 ? cpf.isValid(value) : cnpj.isValid(value),
        formatTaxId: formatCpfOrCnpj,
        formatPhone: (value) => value.replace(/\D/g, '')
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .slice(0, 15),
        hasZipLookup: true,
    },
    US: {
        countryCode: 'US',
        addressLabels: {
            zip: 'ZIP Code',
            street: 'Street Address',
            address_number: 'Apt/Unit',
            city: 'City',
            address_state: 'State',
        },
        addressFields: ['zip', 'street', 'address_number', 'city', 'address_state'],
        requiredFields: ['zip', 'street', 'address_number', 'city', 'address_state'],
        taxIdLabel: 'SSN/EIN',
        taxIdRequired: false,
        validateTaxId: (value) => /^\d{9}$/.test(value),
        formatTaxId: (value) => value.replace(/\D/g, '').slice(0, 9)
            .replace(/(\d{3})(\d)/, '$1-$2')
            .replace(/(\d{2})(\d)/, '$1-$2'),
        formatPhone: (value) => value.replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '($1) $2')
            .replace(/(\d{3})(\d)/, '$1-$2')
            .slice(0, 14),
        hasZipLookup: false,
    },
    PT: {
        countryCode: 'PT',
        addressLabels: {
            zip: 'Código Postal',
            street: 'Morada',
            address_number: 'Número',
            city: 'Localidade',
            address_state: 'Distrito',
        },
        addressFields: ['zip', 'street', 'address_number', 'city', 'address_state'],
        requiredFields: ['zip', 'street', 'address_number', 'city', 'address_state'],
        taxIdLabel: 'NIF',
        taxIdRequired: false,
        validateTaxId: (value: string) => /^\d{9}$/.test(value),
        formatTaxId: (value: string) => value.replace(/\D/g, '').slice(0, 9),
        formatPhone: (value: string) => value.replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1 $2')
            .replace(/(\d{3})(\d)/, '$1 $2')
            .slice(0, 11),
        hasZipLookup: false,
    },
};

// ---------- Montagem ----------
export const COUNTRY_CONFIGS: Record<CountryCode, CountryConfig> =
    Object.fromEntries(
        SUPPORTED_COUNTRIES.map((code) => [
            code,
            KNOWN_CONFIGS[code] ?? buildDefaultConfig(code),
        ]),
    ) as Record<CountryCode, CountryConfig>;

export interface AddressValidationResult {
    valid: boolean;
    errors: Partial<Record<AddressFieldKey | 'zip', string>>;
    missing: AddressFieldKey[];
}

// ---------- Generic config (international fallback) ----------
function buildDefaultConfig(countryCode: CountryCode): CountryConfig {
    return {
        countryCode,
        addressLabels: {
            zip: 'Postal Code',
            street: 'Street',
            address_number: 'Number',
            complement: 'Complement',
            city: 'City',
            address_state: 'State/Province',
        },
        addressFields: ['zip', 'street', 'address_number', 'complement', 'city', 'address_state'],
        requiredFields: ['zip', 'street', 'address_number', 'city', 'address_state'],
        taxIdLabel: 'Tax ID',
        taxIdRequired: false,
        validateTaxId: () => true,            // will accept anything
        formatTaxId: (v) => v.trim(),
        formatPhone: (v) => v.replace(/[^\d+]/g, '').slice(0, 15),
        hasZipLookup: false,
    };
}













// import { cpf, cnpj } from 'cpf-cnpj-validator';
// import { CountryCode } from '@/lib/types/generic';


// export type AddressFieldKey = | 'zip' | 'street' | 'address_number' | 'complement' | 'neighborhood' | 'city' | 'address_state';

// export interface CountryConfig {
//     countryCode: CountryCode
//     /** Rótulo de cada campo de endereço nesse país */
//     addressLabels: Partial<Record<AddressFieldKey, string>>;
//     /** Quais campos de endereço esse país usa (ordem de exibição) */
//     addressFields: AddressFieldKey[];
//     /** Nome do "documento fiscal" (CPF/CNPJ, SSN, NIF...) */
//     taxIdLabel: string;
//     /** Se o documento é obrigatório no cadastro */
//     taxIdRequired: boolean;
//     /** Valida o valor limpo (sem máscara) do documento fiscal */
//     validateTaxId: (value: string) => boolean;
//     /** Aplica máscara enquanto o usuário digita */
//     formatTaxId: (value: string) => string;
//     /** Aplica máscara de telefone enquanto o usuário digita */
//     formatPhone: (value: string) => string;
//     /** Se existe busca automática de endereço por CEP/ZIP nesse país */
//     hasZipLookup: boolean;
// }

// function formatCpfOrCnpj(value: string): string {
//     const digits = value.replace(/\D/g, '');
//     if (digits.length <= 11) {
//         return digits
//             .replace(/(\d{3})(\d)/, '$1.$2')
//             .replace(/(\d{3})(\d)/, '$1.$2')
//             .replace(/(\d{3})(\d)/, '$1-$2')
//             .slice(0, 14);
//     }
//     return digits
//         .replace(/(\d{2})(\d)/, '$1.$2')
//         .replace(/(\d{3})(\d)/, '$1.$2')
//         .replace(/(\d{3})(\d)/, '$1/$2')
//         .replace(/(\d{4})(\d)/, '$1-$2')
//         .slice(0, 18);
// }

// export const COUNTRY_CONFIGS: Record<CountryCode, CountryConfig> = {
//     BR: {
//         countryCode: 'BR',
//         addressLabels: {
//             zip: 'CEP',
//             street: 'Logradouro',
//             address_number: 'Número',
//             complement: 'Complemento',
//             neighborhood: 'Bairro',
//             city: 'Cidade',
//             address_state: 'Estado (UF)',
//         },
//         addressFields: ['zip', 'street', 'address_number', 'complement', 'neighborhood', 'city', 'address_state'],
//         taxIdLabel: 'CPF/CNPJ',
//         taxIdRequired: false,
//         validateTaxId: (value) => value.length === 11 ? cpf.isValid(value) : cnpj.isValid(value),
//         formatTaxId: formatCpfOrCnpj,
//         formatPhone: (value) => value.replace(/\D/g, '')
//             .replace(/(\d{2})(\d)/, '($1) $2')
//             .replace(/(\d{5})(\d)/, '$1-$2')
//             .slice(0, 15),
//         hasZipLookup: true,
//     },
//     US: {
//         countryCode: 'US',
//         addressLabels: {
//             zip: 'ZIP Code',
//             street: 'Street Address',
//             address_number: 'Apt/Unit',
//             city: 'City',
//             address_state: 'State',
//         },
//         addressFields: ['zip', 'street', 'address_number', 'city', 'address_state'],
//         taxIdLabel: 'SSN/EIN',
//         taxIdRequired: false,
//         validateTaxId: (value) => /^\d{9}$/.test(value),
//         formatTaxId: (value) => value.replace(/\D/g, '').slice(0, 9)
//             .replace(/(\d{3})(\d)/, '$1-$2')
//             .replace(/(\d{2})(\d)/, '$1-$2'),
//         formatPhone: (value) => value.replace(/\D/g, '')
//             .replace(/(\d{3})(\d)/, '($1) $2')
//             .replace(/(\d{3})(\d)/, '$1-$2')
//             .slice(0, 14),
//         hasZipLookup: false,
//     },
//     PT: {
//         countryCode: 'PT',
//         addressLabels: {
//             zip: 'Código Postal',
//             street: 'Morada',
//             address_number: 'Número',
//             city: 'Localidade',
//             address_state: 'Distrito',
//         },
//         addressFields: ['zip', 'street', 'address_number', 'city', 'address_state'],
//         taxIdLabel: 'NIF',
//         taxIdRequired: false,
//         validateTaxId: (value: string) => /^\d{9}$/.test(value),
//         formatTaxId: (value: string) => value.replace(/\D/g, '').slice(0, 9),
//         formatPhone: (value: string) => value.replace(/\D/g, '')
//             .replace(/(\d{3})(\d)/, '$1 $2')
//             .replace(/(\d{3})(\d)/, '$1 $2')
//             .slice(0, 11),
//         hasZipLookup: false,
//     },
// };

// /** Mandatory fields, whenever applicable in the country. */
// export const REQUIRED_FIELDS: AddressFieldKey[] = [
//     'zip',
//     'street',
//     'address_number',
//     'city',
//     'address_state',
// ];

// /**
//  * `neighborhood` (Bairro) is only mandatory in BR (it is the only country that declares it).
//  * If tomorrow another country requires it, add it here or make it part of CountryConfig.
//  */
// export const CONDITIONALLY_REQUIRED: AddressFieldKey[] = ['neighborhood'];

// export interface AddressValidationResult {
//     valid: boolean;
//     errors: Partial<Record<AddressFieldKey | 'zip', string>>;
//     missing: AddressFieldKey[];
// }
