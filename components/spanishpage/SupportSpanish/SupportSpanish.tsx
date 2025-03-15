import React from "react";
import "@/app/globals.css";
import Button from "@/components/common/Button";
import Image from "next/image";
import Link from "next/link";

const SupportSpanish = async () => {

  return (
    <div className="mx-auto">
      <div className="w-full lg:py-10 md:py-10 sm:py-10 py-10 px-9 sm:px-0">
        <div>
          <div className="mx-auto w-full container">
            <div
              className="px-4 bg-[#ffffff] mx-auto text-center"
              data-aos="fade-right"
              data-aos-duration="1000"
            >
              <div className="flex justify-center items-center mt-10">
                <div className="flex flex-col lg:flex-row md:flex-row gap-8 justify-between items-center">
                  <div className="lg:text-left sm:text-center text-left flex flex-col gap-4 justify-between px-12">
                    <div>
                      <h2 className="text-[#292F6C] font-bold xl:text-[42px] lg:text-[40px] sm:text-[40px] text-[40px] leading-[54px] tahoma">
                        Ayuda con el préstamo VA
                      </h2>
                    </div>
                    <div>
                      <p className="text-[#161C2Db3] text-[20px] font-normal leading-[39px] tahoma">
                        El beneficio del préstamo VA puede ser difícil de entender. Además, muchas empresas cobran de más a los miembros del servicio y veteranos en tasas y comisiones. VeteranPCS puede ayudarte a ahorrar dinero conectándote con un prestamista hipotecario de préstamo VA que habla español.
                      </p>
                    </div>
                    <div className="flex justify-start">
                      <Link href="/contact-agent">
                        <Button
                          buttonText={"Descubre cómo conectarte con un prestamista"}
                        />
                      </Link>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <Image
                      width={1000}
                      height={1000}
                      className="w-auto h-auto min-w-[400px] min-h-[400px]"
                      src={"/assets/agent-image.png"}
                      alt="Move in bonus"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportSpanish;
