import React from "react";
import "@/app/globals.css";
import Button from "@/components/common/Button";
import Image from "next/image";
import Link from "next/link";

interface HeroSectionProps {
  backgroundImage?: string;
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  buttonText?: string;
  buttonLink?: string;
  logoPath?: string;
  logoAlt?: string;
  features?: { text: string; icon: string }[];
  rightImage?: {
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
  };
  containerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  backgroundImage = "/assets/aboutherosectionbg.webp",
  title,
  description,
  buttonText,
  buttonLink,
  logoPath = "/icon/VeteranPCS-logo_wht-outline.svg",
  logoAlt = "VeteranPCS logo",
  features,
  rightImage,
  containerClassName = "",
  titleClassName = "",
  descriptionClassName = "",
}) => {
  return (
    <div className="relative">
      <div
        className={`bg-cover bg-center bg-no-repeat py-hero-padding px-[30px] mt-[80px] ${containerClassName} sm:py-hero-mobile-padding`}
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      >
        <div className="container mx-auto px-5">
          <div className="grid lg:grid-cols-2 md:grid-cols-1 sm:grid-cols-1 grid-cols-1 items-start justify-between gap-6 mb-6">
            <div className="mx-auto lg:text-left md:text-left text-left w-full sm:order-2 order-2 lg:order-none md:order-none">
              <h1 className={`text-white font-bold text-hero md:text-hero-md sm:text-hero-sm text-hero-xs font-poppins leading-[1.3] font-tahoma ${titleClassName}`}>
                {title}
              </h1>
              {description && (
                <p className={`lg:text-[18px] md:text-[18px] sm:text-[16px] text-[16px] font-normal text-white font-poppins sm:mb-10 mb-5 mt-4 font-tahoma leading-[26px] ${descriptionClassName}`}>
                  {description}
                </p>
              )}
              
              {buttonText && buttonLink && (
                <div>
                  <Link href={buttonLink}>
                    <Button buttonText={buttonText} />
                  </Link>
                </div>
              )}

              {features && features.length > 0 && (
                <div className="flex justify-between xl:justify-start lg:justify-start md:justify-start sm:justify-between gap-4 mb-10 mt-10 mx-auto text-center">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <Image
                        width={100}
                        height={100}
                        src={feature.icon}
                        alt="feature icon"
                        className="w-6 h-6"
                        loading="eager"
                      />
                      <p className="text-white font-medium text-sm font-tahoma">
                        {feature.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {logoPath && (
                <div className="absolute bottom-[-15%] left-1/2 transform -translate-x-1/2">
                  <Image
                    width={1000}
                    height={1000}
                    src={logoPath}
                    alt={logoAlt}
                    className="lg:w-[250px] lg:h-[250px] md:w-[250px] md:h-[250px] sm:w-[250px] sm:h-[250px] w-[200px] h-[200px]"
                    loading="eager"
                  />
                </div>
              )}
            </div>

            {rightImage && (
              <div className="flex justify-end">
                <Image
                  width={rightImage.width}
                  height={rightImage.height}
                  src={rightImage.src}
                  alt={rightImage.alt}
                  className={rightImage.className || "sm:block hidden"}
                  loading="eager"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;