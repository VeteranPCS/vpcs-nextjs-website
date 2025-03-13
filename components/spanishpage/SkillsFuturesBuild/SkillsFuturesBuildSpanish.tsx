import "@/styles/globals.css";
import Button from "@/components/common/Button";
import classes from "@/components/homepage/SkillsFuturesBuild/SkillsFuturesBuild.module.css";
import Link from "next/link";

const SkillFuturesBuildSpanish = () => {
    return (
        <div className="w-full relative lg:mb-8 mb-0">
            <div className={classes.SkillsFuturesBuildContainer}>
                <div className="container mx-auto">
                    <div className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 w-full">
                        <div className="text-center">
                            <h1 className="text-white lg:text-[48px] text-[30px] font-bold poppins px-10 sm:px-0 mb-5">
                                Las habilidades para compartir. Los futuros a construir.
                            </h1>
                            <p className="font-medium text-[18px] leading-[30px] text-white roboto lg:w-full w-[300px] mx-auto">
                                ¿Interesado en comenzar una carrera como agente inmobiliario o oficial de préstamos hipotecarios?
                            </p>
                            <Link href="/internship">
                                <Button buttonText="Infórmate sobre nuestra pasantía" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SkillFuturesBuildSpanish;
