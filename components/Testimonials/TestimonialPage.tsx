"use client"
import { useState, useEffect, useCallback, memo } from "react"
import userImageServices from "@/services/userService";
import ImageSlider from "@/components/common/ImageSlider";

const MemoizedSlider = memo(ImageSlider);

export default function Testimonials() {
    const [userImageList, SetUserImageList] = useState([]);

    const fetchUserImage = useCallback(async () => {
        try {
            const response = await userImageServices.fetchImages()
            if (!response.ok) throw new Error('Failed to fetch posts')
            const data = await response.json()
            SetUserImageList(data)
        } catch (error) {
            console.error('Error fetching posts:', error)
        }
    }, [])

    useEffect(() => {
        fetchUserImage()
    }, [fetchUserImage])

    return (
        <MemoizedSlider userImageList={userImageList} />
    )
}