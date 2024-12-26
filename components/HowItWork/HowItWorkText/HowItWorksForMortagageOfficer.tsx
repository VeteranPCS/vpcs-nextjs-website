import { HowItWorksContentProps } from '@/services/howItWorksService';
import howItWorksService from "@/services/howItWorksService";

const HowItWorksForMortagageOfficer = async () => {
    let pageContent: HowItWorksContentProps | null = null;

    try {
        pageContent = await howItWorksService.fetchOverviewSection("how-it-works-for-mortgage-loan-officers");
    } catch (error) {
        console.error("Error fetching the How It Works for Mortage Loan Officer Content", error);
    }

    if (!pageContent) {
        return <p>Failed to load the How It Works for Agent Content.</p>;
    }

    return (
        <>
            <div>
                <h6 className="text-[#292F6C] tahoma lg:text-[33px] md:text-[30px] sm:text-[30px] text-[30px] font-bold my-2">
                    {pageContent.component_header[0].children.map((child) =>
                        child.marks.includes("strong") ? (
                            <span key={child._key} className="font-bold">
                                {child.text}
                            </span>
                        ) : (
                            child.text
                        )
                    )}
                </h6>
            </div>
            {pageContent.description?.map((block, index) => {
                const isHeading = block.children?.[0]?.marks?.includes("strong");
                const isList = block.listItem === "bullet";
                const isItalian = block.children?.[0]?.marks?.includes("em");

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
                            <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
                                {block.children?.[0]?.text}
                            </p>
                        </div>
                    );
                }

                if (isItalian) {
                    return (
                        <div key={block._key || index}>
                            <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
                                <em>{block.children?.[0]?.text}</em>
                            </p>
                        </div>
                    );
                }

                return (
                    <div key={block._key || index} className='mt-3 mb-5'>
                        <p className="text-[#000000] roboto lg:text-[24px] md:text-[24px] sm:text-[20px] text-[20px] font-medium">
                            {block.children?.[0]?.text}
                        </p>
                    </div>
                );
            })}
        </>
    )
}

export default HowItWorksForMortagageOfficer;