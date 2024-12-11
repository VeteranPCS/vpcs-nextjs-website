"use client"
import { useEffect, useState } from "react";
import userImageServices from "@/services/userService";
import ImpactImageslider from "@/components/common/ImageSlider";

export default function ImageSlider() {
    const [userImageList, SetUserImageList] = useState([]);

    useEffect(() => {
        fetchUserImage();
    }, []);

    const fetchUserImage = async () => {
        try {
          const response = await userImageServices.fetchImages();
          if (!response.ok) throw new Error("Failed to fetch posts");
          const data = await response.json();
          SetUserImageList(data);
        } catch (error) {
          console.error("Error fetching posts:", error);
        }
      };

      return (
        <ImpactImageslider userImageList={userImageList} />
      )
}