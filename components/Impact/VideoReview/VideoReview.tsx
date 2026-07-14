import commonService from "@/services/commonServices";

export interface VideoReviewProps {
  _id: string;
  title?: string;
  videoUrl?: string;
}

// Server component: the video data now comes from the repo-committed export
// (content/_data/site/video_review.json) via services/commonServices at render
// time. The old 'use client' version fetched Sanity from the browser, which is
// CSP-blocked in prod; the fallbacks below are kept only as a type-level
// safety net for the optional VideoReviewProps fields.
const VideoReview = async () => {
  const videoDetails = await commonService.fetchVideoReview();

  return (
    <div className="container mx-auto bg-[#ffffff] shadow-lg sm:my-10 my-0 p-5">
      <div>
        <div className=" relative w-full">
          <iframe
            loading="lazy" // Native lazy loading
            title={videoDetails.title || "VeteranPCS Customer Review"}
            src={videoDetails.videoUrl || "https://www.youtube.com/embed/QNY6vzSO9p4?autoplay=1&mute=1&modestbranding=1&rel=0"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full aspect-video h-auto border-0" // Responsive sizing
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default VideoReview;
