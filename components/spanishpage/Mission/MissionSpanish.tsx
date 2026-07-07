import classes from "./Mission.module.css";
import Button from "@/components/common/Button";
import Image from "next/image";
import Link from "next/link";

const MissionSpanish = async () => {

    return (

        <div className="container mx-auto w-full sm:py-16 py-0">
            <div className={classes.missioncontainer}>
                <div
                    className="items-center grid lg:grid-cols-2 grid-cols-1 justify-center md:gap-10 gap-2 md:px-10 px-3 lg:py-12"
                >
                    <div className="flex lg:justify-end justify-center">
                        <Image
                            width={1000}
                            height={1000}
                            src={"/assets/military-image-2.png"}
                            className="w-full max-w-[552px] h-auto object-cover"
                            alt="Dos militares avanzando juntos en el campo"
                        />
                    </div>
                    <div className="text-left">
                        <div>
                            <h2 className="text-white poppins text-[31px] font-bold mt-5 md:text-left sm:text-center text-left">
                                Muévete con una misión
                            </h2>
                            <p className="text-white lg:text-[20px] md:text-[19px] text-[16px] font-normal leading-[30px] mt-4 md:text-left sm:text-center text-left tahoma">
                                VeteranPCS está aquí para ayudarte. Hemos identificado agentes inmobiliarios que hablan español y que son veteranos o cónyuges de militares para ayudarte a comprar o vender una vivienda. Además, como usted es parte de las fuerzas armadas, calificas para un bono de $200 a $4,000 en el cierre para ayudarte con los costos de compra de tu hogar.
                            </p>
                        </div>
                        <Link href="/how-it-works" className="flex md:justify-start sm:justify-center justify-start items-center mt-2">
                            <Button buttonText={"Descubre cómo funciona"} />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MissionSpanish;
