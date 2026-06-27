import "@/app/globals.css";
import Button from "@/components/common/Button";
import classes from "./SkillsFuturesBuild.module.css";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";

const SkillFuturesBuild = () => {
  return (
    <div className="w-full relative lg:mb-8 mb-0">
      <div className={classes.SkillsFuturesBuildContainer}>
        <div className="container mx-auto">
          <div className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 w-full">
            <div className="text-center">
              <h2 className="text-white lg:text-[48px] text-[30px] font-bold poppins px-10 sm:px-0 mb-5">
                Skills to share. Futures to build
              </h2>
              <p className="font-medium text-[18px] leading-[30px] text-white roboto lg:w-full w-[300px] mx-auto">
                Interested in Starting a Career as a Real Estate Agent or
                Mortgage Loan Officer?
              </p>
              <TrackedCtaLink
                href="/internship"
                cta={{
                  ctaId: 'homepage_internship',
                  ctaIntent: 'career_navigation',
                  ctaPosition: 'homepage_skills_futures',
                  ctaComponent: 'skills_futures_build',
                  ctaLabel: 'Learn about our internship',
                  destination: '/internship',
                  pageType: 'homepage',
                }}
              >
                <Button buttonText="Learn about our internship" />
              </TrackedCtaLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillFuturesBuild;
