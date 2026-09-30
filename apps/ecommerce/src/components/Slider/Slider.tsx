'use client'
import 'swiper/css'
import 'swiper/css/pagination'
import { useConfig } from '@/context/ConfigContext'
import { ISlideTranslated } from '@/lib/schemas/slide'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination } from 'swiper/modules'
import { useMemo } from 'react'
import Image from 'next/image'
import { buildImageUrl, isExternalUrl } from '@/lib/utils'
import { usePathname, Link } from '@/i18n/navigation'


export default function SliderComponent() {
    const { config, slides } = useConfig();
    const pathname = usePathname();

    const isHomePage = pathname === '/';
    const slideHeight = isHomePage ? 'h-[400px] md:h-[700px]' : 'h-[300px] md:h-[350px]';

    const slideLocation = useMemo(() => {
        if (pathname === '/') return 'home';
        if (pathname.startsWith('/category')) return 'category';
        if (pathname.startsWith('/brand')) return 'brand';
        if (pathname.startsWith('/product')) return 'product';
        return 'page';
    }, [pathname]);

    const listaSlides = useMemo(() => {
        if (!slides) return [];

        return slides
            .filter((slide: ISlideTranslated) =>
                Array.isArray(slide.slide_location) && slide.slide_location.includes(slideLocation)
            )
            .sort((a: ISlideTranslated, b: ISlideTranslated) => a.slide_order - b.slide_order);

    }, [slides, slideLocation]);

    return (
        <Swiper
            lazyPreloadPrevNext={1}
            modules={[Autoplay, Pagination]}
            spaceBetween={0}
            slidesPerView={1}
            loop={listaSlides.length > 1}
            autoplay={{ delay: 5000, disableOnInteraction: false }}
            pagination={{
                clickable: true,
                bulletClass: 'swiper-pagination-bullet !bg-white/70 !w-3 !h-3 !mx-1',
                bulletActiveClass: '!bg-white !w-4 !h-4'
            }}
            className={`w-full ${slideHeight}`}
        >
            {listaSlides.map((slide, index) => {
                const buttonStyle = {
                    color: slide.button_text_color || '#FFFFFF',
                    backgroundColor: slide.button_background || 'transparent',
                    border: slide.button_border ? `1px solid ${slide.button_border}` : 'none'
                };
                const buttonClassName = "inline-block px-4 py-2 md:px-7 md:py-3 rounded-full md:text-xl transition-all hover:scale-105 font-medium";
                const hasLink = Boolean(slide.button_link) && slide.button_link !== '#';

                return (
                    <SwiperSlide key={slide.id} className="relative">
                        <div className="w-full h-full relative bg-gray-100 dark:bg-gray-800">
                            <Image src={buildImageUrl(config?.cdn, slide.slide_image)} alt={slide.title || 'Slide'} fill priority={index === 0} loading={index === 0 ? 'eager' : 'lazy'} sizes="100vw" className="object-cover" unoptimized={isExternalUrl(slide.slide_image)} />
                            <div className="absolute inset-0 flex items-center" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                <div className="md:container mx-auto px-4 text-center md:text-left">
                                    <h1 className="text-2xl md:text-5xl font-bold mb-2 md:mb-4"
                                        style={{
                                            color: slide.title_color || '#FFFFFF',
                                            textShadow: '0 2px 8px rgba(0,0,0,0.4)'
                                        }}
                                    >
                                        {slide.title}
                                    </h1>
                                    <p className="text-lg md:text-xl mb-6 md:mb-8 max-w-2xl mx-auto md:mx-0"
                                        style={{
                                            color: slide.subtitle_color || '#FFFFFF',
                                            textShadow: '0 2px 8px rgba(0,0,0,0.4)'
                                        }}
                                    >
                                        {slide.subtitle}
                                    </p>
                                    {hasLink && slide.button_text && (
                                        isExternalUrl(slide.button_link!) ? (
                                            <a href={slide.button_link!} target="_blank" rel="noopener noreferrer" className={buttonClassName} style={buttonStyle}>
                                                {slide.button_text}
                                            </a>
                                        ) : (
                                            <Link prefetch={false} href={{ pathname: slide.button_link as any }} className={buttonClassName} style={buttonStyle}>
                                                {slide.button_text}
                                            </Link>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </SwiperSlide>
                );
            })}
        </Swiper>
    );
}
