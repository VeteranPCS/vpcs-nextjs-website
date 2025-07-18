import React from "react";
import "@/app/globals.css";
import classes from "./PcsResources.module.css";
import Image from "next/image";

interface PcsResourcesCustomizableProps {
    headerText: string;
    subText?: string;
    className?: string;
}

const PcsResourcesCustomizable: React.FC<PcsResourcesCustomizableProps> = ({
    headerText,
    subText = "Together we'll make it home",
    className = "",
}) => {
    return (
        <div className={`relative ${className}`}>
            <div className={classes.pcsresourcesherosectioncontainer}>
                <div className="container mx-auto px-5">
                    <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-4">
                        <div className="mx-auto lg:text-left md:text-left sm:text-leeft text-leeft w-full sm:order-2 order-2 lg:order-none md:order-none">
                            <h1 className="text-white font-bold lg:text-[59px] md:text-[29px] sm:text-[32px] text-[32px] poppins mb-5 tahoma leading-[1.3]">
                                {headerText}
                            </h1>
                            <p className="lg:text-[18px] md:text-[18px] sm:text-[16px] text-[16px] font-normal text-white poppins mb-10 tahoma">
                                {subText}
                            </p>
                            <div className="flex justify-between xl:justify-start lg:justify-start md:justify-start sm:justify-between gap-4 mb-10 mt-10 mx-auto text-center">
                                <div className="flex items-center gap-4">
                                    <Image
                                        width={100}
                                        height={100}
                                        src="/icon/checkred.svg"
                                        alt="check"
                                        className="w-6 h-6"
                                        loading="eager"
                                    />
                                    <p className="text-white font-medium text-sm tahoma">
                                        Free To Use
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
                                    <p className="text-white font-medium text-sm tahoma">
                                        Veteran Approved
                                    </p>
                                </div>
                            </div>
                            <div className="absolute sm:bottom-[-15%] bottom-[-30%] xl:left-[41%] lg:left-[35%] md:left-[35%] sm:left-[27%] left-[27%] translate-[-45%] ">
                                <Image
                                    width={1000}
                                    height={1000}
                                    src="/icon/VeteranPCS-logo_wht-outline.svg"
                                    alt="Description of the image"
                                    className="lg:w-[250px] lg:h-[250px] md:w-[250px] md:h-[250px] sm:w-[250px] sm:h-[250px] w-[200px] h-[200px]"
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

export default PcsResourcesCustomizable; 