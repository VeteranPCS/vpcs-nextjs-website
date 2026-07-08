import Image from "next/image";
import aboutService from "@/services/aboutService";
import BlockContent from "@/components/Blog/BlockContent";
import { validateBlockStyle } from "@/components/Blog/BlogDetail";
import BioToggle from "@/components/About/BioToggle";

export interface ImageAsset {
  image_url?: string;
}

interface MainImage {
  alt: string; // Alternative text for the image
  asset: {
    image_url?: string; // URL of the image
    _ref: string; // Reference ID for the image asset
    _type: string; // Type of the asset, typically "reference"
  };
  _type: "image"; // Type of the main image, typically "image"
}

export interface TeamMember {
  _id: string;
  image: MainImage;
  description: {
    _key: string;
    style: string;
    children: {
      _key: string;
      marks: string[];
      text: string;
    }[];
  }[];
  buttonText: string;
  name: string;
  designation: string;
}

const AdminTeam = async () => {
  let DigitalAdminDetails: TeamMember[] | null = null;

  try {
    DigitalAdminDetails = await aboutService.fetchMembersDetail('administration');

    // Sort team members by specific order (unknown names appear at the end)
    if (DigitalAdminDetails) {
      const nameOrder = ['Beth Soldner', 'Stephanie Guree', 'Jessica Brown', 'Tara Gould'];
      DigitalAdminDetails.sort((a, b) => {
        const aIndex = nameOrder.indexOf(a.name);
        const bIndex = nameOrder.indexOf(b.name);
        const aPos = aIndex === -1 ? nameOrder.length : aIndex;
        const bPos = bIndex === -1 ? nameOrder.length : bIndex;
        return aPos - bPos;
      });
    }
  } catch (error) {
    console.error('Error fetching Administrations Team&apos;s Data:', error);
    return <p>Failed to load the Administrations Team&apos;s Data.</p>;
  }

  return (
    <div>
      <div className="bg-[#FFFFFF] pt-7 pb-14 px-9 sm:px-4">
        <div className="container mx-auto">
          <div className="text-center">
            <h6 className="text-gray-800 text-center font-bold text-[21px]">
              ADMINISTRATION
            </h6>
            <p className="text-[#000000] text-center font-normal text-[24px] lg:w-[1000px] mx-auto my-3">
              Ensuring your experience is seamless and an extraordinary move or PCS.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-9 mt-10">
            {DigitalAdminDetails.map((details) => (
              <div key={details._id} className="border border-[#EAECF0] bg-white mx-auto mt-5">
                <div>
                  <Image
                    src={details?.image?.asset?.image_url || "/assets/adminpasteimage.png"}
                    alt={details?.image?.alt || "Profile image"}
                    width={417}
                    height={400}
                    className="w-full sm:h-[350px] h-auto object-cover"
                  />
                </div>
                <div className="px-5 py-5">
                  <h6 className="text-black font-semibold text-lg md:text-2xl">
                    {details.name}
                  </h6>
                  <span className="text-[#3E3E59] text-sm md:text-lg font-light">
                    {details.designation}
                  </span>
                  <BioToggle id={details._id}>
                    {details?.description?.map((block, index) => (
                      <BlockContent
                        key={block._key || index}
                        blocks={[
                          {
                            ...block,
                            style: validateBlockStyle(block.style),
                          },
                        ]}
                      />
                    ))}
                  </BioToggle>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTeam;
