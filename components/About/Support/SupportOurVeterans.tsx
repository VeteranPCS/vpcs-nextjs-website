// "use client";
import React from "react";
import "@/app/globals.css";
import Button from "@/components/common/Button";
import Image from "next/image";
import aboutService from "@/services/aboutService";
import Link from "next/link";
interface ImageAsset {
    image_url?: string;
}

interface ForegroundImage {
    asset?: ImageAsset;
}

export interface SupportComponentProps {
    _id: string;
    image?: ForegroundImage;
    header_1?: string;
    header_2?: string;
    description_1?: string;
    description_2?: string;
    buttonText_1: string;
    buttonText_2: string;
    name?: string;
    designation?: string;
}

const SupportOurVeterans = async () => {
    let pageData: SupportComponentProps | null = null;

    try {
        pageData = await aboutService.fetchSupportComponent();
    } catch (error) {
        console.error("Error fetching Support Spanish Page:", error);
        return <p>Failed to load the Support Spanish Page.</p>;
    }

    return (
        <div>
            <div className="w-full lg:py-10 md:py-10 sm:py-10 py-10 px-9 sm:px-0">
                <div>
                    <div className="container mx-auto w-full">
                        <div
                            className="px-4 bg-[#ffffff] mx-auto text-center"
                            data-aos="fade-right"
                            data-aos-duration="1000"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-4 justify-between items-start mt-10">
                                <div className="lg:text-left sm:text-center text-left flex flex-col gap-4 justify-between">
                                    <div>
                                        <h2 className="text-[#292F6C] font-bold xl:text-[42px] lg:text-[40px] sm:text-[40px] text-[40px] leading-[54px] tahoma">
                                            {pageData?.header_1}
                                        </h2>
                                    </div>
                                    <div>
                                        <p className="text-[#161C2Db3] text-[20px] font-normal leading-[39px] tahoma">
                                            {pageData?.description_1}
                                        </p>
                                    </div>
                                    <div className="flex justify-start">
                                        <Link href="/contact-agent">
                                            <Button
                                                buttonText={pageData?.buttonText_1 || "Default Button"}
                                            />
                                        </Link>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex gap-4 items-center">
                                        <Image
                                            width={1000}
                                            height={1000}
                                            className="w-auto h-auto"
                                            src={
                                                pageData?.image?.asset?.image_url ||
                                                "/assets/military-image-2.png"
                                            }
                                            alt="Move in bonus"
                                        />
                                    </div>
                                </div>
                                <div className="lg:text-left sm:text-left text-left flex flex-col sm:gap-7 gap-4 justify-between lg:ml-5 md:ml-5 sm:ml-0 ml-0">
                                    <div>
                                        <h2 className="text-[#292F6C] font-bold xl:text-[42px] lg:text-[40px] sm:text-[40px] text-[40px] leading-[54px] tahoma">
                                            {pageData?.header_2}
                                        </h2>
                                    </div>
                                    <div>
                                        <p className="text-[#161C2Db3] text-[20px] font-normal leading-[39px] tahoma">
                                            {pageData?.description_2}
                                        </p>
                                    </div>
                                    <Link
                                        href="/impact"
                                        className="flex lg:justify-start md:justify-start sm:justify-start justify-start items-center"
                                    >
                                        <Button
                                            buttonText={pageData?.buttonText_2 || "Default Button"}
                                        />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupportOurVeterans;