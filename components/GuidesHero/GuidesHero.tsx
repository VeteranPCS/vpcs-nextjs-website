import React from "react";
import "@/app/globals.css";
import styles from "./GuidesHero.module.css";
import Image from "next/image";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";

const GuidesHero = () => {
    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div className="relative">
            <div className={styles.guidesHeroContainer}>
                <div className="container mx-auto px-5">
                    <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-center justify-between gap-8">
                        <div className="mx-auto lg:text-left md:text-left sm:text-left text-left w-full">
                            <h1 className="text-white font-bold lg:text-[59px] md:text-[45px] sm:text-[36px] text-[32px] poppins mb-5 tahoma leading-[1.2]">
                                VeteranPCS Guides
                            </h1>
                            <p className="lg:text-[20px] md:text-[18px] sm:text-[16px] text-[16px] font-normal text-white poppins mb-10 tahoma max-w-lg">
                                Resources designed to help military families navigate PCS moves, home buying, VA loans, and more
                            </p>
                            <div className="flex flex-wrap gap-4 mb-10 mt-8">
                                <TrackedCtaLink
                                    href="/guides#va-loan-guide"
                                    className="px-6 bg-[#8B2D2D] text-white rounded-lg py-3 text-base font-medium hover:bg-[#722424] transition-colors"
                                    cta={{
                                        ctaId: 'guides_hero_va_loan',
                                        ctaIntent: 'guide_section_navigation',
                                        ctaPosition: 'guides_hero',
                                        ctaComponent: 'guides_hero',
                                        ctaLabel: 'VA Loan',
                                        destination: '/guides#va-loan-guide',
                                        pageType: 'guides',
                                        guideId: 'va_loan_guide',
                                    }}
                                >
                                    VA Loan
                                </TrackedCtaLink>
                                <TrackedCtaLink
                                    href="/guides#homebuyer-guide"
                                    className="px-6 bg-[#8B2D2D] text-white rounded-lg py-3 text-base font-medium hover:bg-[#722424] transition-colors"
                                    cta={{
                                        ctaId: 'guides_hero_homebuyer',
                                        ctaIntent: 'guide_section_navigation',
                                        ctaPosition: 'guides_hero',
                                        ctaComponent: 'guides_hero',
                                        ctaLabel: 'First Time Home Buyer',
                                        destination: '/guides#homebuyer-guide',
                                        pageType: 'guides',
                                        guideId: 'first_time_homebuyer_guide',
                                    }}
                                >
                                    First Time Home Buyer
                                </TrackedCtaLink>
                            </div>
                        </div>
                        <div className="hidden lg:flex justify-end items-center">
                            <div className={styles.guidesImageContainer}>
                                <Image
                                    src="/assets/guides.webp"
                                    alt="VeteranPCS Guides"
                                    width={550}
                                    height={350}
                                    className="object-contain"
                                    loading="eager"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GuidesHero;
