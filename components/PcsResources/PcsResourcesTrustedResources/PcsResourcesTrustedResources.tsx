import React from "react";
import Image from "next/image";
import Link from "next/link";
import resourcesService from "@/services/resourcesService";

interface TrustedSource {
  _id: string;
  url?: string;
  logo: {
    asset: {
      image_url: string;
    };
    alt: string;
  };
}

const PcsResourcesTrustedResources = async () => {
  let trusted_sources: TrustedSource[] | null = null;

  try {
    trusted_sources = await resourcesService.fetchTrustedResources(); // fetch data on the server side
  } catch (error) {
    console.error("Error fetching Life Resources", error);
  }

  if (!trusted_sources) {
    return <p>Failed to load the blog.</p>;
  }

  return (
    <div className="py-12 px-5">
      <div className="container mx-auto">
        <div>
          <h2 className="text-[#003486] md:text-[43px] text-[31px] font-bold text-center">
            VeteranPCS Trusted Resources
          </h2>
          <p className="text-[#878787] text-center mx-auto roboto md:text-[18px] text-[14px] font-medium mt-2 italic">
            Trusted veteran and military spouse owned resources, businesses and
            organizations.
          </p>
        </div>
        <div className="grid lg:grid-cols-6 md:grid-cols-4 grid-cols-2 gap-5 md:mt-10 mt-5">
          {trusted_sources.map((trusted_source) => (
            <div key={trusted_source._id}>
              {trusted_source?.url ? (
                <Link href={trusted_source?.url}>
                  <Image
                    width={128}
                    height={36}
                    src={
                      trusted_source?.logo?.asset?.image_url ||
                      "/assets/spouselylogomain.png"
                    }
                    alt={trusted_source?.logo?.alt || "no alt"}
                    className="md:w-[128px] mt-10 md:h-[36px] w-auto h-auto"
                  />
                </Link>
              ) : (
                <div>
                  <Image
                    width={128}
                    height={36}
                    src={
                      trusted_source?.logo?.asset?.image_url ||
                      "/assets/spouselylogomain.png"
                    }
                    alt={trusted_source?.logo?.alt || "no alt"}
                    className="md:w-[128px] mt-10 md:h-[36px] w-auto h-auto"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PcsResourcesTrustedResources;
