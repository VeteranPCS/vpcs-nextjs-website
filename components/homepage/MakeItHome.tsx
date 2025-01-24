import Button from "@/components/common/Button";
import "@/styles/globals.css";
import "aos/dist/aos.css";
import Image from "next/image";
import Link from "next/link";

const MilitaryHomePage = () => {
  return (
    <div className="bg-[#F4F4F4]">
      <div className="container mx-auto px-8">
        <div className="flex flex-col md:flex-row items-center justify-center py-10 md:py-20">
          <div className="w-full md:w-1/2 lg:pr-10 md:pr-6 flex justify-center">
            <Image
              width={400}
              height={400}
              src="/assets/makeitwork.webp"
              alt="Military Family"
              className="w-[400px] h-[400px]"
            />
          </div>
          <div className="w-full md:w-1/2 mt-10 md:mt-0">
            <h1 className="lg:text-left md:text-left sm:text-center text-center text-3xl font-bold text-navy-500 mb-4 text-[#292F6C] poppins leading-[31px]">
              Together we&apos;ll make it home
            </h1>
            <p className="lg:text-left md:text-left sm:text-center text-center text-xl font-medium text-[#292F6C] italic mb-6 leading-[24px] roboto">
              Your service is your down payment
            </p>
            <ul className="list-disc text-[#7A7A7A] mb-8">
              <li className="list-none text-[17px] md:font-medium sm:font-normal font-normal roboto">
                Many companies prey on our military community
              </li>
              <li className="list-none text-[17px] md:font-medium sm:font-normal font-normal roboto">
                We&apos;ve hand selected veteran and military spouse VA loan
                experts to help guide you whether you&apos;re a first-time home
                buyer or experienced.
              </li>
            </ul>
            <Link
              href="/contact-lender"
              className="flex lg:justify-start md:justify-start sm:justify-center justify-center"
            >
              <Button buttonText="Contact VA Loan Expert" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MilitaryHomePage;
