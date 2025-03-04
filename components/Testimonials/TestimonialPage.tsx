import userImageServices from "@/services/userService";
import ImageSlider from "@/components/common/ImageSlider";
import { UserImage } from "@/components/common/ImageSlider";


export default async function Testimonials() {
    let userImageList: UserImage[] = [];

    try {
        userImageList = await userImageServices.fetchImages();
    } catch (error) {
        console.error("Error fetching images for testimonials", error);
    }

    if (!userImageList) {
        return <p>Failed to load the User Image List.</p>;
    }

    return (
        <ImageSlider userImageList={userImageList} />
    )
}