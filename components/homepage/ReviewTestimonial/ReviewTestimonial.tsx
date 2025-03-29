import "@/app/globals.css";
import Button from "@/components/common/Button";
import ReviewTestimonialSlider from "@/components/homepage/ReviewTestimonial/ReviewTestimonialSlider";
import Link from "next/link";

interface Reviewer {
  profilePhotoUrl: string;
  displayName: string;
}

export interface Review {
  comment: string | null;
  createTime: string;
  reviewId: string;
  reviewer: Reviewer;
  starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';
}

interface ReviewTestimonialProps {
  reviewsList: Review[];
  averageRating: number;
  totalReviewCount: number;
}

const ReviewTestimonial: React.FC<ReviewTestimonialProps> = ({
  reviewsList,
  averageRating,
  totalReviewCount,
}) => {
  return (
    <div className="w-full relative bg-gradient-to-b from-[#2A2F6C] to-[#545CA4] py-16">
      <div className="container mx-auto px-4 md:px-12 lg:px-16 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-white text-[35px] md:text-[38px] lg:text-[48px] font-bold leading-tight mb-4">
            We&apos;ve helped hundreds
          </h2>
          <p className="text-white text-[17px] md:text-[25px]">
            Of military, veterans, & their families
          </p>
          <div className="text-white mt-4">
            <span className="text-2xl font-bold">{averageRating.toFixed(1)}</span> out of 5 stars
            <span className="mx-2">•</span>
            <span>{totalReviewCount} reviews</span>
          </div>
        </div>

        <div className="relative px-4 md:px-10 lg:px-12">
          <ReviewTestimonialSlider
            reviews={reviewsList}
            averageRating={averageRating}
            totalReviewCount={totalReviewCount}
          />
        </div>

        <div className="flex justify-center mt-12">
          <Link href="/stories">
            <Button buttonText="More success stories" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ReviewTestimonial;
