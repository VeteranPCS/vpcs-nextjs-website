import React from "react";
import "@/app/globals.css";
import Button from "@/components/common/Button";
import Image from "next/image";
import Link from "next/link";

interface CTAButtonProps {
  text: string;
  link: string;
  isSecondary?: boolean;
}

interface CTASectionProps {
  backgroundImage?: string;
  backgroundColor?: string;
  title?: string | React.ReactNode;
  description?: string;
  buttons: CTAButtonProps[];
  image?: {
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
  };
  icon?: string;
  containerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

const CTASection: React.FC<CTASectionProps> = ({
  backgroundImage,
  backgroundColor,
  title,
  description,
  buttons,
  image,
  icon,
  containerClassName = "",
  titleClassName = "text-white font-tahoma text-[40px] md:text-[40px] sm:text-[30px] text-[30px] font-bold",
  descriptionClassName = "text-white font-tahoma text-[18px] md:text-[19px] sm:text-[16px] text-[16px] font-normal leading-[25px] mt-4 lg:text-left md:text-left sm:text-center text-center",
}) => {
  const containerStyle = backgroundImage
    ? { backgroundImage: `url(${backgroundImage})` }
    : backgroundColor
    ? { background: backgroundColor }
    : { background: "linear-gradient(233deg, #2A2F6C 28.37%, #555CA4 95.18%), #D9D9D9" };

  return (
    <div className="container mx-auto w-full py-8 sm:py-12 md:py-16">
      <div
        className={`bg-cover bg-center bg-no-repeat p-6 sm:p-8 md:p-12 rounded-custom ${containerClassName}`}
        style={containerStyle}
      >
        <div className="items-center grid lg:grid-cols-2 md:grid-cols-2 sm:grid-cols-1 grid-cols-1 justify-center xl:gap-10 lg:gap-10 md:gap-10 sm:gap-2 gap-2">
          {image && (
            <div className="flex justify-center">
              <Image
                src={image.src}
                width={image.width}
                height={image.height}
                alt={image.alt}
                className={image.className || "lg:w-[530px] lg:h-[530px] md:w-[530px] md:h-[530px] sm:w-[326px] sm:h-[326px] w-[326px] h-[326px] object-cover"}
              />
            </div>
          )}
          
          <div className="text-left md:pl-4 lg:pl-8">
            {icon && (
              <div className="lg:block md:block sm:hidden hidden">
                <Image
                  width={100}
                  height={100}
                  className="w-auto h-auto"
                  src={icon}
                  alt="Icon"
                />
              </div>
            )}
            
            {title && (
              <h2 className={titleClassName}>
                {title}
              </h2>
            )}
            
            {description && (
              <p className={descriptionClassName}>
                {description}
              </p>
            )}
            
            <div className="flex lg:justify-start md:justify-start sm:justify-center justify-center items-center gap-4 mt-6">
              {buttons.map((button, index) => (
                <div key={index}>
                  <Link href={button.link}>
                    {button.isSecondary ? (
                      <Button
                        buttonText={button.text}
                        variant="secondary"
                      />
                    ) : (
                      <Button buttonText={button.text} />
                    )}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CTASection;