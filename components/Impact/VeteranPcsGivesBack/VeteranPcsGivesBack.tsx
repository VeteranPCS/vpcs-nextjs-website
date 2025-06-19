import React from "react";
import Button from "@/components/common/Button";
import classes from "./VeteranPcsGivesBack.module.css";
import Image from "next/image";
import Link from "next/link";

const VeteranPcsGivesBack = () => {
    return (
        <div className={classes.VeteranPcsGivesBackContainer}>
            <div className="container mx-auto px-8">
                <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 gap-10 items-center justify-center">
                    <div className="lg:pl-10 md:pl-0 sm:pl-0 pl-0 sm:order-1 order-2">
                        <div className="md:text-left text-center">
                            <h1 className="text-white font-tahoma lg:text-[42px] md:text-[42px] sm:text-[32px] text-[32px] font-bold leading-[50.4px] capitalize">
                                Veteran<span className="text-white">PCS</span> Gives Back
                            </h1>
                            <p className="text-white font-montserrat lg:text-[26px] md:text-[26px] sm:text-[20px] text-[20px] font-medium pt-6">
                                Every closing <b>$10-$40</b> is donated to military focused charities
                            </p>
                        </div>
                        <div className="mt-5 md:block flex justify-center">
                            <Link href="/charity">
                                <Button buttonText="Charities VeteranPCS Backs" />
                            </Link>
                        </div>
                    </div>
                    <div className="lg:ml-10 md:ml-0 sm:ml-0 ml-0 sm:order-2 order-1">
                        <Image
                            width={1000}
                            height={1000}
                            src="/assets/wear-blue-family.webp"
                            alt="VeteranPCS Gives Back - Military Family with Donation"
                            className="lg:w-[445px] lg:h-[445px] md:w-full md:h-full sm:w-full sm:h-full w-full h-full"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VeteranPcsGivesBack; 