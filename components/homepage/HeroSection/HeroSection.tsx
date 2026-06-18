import Button from "@/components/common/Button";
import "@/app/globals.css";
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
      <section className={classes.herosectioncontainer} aria-labelledby="home-hero-title">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 items-center justify-between gap-6 lg:grid-cols-2 lg:gap-10">
            <div className="order-1 mx-auto w-full max-w-[680px] text-center lg:mt-8 lg:max-w-none lg:text-left">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-white/90 tahoma">
                Free military-friendly agent matching
              </p>
              <h1 id="home-hero-title" className="text-[2.25rem] font-bold leading-[1.12] text-white tahoma sm:text-[2.75rem] md:text-[3.25rem] lg:text-[3.7rem]">
                {title}
              </h1>
              <p className="mx-auto my-5 max-w-[38rem] text-base font-normal leading-7 text-white tahoma md:text-lg lg:mx-0 lg:my-7">
                {subTitle}
              </p>
              {page == "home" && (
                <p className="mx-auto max-w-[36rem] text-base leading-7 text-white/95 tahoma lg:mx-0">
                  Tell us where you are moving. We will help match you with a vetted agent who understands military moves.
                </p>
              )}
              {page == "spanish" && (
                <div className="hidden md:flex flex-col gap-4 text-white text-lg">
                  <ul className="list-disc list-outside">
                    <li>
                      Encuentra un agente inmobiliario que sea militar, veterano o cónyuge de un militar, que entienda el préstamo VA y hable español.
                    </li>
                    <li>
                      Los miembros del servicio pueden recibir entre $200 y $4,000 al cierre para ayudar con los gastos de la compra de su vivienda.
                    </li>
                  </ul>
                </div>
              )}
              {page == "home" && (
                <div className="mx-auto my-6 flex max-w-[360px] flex-wrap justify-center gap-4 text-center lg:mx-0 lg:my-8 lg:max-w-none lg:justify-start">
                  <div className="flex items-center gap-4">
                    <Image
                      width={6}
                      height={6}
                      src="/icon/checkred.svg"
                      alt=""
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
                      alt=""
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
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:mb-12 lg:justify-start">
                  <Link href="/contact-agent">
                    <Button buttonText="Find An Agent" />
                  </Link>
                  <Link
                    href="#state-map"
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/70 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:text-base"
                  >
                    Browse by State
                  </Link>
                </div>
              )}
              {page == "spanish" && (
                <div className="lg:flex md:flex justify-start items-center gap-4 flex-wrap ">
                  <Link href="#state-map">
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
            <div className="order-2 mx-auto w-full md:mb-12 lg:mb-0">
              <div className="flex justify-center">
                <div className="relative w-full max-w-[873px]">
                  <Image
                    width={873}
                    height={482}
                    src="/assets/house-hero-2024.png"
                    className="h-auto w-full object-contain"
                    alt="A home sold by VeteranPCS"
                    loading="eager"
                    priority
                  />
                  <Image
                    width={533}
                    height={533}
                    src="/assets/veteranPCS-slider-checks-03.png"
                    className="absolute left-1/2 top-3/4 h-auto w-[min(92vw,533px)] -translate-x-1/2 -translate-y-1/2 object-contain md:w-[465px] lg:w-[533px]"
                    alt="A military couple stands in front of their newly purchased home after using a military-friendly realtor from VeteranPCS"
                    loading="eager"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HeroSection;
