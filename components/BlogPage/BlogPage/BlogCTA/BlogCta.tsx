"use client"
import React from "react";
import "@/app/globals.css";
import classes from "./BlogCts.module.css";
import Button from "@/components/common/Button";
import Image from "next/image";
import Link from "next/link";

const StatePageHeroSecondSection = () => {
    return (
        <div className={classes.BlogCtsContainer}>
            <div className="container mx-auto">
                <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-center justify-between gap-4 mt-10">
                    <div>
                        <div>
                            <h2 className="text-[#FFFFFF] tahoma lg:text-[40px] md:text-[40px] sm:text-[30px] text-[30px] font-bold">Buying Or Selling</h2>
                        </div>
                        <Link href="/#map-container">
                            <Button buttonText="Find An Agent" />
                        </Link>
                        <div>
                            <h2 className="text-[#FFFFFF] tahoma lg:text-[40px] md:text-[40px] sm:text-[30px] text-[30px] font-bold">VA Loan Expert</h2>
                        </div>
                        <Link href="/#map-container">
                            <Button buttonText="Find A Lender" />
                        </Link>
                    </div>
                    <div>
                        <div>
                            <Image src="/assets/blogpcsright.png" alt="Description of the image" width={1000} height={1000} className="w-auto h-auto object-cover" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatePageHeroSecondSection;
