import Button from "@/components/common/Button";
import classes from "@/components/homepage/SkillsFuturesBuild/SkillsFuturesBuild.module.css";
import Link from "next/link";

const SkillFuturesBuildSpanish = () => {
    return (
        <div className="w-full lg:mb-8 mb-0">
            <div className={`${classes.SkillsFuturesBuildContainer} flex items-center`}>
                <div className="w-full text-center py-16 md:py-24">
                    <h1 className="text-white lg:text-[48px] text-[30px] font-bold poppins px-10 sm:px-0 mb-5">
                        Las habilidades para compartir. Los futuros a construir.
                    </h1>
                    <p className="font-medium text-[18px] leading-[30px] text-white roboto w-full mx-auto">
                        ¿Interesado en comenzar una carrera como agente inmobiliario o oficial de préstamos hipotecarios?
                    </p>
                    <Link href="/internship">
                        <Button buttonText="Infórmate sobre nuestra pasantía" />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default SkillFuturesBuildSpanish;
