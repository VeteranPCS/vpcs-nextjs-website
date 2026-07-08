import React from "react";
import classes from "@/components/Charity/CharityHeroSection.module.css";
import Image from "next/image";

const HeroSec = () => {
    return (
        <div className="relative">
            <div className={classes.charityherosectioncontainer}>
                <div className="container mx-auto px-5">
                    <div className="grid lg:grid-cols-2 grid-cols-1 items-start justify-between gap-4">
                        <div className="mx-auto md:text-left sm:text-center text-left w-full order-2 md:order-none">
                            <h1 className="text-white font-bold lg:text-[59px] md:text-[29px] text-[40px] poppins mb-5 leading-[1.3]">
                                Veterans Give Back
                            </h1>
                            <p className="md:text-[18px] text-[16px] font-normal text-white poppins mb-10">
                                Every closing $20-$400 is donated to military focused charities
                            </p>
                            <div className="flex justify-between md:justify-start gap-4 mb-10 mt-10 mx-auto text-center">
                                <div className="flex items-center gap-4">
                                    <Image
                                        width={100}
                                        height={100}
                                        src="/icon/checkred.svg"
                                        alt="check"
                                        className="w-6 h-6"
                                        loading="eager"
                                    />
                                    <p className="text-white font-medium text-sm">
                                        Trusted Charities
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Image
                                        width={100}
                                        height={100}
                                        src="/icon/checkred.svg"
                                        alt="check"
                                        className="w-6 h-6"
                                        loading="eager"
                                    />
                                    <p className="text-white font-medium text-sm">
                                        Trusted Partners
                                    </p>
                                </div>
                            </div>
                            <div className="absolute sm:bottom-[-15%] bottom-[-23%] xl:left-[41%] md:left-[35%] left-[27%]">
                                <Image
                                    width={1000}
                                    height={1000}
                                    src="/icon/VeteranPCS-logo_wht-outline.svg"
                                    alt=""
                                    className="sm:w-[250px] w-[200px] h-auto"
                                    loading="eager"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Image
                                width={583}
                                height={444}
                                src="/assets/impact_wearblue.png"
                                alt="impact_wearblue"
                                className="w-[583px] h-[444px] sm:block hidden"
                                loading="eager"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeroSec;
