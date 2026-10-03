'use client';
import { useAdminConfig } from '@/context/AdminConfigContext';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { FaPencilAlt, FaTrash, FaPlus, FaEyeSlash, FaEye, FaTags, FaEllipsisV, FaStar, FaSave } from 'react-icons/fa';
import { CreateMetadataRequestInput, IMetadataOutput, UpdateMetadataRequestInput } from '@/lib/schemas/metadata';
import { buildImageUrl, formatPrice, extractData, isValidImageUrl, apiFetch, stripHtmlToText, makeSlug } from '@/lib/utils';
import { TiptapEditor } from '@/components/TiptapEditor/TiptapEditor';
import TableBuilder from '@/components/TableBuilder/TableBuilder';
import { MetadataManager } from '@/components/MetadataManager/MetadataManager';
import { LanguageTabs } from '@/components/LanguageTabs/LanguageTabs';
import { SUPPORTED_LANGUAGES, ADMIN_PAGINATION_DEFAULT, DEFAULT_LANGUAGE } from '@/lib/constants'
import { SupportedLanguage } from '@/lib/types/generic'
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import AdminSearch from '@/components/Features/admin-search';
import ImageWithFallback from '@/components/ImageWithFallback/imageWithFallback';
import { IProductTranslated, ProductFormState, EMPTY_FORM, LocalizedProductFields, IProductImage } from '@/lib/schemas/product';
import { IBrandTranslated } from '@/lib/schemas/brand';
import { ICategoryTranslated } from '@/lib/schemas/category';
import { PlaceholderImage } from '@/components/PlaceholderImage/PlaceholderImage';
import { useRouter } from '@/i18n/navigation'
import { useToast } from '@/components/ToastSystem';
import Pagination from '@/components/Pagination/Pagination';
import { Button } from '@/components/ui/button';
import { loginHref } from '@/i18n/routing';


const TARGET_TYPE = 'product';

const NOTHING_TOUCHED: Record<SupportedLanguage, boolean> = SUPPORTED_LANGUAGES.reduce(
    (acc, lang) => ({ ...acc, [lang]: false }),
    {} as Record<SupportedLanguage, boolean>
);

const ProductComponent = React.memo(function ProductComponent() {
    const t = useTranslations('ProductAdmin');
    const tCommon = useTranslations('AdminCatalog');
    const locale = useLocale() as SupportedLanguage;
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [brands, setBrands] = useState<IBrandTranslated[]>([]);
    const [categories, setCategories] = useState<ICategoryTranslated[]>([]);
    const { config, loading } = useAdminConfig();
    const [saveLoading, setSaveLoading] = useState(false);
    const [products, setProducts] = useState<IProductTranslated[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [showMetadataModal, setShowMetadataModal] = useState(false);
    const [currentMetadata, setCurrentMetadata] = useState<IMetadataOutput | null>(null);
    const { searchTerm } = useGlobalSearch();
    const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
    const [activeLanguage, setActiveLanguage] = useState<SupportedLanguage>(locale);
    const [touchedLanguages, setTouchedLanguages] = useState<Record<SupportedLanguage, boolean>>(NOTHING_TOUCHED);
    const [newImageUrl, setNewImageUrl] = useState<string>('');
    const isMountedRef = useRef(true);
    const { showAlert } = useToast();
    const router = useRouter();
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState<number>(ADMIN_PAGINATION_DEFAULT);
    const [totalProducts, setTotalProducts] = useState(0);
    const [productsLoading, setProductsLoading] = useState(false);
    const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
    const [brandsMap, setBrandsMap] = useState<Record<number, string>>({});
    const [categoriesMap, setCategoriesMap] = useState<Record<number, string>>({});

    useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(searchTerm), 350);
        return () => clearTimeout(id);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, itemsPerPage]);

    // Load brands and categories to select
    useEffect(() => {
        if (loading) return;
        const abort = new AbortController();

        (async () => {
            try {
                const [categoriesData, brandsData] = await Promise.all([
                    apiFetch(`/api/admin/category?locale=${locale}`, { method: 'GET', signal: abort.signal }),
                    apiFetch(`/api/admin/brand?locale=${locale}`, { method: 'GET', signal: abort.signal }),
                ]);

                if (!isMountedRef.current) return;

                const cats: ICategoryTranslated[] = extractData(categoriesData, 'array') ?? [];
                const brs: IBrandTranslated[] = extractData(brandsData, 'array') ?? [];

                setCategories(cats);
                setBrands(brs);
                setCategoriesMap(Object.fromEntries(cats.map(c => [c.id, c.title])));
                setBrandsMap(Object.fromEntries(brs.map(b => [b.id, b.title])));

            } catch (error: any) {
                if (error.name === 'AbortError') return;
                if (!isMountedRef.current) return;
                console.error('error loading categories/brands', error);
                showAlert('danger', tCommon('loadError') ?? error.message);
            }
        })();

        return () => abort.abort();

    }, [loading, locale, showAlert, tCommon]);

    // Load products always on page/limit/search changes
    useEffect(() => {
        if (loading || productsLoading) return;

        const abort = new AbortController();
        const fetchProducts = async () => {
            setProductsLoading(true);
            try {
                const params = new URLSearchParams({ locale, page: String(currentPage), limit: String(itemsPerPage), search: debouncedSearch });
                const data = await apiFetch(`/api/admin/product?${params}`, { method: 'GET', signal: abort.signal });

                if (!isMountedRef.current) return;

                // API returns { items, total }
                const items: IProductTranslated[] = data?.items ?? [];

                setProducts(items);
                setTotalProducts(data?.total ?? 0);

            } catch (error: any) {
                if (error.name === 'AbortError' || !isMountedRef.current) return;

                if (error.status === 401 || error.status === 403) {
                    showAlert('danger', tCommon('sessionExpired'), () => {
                        router.push(loginHref('/admin/product'));
                    });
                } else {
                    console.error('error loading products', error);
                    showAlert(error.status === 400 || error.status === 404 ? 'warning' : 'danger',
                        tCommon('loadError') ?? error.message);
                }
            } finally {
                if (isMountedRef.current) setProductsLoading(false);
            }
        };

        fetchProducts();
        return () => abort.abort();

    }, [loading, locale, currentPage, itemsPerPage, debouncedSearch, showAlert, tCommon, router]);


    const pickDisplayRow = useCallback((rows: IProductTranslated[]): IProductTranslated =>
        rows.find(row => row.translation_language === locale) ?? rows[0],
        [locale]
    );

    const updateLocalizedField = (lang: SupportedLanguage, field: keyof LocalizedProductFields, value: string) => {
        setTouchedLanguages((prev) => ({ ...prev, [lang]: true }));
        setForm((prev) => {
            const translations = { ...prev.translations };
            translations[lang] = { ...translations[lang], [field]: value };
            for (const other of SUPPORTED_LANGUAGES) {
                if (other !== lang && !touchedLanguages[other]) {
                    translations[other] = { ...translations[other], [field]: value };
                }
            }
            return { ...prev, translations };
        });
    };

    const handleTitleChange = (lang: SupportedLanguage, value: string) => {
        setTouchedLanguages((prev) => ({ ...prev, [lang]: true }));
        setForm((prev) => {
            const slugFor = (targetLang: SupportedLanguage) =>
                editMode ? prev.translations[targetLang].slug : makeSlug(value, targetLang, prev.translations[config?.default_language || DEFAULT_LANGUAGE]?.slug ?? '');

            const translations = { ...prev.translations };
            translations[lang] = { ...translations[lang], title: value, slug: slugFor(lang) };

            for (const other of SUPPORTED_LANGUAGES) {
                if (other !== lang && !touchedLanguages[other]) {
                    translations[other] = { ...translations[other], title: value, slug: slugFor(other) };
                }
            }
            return { ...prev, translations };
        });
    };

    const resetForm = useCallback(() => {
        setForm(EMPTY_FORM);
        setTouchedLanguages(NOTHING_TOUCHED);
        setActiveLanguage(locale);
        setEditMode(false);
        setNewImageUrl('');
    }, []);

    const openEditModal = useCallback((row: IProductTranslated) => {
        if (!row?.id) {
            showAlert('danger', t('alerts.loadForEditError'));
            return;
        }

        const translations = { ...EMPTY_FORM.translations };
        const touched: Record<SupportedLanguage, boolean> = { ...NOTHING_TOUCHED };

        for (const lang of SUPPORTED_LANGUAGES) {
            const fields = row.translations?.[lang];
            if (fields) {
                translations[lang] = {
                    title: fields.title ?? '',
                    product_description: fields.product_description ?? '',
                    slug: fields.slug ?? '',
                    specification: fields.specification ?? ''
                };
                touched[lang] = Boolean(fields.title);
            }
        }

        const images: IProductImage[] = (row?.images || []).map((img: any) => ({
            id: img.id,
            image_path: img.image_path ?? img.path,
            image_order: img.image_order ?? 0,
            image_primary: Boolean(img.image_primary ?? false),
            product_id: row.id,
        }));

        setForm({
            id: row?.id,
            sku: row?.sku ?? '',
            cost_price: row?.cost_price ?? null,
            price: row?.price ?? null,
            promotional_price: row?.promotional_price ?? null,
            stock: row?.stock ?? null,
            product_length: row?.product_length ?? null,
            width: row?.width ?? null,
            height: row?.height ?? null,
            product_weight: row?.product_weight ?? null,
            active: Boolean(row?.active),
            category_id: row?.category_id ?? 1,
            brand_id: row?.brand_id ?? 1,
            translations,
            images,
        });

        setTouchedLanguages(touched);
        setEditMode(true);
        setActiveLanguage(locale);
        setShowModal(true);

    }, [t, showAlert, locale]);

    const missingLanguages = useMemo(
        () =>
            SUPPORTED_LANGUAGES.filter(
                (lang) => !form.translations[lang].title || !form.translations[lang].slug
            ),
        [form.translations]
    );

    const hasSavableContent = useMemo(
        () =>
            SUPPORTED_LANGUAGES.some(
                (lang) => form.translations[lang].title && form.translations[lang].slug
            ),
        [form.translations]
    );

    const handleSaveProduct = useCallback(async () => {
        setSaveLoading(true);
        try {
            const payload = {
                sku: form.sku,
                cost_price: form.cost_price ?? 0,
                price: form.price ?? 0,
                promotional_price: form.promotional_price,
                stock: form.stock,
                product_length: form.product_length,
                width: form.width,
                height: form.height,
                product_weight: form.product_weight,
                active: form.active,
                category_id: form.category_id,
                brand_id: form.brand_id,
                translations: form.translations,
                images: form.images.map((img, index) => ({
                    image_path: img.image_path,
                    image_order: index,
                    image_primary: img.image_primary
                })),
            };


            const url = editMode ? `/api/admin/product/${form.id}` : '/api/admin/product';
            const method = editMode ? 'PUT' : 'POST';

            const data = await apiFetch(url, { method: method, body: JSON.stringify(payload) })

            const result = extractData(data, 'array') as IProductTranslated;
            const rows = Array.isArray(result) ? result : (result ? [result] : []);
            const savedRow = pickDisplayRow(rows);

            if (isMountedRef.current) {
                if (editMode) {
                    setProducts((prev) => prev.map((p) => (p.id === form.id ? savedRow : p)));
                } else {
                    setProducts((prev) => [savedRow, ...prev]);
                }

                setShowModal(false);
                resetForm();
                showAlert('success', t('alerts.saveSuccess'));
                setCurrentPage(1);
            }

        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 409) {
                showAlert('warning', t('alerts.saveError'), () => setShowModal(false));
            }
            else if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => { router.push(loginHref('/admin/product')); });
            } else {
                console.error('Error saving category', error);
                showAlert('danger', t('alerts.loadForEditError') ?? error.message);
            }

        } finally {
            setTimeout(() => {
                if (isMountedRef.current) setSaveLoading(false);
            }, 100);
        }
    }, [editMode, form, pickDisplayRow, resetForm, showAlert, t]);

    const handleDelete = useCallback(async (id: number) => {
        if (!confirm(tCommon('confirmDelete'))) return;

        try {
            await apiFetch(`/api/admin/product/${id}`, { method: 'DELETE' });

            if (isMountedRef.current) {
                setProducts((prev) => prev.filter((p) => p.id !== id));
                showAlert('success', t('alerts.deleteSuccess'));
                setCurrentPage(1);
            }

        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/product'));
                });
            } else {
                console.error('Error deleting product', error);
                showAlert('danger', t('alerts.loadForEditError') ?? error.message);
            }
        }
    }, [tCommon, t, showAlert]);

    const toggleActive = useCallback(async (id: number) => {
        setSaveLoading(true);
        try {
            const prod = products.find(p => p.id === id);
            if (prod) {
                const newStatus = !prod.active;
                const data = await apiFetch(`/api/admin/product/${id}`, { method: 'PUT', body: JSON.stringify({ ...prod, active: newStatus }) })

                const updatedRow = pickDisplayRow(extractData(data, 'array') as IProductTranslated[]);

                if (isMountedRef.current) {
                    setProducts(prev => prev.map(p => p.id === id ? updatedRow : p));
                    showAlert('success', t('alerts.saveSuccess'));
                    setCurrentPage(1);
                }
            }

        } catch (error: any) {
            if (!isMountedRef.current) return;
            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/product'));
                });
            } else {
                console.error('Error activating/deactivating product', error);
                showAlert('danger', t('alerts.loadForEditError') ?? error.message);
            }
        } finally {
            setTimeout(() => {
                if (isMountedRef.current) setSaveLoading(false);
            }, 100);
        }
    }, [products, pickDisplayRow, showAlert, t]);

    const openMetadataModal = useCallback(async (prod: IProductTranslated) => {
        const buildLocaleMetadata = (p: IProductTranslated, lang: SupportedLanguage) => {
            const productT = p.translations?.[lang];
            const configT = config?.translations?.[lang];
            const title = productT?.title ?? p.title;
            const description = productT?.product_description ?? p.product_description ?? t('seo.description', { site: configT?.site_name ?? '', title });
            const siteName = configT?.site_name ?? (config?.site_name ?? '');

            const cleanedDescription = stripHtmlToText(description)

            return {
                title: `${siteName} - ${title}`,
                metadata_description: cleanedDescription,
                keywords: title,
                og_title: `${siteName} - ${title}`,
                og_description: cleanedDescription,
                x_title: `${siteName} - ${title}`,
                x_description: cleanedDescription
            };
        };

        const buildDefaultMetadata = (p: IProductTranslated): IMetadataOutput => ({
            target_type: TARGET_TYPE,
            target_id: p.id,
            robots_directive: 'index, follow',
            og_image: p.images?.[0]?.image_path ?? null,
            x_image: p.images?.[0]?.image_path ?? null,
            id: 0,
            translations: SUPPORTED_LANGUAGES.reduce((acc, lang) => {
                acc[lang] = buildLocaleMetadata(p, lang);
                return acc;
            }, {} as Record<SupportedLanguage, ReturnType<typeof buildLocaleMetadata>>)
        });

        try {
            const data = await apiFetch(`/api/admin/metadata/${TARGET_TYPE}/${prod.id}?locale=${locale}`, { method: 'GET' });

            const metadata = extractData(data, 'object');

            if (isMountedRef.current) {
                setCurrentMetadata(metadata ?? buildDefaultMetadata(prod));
                if (!metadata) showAlert('warning', tCommon('newMetadata'));
                setShowMetadataModal(true);
            }

        } catch (error: any) {
            if (!isMountedRef.current) return;

            if (error.status === 404) {
                showAlert('warning', tCommon('newMetadata'));
                setCurrentMetadata(buildDefaultMetadata(prod));
                setShowMetadataModal(true);
            } else if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/product'));
                });
            } else {
                console.error('Error opening metadata modal', error);
                showAlert('warning', tCommon('metadataOpenError') ?? error.message);
            }
        }
    }, [config?.site_name, config?.domain, config?.translations, t, tCommon, showAlert]);

    const handleSaveMetadata = useCallback(async (metadata: CreateMetadataRequestInput | UpdateMetadataRequestInput) => {
        setSaveLoading(true);
        try {
            let url: string;
            let method: 'PUT' | 'POST';
            let body: CreateMetadataRequestInput | UpdateMetadataRequestInput;

            if (currentMetadata?.id) {
                url = `/api/admin/metadata/${TARGET_TYPE}/${currentMetadata.target_id}`;
                method = 'PUT';
                body = metadata;
            } else if (currentMetadata?.target_id) {
                url = '/api/admin/metadata';
                method = 'POST';
                body = { ...metadata, target_type: TARGET_TYPE, target_id: currentMetadata.target_id } as CreateMetadataRequestInput;
            } else {
                throw new Error(tCommon('metadataSaveError'));
            }

            const result = await apiFetch(url, { method, body: JSON.stringify(body) });

            if (!result.success) throw new Error(tCommon('metadataSaveError'));

            if (isMountedRef.current) {
                setCurrentMetadata(extractData(result, 'array') as IMetadataOutput);
                setShowMetadataModal(false);
                showAlert('success', tCommon('metadataSaved'));
                setCurrentPage(1);
            }
            return true;
        } catch (error: any) {
            if (isMountedRef.current) {
                if (error.status === 401 || error.status === 403) {
                    showAlert('danger', tCommon('sessionExpired') ?? error.message, () => {
                        router.push(loginHref('/admin/product'));
                    });
                } else {
                    console.error('Error saving metadata', error);
                    showAlert('danger', tCommon('metadataSaveError') ?? error.message);
                }
            }
            return false;
        } finally {
            setTimeout(() => {
                if (isMountedRef.current) setSaveLoading(false);
            }, 100);
        }
    }, [currentMetadata, showAlert, tCommon]);

    const handleDeleteMetadata = useCallback(async () => {
        if (!currentMetadata?.target_id) return false;

        try {
            await apiFetch(`/api/admin/metadata/${TARGET_TYPE}/${currentMetadata.target_id}`, { method: 'DELETE' });

            if (isMountedRef.current) {
                setCurrentMetadata(null);
                showAlert('success', tCommon('metadataDeleted'));
                setCurrentPage(1);
            }
            return true;
        } catch (error: any) {
            if (!isMountedRef.current) return false;

            if (error.status === 401 || error.status === 403) {
                showAlert('danger', tCommon('sessionExpired'), () => {
                    router.push(loginHref('/admin/product'));
                });
            } else {
                console.error('Error deleting metadata', error);
                showAlert('danger', tCommon('metadataDeleteError') ?? error.message);
            }
            return false;
        }
    }, [currentMetadata, showAlert, t]);

    const columns = useMemo(
        () => [
            { key: 'sku', header: tCommon('sku') },
            {
                key: 'image',
                header: tCommon('image'),
                render: (_: any, row: IProductTranslated) => {
                    const images = row.images ?? [];
                    const image = images.find((img) => img.image_primary) || images[0];
                    const imgSrc = buildImageUrl(config?.cdn, image?.image_path);
                    return (
                        <ImageWithFallback src={imgSrc} alt={row.title} title={imgSrc} width={50} height={50} fallbackComponent={<PlaceholderImage size="sm" className="w-10 h-10" />} className="object-cover rounded" />
                    );
                },
                className: 'hidden md:table-cell'
            },
            { key: 'title', header: tCommon('title'), render: (title: string) => <span className="font-medium">{title}</span> },
            {
                key: 'category_id',
                header: tCommon('category'),
                render: (_: any, row: IProductTranslated) => categoriesMap[row.category_id] ?? 'N/A',
            },
            {
                key: 'brand_id',
                header: tCommon('brand'),
                render: (_: any, row: IProductTranslated) => brandsMap[row.brand_id] ?? 'N/A',
            },
            {
                key: 'price',
                header: tCommon('price'),
                render: (price: number) => formatPrice(price, locale, config?.currency),
            },
            {
                key: 'stock',
                header: tCommon('stock'),
                render: (stock: number | null) => stock ?? 0,
            },
            {
                key: 'actions',
                header: tCommon('actions'),
                render: (_: any, row: IProductTranslated) => (
                    <div className="relative">
                        <div className="inline-flex">
                            <button
                                className="text-gray-600 hover:text-gray-800"
                                title={tCommon('options')}
                                onClick={() => setOpenMenuId((prev) => (prev === row.id ? null : row.id))}
                            >
                                <FaEllipsisV className="h-5 w-5" />
                            </button>
                        </div>
                        {openMenuId === row.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md border border-gray-200 z-50">
                                <div className="py-1">
                                    <button
                                        onClick={() => {
                                            openEditModal(row);
                                            setOpenMenuId(null);
                                        }}
                                        className="text-blue-600 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
                                    >
                                        <FaPencilAlt className="inline h-4 w-4 mr-2" />
                                        {t('editEntity')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            openMetadataModal(row);
                                            setOpenMenuId(null);
                                        }}
                                        className="text-purple-600 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
                                    >
                                        <FaTags className="inline h-4 w-4 mr-2" />
                                        {tCommon('editMetadata')}
                                    </button>
                                    {row.id !== 1 && (
                                        <button
                                            onClick={() => {
                                                handleDelete(row.id);
                                                setOpenMenuId(null);
                                            }}
                                            className="text-red-600 block px-4 py-2 text-sm w-full text-left hover:bg-gray-100"
                                        >
                                            <FaTrash className="inline h-4 w-4 mr-2" />
                                            {t('deleteEntity')}
                                        </button>
                                    )}
                                    <button onClick={() => { toggleActive(row.id); setOpenMenuId(null) }} className={`px-4 py-2 ${row.active ? 'text-green-500 hover:dark:text-gray-500' : 'text-gray-500 hover:text-green-500'} block mr-2 text-sm w-full text-left`} title={row.active ? tCommon('deactivate') : tCommon('activate')}>
                                        {row.active ? <FaEye className="inline h-4 w-4 mr-2" /> : <FaEyeSlash className="inline h-4 w-4 mr-2" />}
                                        {row.active ? tCommon('deactivate') : tCommon('activate')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ),
                className: 'text-right',
            },
        ], [config?.cdn, setCategoriesMap, brandsMap, openMenuId, openEditModal, handleDelete, openMetadataModal, toggleActive, tCommon, t,]);

    if (loading) return <div>{tCommon('loading')}</div>;

    if (!config || !categories || !brands) {
        return (
            <div>
                <h1 className="text-2xl font-bold mb-6">{t('pageTitle')}</h1>
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    <p>{tCommon('loadError')}</p>
                </div>
            </div>
        );
    }

    const currentFields = form.translations[activeLanguage];

    return (
        <div>
            <div className="block lg:hidden max-w-fit p-3">
                <AdminSearch />
            </div>

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold ml-3">{t('pageTitle')}</h1>
                <Button variant={'theme'} size={'default'} className="mr-3" onClick={() => { resetForm(); setShowModal(true); }}>
                    <FaPlus className="h-4 w-4" />
                    {tCommon('add')}
                </Button>
            </div>

            <TableBuilder data={products} columns={columns} emptyMessage={t('noEntities')} />

            <Pagination currentPage={currentPage} totalPages={Math.max(1, Math.ceil(totalProducts / itemsPerPage))} totalItems={totalProducts} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} itemsPerPageOptions={[20, 50, 100]} />

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 overflow-y-auto z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-6xl max-h-[calc(100vh-4rem)] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">{editMode ? t('editEntity') : t('addEntity')}</h2>

                        <LanguageTabs active={activeLanguage} onChange={setActiveLanguage} incomplete={missingLanguages} config={config} />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">{tCommon('sku')} <span className="text-red-500">*</span></label>
                                <input type="text" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} required />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{tCommon('costPrice')} ({config?.currency}) <span className="text-red-500">*</span></label>
                                {/* <input type="number" step="0.01" min="0" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.cost_price ?? ''} onChange={(e) => setForm({ ...form, cost_price: parseFloat(e.target.value) || 0 })} required /> */}
                                <input type="number" step="0.01" min="0" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.cost_price ?? ''} onChange={(e) => setForm({ ...form, cost_price: e.target.value ? parseFloat(e.target.value) : null })} required />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{tCommon('price')} ({config?.currency}) <span className="text-red-500">*</span></label>
                                {/* <input type="number" step="0.01" min="0" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.price ?? ''} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} required /> */}
                                <input type="number" step="0.01" min="0" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.price ?? ''} onChange={(e) => setForm({ ...form, price: e.target.value ? parseFloat(e.target.value) : null })} required />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{tCommon('promotionalPrice')} ({config?.currency})</label>
                                <input type="number" step="0.01" min="0" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.promotional_price ?? ''} onChange={(e) => setForm({ ...form, promotional_price: e.target.value ? parseFloat(e.target.value) : null })} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{tCommon('stock')} <span className="text-red-500">*</span></label>
                                <input type="number" min="0" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.stock ?? ''} onChange={(e) => setForm({ ...form, stock: e.target.value ? parseInt(e.target.value) : null })} required />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{tCommon('category')} <span className="text-red-500">*</span></label>
                                <select className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: parseInt(e.target.value) || 1 })} required>
                                    <option value="0">{tCommon('selectCategory')}</option>
                                    {categories?.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{tCommon('brand')} <span className="text-red-500">*</span></label>
                                <select className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.brand_id} onChange={(e) => setForm({ ...form, brand_id: parseInt(e.target.value) || 1 })} required>
                                    <option value="0">{tCommon('selectBrand')}</option>
                                    {brands?.map((brand) => (
                                        <option key={brand.id} value={brand.id}>
                                            {brand.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{tCommon('length')} (cm)</label>
                                <input type="number" step="0.01" min="0" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.product_length ?? ''} onChange={(e) => setForm({ ...form, product_length: e.target.value ? parseFloat(e.target.value) : null })} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{tCommon('width')} (cm)</label>
                                <input type="number" step="0.01" min="0" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.width ?? ''} onChange={(e) => setForm({ ...form, width: e.target.value ? parseFloat(e.target.value) : null })} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{tCommon('height')} (cm)</label>
                                <input type="number" step="0.01" min="0" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.height ?? ''} onChange={(e) => setForm({ ...form, height: e.target.value ? parseFloat(e.target.value) : null })} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{tCommon('weight')} (kg)</label>
                                <input type="number" step="0.01" min="0" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={form.product_weight ?? ''} onChange={(e) => setForm({ ...form, product_weight: e.target.value ? parseFloat(e.target.value) : null })} />
                            </div>

                            <div className="flex items-center">
                                <input type="checkbox" id="active" className="h-4 w-4 text-blue-600 rounded" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                                <label htmlFor="active" className="ml-2 block text-sm font-medium">{tCommon('activate')}</label>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">{tCommon('title')} <span className="text-red-500">*</span></label>
                                <input type="text" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={currentFields.title} onChange={(e) => handleTitleChange(activeLanguage, e.target.value)} required />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">{tCommon('slug')} <span className="text-red-500">*</span></label>
                                <input type="text" className="w-full p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={currentFields.slug} onChange={(e) => updateLocalizedField(activeLanguage, 'slug', e.target.value)} required />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">{tCommon('description')}</label>
                                <TiptapEditor content={currentFields.product_description || ''} onChange={(html) => updateLocalizedField(activeLanguage, 'product_description', html)} className="mt-1 dark:border-gray-700" />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">{tCommon('specification')}</label>
                                <TiptapEditor content={currentFields.specification || ''} onChange={(html) => updateLocalizedField(activeLanguage, 'specification', html)} className="mt-1 dark:border-gray-700" />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">{tCommon('images')} <span className="text-xs text-gray-700 dark:text-gray-400">(600x600)</span></label>
                                <div className="flex gap-2">
                                    <input type="text" className="flex-1 p-2 border dark:border-gray-700 rounded dark:bg-gray-700" value={newImageUrl} placeholder="https://path/to/image.png" onChange={(e) => setNewImageUrl(e.target.value)} />
                                    <button type="button" className="px-3 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 hover:dark:bg-gray-800"
                                        onClick={() => {
                                            if (isValidImageUrl(newImageUrl)) {
                                                const novaImg: IProductImage = {
                                                    id: 0,
                                                    product_id: form.id as number,
                                                    image_path: newImageUrl,
                                                    image_order: form.images.length,
                                                    image_primary: form.images.length === 0,
                                                };
                                                setForm((prev) => ({
                                                    ...prev,
                                                    images: [...prev.images, novaImg],
                                                }));
                                                setNewImageUrl('');
                                            } else {
                                                alert(tCommon('invalidImage'));
                                            }
                                        }}
                                    >
                                        +
                                    </button>
                                </div>

                                {form.images.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {form.images.map((img, index) => (
                                            <div key={index} className="relative group">
                                                <ImageWithFallback src={buildImageUrl(config?.cdn, img.image_path)} alt={img.image_path || tCommon('imageNotAvailable')} width={80} height={80} fallbackComponent={<PlaceholderImage size="sm" className="h-30 w-full border dark:border-gray-700 rounded" />} className={`h-20 w-20 object-cover rounded border ${img.image_primary ? 'ring-2 ring-blue-500' : ''}`} />

                                                <div className="absolute bottom-0 left-0 right-0 flex justify-center space-x-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button type="button" title={tCommon('setAsMain')} className={`${img.image_primary ? 'bg-blue-500 text-white' : 'bg-gray-400 text-gray-200'} rounded-full p-1`}
                                                        onClick={() => {
                                                            const reordered = form.images.map((item, i) => ({
                                                                ...item,
                                                                image_primary: i === index,
                                                                image_order: i,
                                                            }));
                                                            setForm((prev) => ({ ...prev, images: reordered }));
                                                        }}
                                                    >
                                                        <FaStar className="h-3 w-3" />
                                                    </button>
                                                    <button type="button" className="bg-red-500 text-white rounded-full p-1" title={tCommon('remove')}
                                                        onClick={() => {
                                                            const newImages = form.images.filter((_, i) => i !== index);
                                                            const reordered = newImages.map((item, i) => ({
                                                                ...item,
                                                                image_order: i,
                                                                image_primary: i === 0,
                                                            }));
                                                            setForm((prev) => ({ ...prev, images: reordered }));
                                                        }}
                                                    >
                                                        <FaTrash className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant={'outline'} size={'default'} onClick={() => { setShowModal(false); resetForm(); }}>{tCommon('cancel')}</Button>
                            <Button variant={'theme'} size={'default'} onClick={handleSaveProduct} disabled={!hasSavableContent || !form.sku || saveLoading}>
                                <FaSave className="h-4 w-4 mx-1" />
                                {saveLoading
                                    ? editMode
                                        ? tCommon('updating')
                                        : tCommon('saving')
                                    : editMode
                                        ? tCommon('update')
                                        : tCommon('save')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showMetadataModal && currentMetadata && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold dark:font-normal">{tCommon('metadataOf', { title: currentMetadata.translations?.[locale]?.title || 'Product' })}</h2>
                            <button onClick={() => setShowMetadataModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">&times;</button>
                        </div>
                        <MetadataManager targetType={TARGET_TYPE} targetId={currentMetadata.target_id} onSave={handleSaveMetadata} onDelete={handleDeleteMetadata} initialMetadata={currentMetadata} setShowMetadataModal={setShowMetadataModal} />
                    </div>
                </div>
            )}
        </div>
    );
});

export default ProductComponent;
