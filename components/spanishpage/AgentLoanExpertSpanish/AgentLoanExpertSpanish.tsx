import "@/styles/globals.css";
import "@/styles/globals.css";
import Button from "@/components/common/Button";
import classes from "@/components/homepage/AgentLoanExpert/AgentLoanExpert.module.css";
import Link from "next/link";

const AgentLoanExpertSpanish = () => {
    return (
        <div className="container mx-auto w-full md:mt-12 md:mb-12 mb-0">
            <div className={classes.agentLoanExpertContainer}>
                <div className="items-center grid lg:grid-cols-2 md:grid-cols-0 sm:grid-cols-0 grid-cols-1 md:mt-10 mt-0 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2 ">
                    <div className="lg:text-left sm:text-center text-center md:py-10 py-0">
                        <h4 className="text-white poppins text-3xl font-bold lg:w-[415px] md:w-full sm:w-full w-full">
                            ¿Eres agente o experto en préstamos VA?
                        </h4>
                        <p className="roboto text-[21px] italic font-medium text-white m-0 pt-5">
                            ¿Quieres aparecer en nuestra página?
                        </p>
                        <Link href="/contact" className="md:mt-0 mt-7">
                            <Button buttonText="Regístrate aquí" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentLoanExpertSpanish;
