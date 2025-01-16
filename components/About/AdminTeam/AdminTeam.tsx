import "@/styles/globals.css";
import Image from "next/image";
import aboutService from "@/services/aboutService";
import BlockContent from "@/components/Blog/BlockContent";
import { validateBlockStyle } from "@/components/Blog/BlogDetail";

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
  } catch (error) {
    console.error('Error fetching Administrations Team&apos;s Data:', error);
    return <p>Failed to load the Administrations Team&apos;s Data.</p>;
  }

  return (
    <div>
      <div className="bg-[#FFFFFF] pt-7 pb-14 px-9 sm:px-0">
        <div className="container mx-auto">
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
                  <h6 className="text-black tahoma font-semibold text-2xl">
                    {details.name}
                  </h6>
                  <span className="text-[#3E3E59] text-lg font-light">
                    {details.designation}
                  </span>
                  <div className="relative">
                    {/* Hidden checkbox to track toggle state */}
                    <input type="checkbox" id={`toggle-${details._id}`} className="peer hidden" />

                    {/* Text that expands/collapses */}
                    <p className="text-[#5F6980] max-h-28 text-lg font-light mt-3 mb-3 overflow-hidden peer-checked:max-h-full transition-all duration-300">
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
                    </p>

                    {/* Single label that toggles state */}
                    <label htmlFor={`toggle-${details._id}`} className="cursor-pointer text-[#292F6C] tahoma text-sm font-bold absolute bottom-[-1] left-0 bg-white peer-checked:before:content-['Read_Less'] before:content-['Read_More'] before:bg-white before:block">
                    </label>
                  </div>
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
