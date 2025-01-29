import React from "react";
import classes from "./Footer.module.css";
import Image from "next/image";
import Link from "next/link";

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

  const formattedLocation = (location: string) => {
    return location.toLowerCase().replace(/\s+/g, "-");
  };

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
                <Link
                  href={`/${formattedLocation(location)}`}
                  className="text-white text-center roboto text-base font-medium"
                >
                  {location}
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-10 px-5">
            <div className="md:flex sm:block sm:justify-center sm:text-center text-center flex-wrap gap-5 md:justify-between items-center">
              <div>
                <Link
                  href="/terms-of-use"
                  className="text-white text-center roboto text-lg font-medium"
                >
                  Terms Of Service
                </Link>
              </div>
              <div className="my-7 sm:my-7 md:my-0">
                <span className="text-white text-center roboto text-lg font-medium">
                  VeteranPCS ©2024
                </span>
              </div>
              <div>
                <Link
                  href="/privacy-policy"
                  className="text-white text-center roboto text-lg font-medium"
                >
                  Privacy Policy{" "}
                </Link>
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
                <Image
                  width={200}
                  height={52}
                  className="w-[200px] h-[52px]"
                  src="/icon/solid-oak-logo.svg"
                  alt=""
                />
              </div>
              <div className="text-white text-[14px] font-medium roboto my-4">
                <p>Solid Oak Realty, Inc.</p>
                <p>D.B.A. VeteranPCS</p>
                <p>415 N. Tejon St.</p>
                <p>Colorado Springs, CO 80903</p>
                <p>License: ER.100089091</p>
              </div>
              <div className="flex items-center">
                <div>
                  <Image
                    width={100}
                    height={100}
                    className="w-auto h-auto"
                    src="/icon/foot2.svg"
                    alt=""
                  />
                </div>
                <div>
                  <Image
                    width={100}
                    height={100}
                    className="w-auto h-auto"
                    src="/icon/foot3.svg"
                    alt=""
                  />
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
