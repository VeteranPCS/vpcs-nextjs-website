import Button from "@/components/common/Button";
import Image from "next/image";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";

const reasons = [
  { icon: "/icon/Moveinbonus.svg", label: "MOVE IN BONUS" },
  { icon: "/icon/checkblue.svg", label: "FREE TO USE" },
  { icon: "/icon/Giveback.svg", label: "GIVE BACK" },
  { icon: "/icon/valoanexperts.svg", label: "VA LOAN EXPERTS" },
  { icon: "/icon/Support.svg", label: "SUPPORT" },
  { icon: "/icon/Agents.svg", label: "AGENTS" },
];

const WhyVeteranPcs = () => {
  return (
    <div className="w-full py-16 md:py-24 bg-surface">
      <div className="container mx-auto w-full px-4">
        <div className="text-center">
          <h2 className="text-[#292F6C] font-bold lg:text-[40px] sm:text-[31px] text-[31px]">
            Why VeteranPCS
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10 mt-12 max-w-4xl mx-auto">
            {reasons.map((reason) => (
              <div
                key={reason.label}
                className="flex flex-col items-center text-center gap-3"
              >
                <Image
                  width={100}
                  height={100}
                  className="h-14 md:h-16 w-auto object-contain"
                  src={reason.icon}
                  alt=""
                />
                <h3 className="text-[#003486] font-bold text-lg md:text-xl lg:text-2xl leading-tight poppins">
                  {reason.label}
                </h3>
              </div>
            ))}
          </div>
          <div className="mx-auto justify-center text-center flex mt-12">
            <Image
              width={100}
              height={100}
              className="w-full max-w-md h-auto"
              src="/icon/vet-PCS-5-star-review.svg"
              alt="Five out of five star customer review rating"
            />
          </div>
          <div className="mx-auto justify-center text-center flex mt-8">
            <TrackedCtaLink
              href="/#state-map"
              cta={{
                ctaId: 'homepage_why_find_agent',
                ctaIntent: 'state_map',
                ctaPosition: 'homepage_why_veteranpcs',
                ctaComponent: 'why_veteranpcs',
                ctaLabel: 'Find an Agent',
                destination: '/#state-map',
                pageType: 'homepage',
              }}
            >
              <Button buttonText="Find an Agent" />
            </TrackedCtaLink>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhyVeteranPcs;
