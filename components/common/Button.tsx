import React from "react";
import "@/app/globals.css";

interface ButtonProps {
  buttonText: string;
  href?: string;
  target?: React.HTMLAttributeAnchorTarget;
  rel?: string;
  onClick?: () => void;
  divClassName?: string;
  buttonClassName?: string;
}

const Button: React.FC<ButtonProps> = ({
  buttonText,
  href,
  target,
  rel,
  onClick,
  divClassName = "",
  buttonClassName = "",
}) => {
  const className = `${buttonClassName} inline-flex min-h-11 max-w-full items-center justify-center rounded-2xl bg-accent-red px-5 py-3.5 text-center transition-colors duration-200 hover:bg-accent-red-dark active:bg-accent-red-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-5 lg:px-8 lg:py-4 xl:px-8 xl:py-4`;

  const label = (
    <span
      className="bg-cover text-sm font-normal leading-6 text-white tahoma md:text-lg"
    >
      {buttonText}
    </span>
  );

  return (
    <div className={`lg:py-8 md:py-8 sm:py-2 py-2 ${divClassName}`}>
      {href ? (
        <a href={href} target={target} rel={rel} onClick={onClick} className={className}>
          {label}
        </a>
      ) : !onClick ? (
        <span className={className}>
          {label}
        </span>
      ) : (
        <button onClick={onClick} className={className}>
          {label}
        </button>
      )}
    </div>
  );
};

export default Button;
