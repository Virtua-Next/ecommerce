'use client'
import { useCart } from '@//hooks/useCart'
import { Button } from '@/components/ui/button'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useConfig } from '@/context/ConfigContext'
import { formatPrice, buildImageUrl } from '@/lib/utils'
import ImageWithFallback from '@/components/ImageWithFallback/imageWithFallback'
import { PlaceholderImage } from '@/components/PlaceholderImage/PlaceholderImage'


export default function Cart() {
    const t = useTranslations('Cart');
    const locale = useLocale();
    const { config } = useConfig();
    const { cart, total, removeFromCart, updateQuantity, products, isLoading } = useCart();

    if (isLoading) {
        return (
            <div className="w-full flex items-center justify-center py-10">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-border mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            <h1 className="text-2xl mb-6">{t('title')}</h1>

            {cart.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-lg mb-4">{t('empty')}</p>
                    <Link prefetch={false} href="/">
                        <Button variant={'theme'} size={'lg'}>
                            {t('backToShopping')}
                        </Button>
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="divide-y divide-border">
                        {cart.map((item) => {
                            const product = products.find(p => p.id === item.productId);

                            if (!product) return null;

                            return (
                                <CartItemRow config={config} key={item.productId} item={item} product={product} cdn={config?.cdn} locale={locale} onUpdateQuantity={updateQuantity} onRemove={removeFromCart} t={t} />
                            );
                        })}
                    </div>

                    <div className="border-t pt-4 border-border">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{t('subtotal')}:</span>
                            <span className="font-medium">{formatPrice(total, locale, config?.currency)}</span>
                        </div>
                        <p className="text-sm mb-4">{t('shippingNote')}</p>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Link prefetch={false} href="/" className="sm:flex-1">
                                <Button variant="outline" className="w-full border-border hover:bg-card">
                                    {t('continueShopping')}
                                </Button>
                            </Link>
                            <a href="/checkout" className="sm:flex-1">
                                <Button variant={'theme'} size={'full'}>
                                    {t('checkout')}
                                </Button>
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function CartItemRow({ config, item, product, cdn, locale, onUpdateQuantity, onRemove, t }: { config: any, item: any; product: any; cdn?: string | null; locale: string; onUpdateQuantity: (id: number, quantity: number) => void; onRemove: (id: number) => void; t: (key: string) => string }) {
    const imgSrc = buildImageUrl(cdn, item.image);

    const handleQuantityInput = (rawValue: number) => {
        if (isNaN(rawValue)) return;
        const clamped = Math.min(Math.max(1, rawValue), product.stock);
        onUpdateQuantity(item.productId, clamped);
    };

    return (
        <div className="flex items-start gap-4 py-4">
            <div className="relative w-20 h-20 flex-shrink-0">
                <ImageWithFallback src={imgSrc} alt={item.name || t('unnamedProduct')} fallbackComponent={<PlaceholderImage size="sm" className="w-20 h-20 rounded border border-border" />} className="object-cover rounded border border-border" width={80} height={80} />
            </div>

            <div className="flex-1">
                <h3 className="font-medium">{item.name}</h3>
                <p className="text-secondary font-medium">{formatPrice(item.price, locale, config?.currency)}</p>

                <div className="flex items-center mt-2">
                    <button disabled={item.quantity <= 1} className="cursor-pointer text-red-500 w-6 h-6 flex items-center justify-center border border-gray-300 rounded-l-md bg-gray-100 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50" onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}>-</button>

                    <input type="number" min="1" max={product.stock} value={item.quantity} onChange={(e) => handleQuantityInput(Number(e.target.value))} className="w-10 h-6 text-center border-t border-b border-gray-300 dark:bg-gray-800 dark:border-gray-600" />

                    <button disabled={item.quantity >= product.stock} className="cursor-pointer text-green-500 w-6 h-6 flex items-center justify-center border border-gray-300 rounded-r-md bg-gray-100 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50" onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}>+</button>

                    <button onClick={() => onRemove(item.productId)} className="text-link/70 hover:underline text-sm ml-2">{t('remove')}</button>
                </div>
            </div>
        </div>
    );
}
