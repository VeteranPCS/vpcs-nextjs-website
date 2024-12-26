import { memo } from "react"
import userImageServices from "@/services/userService";
import ImageSlider from "@/components/common/ImageSlider";

const MemoizedSlider = memo(ImageSlider);

export default async function Testimonials() {
    let userImageList = [];

    try {
        userImageList = await userImageServices.fetchImages();        
    } catch (error) {
        console.error("Error fetching blog", error);
    }

    if (!userImageList) {
        return <p>Failed to load the User Image List.</p>;
    }

    return (
        <MemoizedSlider userImageList={userImageList} />
    )
}