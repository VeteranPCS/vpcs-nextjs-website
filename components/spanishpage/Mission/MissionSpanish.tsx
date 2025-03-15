import "@/app/globals.css";
import classes from "./Mission.module.css";
import Button from "@/components/common/Button";
import Image from "next/image";
import Link from "next/link";

const MissionSpanish = async () => {

    return (

        <div className="container mx-auto w-full lg:py-16 md:py-16 sm:py-16 py-0">
            <div className={classes.missioncontainer}>
                <div
                    className="items-center grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1
           grid-cols-1 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 xl:px-10 lg:px-10 md:px-10 sm:px-3 px-3 lg:py-12"
                >
                    <div className="flex lg:justify-end justify-center">
                        <Image
                            width={1000}
                            height={1000}
                            src={"/assets/military-image-2.png"}
                            className="lg:w-[552px] lg:h-[552px] md:w-[552px] md:h-[552px] sm:w-[326px] sm:h-[326px] w-[326px] h-[326px] object-cover"
                            alt="Description of the image"
                        />
                    </div>
                    <div className="text-left">
                        <div>
                            <h2 className="text-white poppins lg:text-[31px] md:text-[31px] sm:text-[31px] text-[31px] font-bold mt-5 lg:text-left md:text-left sm:text-center text-left">
                                Muévete con una misión
                            </h2>
                            <p className="text-white lg:text-[20px] md:text-[19px] sm:text-[16px] text-[16px] font-normal leading-[30px] mt-4 lg:text-left md:text-left sm:text-center text-left tahoma">
                                VeteranPCS está aquí para ayudarte. Hemos identificado agentes inmobiliarios que hablan español y que son veteranos o cónyuges de militares para ayudarte a comprar o vender una vivienda. Además, como usted es parte de las fuerzas armadas, calificas para un bono de $200 a $4,000 en el cierre para ayudarte con los costos de compra de tu hogar.
                            </p>
                        </div>
                        <Link href="/how-it-works" className="flex lg:justify-start md:justify-start sm:justify-center justify-start items-center mt-2">
                            <Button buttonText={"Descubre cómo funciona"} />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MissionSpanish;
