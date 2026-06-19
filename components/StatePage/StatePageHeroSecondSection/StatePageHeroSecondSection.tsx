import React from "react";
import "@/app/globals.css";
import Image from "next/image";

interface StatePageHeroSecondSectionProps {
  stateName: string;
}

const StatePageHeroSecondSection = ({ stateName }: StatePageHeroSecondSectionProps) => {
  const benefits = [
    {
      icon: "/icon/userpluswhite.svg",
      title: "VA Loan Lender",
      body: "Veteran and military spouse lenders who understand PCS timelines.",
    },
    {
      icon: "/icon/dollar.svg",
      title: "Don't Overpay",
      body: "Clear guidance on costs, credits, and lender options.",
    },
    {
      icon: "/icon/userswhite.svg",
      title: "Assistance",
      body: "Help with paperwork, communication, and next steps.",
    },
  ];

  return (
    <section className="hidden bg-primary text-white xl:block" aria-label="VeteranPCS lending support">
      <div className="mx-auto flex max-w-[1500px] items-stretch">
        <div className="flex w-[36%] items-center justify-center bg-primary-hover/25 px-10 py-8 xl:px-14">
          <div className="flex max-w-[360px] flex-col items-center text-center">
            <Image
              src="/icon/VeteranPCSlogo.svg"
              alt="VeteranPCS"
              width={500}
              height={110}
              className="h-auto w-full max-w-[320px]"
            />
            <p className="mt-3 max-w-[280px] font-inter text-sm font-medium leading-6 text-white/90">
              Your trusted Veteran and military real estate team in {stateName}.
            </p>
          </div>
        </div>

        <div className="flex min-h-[210px] flex-1 items-center px-10 py-8 xl:px-14">
          <div className="grid w-full grid-cols-3 gap-8 xl:gap-12">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="max-w-[240px]">
                <Image
                  src={benefit.icon}
                  alt=""
                  width={36}
                  height={36}
                  className="mb-4 size-9"
                />
                <p className="font-inter text-xl font-bold leading-tight text-white">
                  {benefit.title}
                </p>
                <p className="mt-3 font-inter text-sm leading-6 text-white/85">
                  {benefit.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatePageHeroSecondSection;
