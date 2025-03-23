import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer/Footer';

export default function NotFound() {
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
                            404 - Page Not Found
                        </h1>
                        <p className="text-[#161C2Db3] text-[20px] font-normal leading-[39px] tahoma mb-8">
                            The page you&apos;re looking for doesn&apos;t exist or has been moved.
                            Let us help you find what you&apos;re looking for.
                        </p>
                        <div className="flex justify-center gap-4">
                            <Link
                                href="/"
                                className="bg-accent-red hover:bg-accent-red-dark text-white font-medium px-6 py-3 rounded-lg transition-colors duration-300"
                            >
                                Return Home
                            </Link>
                            <Link
                                href="/contact"
                                className="bg-primary hover:bg-primary-hover text-white font-medium px-6 py-3 rounded-lg transition-colors duration-300"
                            >
                                Contact Support
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
} 