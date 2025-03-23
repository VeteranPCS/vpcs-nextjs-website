'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer/Footer';

interface ErrorProps {
    error: Error;
    reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Error:', error);
    }, [error]);

    return (
        <>
            <Header />
            <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] mt-[105px]">
                <div className="container mx-auto px-5">
                    <div className="text-center">
                        <div className="mb-8">
                            <Image
                                src="/icon/VeteranPCS-logo_wht-outline.svg"
                                alt="VeteranPCS Logo"
                                width={200}
                                height={200}
                                className="mx-auto"
                            />
                        </div>
                        <h1 className="text-primary font-bold text-[42px] mb-4 poppins">
                            Oops! Something Went Wrong
                        </h1>
                        <p className="text-[#161C2Db3] text-[20px] font-normal leading-[39px] tahoma mb-8">
                            We apologize for the inconvenience. Our team has been notified and is working to fix this issue.
                        </p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={reset}
                                className="bg-accent-red hover:bg-accent-red-dark text-white font-medium px-6 py-3 rounded-lg transition-colors duration-300"
                            >
                                Try Again
                            </button>
                            <Link
                                href="/"
                                className="bg-primary hover:bg-primary-hover text-white font-medium px-6 py-3 rounded-lg transition-colors duration-300"
                            >
                                Return Home
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
} 