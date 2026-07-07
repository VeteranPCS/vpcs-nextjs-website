import Button from "@/components/common/Button";
import classes from "./AgentLoanExpert.module.css";
import TrackedCtaLink from "@/components/common/TrackedCtaLink";

const AgentLoanExpert = () => {
  return (
    <div className="container mx-auto w-full md:mt-12 md:mb-12 mb-0">
      <div className={classes.agentLoanExpertContainer}>
        <div className="items-center grid lg:grid-cols-2 grid-cols-1 md:mt-10 mt-0 justify-center md:gap-10 gap-2">
          <div className="lg:text-left text-center md:py-10 py-0">
            <h4 className="text-white poppins text-3xl font-bold lg:w-[415px] w-full">
              Are you an agent or VA loan expert?
            </h4>
            <p className="roboto text-[21px] italic font-medium text-white m-0 pt-5">
              Want to be featured?
            </p>
            <TrackedCtaLink
              href="/contact"
              className="md:mt-0 mt-7"
              cta={{
                ctaId: 'homepage_agent_loan_expert_signup',
                ctaIntent: 'partner_recruiting',
                ctaPosition: 'homepage_agent_loan_expert',
                ctaComponent: 'agent_loan_expert',
                ctaLabel: 'Sign-up here',
                destination: '/contact',
                pageType: 'homepage',
              }}
            >
              <Button buttonText="Sign-up here" />
            </TrackedCtaLink>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentLoanExpert;
