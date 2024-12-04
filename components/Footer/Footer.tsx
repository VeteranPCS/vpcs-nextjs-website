"use client";
import React from "react";
import styled from "styled-components";
import classes from "./Footer.module.css";

const LocationsContainer = styled.div`
  background: #002258;
  padding: 84px 0px 40px;
`;

const FooterContainer = styled.div`
  background: #002258;
  padding: 84px 0px 40px;
`;

const Footer = styled.div`
  background-color: #000000;
  padding: 40px 20px;
`;

const TitleComponent = styled.div`
  color: #fff;
  text-align: center;
  font-family: Roboto;
  font-size: 30px;
  font-style: normal;
  font-weight: 700;
  line-height: 32.4px;
`;

const PolicyLink = styled.div`
  color: #fff;
  font-family: Roboto;
  font-size: 18px;
  font-style: normal;
  font-weight: 500;
  line-height: 32.4px; /* 180% */
`;

const LocationsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  grid-gap: 20px;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
    grid-gap: 20px;
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
    grid-gap: 20px;
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
    grid-gap: 10px;
  }
`;

const LocationItem = styled.div`
  color: #fff;
  text-align: center;
  font-family: Roboto;
  font-size: 16px;
  font-style: normal;
  font-weight: 500;
  line-height: 32.4px;
  border-radius: 0.5rem;
  transition: all 0.3s ease;
`;

const Locations = () => {
  const locations = [
    "Alabama",
    "Alaska",
    "Arizona",
    "Arkansas",
    "California",
    "Colorado",
    "Connecticut",
    "Delaware",
    "Florida",
    "Georgia",
    "Hawaii",
    "Idaho",
    "Illinois",
    "Indiana",
    "Iowa",
    "Kansas",
    "Kentucky",
    "Louisiana",
    "Maine",
    "Maryland",
    "Massachusetts",
    "Michigan",
    "Minnesota",
    "Mississippi",
    "Missouri",
    "Montana",
    "Nebraska",
    "Nevada",
    "New Hampshire",
    "New Jersey",
    "New Mexico",
    "New York",
    "North Carolina",
    "North Dakota",
    "Ohio",
    "Oklahoma",
    "Oregon",
    "Pennsylvania",
    "Rhode Island",
    "South Carolina",
    "South Dakota",
    "Tennessee",
    "Texas",
    "Utah",
    "Vermont",
    "Virginia",
    "Washington",
    "Washington DC",
    "West Virginia",
    "Wisconsin",
    "Wyoming",
  ];

  return (
    <div className={classes.FooterLocationsContainer}>
      <div className={classes.FooterContainer}>
        <div className="container mx-auto">
          <div className="flex justify-center items-center mb-10 roboto font-bold">
            <div className="text-white text-center roboto text-3xl font-bold">
              LOCATIONS
            </div>
          </div>
          <div className={classes.LocationsGrid}>
            {locations.map((location, index) => (
              <div key={index} className={classes.LocationItem}>
                <a
                  href="#"
                  className="text-white text-center roboto text-base font-medium"
                >
                  {location}
                </a>
              </div>
            ))}
          </div>
          <div className="mt-10 px-5">
            <div className="flex flex-wrap justify-between items-center">
              <div>
                <a
                  href="#"
                  className="text-white text-center roboto text-lg font-medium"
                >
                  Terms Of Service
                </a>
              </div>
              <div>
                <a
                  href="#"
                  className="text-white text-center roboto text-lg font-medium"
                >
                  Veteran PCS ©2024
                </a>
              </div>
              <div>
                <a
                  href="#"
                  className="text-white text-center roboto text-lg font-medium"
                >
                  Privacy Policy{" "}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={classes.Footer}>
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 md:grid-cols-2 sm:grid-cols-1 grid-cols-1 gap-4">
            <div>
              <div>
                <img
                  className="w-[200px] h-[52px]"
                  src="/icon/solid-oak-logo.svg"
                  alt=""
                />
              </div>
              <div>
                <p className="text-white text-[14px] font-medium roboto w-[180px] my-4">
                  Jason Anderson Founder and Owner, VeteranPCS, LLC Employing
                  Broker License: ER.100089091
                </p>
              </div>
              <div className="flex items-center">
                <div>
                  <img src="/icon/foot2.svg" alt="" />
                </div>
                <div>
                  <img src="/icon/foot3.svg" alt="" />
                </div>
              </div>
            </div>
            <div>
              <p className="text-white text-[14px] font-medium roboto mb-2">
                The Move-In Bonus is offered in most states, but due to local
                regulations, it may not be available in your state. In such
                states, VeteranPCS may offer a “Relocation Grant” in lieu of the
                Move-In Bonus if it is not available in your state. You must
                apply and be approved for the Relocation Grant, and VeteranPCS
                is under no obligation to approve such application. We will
                reach out to you once you begin using the service and notify you
                if the Move- In Bonus is not available in your state and what
                next steps may be available.
              </p>
              <p className="text-white text-[14px] font-medium roboto">
                The Move-In Bonus (or Relocation Grant, as applicable) is only
                available with the purchase and/or sale of your home through the
                use of a VeteranPCS-introduced real estate agent. Other terms
                and conditions may apply. This is not a solicitation if you are
                already represented by a real estate broker. Please contact
                operations@veteranPCS.com for details. Program terms and
                conditions are subject to change at any time without notice. By
                using the services offered herein, you represent that you have
                read, understood, and agree to the Platform Terms of Use.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Locations;
