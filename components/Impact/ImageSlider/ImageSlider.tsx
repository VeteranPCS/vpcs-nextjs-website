import userImageServices from "@/services/userService";
import ImpactImageslider from "@/components/common/ImageSlider";

export default async function ImageSlider() {
    let userImageList = [];

    try {
      userImageList = await userImageServices.fetchImages();
    } catch (error) {
      console.error('Failed to fetch Internship Action Items:', error);
      return <p>Failed to load Internship Action Items.</p>;
    }

      return (
        <ImpactImageslider userImageList={userImageList} />
      )
}