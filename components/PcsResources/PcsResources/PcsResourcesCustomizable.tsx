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
                    <div className="grid lg:grid-cols-2 grid-cols-1 items-start justify-between gap-4">
                        <div className="mx-auto text-left w-full order-2 md:order-none">
                            <h1 className="text-white font-bold lg:text-[59px] md:text-[29px] text-[32px] poppins mb-5 tahoma leading-[1.3]">
                                {headerText}
                            </h1>
                            <p className="md:text-[18px] text-[16px] font-normal text-white poppins mb-10 tahoma">
                                {subText}
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
                            <div className="absolute sm:bottom-[-15%] bottom-[-30%] xl:left-[41%] md:left-[35%] left-[27%]">
                                <Image
                                    width={1000}
                                    height={1000}
                                    src="/icon/VeteranPCS-logo_wht-outline.svg"
                                    alt="Description of the image"
                                    className="sm:w-[250px] w-[200px] h-auto"
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