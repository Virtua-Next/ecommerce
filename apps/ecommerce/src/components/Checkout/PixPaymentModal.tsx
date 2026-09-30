'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';


export type PixPaymentModalProps = {
    locale: string;
    config: any;
    barcode?: string;
    kind?: 'pix' | 'boleto';
    open: boolean;
    onClose: () => void;
    qrCode?: string;            /** Code "copy and past" (payment_method.qr_code) */
    qrCodeBase64?: string;      /** base64 QR image, no data prefix: (payment_method.qr_code_base64) */
    ticketUrl?: string;         /** Mercado Pago alternative pdf page */
    expiresAt?: string | null;
    amount?: number;
};

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, [tabindex]:not([tabindex="-1"])';

function formatRemaining(ms: number) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

export default function PixPaymentModal({ locale, config, kind, barcode, open, onClose, qrCode, qrCodeBase64, ticketUrl, expiresAt, amount }: PixPaymentModalProps) {
    const t = useTranslations('PixModal');
    const dialogRef = useRef<HTMLDivElement>(null);
    const codeRef = useRef<HTMLTextAreaElement>(null);
    const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [copied, setCopied] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    const expiresMs = expiresAt ? Date.parse(expiresAt) : NaN;
    const hasExpiry = Number.isFinite(expiresMs);
    const remaining = hasExpiry ? expiresMs - now : null;
    const expired = remaining !== null && remaining <= 0;
    const currency = new Intl.NumberFormat(locale, { style: 'currency', currency: config.currency });

    useEffect(() => {
        if (!open || !hasExpiry || expired) return;
        setNow(Date.now());
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [open, hasExpiry, expired]);

    useEffect(() => {
        if (!open) return;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        dialogRef.current?.focus();

        return () => {
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus?.();
        };
    }, [open]);

    useEffect(() => {
        if (!open) setCopied(false);
    }, [open]);

    useEffect(() => {
        return () => {
            if (copiedTimer.current) clearTimeout(copiedTimer.current);
        };
    }, []);

    if (!open) return null;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
            return;
        }
        if (e.key !== 'Tab') return;

        const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (!nodes || nodes.length === 0) return;

        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement;

        if (e.shiftKey && (active === first || active === dialogRef.current)) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
        }
    };

    const handleCopy = async () => {
        if (!qrCode && !barcode) return;
        const copyData = kind === 'boleto' ? barcode : qrCode;
        
        if (!copyData) return;

        try {
            await navigator.clipboard.writeText(copyData);
        } catch {
            // Fallback: seleciona o texto para o usuário copiar manualmente
            codeRef.current?.select();
            try {
                if (!document.execCommand('copy')) return;
            } catch {
                return;
            }
        }

        setCopied(true);
        if (copiedTimer.current) clearTimeout(copiedTimer.current);
        copiedTimer.current = setTimeout(() => setCopied(false), 2500);
    };

    const focusRing = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700';

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="pix-modal-title" tabIndex={-1} onKeyDown={handleKeyDown} className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 text-neutral-900 shadow-xl outline-none sm:max-w-md sm:rounded-2xl dark:bg-neutral-900 dark:text-neutral-50">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 id="pix-modal-title" className="text-lg font-semibold">{kind === 'boleto' ? t('titleBoleto') : t('title')}</h2>
                        {typeof amount === 'number' && (
                            <p className="mt-1 text-2xl font-semibold tabular-nums">{currency.format(amount)}</p>
                        )}
                    </div>
                    <button type="button" onClick={onClose} aria-label={t('close')} className={`-m-2 rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-50 ${focusRing}`}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {expired ? (
                    <div className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                        {kind === 'boleto' ? t('expiredBoleto') : t('expired')}
                    </div>
                ) : (
                    <>
                        {kind === 'boleto' && barcode && (
                            <div className="mt-5">
                                <label htmlFor="boleto-barcode" className="text-sm font-medium">{t('barcodeLabel')}</label>
                                <textarea
                                    id="boleto-barcode"
                                    readOnly
                                    rows={2}
                                    value={barcode}
                                    onFocus={(e) => e.currentTarget.select()}
                                    className="mt-1.5 w-full resize-none rounded-lg border border-neutral-300 bg-neutral-50 p-2.5 font-mono text-xs break-all dark:border-neutral-700 dark:bg-neutral-800"
                                />
                                <button type="button" onClick={handleCopy} className="mt-3 w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800">
                                    {copied ? t('copied') : t('copyBarcode')}
                                </button>
                            </div>
                        )}

                        {kind === 'pix' && qrCodeBase64 && qrCode && (
                            <div className="mt-5">
                                {hasExpiry && remaining !== null && (
                                    <p role="timer" aria-live="off" className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                                        {t('expiresIn')}{' '}
                                        <span className="font-medium tabular-nums text-neutral-900 dark:text-neutral-50">
                                            {formatRemaining(remaining)}
                                        </span>
                                    </p>
                                )}

                                <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">{t('instructions')}</p>

                                <div className="mx-auto mt-4 w-fit rounded-xl border border-neutral-200 bg-white p-3">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={`data:image/png;base64,${qrCodeBase64}`}
                                        alt={t('qrAlt')}
                                        width={208}
                                        height={208}
                                        className="h-52 w-52"
                                    />
                                </div>

                                <div className="mt-5">
                                    <label htmlFor="pix-copy-paste" className="text-sm font-medium">
                                        {t('codeLabel')}
                                    </label>
                                    <textarea
                                        id="pix-copy-paste"
                                        ref={codeRef}
                                        readOnly
                                        rows={3}
                                        value={qrCode}
                                        onFocus={(e) => e.currentTarget.select()}
                                        className={`mt-1.5 w-full resize-none rounded-lg border border-neutral-300 bg-neutral-50 p-2.5 font-mono text-xs break-all text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 ${focusRing}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className={`mt-3 w-full rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-800 ${focusRing}`}
                                    >
                                        {copied ? t('copied') : t('copyCode')}
                                    </button>
                                    <p role="status" aria-live="polite" className="sr-only">
                                        {copied ? t('copied') : ''}
                                    </p>
                                </div>

                            </div>
                        )}

                        {ticketUrl && (
                            <a href={ticketUrl} target="_blank" rel="noopener noreferrer" className={`mt-3 block rounded-lg border border-neutral-300 px-4 py-2.5 text-center text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800 ${focusRing}`}>
                                {kind === 'boleto' ? t('downloadBoleto') : t('openTicket')}
                            </a>
                        )}
                        <p className="mt-5 text-xs text-neutral-500 dark:text-neutral-400">{kind === 'boleto' ? t('afterPaymentBoleto') : t('afterPayment')}</p>
                    </>
                )}

                <button
                    type="button"
                    onClick={onClose}
                    className={`mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 ${focusRing}`}
                >
                    {t('close')}
                </button>
            </div>
        </div>
    );
}
