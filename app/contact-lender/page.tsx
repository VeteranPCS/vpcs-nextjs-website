import Image from "next/image";
import { ContactFormData } from "@/components/ContactLender/ContactLender";
import ContactLender from "@/components/ContactLender/ContactLender";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  additionalComments: string;
  currentBase: string;
  destinationBase: string;
  howDidYouHear?: string;
  tellusMore?: string;
}

async function submitForm(formData: ContactFormData, fullQueryString: string) {
  "use server"

  const paramsObj: { [key: string]: string } = {};
  new URLSearchParams (fullQueryString).forEach((value, key) => {
      paramsObj[key] = value;
  });

  const formBody = new URLSearchParams({
    oid: "00D4x000003yaV2",
    retURL: "https://veteranpcs.com/",
    "00N4x00000QPJUT": paramsObj.id,
    recordType: "0124x000000Z5yD",
    lead_source: "Website",
    "00N4x00000Lsr0GAAU": "true",
    country_code: "US",
    "00N4x00000QQ1LB": `https://veteranpcs.com/contact-lender${fullQueryString}`,
    first_name: formData.firstName || "",
    last_name: formData.lastName || "",
    email: formData.email || "",
    mobile: formData.phone || "",
    "00N4x00000LspUs": formData.currentBase || "",
    "00N4x00000QPksj": formData.howDidYouHear || "",
    "00N4x00000QPS7V": formData.tellusMore || "",
    "00N4x00000bfgFA": formData.additionalComments || "",
    recaptcha_token: formData.captchaToken || "",
  }).toString();

  try {
    const response = await fetch(
      "https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8&orgId=00D4x000003yaV2",
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody,
      }
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    revalidatePath('/');
    
    // console.log('NEXT_PUBLIC_API_BASE_URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
    // redirect("http://127.0.0.1:3000/");
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Failed to submit form');
  }
}

export default function Home() {
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
          onSubmit={submitForm}
        />
      </div>
    </>
  );
}