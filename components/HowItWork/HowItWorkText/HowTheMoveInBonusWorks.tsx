import { HowBonusMoveInContentProps } from "@/services/howItWorksService";
import howItWorksService from "@/services/howItWorksService";

const HowTheMoveInBonusWorks = async () => {
  let moveInBonus: HowBonusMoveInContentProps | null = null;

  try {
    moveInBonus = await howItWorksService.fetchMoveInBonus();
  } catch (error) {
    console.error("Error fetching How Move In Bonus Works Content", error);
  }

  if (!moveInBonus) {
    return <p>Failed to load the How Move In Bonus Works Content.</p>;
  }

  return (
    <>
      <div>
        <div>
          <h6 className="text-[#292F6C] tahoma lg:text-[33px] md:text-[30px] sm:text-[25px] text-[25px] font-bold my-2">
            {moveInBonus?.title}
          </h6>
        </div>
        <div>
          {moveInBonus?.description?.map((block, index) => {
            const isHeading = block.children?.[0]?.marks?.includes("strong");
            const isList = block.listItem === "bullet";

            if (isHeading) {
              return (
                <div key={block._key || index} className="mt-3 mb-5">
                  <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold mb-5">
                    {block.children?.[0]?.text}
                  </p>
                </div>
              );
            }

            if (isList) {
              return (
                <div key={block._key || index} className="pl-6">
                  <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[17px] text-[17px] md:font-medium sm:font-normal font-normal">
                    {block.children?.[0]?.text}
                  </p>
                </div>
              );
            }

            return (
              <div key={block._key || index} className="mt-3 mb-5">
                <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[17px] text-[17px] md:font-medium sm:font-normal font-normal">
                  {block.children?.[0]?.text}
                </p>
              </div>
            );
          })}
        </div>

        <div className="md:pl-6 mt-2">
          <table className="table-auto border lg:w-[1000px] w-full">
            <thead>
              <tr className="border text-left">
                <th className="text-[#000] tahoma lg:text-[24px] md:text-[24px] sm:text-[17px] text-[17px] font-bold p-3">
                  Home Price
                </th>
                <th className="text-[#000] tahoma lg:text-[24px] md:text-[24px] sm:text-[17px] text-[17px] font-bold p-3">
                  Move-In Bonus
                </th>
                <th className="text-[#000] tahoma lg:text-[24px] md:text-[24px] sm:text-[17px] text-[17px] font-bold p-3">
                  Charity Donation
                </th>
              </tr>
            </thead>
            <tbody>
              {moveInBonus?.bonusTable.map((row, index) => (
                <tr key={index} className="border">
                  <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[17px] text-[17px] font-bold p-3">
                    {row.priceRange}
                  </td>
                  <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[17px] text-[17px] md:font-medium sm:font-normal font-normal p-3">
                    {row.moveInBonus.toLocaleString()}
                  </td>
                  <td className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[17px] text-[17px] md:font-medium sm:font-normal font-normal p-3">
                    {row.charityDonation.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8">
          <div className="pl-6 text-lg">
            {moveInBonus?.requirements?.map((block, index) => {
              const isHeading = block.children?.[0]?.marks?.includes("strong");
              const isList = block.listItem === "bullet";

              if (isHeading) {
                return (
                  <div key={block._key || index} className="mt-3 mb-5">
                    <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-bold mb-5">
                      {block.children?.[0]?.text}
                    </p>
                  </div>
                );
              }

              if (isList) {
                return (
                  <div key={block._key || index} className="pl-6">
                    <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[17px] text-[17px] md:font-medium sm:font-normal font-normal">
                      {block.children?.[0]?.text}
                    </p>
                  </div>
                );
              }

              return (
                <div key={block._key || index} className="mt-3 mb-5">
                  <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[17px] text-[17px] md:font-medium sm:font-normal font-normal">
                    {block.children?.[0]?.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default HowTheMoveInBonusWorks;
