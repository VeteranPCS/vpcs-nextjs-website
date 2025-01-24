import "@/styles/globals.css";
import Button from "@/components/common/Button";
import Image from "next/image";
import Link from "next/link";

const WhyVeteranPcs = () => {
  return (
    <div className="w-full py-10 bg-[#F4F4F4]">
      <div>
        <div className="container mx-auto w-full">
          <div className="px-4 mx-auto text-center">
            <div>
              <h2 className="text-[#292F6C] font-bold lg:text-[40px] sm:text-[31px] text-[31px] tahoma">
                Why VeteranPCS
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-4 justify-between items-center mt-10">
              <div className="lg:ml-auto">
                <div className="flex gap-4 lg:justify-start sm:justify-center justify-center items-center">
                  <Image
                    width={100}
                    height={100}
                    className="md:w-auto md:h-auto sm:w-[12%] w-12"
                    src="/icon/Moveinbonus.svg"
                    alt="Move in bonus"
                  />
                  <h3 className="text-[#003486] font-bold lg:text-[30px] md:text-[25px] sm:text-[25px] text-[22px] leading-[32px] poppins">
                    MOVE IN <br /> BONUS
                  </h3>
                </div>
                <div className="flex gap-4 lg:justify-start sm:justify-center justify-center items-center my-16">
                  <Image
                    width={100}
                    height={100}
                    className="md:w-auto md:h-auto sm:w-[12%] w-12"
                    src="/icon/checkblue.svg"
                    alt="Move in bonus"
                  />
                  <h3 className="text-[#003486] font-bold lg:text-[30px] md:text-[25px] sm:text-[25px] text-[22px] leading-[32px] poppins">
                    FREE TO USE
                  </h3>
                </div>
                <div className="flex gap-4 lg:justify-start sm:justify-center justify-center items-center">
                  <Image
                    width={100}
                    height={100}
                    className="md:w-auto md:h-auto sm:w-[12%] w-12"
                    src="/icon/Giveback.svg"
                    alt="Move in bonus"
                  />
                  <h3 className="text-[#003486] font-bold lg:text-[30px] md:text-[25px] sm:text-[25px] text-[22px] leading-[32px] poppins">
                    GIVE BACK
                  </h3>
                </div>
              </div>
              <div>
                <div className="flex gap-4 items-center">
                  <Image
                    width={465}
                    height={465}
                    className="w-full h-full"
                    src="/assets/veteranPCS-slider-checks-03.webp"
                    alt="Move in bonus"
                  />
                </div>
              </div>
              <div>
                <div className="flex gap-4 lg:justify-start sm:justify-center justify-center items-center">
                  <Image
                    width={100}
                    height={100}
                    className="md:w-auto md:h-auto sm:w-[12%] w-12"
                    src="/icon/valoanexperts.svg"
                    alt="Move in bonus"
                  />
                  <h3 className="text-[#003486] font-bold lg:text-[30px] md:text-[25px] sm:text-[25px] text-[22px] leading-[32px] poppins">
                    VA LOAN <br /> EXPERTS
                  </h3>
                </div>
                <div className="flex gap-4 lg:justify-start sm:justify-center justify-center items-center my-16">
                  <Image
                    width={100}
                    height={100}
                    className="md:w-auto md:h-auto sm:w-[12%] w-12"
                    src="/icon/Support.svg"
                    alt="Move in bonus"
                  />
                  <h3 className="text-[#003486] font-bold lg:text-[30px] md:text-[25px] sm:text-[25px] text-[22px] leading-[32px] poppins">
                    SUPPORT
                  </h3>
                </div>
                <div className="flex gap-4 lg:justify-start sm:justify-center justify-center items-center">
                  <Image
                    width={100}
                    height={100}
                    className="md:w-auto md:h-auto sm:w-[12%] w-12"
                    src="/icon/Agents.svg"
                    alt="Move in bonus"
                  />
                  <h3 className="text-[#003486] font-bold lg:text-[30px] md:text-[25px] sm:text-[25px] text-[22px] leading-[32px] poppins">
                    AGENTS
                  </h3>
                </div>
              </div>
            </div>
            <div className="mx-auto justify-center text-center flex">
              <Image
                width={100}
                height={100}
                className="md:w-auto md:h-auto sm:w-full sm:h-full w-full h-full my-10 px-14"
                src="/icon/vet-PCS-5-star-review.svg"
                alt="Move in bonus"
              />
            </div>
            <div className="mx-auto justify-center text-center flex">
              <Link href="/#map-container">
                <Button buttonText="Find an Agent" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhyVeteranPcs;
