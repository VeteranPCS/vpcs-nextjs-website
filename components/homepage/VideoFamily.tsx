"use client"
import "@/app/globals.css";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";

interface ImpactMetrics {
  cashBackAmount: string;
  charityAmount: string;
  totalVolumeSold: string;
}

const FamilyVideo = () => {
  const [metrics, setMetrics] = useState<ImpactMetrics>({
    cashBackAmount: '$500,000',
    charityAmount: '$50,000',
    totalVolumeSold: '$189M+',
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/v1/impact');
        const data = await response.json();

        if (data.success && data.data) {
          setMetrics({
            cashBackAmount: `${data.data.cashBackAmount}+`,
            charityAmount: data.data.charityAmount,
            totalVolumeSold: data.data.totalVolumeSold.replace(' Million', 'M+'),
          });
        }
      } catch (error) {
        console.error('Error fetching impact metrics:', error);
        // Keep default values on error
      }
    };

    fetchMetrics();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          video.play().catch(() => {
            // Autoplay blocked (e.g. iOS Low Power Mode) — fall back to
            // showing the poster with manual playback controls.
            setShowControls(true);
          });
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(video);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full relative overflow-hidden">
      <div>
        <video
          ref={videoRef}
          loop
          playsInline
          muted
          preload="none"
          poster="/assets/military-families-poster.jpg"
          src="/assets/military-families-720.mp4"
          className="w-full"
          aria-label="Military families helped by VeteranPCS"
          controls={showControls}
        />
      </div>
      <div className="container mx-auto overflow-hidden">
        <div className="absolute top-[50%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 w-full">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="text-center items-center baseline rounded-2xl p-0 sm:p-6 lg:space-y-10">
                <div className="flex justify-center mx-auto lg:w-[100px] lg:h-[100px] sm:w-[70px] sm:h-[70px] w-[25px] h-[25px]">
                  <Image
                    width={100}
                    height={100}
                    src="/icon/yourimpacthendwhhite.svg"
	                    alt=""
                    className="w-full h-full"
                  />
                </div>
                <div className="text-center lg:space-y-5">
                  <h2 className="text-white font-bold lg:text-4xl md:text-4xl text-base tahoma mt-5 mb-2">
                    {metrics.cashBackAmount}
                  </h2>
                  <p className="text-white font-normal lg:text-xl md:text-base text-xs tahoma">
                    Savings Given Back
                  </p>
                </div>
              </div>

              <div className="text-center items-center baseline rounded-2xl p-0 sm:p-6 lg:space-y-10">
                <div className="flex justify-center mx-auto lg:w-[100px] lg:h-[100px] sm:w-[70px] sm:h-[70px] w-[25px] h-[25px]">
                  <Image
                    width={100}
                    height={100}
                    src="/icon/yourhome.svg"
	                    alt=""
                    className="w-full h-full"
                  />
                </div>
                <div className="text-center lg:space-y-5">
                  <h2 className="text-white font-bold lg:text-4xl md:text-4xl text-base tahoma mt-5 mb-2">
                    {metrics.totalVolumeSold}
                  </h2>
                  <p className="text-white font-normal lg:text-xl md:text-base text-xs tahoma">
                    Real Estate Volume Sold
                  </p>
                </div>
              </div>

              <div className="text-center items-center baseline rounded-2xl p-0 sm:p-6 lg:space-y-10">
                <div className="flex justify-center mx-auto lg:w-[100px] lg:h-[100px] sm:w-[70px] sm:h-[70px] w-[25px] h-[25px]">
                  <Image
                    width={100}
                    height={100}
                    src="/icon/yourSymbol.svg"
	                    alt=""
                    className="w-full h-full"
                  />
                </div>
                <div className="text-center lg:space-y-5">
                  <h2 className="text-white font-bold lg:text-4xl md:text-4xl text-base tahoma mt-5 mb-2">
                    {metrics.charityAmount}
                  </h2>
                  <p className="text-white font-normal lg:text-xl md:text-base text-xs tahoma">
                    Donated to Military Foundations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FamilyVideo;
