import React from "react";
import "@/app/globals.css";
import styles from "./RefinancingHero.module.css";
import Image from "next/image";
import Link from "next/link";
import Button from "@/components/common/Button";

const RefinancingHero = () => {
    return (
        <div className="relative">
            <div className={styles.refinancingHeroContainer}>
                <div className="container mx-auto px-5">
                    <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-center justify-between gap-8">
                        <div className="mx-auto lg:text-left md:text-left sm:text-left text-left w-full">
                            <h1 className="text-white font-bold lg:text-[59px] md:text-[45px] sm:text-[36px] text-[32px] poppins mb-5 tahoma leading-[1.2]">
                                VA Loan Refinancing Made Simple
                            </h1>
                            <p className="lg:text-[20px] md:text-[18px] sm:text-[16px] text-[16px] font-normal text-white poppins mb-10 tahoma max-w-lg leading-8">
                                Lower your mortgage rate with the VA Streamline IRRRL. No income verification, no appraisal, and closing costs rolled into your loan. Close in as little as 10-14 business days.
                            </p>
                            <div className="flex flex-wrap gap-4 mb-10 mt-8">
                                <Link href="/contact-lender">
                                    <Button buttonText="Connect with a Lender" />
                                </Link>
                                <Link
                                    href="#how-it-works"
                                    className="px-6 bg-white text-[#292F6C] rounded-lg py-3 text-base font-medium hover:bg-gray-100 transition-colors h-full my-auto"
                                >
                                    Learn More
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RefinancingHero;
