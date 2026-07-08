"use client"
import React from "react";
import classes from "./BlogCts.module.css";
import Button from "@/components/common/Button";
import Image from "next/image";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";

const StatePageHeroSecondSection = () => {
    return (
        <div className={classes.BlogCtsContainer}>
            <div className="container mx-auto">
                <div className="grid lg:grid-cols-2 grid-cols-1 items-center justify-between gap-4 mt-10">
                    <div>
                        <div>
                            <h2 className="text-[#FFFFFF] md:text-[40px] text-[30px] font-bold">Buying Or Selling</h2>
                        </div>
                        <TrackedCtaLink
                            href="/#state-map"
                            cta={{
                                ctaId: 'blog_landing_agent_cta',
                                ctaIntent: 'state_map',
                                ctaPosition: 'blog_landing_cta_band',
                                ctaComponent: 'blog_cta_band',
                                ctaLabel: 'Find An Agent',
                                destination: '/#state-map',
                                pageType: 'blog_landing',
                            }}
                        >
                            <Button buttonText="Find An Agent" />
                        </TrackedCtaLink>
                        <div>
                            <h2 className="text-[#FFFFFF] md:text-[40px] text-[30px] font-bold">VA Loan Expert</h2>
                        </div>
                        <TrackedCtaLink
                            href="/#state-map"
                            cta={{
                                ctaId: 'blog_landing_lender_cta',
                                ctaIntent: 'state_map',
                                ctaPosition: 'blog_landing_cta_band',
                                ctaComponent: 'blog_cta_band',
                                ctaLabel: 'Find A Lender',
                                destination: '/#state-map',
                                pageType: 'blog_landing',
                            }}
                        >
                            <Button buttonText="Find A Lender" />
                        </TrackedCtaLink>
                    </div>
                    <div>
                        <div>
                            <Image src="/assets/blogpcsright.png" alt="VeteranPCS move-in bonus check presented to a military family" width={1000} height={1000} sizes="710px" className="w-auto h-auto object-cover" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatePageHeroSecondSection;
