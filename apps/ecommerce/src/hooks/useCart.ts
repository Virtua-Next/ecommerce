'use client'
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useConfig } from '@/context/ConfigContext';
import { IProductTranslated } from '@/lib/schemas/product';
import { NO_IMAGE } from '@/lib/constants';


interface CartItem {
    productId: number;
    quantity: number;
}

export interface CartProduct {
    id: number;
    sku: string;
    title: string;
    slug: string;
    price: number;
    promotional_price: number | null;
    stock: number;
    images: string[];
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
}

const getEffectivePrice = (product?: CartProduct): number => {
    if (!product) return 0;
    return product.promotional_price && product.promotional_price > 0
        ? product.promotional_price
        : product.price;
};

function toCartProduct(p: IProductTranslated & { images?: Array<{ image_path: string; image_primary?: boolean; image_order?: number }> }): CartProduct {
    const sortedImages = [...(p.images ?? [])].sort((a, b) => {
        if (a.image_primary !== b.image_primary) return a.image_primary ? -1 : 1;
        return (a.image_order ?? 0) - (b.image_order ?? 0);
    });

    return {
        id: p.id,
        sku: p.sku,
        title: p.title,
        slug: p.slug,
        price: p.price,
        promotional_price: p.promotional_price ?? null,
        stock: p.stock ?? 0,
        images: sortedImages.map((img) => img.image_path),
        length: p.product_length ?? undefined,
        width: p.width ?? undefined,
        height: p.height ?? undefined,
        weight: p.product_weight ?? undefined,
    };
}

export function useCart() {
    const { user } = useConfig();
    const locale = useLocale();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [products, setProducts] = useState<CartProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const isUpdating = useRef(false);
    const hasLoadedOnce = useRef(false);

    const cartKey = useMemo(
        () => (user?.uuid ? `cart_${user.uuid}` : 'cart_anonymous'),
        [user?.uuid]
    );

    useEffect(() => {
        const savedCart = localStorage.getItem(cartKey);
        if (!savedCart) return;

        try {
            const parsedCart = JSON.parse(savedCart);
            if (Array.isArray(parsedCart)) setCart(parsedCart);
        } catch (e) {
            console.error('Erro ao ler carrinho:', e);
            localStorage.removeItem(cartKey);
        }
    }, [cartKey]);

    useEffect(() => {
        if (!user?.uuid) return;

        const anonymousCart = localStorage.getItem('cart_anonymous');
        if (!anonymousCart) return;

        localStorage.setItem(`cart_${user.uuid}`, anonymousCart);
        localStorage.removeItem('cart_anonymous');
        setCart(JSON.parse(anonymousCart));
    }, [user?.uuid]);

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (isUpdating.current || e.key !== cartKey) return;
            try {
                setCart(e.newValue ? JSON.parse(e.newValue) : []);
            } catch (error) {
                console.error('Erro ao sincronizar carrinho:', error);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [cartKey]);

    const productIds = useMemo(() => {
        const uniqueIds = [...new Set(cart.map(item => item.productId))];
        return uniqueIds.sort((a, b) => a - b);
    }, [cart]);

    const productIdsKey = productIds.join(',');

    useEffect(() => {
        if (productIds.length === 0) {
            setProducts([]);
            setIsLoading(false);
            return;
        }

        if (!hasLoadedOnce.current) setIsLoading(true);
        let cancelled = false;

        const params = new URLSearchParams({ ids: productIds.join(',') });
        if (locale) params.set('locale', locale);

        fetch(`/api/product/by-ids?${params.toString()}`)
            .then(async res => {
                if (!res.ok) return [];
                const products = await res.json() as any;
                return products.map(toCartProduct);
            })
            .then(data => {
                if (!cancelled) setProducts(data || []);
            })
            .catch(error => {
                console.error('Erro ao buscar produtos:', error);
                if (!cancelled) setProducts([]);
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoading(false);
                    hasLoadedOnce.current = true;
                }
            });

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productIdsKey, locale]);

    const updateCart = useCallback((newCart: CartItem[]) => {
        isUpdating.current = true;
        setCart(newCart);
        localStorage.setItem(cartKey, JSON.stringify(newCart));
        window.dispatchEvent(new CustomEvent('cart-updated', { detail: newCart }));
        setTimeout(() => { isUpdating.current = false; }, 100);
    }, [cartKey]);

    const addToCart = useCallback((productId: number) => {
        const product = products.find(p => p.id === productId);
        const stock = product?.stock ?? 0;
        const existingItem = cart.find(item => item.productId === productId);

        if (existingItem && existingItem.quantity >= stock) return;

        const newCart = existingItem
            ? cart.map(item =>
                item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
            )
            : [...cart, { productId, quantity: 1 }];

        updateCart(newCart);
    }, [cart, products, updateCart]);

    const removeFromCart = useCallback((productId: number) => {
        updateCart(cart.filter(item => item.productId !== productId));
    }, [cart, updateCart]);

    const updateQuantity = useCallback((productId: number, quantity: number) => {
        updateCart(
            quantity <= 0
                ? cart.filter(item => item.productId !== productId)
                : cart.map(item => (item.productId === productId ? { ...item, quantity } : item))
        );
    }, [cart, updateCart]);

    const clearCart = useCallback(() => updateCart([]), [updateCart]);

    const validateCart = useCallback(async (cartItems: (CartItem & { price?: number })[]) => {
        const ids = cartItems.map(item => item.productId);
        const params = new URLSearchParams({ ids: ids.join(',') });
        if (locale) params.set('locale', locale);
        const response = await fetch(`/api/product/by-ids?${params.toString()}`);
        const data = await response.json() as any;
        return cartItems.map(item => {
            const product = data.find((p: CartProduct) => p.id === item.productId);
            if (!product) {
                throw new Error(`Produto ${item.productId} não encontrado`);
            }

            const currentPrice = getEffectivePrice(product);
            return {
                ...item,
                currentPrice,
                originalPrice: item.price,
                isValid: currentPrice === item.price,
                stock: product.stock,
            };
        });
    }, [locale]);

    const enrichedCart = useMemo(() => {
        return cart.map(item => {
            const product = products.find(p => p.id === item.productId);
            return {
                ...item,
                name: product?.title || 'Produto indisponível',
                price: getEffectivePrice(product),
                image: product?.images?.[0] || NO_IMAGE
            };
        });
    }, [cart, products]);

    const total = useMemo(() => {
        return cart.reduce((sum, item) => {
            const product = products.find(p => p.id === item.productId);
            return sum + getEffectivePrice(product) * item.quantity;
        }, 0);
    }, [cart, products]);

    return {
        cart: enrichedCart,
        total,
        isLoading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        validateCart,
        products,
        updateCart,
    };
}
