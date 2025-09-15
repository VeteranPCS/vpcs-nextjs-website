import Link from "next/link";
import React from "react";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const ContactForm = () => {
  return (
    <div className="py-12 md:px-0 px-5 lg:pt-[140px] pt-10">
      <div className="container mx-auto">
        <div className="lg:w-[800px] w-full mx-auto my-10">
          <div className="mb-5">
            <h1 className="text-[#000000] font-medium text-[45px] roboto">
              Terms of Use
            </h1>
            <h6 className="text-[#000000] font-bold text-lg roboto">
              Last Updated: JANUARY 14, 2023
            </h6>
          </div>
          <div className="mb-4">
            <p className="font-normal leading-8">
              THESE TERMS OF USE CONSTITUTE A LEGALLY BINDING AGREEMENT BETWEEN
              YOU, THE USER, AND SOLID OAK REALTY, INC. d/b/a VETERANPCS, A
              COLORADO CORPORATION (the <b> “Company”</b>)
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                Please CAREFULLY READ these Terms of Use (these “
              </span>
              <b>Terms of Use </b>
              <span className="font-normal leading-8">
                ”) before using this website, www.VeteranPCS.com (the “
              </span>
              <b>Site</b>
              <span className="font-normal leading-8">
                ”), as well as any mobile applications (whether iOS or Android)
                offered by the Company (the “
              </span>
              <b>Apps</b>
              <span className="font-normal leading-8">
                ”).&nbsp; Collectively, the Site and any Apps are referred to as
                the “
              </span>
              <b>Platform</b>
              <span className="font-normal leading-8">
                .” The Platform contains information, including, without
                limitation, all text, graphics, photographs, graphs, sounds,
                data, images, audio, video, page headers, software (including
                HTML and other scripts), buttons, and other icons, and the
                arrangement and compilation of this information (collectively,
                the “
              </span>
              <b>Information</b>
              <span className="font-normal leading-8">
                ”) that is either owned or licensed by the Company.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                The Company, through the Platform, offers a web-based
                communication platform to connect Clients and Service Members
                with Agents (as both are defined below) for the purpose of
                obtaining representation in buying, selling, or leasing real
                estate (the “
              </span>
              <b>Services </b>
              <span className="font-normal leading-8">
                ”). Use of the Platform to obtain the Services may be limited or
                unavailable in your area, or it may be based on demand or
                otherwise determined in the Company’s sole discretion. There is
                no guarantee you will obtain the Services by using the Platform.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                By accessing and using the Platform you thereby agree
              </span>
              <span className="font-normal leading-8">
                (a) that you have received, read and understood these Terms of
                Use, and that these Terms of Use create a valid and binding
                agreement, enforceable against you in accordance with the terms
                hereof, (b) to be bound by these Terms of Use, any terms,
                conditions or other rules, regulations or policies of the
                Company, as each may be amended or supplemented from time to
                time in our sole discretion without notice, and (c) that your
                use of the Platform shall comply with all applicable federal,
                state and local laws, rules or regulations, and that you are
                solely responsible for your compliance with, familiarity with
                and understanding of any such laws, rules or regulations
                applicable to your use of the Platform.&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <b>
                IF YOU DO NOT AGREE WITH ANY PORTION OF THESE TERMS OF USE, YOU
                ARE PROHIBITED FROM USING OR ACCESSING THE SITE.
              </b>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                Additionally, and without limiting the foregoing, by using or
                accessing the Site, you represent and warrant to us that you:
                (a) are 18 years of age or older, (b) are not currently
                restricted from using the Platform , (c) are not a competitor of
                the Company, or engaged in any business or activity, directly or
                indirectly, that could be competitive with the business or
                activities of the Company, and are not using the Platform for
                any reason that may be in competition with the Platform or any
                other product or service offered by the Company, (d) have full
                power and authority to enter into and perform these Terms of
                Use, and doing so will not violate any other agreement to which
                you are a party, (e) will not violate any rights of the Company,
                including, without limitation, intellectual property rights such
                as patent, copyright or trademark rights, and (f) agree to
                provide, operate and maintain, at your sole risk, cost and
                expense, all equipment, software, and internet access necessary
                to use the Site.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                Any personal data you submit to the Platform or which we collect
                about you is governed by our
              </span>
              <Link href="https://www.veteranpcs.com/privacy-policy">
                <span className="font-normal leading-8">Privacy Policy</span>
              </Link>
              <span className="font-normal leading-8">
                . You acknowledge that by using the Platform, you have read and
                accept the terms of our Privacy Policy, which is incorporated by
                reference as if fully set forth herein.
              </span>
            </p>
          </div>
          <p>&nbsp;</p>
          <div className="mb-4">
            <p>
              <b>Background and Mission</b>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                VeteranPCS’ mission is to honor those who have served or are
                currently serving in the U.S Armed Forces and their spouses by
                offering a service that provides rewards and savings in the home
                buying and selling process, a process that many Service Members
                have been through several times over throughout their careers.
                We accomplish this by (1) providing the Platform, by which
                Service Members and Clients may connect with local real estate
                agents and mortgage loan officers who are also Service Members
                themselves and thus share a common experience and understanding;
                (2) offering cash rewards to Service Members upon any purchase
                or sale of a home that is consummated via the VeteranPCS
                Platform; (3) when working with non-Service Members, donating
                what would be a cash reward if the client was a Service Member
                to a Veteran-focused charity organization (collectively, the “
              </span>
              <b>Veteran PCS Program</b>
              <span className="font-normal leading-8">”).</span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                VeteranPCS partners with real estate agents and brokerages
                across the country who share our same mission; wishing to give
                back to those who have served. VeteranPCS also serves clients
                who are not Service Members (each, a “
              </span>
              <b>Client</b>
              <span className="font-normal leading-8">
                ”), but instead of distributing a cash bonus to the Client upon
                the consummation of a purchase or sale, that money is
                distributed to a Veteran-focused charity organization of Veteran
                PCS’ choosing.&nbsp;
              </span>
            </p>
          </div>
          <p>&nbsp;</p>
          <div className="mb-4">
            <p>
              <b>General Definitions</b>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                In addition to the terms defined above, the following terms have
                the meanings described below as follows:
              </span>
            </p>
          </div>
          <div className="mb-4 pl-5">
            <ul>
              <li className="font-normal leading-8 list-disc">
                <b>“We,” “our,” </b>
                <span className="font-normal leading-8">or </span>
                <b>“us”</b>
                <span className="font-normal leading-8">
                  refers to the Company and the Company’s use of the Platform;
                </span>
              </li>
              <li className="font-normal leading-8 list-disc">
                <b>“User” </b>
                <span className="font-normal leading-8">or </span>
                <b>“Users” </b>
                <span className="font-normal leading-8">
                  refers to individuals who use or access the Platform;
                </span>
              </li>
              <li className="font-normal leading-8 list-disc">
                <b>“You” </b>
                <span className="font-normal leading-8">or</span>
                <b> “your”</b>
                <span className="font-normal leading-8">
                  refers to individual you, the User of the Platform;
                </span>
              </li>
              <li className="font-normal leading-8 list-disc">
                <b>“Agents”</b>
                <span className="font-normal leading-8">
                  refers to Users who offer their Services as real estate
                  agents/brokers to Service Members and Clients through the
                  Platform;
                </span>
              </li>
              <li className="font-normal leading-8 list-disc">
                <b>“Service Member”</b>
                <span className="font-normal leading-8">
                  (more fully defined below in Section 1) refers to Users who
                  solicit Agents for representation in selling, buying, and
                  leasing real estate.
                </span>
              </li>
              <li className="font-normal leading-8 list-disc">
                <b>“Client”</b>
                <span className="font-normal leading-8">
                  means a User who is not a Service Member who solicits Agents
                  for representation in selling, buying, and leasing real
                  estate.
                </span>
              </li>
            </ul>
          </div>
          <div className="mb-4 pl-5">
            <ul>
              <li className="list-disc">
                <b>PERMISSION TO USE PLATFORM</b>
              </li>
            </ul>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                By using the Platform, you represent and warrant that, (1) if a
                Service Member, you are (a) currently serving in the U.S. Armed
                Forces, (b) have served in the past and obtained an Honorable
                Discharge, or (c) are a spouse of someone meeting the criteria
                of (a) or (b) (each, a “
              </span>
              <b>Service Member</b>
              <span className="font-normal leading-8">”); and (2) </span>
              <span className="font-normal leading-8">
                if an Agent, that you (y) also meet the criteria of (a), (b), or
                (c), and (z) are a properly licensed real estate agent/broker in
                good standing in the jurisdiction in which you are
                licensed.&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                If you do not meet these requirements, you may still use the
                Platform and receive the Services, but you are not entitled to
                receive the Move-In Bonus as described in Section 8, and
                instead, the fee that would be paid to you as a Move-In Bonus if
                you were a Service Member, will be donated to a Veteran-focused
                charity of the Company’s choosing. If you use the Platform and
                receive the benefits described in Section 8, Move-In Bonus, and
                it is later determined that you did not meet the requirements of
                (a), (b), or (c) above, you will be subject to civil and
                criminal liability and the return of any and all monetary
                bonuses received.&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                The Company reserves the right to waive the requirements above
                in certain situations where the Company feels that a User should
                be entitled to receive the benefits of being a Service Member,
                even though they may not meet the exact definition. This
                determination will be made on a case by case basis in the
                Company’s sole discretion. Reach out to
              </span>
              <Link href="mailto:info@veteranpcs.com">
                <span className="font-normal leading-8">
                  info@veteranpcs.com
                </span>
              </Link>
              <span className="font-normal leading-8">
                if you think you should be considered to be a Service Member
                although you do not meet the exact definition. An example of
                this would be a widow of a deceased service member.&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                VeteranPCS is a service designed to give back to those who have
                served our country; we take great pride in offering this service
                and accordingly, if you violate the provisions of this section
                and misrepresent who you are in order to receive the Move-in
                Bonus offered to Service Members you may cause irreparable harm
                to our reputation and business model, and thus the Company may
                (1) recover any and all monetary benefits you received in
                connection with your use of the Platform and the Services, and
                (2) recover liquidated damages from you in the amount of $500
                per violation, which you agree is a reasonable approximation of
                harm caused by your breach of this section, payable no later
                than fifteen (15) days after demand, and (3) seek any other
                legal or injunctive relief, including, but not limited to,
                injunctive relief to stop any breach of these Terms of
                Use.&nbsp;&nbsp;&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                You will be required to sign a statement affirming that you meet
                the eligibility requirements as a Service Member, as defined
                above, before the Company will remit the Move-In Bonus to
                you.&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4 pl-5">
            <ul>
              <li className="list-disc">
                <b>COMMUNITY GUIDELINES OF USE</b>
              </li>
            </ul>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                The Platform contains, among other things, User profiles and
                mechanisms for Users to communicate with one another. Without
                limitation, you agree to abide by the following community
                guidelines when using the Platform:
              </span>
            </p>
          </div>
          <div className="mb-4 pl-5">
            <ol>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  That the content, materials, Services and other intellectual
                  property contained or embodied in the Platform are owned by
                  the Company and are protected by patent, copyright, trademark
                  and other similar laws;
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  Exercise caution and common sense, same as you would in any
                  other interaction with persons unknown to you, to protect your
                  personal information and data.
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  Not to transmit, send or otherwise post unauthorized
                  commercial communications (such as spam), or other similar
                  materials or advertisements, using the Site;
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  Not to access the Site using any automated means, including,
                  without limitation, harvesting bots, robots, spiders, or
                  scrapers;
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  Not to engage in multi-level marketing using the Platform ,
                  including, without limitation, pyramid schemes and similar
                  marketing concepts;
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  Not to upload, use or disseminate viruses or other malicious
                  code or other abusive scripts or processes;
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  Not to solicit personal information of another person except
                  as explicitly authorized;
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  Not to bully, intimidate, or harass any person;
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  Not to use the Platform in any manner that is, or could
                  reasonably be construed to be, unlawful, including, without
                  limitation, in violation of any law, and/or rules of any
                  national or other governmental agencies, and any regulations
                  or other pronouncements having the force of law;
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  Not to use the Platform in any manner that is, or could
                  reasonably be construed to be, in violation of these Terms of
                  Use, fraudulent, misleading, malicious or discriminatory;
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  Not to take any action that could disable, overburden, or
                  impair the operation or availability of the Site, such as a
                  denial of service attack;
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  Not to engage in manipulative practices designed to obfuscate
                  the true intent of your submissions to the Platform, or to
                  artificially generate traffic to another website;
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  Not to facilitate or encourage any violations of these Terms
                  of Use;
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  Not to issue chargeback disputes against the Company;
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  Not to use patented, copyrighted, trademarked or other
                  protected intellectual property without the written consent
                  and authorization of the owner of such property;
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  Not to copy, distribute or disseminate the Platform or any
                  portion thereof, and not to transfer the Platform, or any
                  portion thereof, to another person or “mirror” the Platform,
                  or any portion thereof, on any other server;
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  Not to decompile or reverse engineer, or attempt to decompile
                  or reverse engineer, the Platform or any portion thereof; and
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  Not to take any other action that could result in any damage
                  or disruption to the Site, or that could otherwise result in
                  any liability, damages, costs or expenses on the part of the
                  Company.
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  You will respect the privacy of other Users (including, but
                  not limited to Users’ private, family and home life), as well
                  as the data and property of other Users.
                </span>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                Your failure to abide by these Terms of Use will result in your
                immediate removal from the Platform and cancellation of all
                Services provided by the Company. This includes blocking you
                from the Platform and all forms of social media accounts held
                and operated by the Company.&nbsp;&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4 pl-5">
            <ul>
              <li className="list-disc">
                <b>
                  RELATIONSHIP BETWEEN THE COMPANY, SERVICE MEMBERS/CLIENTS, &
                  AGENTS
                </b>
              </li>
            </ul>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                CONTRACTS FOR SERVICES ARE EXCLUSIVELY BETWEEN SERVICE
                MEMBERS/CLIENTS AND AGENTS.&nbsp; THE COMPANY ONLY PROVIDES A
                MECHANISM TO CONNECT AGENTS WITH SERVICE MEMBERS/CLIENTS AND
                COLLECTS A PERCENTAGE OF ANY COMMISSIONS EARNED BY AN AGENT UPON
                CONSUMMATION OF A SALE.&nbsp; AGENTS ARE INDEPENDENT CONTRACTORS
                OF SERVICE MEMBERS/CLIENTS. AGENTS ARE NOT EMPLOYEES, PARTNERS,
                INDEPENDENT CONTRACTORS, REPRESENTATIVES, AGENTS, OR OTHERWISE
                AFFILIATED WITH THE COMPANY. SERVICE MEMBERS/CLIENTS EMPLOY
                AGENTS. SERVICE MEMBERS/CLIENTS ARE SOLELY RESPONSIBLE TO DIRECT
                AGENTS AS NECESSARY IN THE PERFORMANCE OF THE SERVICES.&nbsp;
                THE COMPANY DOES NOT EMPLOY AGENTS IN ANY WAY, AND THE COMPANY
                DOES NOT SUPERVISE, DIRECT, OR EXERCISE ANY CONTROL OR
                INVOLVEMENT IN THE SERVICES CONTRACTED FOR BETWEEN SERVICE
                MEMBERS/CLIENTS AND AGENTS OTHER THAN COLLECTION OF THE REFERRAL
                FEE. USERS DO NOT HAVE ANY AUTHORITY TO BIND THE COMPANY THROUGH
                ANY ORAL OR WRITTEN AGREEMENT, WHETHER EXPRESS OR IMPLIED.&nbsp;
                THE COMPANY DISCLAIMS ANY LIABILITY AND RESPONSIBILITY FOR THE
                SERVICES PERFORMED, INCLUDING, BUT NOT LIMITED TO, ANY
                WARRANTIES ASSOCIATED WITH THE SERVICES PERFORMED.&nbsp;&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                Without limitation, the Company is not responsible and will not
                be liable for any worker’s compensation claims, federal, state,
                or local tax payments or income tax withholdings, sales tax,
                unemployment or disability insurance, or licensing of Agents.
                Agents are responsible for their own business decisions and
                judgment when entering into contracts for Services with Service
                Members and Clients. Agents assume all risk for profits or
                losses.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <ol>
              <li>
                <b>
                  4. RELATIONSHIP BETWEEN SERVICE MEMBERS/CLIENTS AND AGENTS
                </b>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                The Company is not a party to any contracts for Services between
                Service Members/Clients and Agents. Service Members/Clients and
                Agents contract with one another directly.&nbsp;&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                Service Members/Clients and Agents acknowledge and agree that
                they create a legally binding agreement when Service
                Members/Clients and Agents execute a buyer agency, seller
                agency, or transaction broker agreement (or your state’s
                equivalent of such agreements) (the “
              </span>
              <b>Agency Agreement</b>
              <span className="font-normal leading-8">
                ”). The terms of the Agency Agreement accepted by the Service
                Member/Client and Agent are outside the scope of these Terms of
                Use, and in the event of any conflict between these Terms of Use
                and the Agency Agreement, the Agency Agreement controls.&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                You agree that the Company is not a party to the Agency
                Agreement and that the Company’s role is solely limited to (a)
                providing a means for Agents and Service Members/Clients to be
                connected with one another, (b) the collection of a referral fee
                from the Agent upon the consummation of a sale, and (c) the
                distribution of the Move-In Bonus (described below in Section 8)
                to the Service Member.
              </span>
              <b>
                To this extent the Company assumes no liability and disclaims
                all responsibility for any acts or omissions of the Agent, in or
                outside of the Platform.
              </b>
              <span className="font-normal leading-8">&nbsp;</span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                Any Service Member who uses the Platform is not obligated to
                select an Agent from the Platform. Any Agent who uses the
                Platform is not restricted from also using other platforms or
                websites that offer similar services.&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                The Company requires Agents to provide their license number and
                brokerage information in order to join the Platform and the
                Company will verify such information. However, Service
                Members/Clients are
              </span>
              <i>
                <span className="font-normal leading-8">solely</span>
              </i>
              <span className="font-normal leading-8">
                responsible for determining whether an Agent is qualified to
                perform the Services and possesses all necessary licenses and
                insurance.&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                Service Members/Clients shall pay their Agents for Services
                performed as stipulated in the Agency Agreement. The Agent shall
                sign a separate agreement with the Company (the “
              </span>
              <b>Referral Partner Agreement</b>
              <span className="font-normal leading-8">
                ,” and the Agent, the “
              </span>
              <b>Referral Partner</b>
              <span className="font-normal leading-8">
                ”) in which they agree to share a percentage of whatever
                commissions they earn for sales consummated via a relationship
                created through the Platform with the Company, and the Referral
                Partner will distribute a fixed amount based on the total home
                price back to the Service Member, as more fully described below
                in Section 8, Move-In Bonus, in states that allow
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                Should a dispute arise between Users, Users agree to immediately
                notify the Company and to engage in good faith negotiations for
                a period of no less than 30 days before initiating any
                proceeding to formally resolve the dispute.
              </span>
              <b>
                Users further agree that the Company will not be named as any
                party to this dispute, or otherwise be involved in this dispute.
              </b>
            </p>
          </div>
          <div className="mb-4">
            <ol>
              <li>
                <b>5. AGENTS&nbsp;</b>
              </li>
            </ol>
          </div>
          <div className="mb-4 pl-5">
            <ol>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  Agents are solely responsible for identifying and obtaining
                  any necessary licenses, permits, or other registrations
                  required by state law required to perform the Services, and
                  must provide proof of such requirements in order to become an
                  Referral Partner. The Company assumes no liability for and
                  disclaims all liability and responsibilities for any fines
                  assessed against an Agent who does not obtain the proper
                  licenses, permits, or registrations as required by federal,
                  state, or local laws, regulations, or rules.
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  In order to become a Referral Partner, Agents agree to enter
                  into the Referral Partner Agreement and to comply with all the
                  provisions thereof. Any violations of the Referral Partner
                  Agreement will result in the immediate termination of the
                  Agent’s access to the Platform.&nbsp;
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  Agents agree to provide biographical information and a
                  headshot to the Company and agree to allow the Company to
                  display such information and headshot on the Site in
                  accordance with our Privacy Policy, the Referral Partner
                  Agreement, and the terms contained herein.
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  Agents agree that a sale or purchase consummated within two
                  years of a Service Member/Client connecting with such Agent
                  via the Platform will be subject to the terms of these Terms
                  of Use and the Referral Partner Agreement, however, this does
                  not apply to subsequent purchases and sales consummated with a
                  recurring Service Member unless the Service Member herself
                  chooses to go through the Platform to receive the Move-In
                  Bonus, nor does it apply to any referrals received outside of
                  the Platform from such Service Member.
                </span>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <ol>
              <li>
                <b>6. NO FIDUCIARY DUTY&nbsp;</b>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                Your use of the Platform does not create or impose any fiduciary
                duty on the Company to you, and these Terms of Use are not
                intended to, and do not, create or impose any fiduciary duty on
                the Company. As such, to the fullest extent permitted by
                applicable law and not withstanding any other provision of these
                Terms of Use, you and the Company agree that no fiduciary duty
                is placed on the Company by your use of the Platform.&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4">
            <ol>
              <li>
                <b>7. VETTING OF USERS &nbsp;</b>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                All Users agree that the Company may, but is not obligated to
                perform vetting of all Agents. The Company will require Agents
                to submit at least two references of former Service Member
                clients (although the Company reserves the right to waive this
                requirement) and the Company will contact such references as
                well as the Agent’s brokerage. The Company will not require
                Service Members to provide proof of their status qualifying them
                as Service Members under these Terms of Use, however, the
                Company will send an agreement to the Service Member or Client
                approximately when the Service Member or Client goes under
                contract on a property, requiring the Service Member or Client
                to affirm their status as either and agree to the terms of
                receiving the Move-In Bonus (the “
              </span>
              <b>Move-In Bonus Agreement</b>
              <span className="font-normal leading-8">”).</span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                Misrepresentation by a User of their status as a Service Member
                to receive the Move-In Bonus when they do not meet the
                eligibility requirements outlined in Section 1 above will
                subject such User to the legal consequences contained in that
                section. Misrepresentation by an Agent of their status in
                violation of the Referral Partner Agreement will subject the
                Agent to the legal consequences described in the Referral
                Partner Agreement.&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                Despite these efforts, and because the Company must rely solely
                on the information provided by Users themselves, the Company
                cannot guarantee and cannot confirm the identity of each User
                and cannot guarantee that each User is who they claim to
                be.&nbsp; As such, the Company does not assume any liability
                for, and disclaims all warranties and liabilities, with regard
                to the accuracy and reliability of all background and identity
                checks, and the information provided through the Platform that
                results from such investigations.&nbsp;&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                THE COMPANY, ITS DIRECTORS, OFFICERS, EMPLOYEES, AGENTS,
                AFFILIATES, SUBSIDIARIES, AND INSURERS DISCLAIM ALL LIABILITY,
                AND ARE NOT RESPONSIBLE FOR THE ACTS, OMISSIONS, OR CONDUCT OF
                USERS ONLINE AND OFFLINE.&nbsp; IN ADDITION, YOU HEREBY RELEASE
                AND HOLD HARMLESS THE COMPANY FROM ANY AND ALL LIABILITY,
                CLAIMS, DEMANDS, OR DAMAGES OF EVERY KIND AND NATURE, KNOWN OR
                UNKNOWN, SUSPECTED OR UNSUSPECTED, DISCLOSED OR UNDISCLOSED,
                ARISING OUT OF, OR IN ANY WAY CONNECTED WITH THE PLATFORM.&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4">
            <ol>
              <li>
                <b>8. MOVE-IN BONUS&nbsp;</b>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                The Platform is free for Agents, Service Members, and Clients to
                use. The only fee the Company takes is a percentage of any
                commission an Agent earns for purchase or sales consummated via
                a relationship created through the Platform with the Company
                (the “
              </span>
              <b>Referral Fee</b>
              <span className="font-normal leading-8">
                ,” as more fully described in the Referral Partner Agreement).
                The Refrral Partner also agrees, when allowed, to distribute an
                amount to the Service Member from their earned commission as a “
              </span>
              <b>Move-In Bonus</b>
              <span className="font-normal leading-8">
                ,” determined as follows:&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4">
            <table className="table-auto border lg:w-[750px] w-full">
              <thead>
                <tr className="border text-left">
                  <th className="text-[#000] tahoma p-3">
                    <b>Home Price</b>
                  </th>
                  <th className="text-[#000] tahoma p-3">
                    <b>Move-In Bonus</b>
                  </th>
                  <th className="text-[#000] tahoma p-3">
                    <b>Charity Donation</b>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border">
                  <td className="text-[#000000] roboto p-3">
                    <b>$100,000</b>
                  </td>
                  <td className="text-[#000000] roboto p-3">$200</td>
                  <td className="text-[#000000] roboto p-3">$20</td>
                </tr>
                <tr className="border">
                  <td className="text-[#000000] roboto p-3">
                    <b>$100,000 – $199,999</b>
                  </td>
                  <td className="text-[#000000] roboto font-normal leading-8 p-3">
                    $400
                  </td>
                  <td className="text-[#000000] roboto font-normal leading-8 p-3">
                    $40
                  </td>
                </tr>
                <tr className="border">
                  <td className="text-[#000000] roboto p-3">
                    <b>$200,000 – $299,999</b>
                  </td>
                  <td className="text-[#000000] roboto font-normal leading-8 p-3">
                    $700
                  </td>
                  <td className="text-[#000000] roboto font-normal leading-8 p-3">
                    $700
                  </td>
                </tr>
                <tr className="border">
                  <td className="text-[#000000] roboto p-3">
                    <b>$300,000 – $399,999</b>
                  </td>
                  <td className="text-[#000000] roboto font-normal leading-8 p-3">
                    $1,000
                  </td>
                  <td className="text-[#000000] roboto font-normal leading-8 p-3">
                    $100
                  </td>
                </tr>
                <tr className="border">
                  <td className="text-[#000000] roboto p-3">
                    <b>$400,000 – $499,999</b>
                  </td>
                  <td className="text-[#000000] roboto font-normal leading-8 p-3">
                    $1,200
                  </td>
                  <td className="text-[#000000] roboto font-normal leading-8 p-3">
                    $120
                  </td>
                </tr>
                <tr className="border">
                  <td className="text-[#000000] roboto p-3">
                    <b>$500,000 – $649,999</b>
                  </td>
                  <td className="text-[#000000] roboto font-normal leading-8 p-3">
                    $1,500
                  </td>
                  <td className="text-[#000000] roboto font-normal leading-8 p-3">
                    $150
                  </td>
                </tr>
                <tr className="border">
                  <td className="text-[#000000] roboto p-3">
                    <b>$650,000 – $799,999</b>
                  </td>
                  <td className="text-[#000000] roboto font-normal leading-8 p-3">
                    $2,000
                  </td>
                  <td className="text-[#000000] roboto font-normal leading-8 p-3">
                    $200
                  </td>
                </tr>
                <tr className="border">
                  <td className="text-[#000000] roboto p-3">
                    <b>$800,000 – $999,999</b>
                  </td>
                  <td className="text-[#000000] roboto font-normal leading-8 p-3">
                    $3,000
                  </td>
                  <td className="text-[#000000] roboto font-normal leading-8 p-3">
                    $300
                  </td>
                </tr>
                <tr className="border">
                  <td className="text-[#000000] roboto p-3">
                    <b>$1,000,000+</b>
                  </td>
                  <td className="text-[#000000] roboto font-normal leading-8 p-3">
                    $4,000
                  </td>
                  <td className="text-[#000000] roboto font-normal leading-8 p-3">
                    $400
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                The Service Member will receive the Move-In Bonus upon closing
                on the property, when allowed. In the event that the Move-In
                Bonus is not allowed in the state of the sale, VeteranPCS will
                work with the Service Member to determine if another method is
                allowed.&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                In such a case as an Agent defaults on its obligations under the
                Referral Partner Agreement and does not pay the Referral Fee or
                Move-In Bonus, the Company will pursue legal action against the
                Agent to recover such fee and any associated costs as provided
                herein and by applicable law.
              </span>
              <span className="font-normal leading-8">&nbsp;</span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                Before the Service Member is eligible to receive the Move-In
                Bonus, they shall sign the Move-In Bonus Agreement with the
                Referral Partner affirming their status as either a Service
                Member or a Client and agreeing to the terms of receiving the
                Move-In Bonus.
              </span>
              <b>
                If you do not sign and return the Move-In Bonus Agreement, you
                will not be entitled to receive the Move-In Bonus
              </b>
              <span className="font-normal leading-8">
                . The Move-In Bonus will be distributed to the Service Member after
                closing however best determined by the settlement closing
                service appointed and must be approved by the lender if
                purchasing with a new loan.&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                The Move-In Bonus is offered in most states, but due to local
                regulations, it may not be available in your state. In such
                states, VeteranPCS may offer a “Relocation Grant” in lieu of the
                Move-In Bonus if it is not available in your state. You must
                apply and be approved for the Relocation Grant, and VeteranPCS
                is under no obligation to approve such application. We will
                reach out to you once you begin using the service and notify you
                if the Move-In Bonus is not available in your state and what
                next steps may be available.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                The Move-In Bonus (or Relocation Grant, as applicable) is only
                available with the purchase and/or sale of your home through the
                use of a VeteranPCS-introduced real estate agent. Other terms
                and conditions may apply. This is not a solicitation if you are
                already represented by a real estate broker. Please contact
                info@veteranpcs.com for details. Program terms and
                conditions are subject to change at any time without notice. By
                using the services offered herein, you represent that you have
                read, understood, and agree to the
              </span>
              <Link href={`${BASE_URL}/terms-of-use`}>
                <span className="font-normal leading-8">
                  {" "}
                  Platform Terms of Use
                </span>
              </Link>
              <span className="font-normal leading-8">.</span>
            </p>
          </div>
          <div className="mb-4">
            <ol>
              <li>
                <b>9. LICENSE AGREEMENT/TERMINATION&nbsp;</b>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                By registering for the Platform and using the Services offered
                by the Company, the Company grants you a limited, revocable,
                non-transferable license to use the Platform. This license is
                solely for your own personal use and only for the purposes set
                forth on the Platform. You may download, view, copy, and print
                the Information incorporated into the Platform solely for your
                personal, non-commercial use. The Information may not be
                transferred to, shared with, or disseminated with anyone for any
                purpose that is inconsistent with the purpose of the Platform,
                to facilitate unfair competition with the Company or the
                Platform, or for any purpose that is inappropriate or unlawful
                under applicable United States or international law or otherwise
                in violation of these Terms of Use. The Company reserves all
                rights, including but not limited to, intellectual property
                rights not expressly granted to you.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-noraml">
                This limited license is freely revocable and may be terminated
                by the Company at any time and without cause and in the sole
                discretion of the Company. This License shall automatically be
                revoked and terminated upon any violation of these Terms of Use
                or any other rule, regulation, or policy of the Company. Upon
                termination of this license, you agree that you shall destroy
                any materials (electronic or otherwise) related to the Platform
                that remain in your possession or control, and you acknowledge
                that after such revocation or termination the Company may deny
                your access to the Platform in its sole discretion.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                If the Company terminates your access to the Platform, you may
                not attempt to access the Platform under your name, or any fake
                name or assumed alias, corporate name, or on behalf of a
                third-party.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                You are free to terminate your account at any time by ceasing to
                use the Platform in its entirety.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                These Terms of Use survive any termination of your account.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <ol>
              <li>
                <b>10. THIRD-PARTY LINKS&nbsp;</b>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-noramal">
                The Platform may contain links to other websites. These links
                are provided for informational purposes only, and the Company
                does not sponsor or affiliate with any linked entity unless
                expressly stated. The Company makes no representations and
                assumes no responsibility for your use of links provided on the
                Platform. You agree to indemnify and hold the Company and any of
                its related entities, board members, employees, agents and
                representatives harmless from and against, and shall reimburse
                the Company for any liability, damage, claim, loss, cost or
                expense (including, without limitation, court costs and
                reasonable attorneys’ fees) which may be incurred by the Company
                as a result of the material you link, upload, post, or transmit
                to the Site.&nbsp; The Company has no duty to review or edit
                materials submitted by users. Any such materials may be removed
                by the Company at any time for any reason whatsoever.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <ol>
              <li>
                <b>11. MODIFICATION&nbsp;</b>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                The Company reserves the right to update these Terms of Use at
                any time.&nbsp; The Company will provide Users notice by email
                or by posting the changes to the Site. The changes will become
                effective 30 days after emailing or posting notice of the
                changes. For the avoidance of doubt, no unilateral amendment
                will retroactively change agreed dispute-resolution provisions
                of these Terms of Use, if any, including, for example,
                arbitration provisions for then-pending disputes unless the
                parties expressly agree otherwise.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-noraml">
                The Company will post the date of the last update to these Terms
                of Use. Your continued use of the Platform after such
                modifications will be deemed to be your conclusive acceptance of
                all modifications to these Terms of Use. If you are dissatisfied
                as a result of such modification(s), your only recourse is to
                immediately discontinue use of the Platform.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <ol>
              <li>
                <b>12. MOBILE APP UPDATES AND UPGRADES&nbsp;</b>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                By installing any App, you agree to the installation and any
                updates or upgrades released through the Platform.&nbsp; Updates
                and upgrades are necessary to ensure the proper performance of
                the Platform and to ensure a satisfactory user experience.&nbsp;
                You have the option to perform updates and upgrades
                automatically.&nbsp; If you elect for automatic upgrades, you
                consent to the automated communication between your mobile
                device and the platform. Any personal information collected
                through this process is governed by the Privacy Policy.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <ol>
              <li>
                <b>
                  13. YOUR FEEDBACK, COMMENTS AND SUGGESTIONS FOR
                  IMPROVEMENTS&nbsp;
                </b>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                We welcome your feedback, comments, suggestions for
                improvements, and requests for technical support and other
                communications relating to the Platform (collectively, your “
              </span>
              <b>Feedback</b>
              <span className="font-normal leading-8">
                ”). Additionally, we may allow a Service Member or Client User
                to submit a review of an Agent after the consummation of a
                purchase or sale, and in our discretion we may display such
                review on the Platform (a “
              </span>
              <b>Review</b>
              <span className="font-normal leading-8">”).</span>
              <span className="font-normal leading-8">
                Please email your Feedback to us at
              </span>
              <Link href="mailto:info@veteranpcs.com">
                <span className="font-normal leading-8">
                  info@veteranpcs.com
                </span>
              </Link>
              <span className="font-normal leading-8">
                .&nbsp;With respect to your Feedback and Reviews, you grant to
                us a non-exclusive, worldwide, perpetual, irrevocable,
                fully-paid, royalty-free, sublicensable and transferable license
                under any and all intellectual property rights that you own or
                control to use, copy, modify, create derivative works based
                upon, and otherwise exploit your Feedback that we receive from
                you for any purpose.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <ol>
              <li>
                <b>14. CHILDREN&nbsp;</b>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                The Platform is intended for adults 18 years or older. You are
                not permitted to use the Platform if you are under the age of
                18. By using the Platform, you agree to provide us with accurate
                information concerning your age or identity if we request it.
                You also agree not to assist children under the age of 18 in
                accessing the Platform.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <ol>
              <li>
                <b>
                  15. GOVERNING LAW, JURISDICTION, AND DISPUTE RESOLUTION&nbsp;
                </b>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                All matters relating to your use of the Platform and these Terms
                of Use and any claim, controversy, or dispute arising therefrom
                or related thereto (in each case, including non-contractual
                disputes or claims), will be governed by and construed in
                accordance with the laws of the State of Colorado without giving
                effect to any choice or conflict of law provision or rule.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                Any legal suit, action or proceeding arising out of, or related
                to, these Terms of Use or your use of the Platform will be
                instituted exclusively in the federal courts of the United
                States located in the city and county of Denver, or the courts
                of the State of Colorado located in El Paso County City,
                although we retain the right to bring any suit, action or
                proceeding against you for breach of these Terms of Use in any
                other jurisdiction. You waive any and all objections to the
                exercise of jurisdiction over you by such courts and to venue in
                such courts.&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                The Company, in its sole discretion, may require you to submit
                any disputes arising from your use of the Platforms or these
                Terms of Use, including disputes arising from or concerning
                their interpretation, violation, invalidity, non-performance, or
                termination to final and binding arbitration.
              </span>
              <b>YOU HEREBY WAIVE ANY RIGHTS TO TRIAL BY JURY.</b>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                If a dispute arises between you and us regarding the respective
                rights or obligations under these Terms of Use, the parties
                agree to first attempt to settle each such dispute by direct
                discussions for a period of no less than 30 days. If such
                dispute cannot be settled by direct discussions, any unresolved
                dispute or breach will be resolved as provided above and by law.
                The prevailing or non-dismissing party in any dispute,
                litigation, or cause of action related to these Terms of Use
                will be entitled to reimbursement of all reasonable expenses,
                including without limitation court or arbitration or mediation
                costs and attorney fees incurred in good faith.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <ol>
              <li>
                <b>16. DISCLAIMER OF WARRANTIES&nbsp;</b>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                You acknowledge and agree that no warranties of any kind are
                made with respect to the Platform and other Services offered by
                the Company. Furthermore, you acknowledge that the Information
                and links provided through the Platform are compiled from
                sources that are beyond the control of the Company. Though such
                Information is recognized to be generally reliable, you
                acknowledge that inaccuracies may occur, and that the Company
                and its licensors do not warrant the accuracy or suitability of
                the Information.&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                FOR THIS REASON, YOU ACKNOWLEDGE THAT THE PLATFORM AND THE
                INFORMATION CONTAINED THEREIN ARE PROVIDED TO YOU ON AN “AS IS,
                WITH ALL FAULTS” BASIS. TO THE FULLEST EXTENT PERMITTED BY LAW,
                THE COMPANY EXPRESSLY EXCLUDES AND DISCLAIMS ALL EXPRESS AND
                IMPLIED WARRANTIES, INCLUDING WITHOUT LIMITATION, WARRANTIES OF
                MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                TO THE FULLEST EXTENT ALLOWED BY LAW, THE COMPANY DISCLAIMS ANY
                WARRANTIES REGARDING THE SECURITY, RELIABILITY, AVAILABILITY,
                SERVICE LEVELS, TIMELINESS, AND PERFORMANCE OF THE PLATFORM.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                TO THE FULLEST EXTENT ALLOWED BY LAW, THE COMPANY DISCLAIMS ALL
                LIABILITY FOR ANY CLAIMS, DAMAGES, LOSSES, COSTS OR EXPENSES
                (INCLUDING ATTORNEY’S FEES) RELATED TO THE FOLLOWING, AND DOES
                NOT WARRANT THAT (I) THE PLATFORM WILL MEET YOUR SPECIFIC
                REQUIREMENTS, (II) THE PLATFORM WILL BE UNINTERRUPTED, TIMELY,
                AVAILABLE, SECURE OR ERROR-FREE, (III) THAT ANY RESULTS MAY BE
                OBTAINED FROM YOUR USE OF THE PLATFORM, OR THAT ANY DATA,
                CONTENT OR INFORMATION ON THE SITE IS, OR WILL BE, VALID,
                ACCURATE, TIMELY, ADEQUATE, COMPLETE, LEGAL OR OTHERWISE
                RELIABLE, (IV) THE QUALITY OF ANY PRODUCTS, SERVICES,
                INFORMATION, OR OTHER MATERIAL OBTAINED BY YOU THROUGH THE
                PLATFORM WILL MEET YOUR EXPECTATIONS, OR (V) ANY ERRORS IN THE
                PLATFORM WILL BE CORRECTED.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                TO THE FULLEST EXTENT ALLOWED BY LAW, THE COMPANY DISCLAIMS ANY
                WARRANTIES FOR ANY INFORMATION, CONTENT OR ADVICE OBTAINED
                THROUGH THE PLATFORM AND ANY WARRANTIES FOR SERVICES OR GOODS
                RECEIVED THROUGH OR ADVERTISED ON THE PLATFORM OR RECEIVED
                THROUGH ANY LINKS PROVIDED BY THE SITE.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                THE COMPANY DISCLAIMS ALL LIABILITY AND SHALL NOT BE RESPONSIBLE
                FOR ANY DAMAGE OR LOSS OF ANY KIND ARISING OUT OF OR RELATED TO
                YOUR USE OF THE PLATFORM, INCLUDING, WITHOUT LIMITATION, DATA
                LOSS OR CORRUPTION, REGARDLESS OF WHETHER SUCH LIABILITY IS
                BASED IN TORT, CONTRACT OR OTHERWISE.&nbsp;
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                THE COMPANY DOES NOT WARRANT ANY SERVICES OBTAINED BY SERVICE
                MEMBERS FROM AGENTS AND DOES NOT RECOMMEND ANY PARTICULAR
                AGENT.&nbsp; THE COMPANY DOES NOT WARRANT OR GUARANTEE ANY
                AGENT’S SKILLS, EXPERTISE, LICENSING, ACCREDITATION, OR ANY
                OTHER CREDENTIALS.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                UNDER THESE TERMS OF USE, YOU ASSUME ALL RISK OF ERRORS AND/OR
                OMISSIONS IN THE PLATFORM, INCLUDING THE TRANSMISSION OR
                TRANSLATION OF INFORMATION. YOU HEREBY ASSUME ALL RESPONSIBILITY
                (AND THEREBY HOLD THE COMPANY HARMLESS), BY WHATEVER MEANS YOU
                DEEM MOST APPROPRIATE FOR YOUR NEEDS, FOR DETECTING AND
                ERADICATING ANY VIRUS OR PROGRAM WITH A SIMILAR FUNCTION.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                THE COMPANY DISCLAIMS ANY LIABILITY THAT MAY ARISE BETWEEN USERS
                OF THE PLATFORM AND DISCLAIMS ALL WARRANTIES WITH RESPECT TO THE
                QUALITY OF SERVICES CONTRACTED FOR AND PERFORMED.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <ol>
              <li>
                <b>17. LIMITATION OF LIABILITY&nbsp;</b>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                IN NO EVENT SHALL THE COMPANY OR ITS EMPLOYEES, AGENTS,
                LICENSORS OR CONTRACTORS BE LIABLE TO YOU OR ANY THIRD PARTY FOR
                ANY DAMAGES OF ANY KIND, INCLUDING, WITHOUT LIMITATION,
                INDIRECT, INCIDENTAL, CONSEQUENTIAL, PUNITIVE OR MULTIPLE
                DAMAGES OF ANY KIND, INCLUDING LOSS OF PROFITS, REVENUES, OR
                OTHER ECONOMIC LOSSES WHETHER DEEMED DIRECT OR CONSEQUENTIAL AND
                REGARDLESS OF THE THEORY OF LIABILITY AND WHETHER SUCH DAMAGES
                WERE REASONABLY FORESEEABLE.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                IN NO EVENT SHALL OUR LIABILITY FOR ANY DAMAGES, REGARDLESS OF
                KIND OR TYPE, TO YOU OR ANY OTHER PERSON, EXCEED THE LESSER OF
                ANY AMOUNTS YOU PAID TO USE THE PLATFORM OR $100.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <ol>
              <li>
                <b>18. LIMITATION OF CLAIMS&nbsp;</b>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                Any action on any claim against the Company must be brought by
                the user within one year following the date the claim first
                accrued or shall be deemed waived.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <ol>
              <li>
                <b>19. SEVERABILITY&nbsp;</b>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                Whenever possible, each provision of these Terms of Use shall be
                interpreted in such manner as to be effective and valid under
                applicable law, but if any provision of these Terms of Use is
                prohibited or invalid under applicable law, such provision shall
                be ineffective to the extent of such prohibition or invalidity
                without invalidating the remainder of such provision or the
                remaining provisions of these Terms of Use. Any unenforceable
                provision will be replaced by a mutually acceptable provision
                which comes closest to the intention of the parties at the time
                the original provision was agreed upon.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <ol>
              <li>
                <b>20. INDEMNIFICATION&nbsp;</b>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                You agree to defend, indemnify, and hold the Company and its
                employees, agents, licensors or contractors harmless from and
                against all claims, demands, actions, suits, damages,
                liabilities, losses, settlements, judgments, costs and expenses
                (including but not limited to reasonable attorney’s fees and
                costs), whether or not involving a third party claim, which
                arise out of or relate to your use of the Platform, including
                without limitation, your violation of these Terms of Use, in
                each case whether or not caused by the negligence of the Company
                or its employees, agents, licensors or contractors and whether
                or not the relevant claim has merit.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                In the event that any third-party claim is brought, the Company
                has the right and option to, at its own expense, undertake the
                defense and control of such action with counsel of its choice.
                If the Company exercises this option, you agree to cooperate
                with it in asserting any available defenses.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <ol>
              <li>
                <b>21. COPYRIGHT, PATENT AND TRADEMARK NOTICE&nbsp;</b>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                The Platform and Information is the valuable, exclusive property
                of the Company its licensors and nothing in these Terms of Use
                shall be construed as transferring or assigning any such
                ownership rights to you or any other person or entity. The
                Information is protected by contract law and various
                intellectual property laws, including domestic and international
                copyright laws. Except as expressly permitted in these Terms of
                Use, you may not copy, adapt, distribute, commercially exploit,
                or publicly display the Information or any portion thereof in
                any manner whatsoever without the Company’s prior written
                consent. You may not remove, alter or obscure any copyright,
                legal or proprietary notices in or on any portions of the
                Information. The Company, and its associated logos, and all page
                headers, custom graphics, buttons, and other icons are service
                marks, trademarks, registered service marks, or registered
                trademarks of the Company. All other product names and company
                logos mentioned on the Platform or Information are trademarks of
                their respective owners.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <ol>
              <li>
                <b>22. PROPRIETARY RIGHTS&nbsp;</b>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                The Platform and its content are protected by copyright,
                trademark, and other proprietary laws. Any Company logos and/or
                trademarks that appear anywhere on the Site are our property and
                may not be used without our express written consent. All other
                trademarks, service marks, and logos used in connection with any
                User, with or without attribution, are the trademarks, service
                marks, or logos of their respective owners and may not be used
                without their express written consent.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <h3>
              <b className="text-[#003486] text-[32px]">
                23. YOUR REPRESENTATIONS AND WARRANTIES&nbsp;
              </b>
            </h3>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                In addition to the representations made in Section 1 above, and
                any other representations and warranties made throughout these
                Terms of Use, you hereby represent and warrant that:
              </span>
            </p>
          </div>
          <div className="mb-4 pl-5">
            <ol>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  You are duly authorized by all necessary action and have all
                  consents, rights and authority to execute these Terms of Use,
                  and the information you provided to us was and is true,
                  accurate, current and complete;
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  you will abide at all times with the Community Guidelines of
                  Use laid out in Section 2 above and all other terms and
                  conditions of these Terms of Use;
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  you will access and use the Platform in compliance with any
                  and all applicable law(s), rules(s) or regulation(s) (whether
                  in the United States or other countries); and
                </span>
              </li>
              <li className="font-normal leading-8 list-decimal">
                <span className="font-normal leading-8">
                  if we grant you access to the Platform in your individual
                  capacity, you are at least 18 years of age.
                </span>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <ol>
              <li>
                <b>24. COMMUNICATIONS&nbsp;</b>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                When you visit our Site, use the Platform, or send us an email,
                you expressly indicate your consent to electronically receive
                any and all communications, notices, and our disclosures that we
                may provide in connection with your communication. Additionally,
                you may opt-in to receive email communications from us, which
                may include promotional, marketing, and advertising information
                and recommendations that we believe may be of interest to you,
                in accordance with applicable law. You may opt-out by emailing
                us at
              </span>
              <Link href="mailto:info@veteranpcs.com">
                <span className="font-normal leading-8">
                  info@veteranpcs.com
                </span>
              </Link>
              <span className="font-normal leading-8">
                , however you understand that you may not opt-out of
                communications related to a transaction consummated via the
                Platform.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                Consistent with federal CAN-SPAM or anti-spam laws, if you do
                not wish to receive commercial emails, you may unsubscribe
                following the instructions on any email, excepting that we may
                still send you administrative and transactional notices,
                including, without limitation, information about your account or
                other information that may be necessary to provide you with the
                Services.
              </span>
            </p>
          </div>
          <div className="mb-4">
            <ol>
              <li>
                <b>25. ENTIRE AGREEMENT&nbsp;</b>
              </li>
            </ol>
          </div>
          <div className="mb-4">
            <p>
              <span className="font-normal leading-8">
                If you are a Service Member or Client, these Terms of Use and
                our
              </span>
              <Link href="https://www.veteranpcs.com/privacy-policy">
                <span className="font-normal leading-8">Privacy Policy</span>
              </Link>
              <span className="font-normal leading-8">
                , which is fully incorporated by reference herein, constitute
                the entire agreement between you and the Company. If you are an
                Agent, you must also agree to the Referral Partner Agreement in
                which case these Terms of Use, our Privacy Policy, and the
                Referral Partner Agreement constitute the entire agreement
                between you and the Company. In the case of any conflicts
                between these Terms of Use and the Referral Partner Agreement
                the terms of the Referral Partner Agreement will control. These
                Terms of Use may not be modified except by the Company.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactForm;
