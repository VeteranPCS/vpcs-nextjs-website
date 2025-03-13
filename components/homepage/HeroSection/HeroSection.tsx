import Button from "@/components/common/Button";
import "@/styles/globals.css";
import classes from "./HeroSection.module.css";
import Image from "next/image";
import Link from "next/link";

interface HeroSectionProps {
  title: string;
  subTitle: string;
  page: string;
}

const HeroSection = ({ title, subTitle, page }: HeroSectionProps) => {

  return (
    <div>
      <div className={classes.herosectioncontainer}>
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-4">
            <div className="mx-auto lg:text-left md:text-left sm:text-center text-center w-full sm:order-2 order-2 lg:order-none md:order-none lg:mt-12">
              <h2 className="text-white font-bold lg:text-[59px] md:text-[29px] sm:text-[32px] text-[32px] leading-[1.3] tahoma sm:px-0 md:px-0 sm:mt-24 mt-24 md:mt-10">
                {title}
              </h2>
              <h1 className="lg:text-[18px] md:text-[18px] sm:text-[16px] text-[16px] font-normal text-white lg:my-10 md:my-5 sm:my-10 my-10 tahoma">
                {subTitle}
              </h1>
              {page == "spanish" && (
                <div className="hidden md:flex flex-col gap-4 text-white text-lg">
                  <ul className="list-disc list-outside">
                    <li>
                      Entendemos el desafío de encontrar un agente inmobiliario militar que comprenda el préstamo VA y hable español también.
                    </li>
                    <li>
                      Los miembros militares reciben entre $200 a $4,000 dólares en el cierre de casa para ayudar con los costos de la compra de su hogar.
                    </li>
                  </ul>
                </div>
              )}
              {page == "home" && (
                <div className="flex justify-between xl:justify-start lg:justify-start md:justify-start sm:justify-between gap-4 lg:my-10 md:my-5 sm:my-10 my-10 mx-auto text-center ">
                  <div className="flex items-center gap-4">
                    <Image
                      width={6}
                      height={6}
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
                      width={6}
                      height={6}
                      src="/icon/checkred.svg"
                      alt="check"
                      className="w-6 h-6"
                      loading="eager"
                    />
                    <p className="text-white font-medium text-sm tahoma">
                      Get Cash Back
                    </p>
                  </div>
                </div>
              )}
              {page == "home" && (
                <div className="lg:mt-28 md:mt-4 sm:mt-10 mt-10">
                  <Link href="#map-container">
                    <Button buttonText="Find An Agent" />
                  </Link>
                </div>
              )}
              {page == "spanish" && (
                <div className="lg:flex md:flex justify-start items-center gap-4 flex-wrap ">
                  <Link href="#map-container">
                    <Button buttonText="Explora nuestro mapa" />
                  </Link>
                  <p className="text-white font-normal xl:text-[30px] lg:text-[30px] md:text-[20px] sm:text-[20px] text-[20px] mx-10 xl:w-auto w-full hidden md:block">
                    O
                  </p>
                  <Link href="/contact-agent" className="hidden md:block">
                    <Button buttonText="Encuentra un agente" />
                  </Link>
                </div>
              )}
            </div>
            <div className="mx-auto w-full md:mb-20 lg:mb-0 sm:order-1 order-1 lg:order-none md:order-none">
              <div className="flex justify-center">
                <div className="relative">
                  <Image
                    width={873}
                    height={482}
                    src="/assets/house-hero-2024.png"
                    className="w-[873px] sm:h-[482px] h-[300px] object-contain"
                    alt="A home sold by VeteranPCS"
                    loading="eager"
                  />
                  <Image
                    width={533}
                    height={533}
                    src="/assets/veteranPCS-slider-checks-03.png"
                    className="absolute top-3/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 xl:w-[533px] xl:h-[533px] lg:w-[533px] lg:h-auto md:w-[465px] md:h-auto sm:w-[450px] sm:h-auto w-[400px] h-auto object-cover"
                    alt="A military couple stands in front of their newly purchased home after using a military-friendly realtor from VeteranPCS"
                    loading="eager"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
