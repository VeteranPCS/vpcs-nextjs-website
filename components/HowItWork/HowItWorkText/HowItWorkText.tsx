// "use client"
import React from "react";
import "@/styles/globals.css";
// import { useState, useEffect, useCallback } from "react";
// import howItWorksService from "@/services/howItWorksService";

const HowItWorkText = () => {
  // const [pageData, setPageData] = useState();

  // const fetchVeterenceServiceData = useCallback(async () => {
  //   try {
  //     const response = await howItWorksService.fetchHowVeterencePCSWorks()
  //     if (!response.ok) throw new Error('Failed to fetch posts')
  //     const data = await response.json()
  //     setPageData(data)
  //   } catch (error) {
  //     console.error('Error fetching posts:', error)
  //   }
  // }, [])

  // useEffect(() => {
  //   fetchVeterenceServiceData()
  // }, [fetchVeterenceServiceData])

  // useEffect(() => {
  //   console.log(pageData)
  // }, [pageData])

  return (
    <div className="py-12 lg:px-0 px-5">
      <div className="container mx-auto">
        <div>
          <p className="text-[#000000] roboto lg:text-[23px] md:text-[23px] sm:text-[20px] text-[20px] font-medium">
            The following is intended to provide a general overview of how the
            VeteranPCS service works, but is qualified in its entirety by the
            <span className="text-[#348BE2]"> Platform Terms of Use.</span> If
            you use our services, you must read, understand, and agree to the{" "}
            <span className="text-[#348BE2]"> Platform Terms of Use.</span> If
            you are an agent, you must agree to our Referral Partner Agreement.
          </p>
        </div>
        <div className="my-4">
          <p className="text-[#000000] roboto lg:text-[23px] md:text-[23px] sm:text-[20px] text-[20px] font-medium">
            Visit our
            <span className="text-[#348BE2]"> contact page</span> to find out
            how you can become a preferred agent or lender with VeteranPCS.
          </p>
        </div>
        <div>
          <h6 className="text-[#292F6C] tahoma lg:text-[33px] md:text-[30px] sm:text-[30px] text-[30px] font-bold my-2">
            How the VeteranPCS Service Works
          </h6>
        </div>
        <div className="mt-2 mb-5">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold mb-5">
            What does it cost?
          </p>
        </div>
        <div className="pl-6">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            The VeteranPCS service is free to use. VeteranPCS takes a percentage
            of any commission an Agent earns for purchases or sales consummated
            through VeteranPCS as a referral fee.
          </p>
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            The Referral Partners also distribute a Move-In Bonus to the Service
            Member at closing, when allowed, for using the site, explained
            below.
          </p>
        </div>
        <div className="my-5">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold mb-5">
            Connecting with an Agent
          </p>
        </div>
        <div className="pl-6">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            You may browse agents according to geographic area and contact them
            through the website. You simply click the “Get in Contact” button
            and fill out a form to connect with that agent.
          </p>
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            Your information will not be shared or sold, the sole intention of
            the form is to connect you with that agent.
          </p>
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            If you decide to enter into an agency agreement with them, that
            contract happens outside of the website and VeteranPCS is not a
            party to that contract.
          </p>
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            When you submit your information, you will receive an auto-email
            with that agent’s contact information, and the agent will receive an
            email with your information, so you can start communicating right
            away.
          </p>
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            You must agree to receive periodic communications from us in order
            to use our services and receive the Move-In Bonus. We must keep
            track of key dates to ensure you receive your Move-In Bonus, when
            allowed.
          </p>
        </div>
        <div className="mt-3 mb-5">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold mb-5">
            Interview Agents
          </p>
        </div>
        <div className="pl-6">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            Fill out multiple forms to get in contact with agents. Interview
            them yourself and see which one is the best match for you.
          </p>
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            If you are an agent, you are not entitled to every lead that you
            receive from the website. The decision on which agent to choose
            rests on the client, and VeteranPCS will communicate their decision
            to each agent to ensure clear communication.
          </p>
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            If a valid agency agreement has been signed between an agent and a
            client, VeteranPCS is not a party to that contract and will not
            attempt to break that contract.
          </p>
        </div>
        <div className="my-5">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold mb-5">
            Follow Up
          </p>
        </div>
        <div className="pl-6">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium mb-5">
            We will keep in contact with both you and your agent throughout the
            process to ensure you are receiving the quality of service we expect
            from all agents using VeteranPCS.
          </p>
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium mb-5">
            If you are ever dissatisfied with the level of service you are
            receiving, we encourage you to let us know. We will investigate, and
            may suspend that agent’s use of our services.
          </p>
        </div>
        <div className="mb-5">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            When you close on a property, your agent will pay us a 15% referral
            fee from their total commission, and will distribute a Move-In Bonus
            to you, when allowed (described below).
          </p>
        </div>
        <div className="border-b-2 border-[#203269]"></div>
        <div>
          <h6 className="text-[#292F6C] tahoma lg:text-[33px] md:text-[30px] sm:text-[30px] text-[30px] font-bold my-2">
            How the Move-In Bonus Works
          </h6>
        </div>
        <div className="pl-6">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            The Move-In Bonus will be distributed upon closing on a property,
            when allowed according to the following schedule:
          </p>
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium mb-5">
            The Move-In Bonus is offered in most states, but due to local
            regulations, it may not be available in your state. In some states,
            a relocation grant may be available in lieu of the Move-In Bonus. We
            will notify you if your state is not eligible for the Move In Bonus
            so you can apply for a Relocation Grant. We will reach out to you
            once you begin using the service and notify you if the Move-In Bonus
            is not available in your state.
          </p>
        </div>
        <div className="pl-6">
          <table className="table-auto border lg:w-[1000px] w-full">
            <thead>
              <tr className="border text-left">
                <th className="text-[#000] tahoma lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold p-3">
                  Home Price
                </th>
                <th className="text-[#000] tahoma lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold p-3">
                  Move-In Bonus
                </th>
                <th className="text-[#000] tahoma lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold p-3">
                  Charity Donation
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border">
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold p-3">
                  {" "}
                  $100,000
                </td>
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium p-3">
                  $200
                </td>
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium p-3">
                  $20
                </td>
              </tr>
              <tr className="border">
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold p-3">
                  $100,000 – $199,999
                </td>
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium p-3">
                  $400
                </td>
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium p-3">
                  $40
                </td>
              </tr>
              <tr className="border">
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold p-3">
                  $200,000 – $299,999
                </td>
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium p-3">
                  $700
                </td>
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium p-3">
                  $70
                </td>
              </tr>
              <tr className="border">
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold p-3">
                  $300,000 – $399,999
                </td>
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium p-3">
                  $1,000
                </td>
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium p-3">
                  $100
                </td>
              </tr>
              <tr className="border">
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold p-3">
                  $400,000 – $499,999
                </td>
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium p-3">
                  $1,200
                </td>
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium p-3">
                  $120
                </td>
              </tr>
              <tr className="border">
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold p-3">
                  $500,000 – $599,999
                </td>
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium p-3">
                  $1,500
                </td>
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium p-3">
                  $150
                </td>
              </tr>
              <tr className="border">
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold p-3">
                  $600,000 – $749,999
                </td>
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium p-3">
                  $2,000
                </td>
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium p-3">
                  $200
                </td>
              </tr>
              <tr className="border">
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold p-3">
                  $750,000 – $999,999
                </td>
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium p-3">
                  $3,000
                </td>
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium p-3">
                  $300
                </td>
              </tr>
              <tr className="border">
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold p-3">
                  $1,000,000+
                </td>
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium p-3">
                  $4,000
                </td>
                <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium p-3">
                  $400
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <h6 className="text-[#000] tahoma lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold mt-5">
            Before obtaining the Move-In Bonus, you will be required to:
          </h6>
        </div>
        <div className="ml-5">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium mb-10">
            Sign and submit the Move-In Bonus Agreement, in which you will agree
            to the terms of receiving the Move-In Bonus, including affirming
            your status as a Service Member, described below.
          </p>
        </div>
        <div className="border-b-2 border-[#203269]"></div>
        <div>
          <h6 className="text-[#292F6C] tahoma lg:text-[33px] md:text-[30px] sm:text-[30px] text-[30px] font-bold my-2">
            Who is Eligible for the Move-In Bonus?
          </h6>
        </div>
        <div className="my-5">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold mb-5">
            Service Member
          </p>
        </div>
        <div className="pl-6">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium mb-10">
            A Service Member eligible to receive the Move-In Bonus means that
            you are either (a) currently serving in the U.S. Armed Forces, (b)
            have served in the past and obtained an Honorable Discharge, or (c)
            are a spouse of someone meeting the criteria of (a) or (b) (there
            are penalties for falsely affirming you are a Service Member when
            you do not meet these criteria; see Section 1.1 of the Platform
            Terms of Use for more information),
          </p>
        </div>
        <div className="my-5">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold mb-5">
            Non-Service Member
          </p>
        </div>
        <div className="pl-6">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium mb-10">
            If you do not meet the criteria above, you may still use the
            VeteranPCS service, but instead of receiving the Move-In Bonus, you
            will agree that what would be distributed to you as a Move-In Bonus,
            if you were a Service Member, will instead be donated to a
            Veteran-focused charity.
          </p>
        </div>
        <div className="border-b-2 border-[#203269]"></div>
        <div>
          <h6 className="text-[#292F6C] tahoma lg:text-[33px] md:text-[30px] sm:text-[30px] text-[30px] font-bold my-2">
            How it Works for Agents
          </h6>
        </div>
        <div>
          <i className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            The following is intended to provide a general overview of how our
            site works with agents. For full information and understanding of
            the terms and conditions you must refer to our Referral Partner
            Agreement.
          </i>
        </div>
        <div className="my-5">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold mb-5">
            Who qualifies to be a Referral Partner?
          </p>
        </div>
        <div className="pl-6">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            To be considered to be a Referral Partner with VeteranPCS you must
            be either (a) currently serving in the U.S. Armed Forces, (b) have
            served in the past and obtained an Honorable Discharge, or (c) are a
            spouse of someone meeting the criteria of (a) or (b)
          </p>
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            Additional requirements to be considered as a Referral Partner can
            be found in the Referral Partner Agreement. Please contact us if you
            are interested in becoming a Referral Partner.
          </p>
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            If you do not meet the exact criteria listed above but believe you
            should be considered as a Referral Partner, please contact us to
            discuss your criteria.
          </p>
        </div>
        <div className="my-5">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold mb-5">
            What does it cost?
          </p>
        </div>
        <div className="pl-6">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            VeteranPCS has no annual fees, no monthly fees, no fees for calls,
            and no hidden fees.
          </p>
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            We operate based on a simple 15% referral of the gross commission
            due back to VeteranPCS for any customer that closes on the sale or
            purchase of a home.
          </p>
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            Referral Partners also agree, through our referral partner
            agreement, to credit the Move-In Bonus amount to the Client at
            closing. For non-Service Member Clients, the referral is 25% of the
            gross commission
          </p>
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            In states that do not allow crediting your client a bonus,
            VeteranPCS collects a 25% referral fee. In these states we will
            consider the Client, if a Service Member, for a Relocation Grant.
          </p>
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            For non-Service Member Clients, the would-be Move-In Bonus amount
            will get donated to a military-focused charity which they can
            select.
          </p>
        </div>
        <div className="my-5">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold mb-5">
            Are you a Brokerage?
          </p>
        </div>
        <div className="pl-6">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium mb-10">
            VeteranPCS is a registered trade name for Solid Oak Realty, Inc., a
            Colorado corporation and real estate brokerage. Referral Partners
            are not employed by VeteranPCS. VeteranPCS features licensed real
            estate agents from many different brokerages.
          </p>
        </div>
        <div className="border-b-2 border-[#203269]"></div>
        <div>
          <h6 className="text-[#292F6C] tahoma lg:text-[33px] md:text-[30px] sm:text-[30px] text-[30px] font-bold my-2">
            How it works for Mortgage Loan Officers
          </h6>
        </div>
        <div>
          <i className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            The following is intended to provide a general overview of how our
            site works with mortgage loan officers, or VA Loan Experts. For full
            information and understanding of the terms and conditions you must
            refer to our Marketing Services Agreement.
          </i>
        </div>
        <div className="mt-2 mb-5">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold mb-5">
            Who qualifies to be a VA Loan Expert?
          </p>
        </div>
        <div className="pl-6">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            To be considered as a VA Loan Expert featured on VeteranPCS you must
            be either (a) currently serving in the U.S. Armed Forces, (b) have
            served in the past and obtained an Honorable Discharge, or (c) are a
            spouse of someone meeting the criteria of (a) or (b)
          </p>
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            You must be a licensed Mortgage Loan Officer in good standing.
            <br></br> You must not charge the 1% loan origination fee.
          </p>
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            Additional requirements to be considered as a VA Loan Expert can be
            found in the Marketing Services Agreement. Please contact us if you
            are interested in becoming a VA Loan Expert with VeteranPCS. If you
            do not meet the exact criteria listed above but believe you should
            be considered as a VA Loan Expert, please contact us to discuss your
            criteria.
          </p>
        </div>
        <div className="my-5">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold mb-5">
            What does is cost?
          </p>
        </div>
        <div className="pl-6">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            VeteranPCS has annual marketing fee for licensed mortgage lenders to
            be featured on the website. The fee is based on demand in each state
            and renewed each calendar year. Please use our Get Listed button on
            the <span className="text-[#348BE2]">Contact Us</span> page to start
            the process and schedule a phone call interview.
          </p>
        </div>
        <div className="mt-5 mb-2">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold mb-5">
            Are you a Lending company or Bank?
          </p>
        </div>
        <div className="pl-6">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium mb-10">
            No we are not a mortgage broker, lending company, or bank. We
            feature veterans and military spouses who are licensed mortgage loan
            officers from a variety of different companies across the nation.
          </p>
        </div>
        <div className="border-b-2 border-[#203269]"></div>
        <div>
          <h6 className="text-[#292F6C] tahoma lg:text-[33px] md:text-[30px] sm:text-[30px] text-[30px] font-bold my-2">
            What makes us different?
          </h6>
        </div>
        <div>
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            VeteranPCS was designed to add value in three ways: first we help
            connect military families to agents who have personally PCSd.
            Second, we help agents who are either veterans or military spouses
            by helping them receive more clients. Third, we give back to
            veteran-focused charities.
          </p>
        </div>
        <div className="my-5">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold mb-5">
            Reviews
          </p>
        </div>
        <div className="pl-6">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            You will not see reviews listed for agents on this site. Each agent
            has been interviewed and selected and we have verified their
            reviews. You do not need to spend time sifting through reviews to
            find a great agent.
          </p>
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            Each agent here has been referred by a military client that bought
            or sold a house through them.
          </p>
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            Review-based sites can make it very difficult for a veteran or
            military spouse to start a business. They have high fees, are hard
            to get noticed on, and do not distinguish between agents who have
            real experience with PCSing.
          </p>
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            If you wish to see an agents reviews you will be able to get access
            to their personal website links once getting in contact with them
            through the site
          </p>
        </div>
        <div className="my-5">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold mb-5">
            Charities
          </p>
        </div>
        <div className="pl-6">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium mb-10">
            VeteranPCS is proud to support many different veteran-focused
            charities and organizations. We donate an additional 10% of your
            Move In Bonus amount to a military-focused charity, for full details
            on amounts see the table above.
          </p>
        </div>
        <div className="border-b-2 border-[#203269]"></div>
        <div>
          <h6 className="text-[#292F6C] tahoma lg:text-[33px] md:text-[30px] sm:text-[30px] text-[30px] font-bold my-2">
            What Charities do you support?
          </h6>
        </div>
        <div className="pl-6">
          <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
            Coming Soon: A page exclusively featuring supported charities
            VeteranPCS supports multiple veteran-focused charities that benefit
            both service members as well as their families. If you would like to
            recommend a charity please visit our contact us page to email us.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HowItWorkText;
