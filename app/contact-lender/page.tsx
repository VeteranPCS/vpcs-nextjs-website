"use client";
import Image from "next/image";
import ContactLender from "@/components/ContactLender/ContactLender";
import { contactLenderPostForm } from "@/services/salesForcePostFormsService";
import { useRouter } from 'next/navigation'

export interface FormData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  currentBase?: string;
  destinationBase?: string;
  additionalComments?: string | null;
  howDidYouHear?: string;
  tellusMore?: string;
  captchaToken?: string;
  captcha_settings?: string;
}

export default function Home() {
  const router = useRouter()

  const handleSubmit = async (formData: FormData) => {
    try {
      const fullQueryString = window.location.search; 
      const server_response = await contactLenderPostForm(formData, fullQueryString);
      if (server_response?.redirectUrl) {
        router.push(server_response.redirectUrl);
      } else {
        console.log("No redirect URL found");
      }    
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  return (
    <>
      <div className="container mx-auto w-full">
        <div className="flex flex-wrap md:flex-nowrap justify-between items-center md:pt-[140px] pt-[80px] md:mx-0 mx-5">
          <div>
            <Image
              src="/assets/Logo.png"
              className="w-[238px] h-[62px]"
              alt="contact us"
              width={400}
              height={400}
            />
          </div>
          <div>
            <button>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
              >
                <path
                  d="M38 12.82L35.18 10L24 21.18L12.82 10L10 12.82L21.18 24L10 35.18L12.82 38L24 26.82L35.18 38L38 35.18L26.82 24L38 12.82Z"
                  fill="#E2E4E6"
                />
              </svg>
            </button>
          </div>
        </div>

        <ContactLender
          onSubmit={handleSubmit}
        />
      </div>
    </>
  );
}