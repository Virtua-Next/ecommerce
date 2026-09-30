'use client';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { forwardRef, useImperativeHandle, useState } from 'react';
import type { Stripe, StripeElements } from '@stripe/stripe-js';
import { IAddress, IUser } from '@/lib/schemas/user';


interface CardFormProps {
    onSubmit: (stripe: Stripe, elements: StripeElements) => Promise<void>;
    user: IUser;
    selectedAddress: IAddress;
}

const CardFormComponent = ({ onSubmit, user, selectedAddress }: CardFormProps, ref: any) => {
    const stripe = useStripe();
    const elements = useElements();
    const [, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
        submit: async () => {
            setError(null);
            if (!stripe || !elements) {
                setError('Stripe not available');
                return;
            }

            const { error: submitError } = await elements.submit();
            if (submitError) {
                setError(submitError.message ?? 'Dados do cartão inválidos.');
                return;
            }

            setLoading(true);
            try {
                await onSubmit(stripe, elements);
            } catch (err: any) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        },
    }));

    return (
        <div className="space-y-4">
            <PaymentElement
                options={{
                    layout: 'tabs',
                    defaultValues: {
                        billingDetails: {
                            name: user.user_name,
                            email: user.email,
                            phone: user.phone || '',
                            address: {
                                line1: selectedAddress?.street,
                                line2: `${selectedAddress?.address_number} ${selectedAddress?.complement || ''}` || undefined,
                                city: selectedAddress?.city,
                                state: selectedAddress?.address_state,
                                postal_code: selectedAddress?.zip,
                                country: user.country,
                            },
                        },
                    },
                }}
            />
            {error && <p className="text-red-500">{error}</p>}
        </div>
    );
};

export const CardForm = forwardRef(CardFormComponent);
