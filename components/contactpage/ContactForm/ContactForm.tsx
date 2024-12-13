"use client";
import Button from "@/components/common/Button";
import "@/styles/globals.css";
import classes from "./ContactForm.module.css";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

const ContectForm = () => {
  const router = useRouter();

  // Function to handle button click
  const handleButtonClick = () => {
    router.push("/get-listed-lenders"); // Navigate to the "stories" page
  };
  return (
    <div className="container mx-auto flex flex-wrap justify-center lg:py-12 md:py-12 sm:py-2 py-2 gap-10">
      <div className="flex flex-wrap justify-around rounded-[12.128px] bg-white shadow-[0px_0px_72.766px_36.383px_rgba(0,0,0,0.03)] p-4 w-full overflow-hidden mx-8 md:mb-0 mb-5">
        <div className="md:w-1/3 sm:w-full w-full ">
          <div className={classes.Container}>
            <div className={classes.Heading}>
              We would love to hear<br></br> from you
            </div>
            <div className={classes.Subtext}>
              We will get back with you within two business <br></br> days!
              Thank you for reaching out!
            </div>
            <div className="mt-10">
              <div className="flex flex-col gap-4 mb-10 sm:mb-0">
                <div className={classes.ContactItem}>
                  <Image
                    width={100}
                    height={100}
                    className="w-auto h-auto"
                    src="/icon/phone-call.svg"
                    alt="phone"
                  />
                  <Link href="tel:719-249-4757">719-249-4757</Link>
                </div>
                <div className={classes.ContactItem}>
                  <Image
                    width={100}
                    height={100}
                    className="w-auto h-auto"
                    src="/icon/sharp-email.svg"
                    alt="phone"
                  />
                  <Link href="tel:719-249-4757">info@veteranpcs.com</Link>
                </div>
              </div>
            </div>

            <div className="block justify-start items-center gap-4 flex-wrap ">
              <Button
                buttonText="Agents, Get Listed Here"
                onClick={handleButtonClick}
              />
              <Button
                buttonText="Lenders, Get Listed Here"
                onClick={handleButtonClick}
              />
            </div>

            <div>
              <ul className="flex items-center md:justify-start justify-center gap-4 mt-5">
                <li className="bg-[#A81F23] rounded-[8px] w-8 h-8 p-1 flex items-center justify-center">
                  <Link href="#">
                    <Image
                      width={100}
                      height={100}
                      className="w-[20px] h-[20px]"
                      src="/icon/dribbble-fill.svg"
                      alt="Description of the image"
                    />
                  </Link>
                </li>
                <li className="bg-[#A81F23] rounded-[8px] w-8 h-8 p-1 flex items-center justify-center">
                  <Link href="#">
                    <Image
                      width={100}
                      height={100}
                      className="w-[20px] h-[20px]"
                      src="/icon/instagram-fill.svg"
                      alt="Description of the image"
                    />
                  </Link>
                </li>
                <li className="bg-[#A81F23] rounded-[8px] w-8 h-8 p-1 flex items-center justify-center">
                  <Link href="#">
                    <Image
                      width={100}
                      height={100}
                      className="w-[20px] h-[20px]"
                      src="/icon/twitter-fill.svg"
                      alt="Description of the image"
                    />
                  </Link>
                </li>
                <li className="bg-[#A81F23] rounded-[8px] w-8 h-8 p-1 flex items-center justify-center">
                  <Link href="#">
                    <Image
                      width={100}
                      height={100}
                      className="w-[20px] h-[20px]"
                      src="/icon/youtube-fill.svg"
                      alt="Description of the image"
                    />
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="md:w-2/3 sm:w-full w-full relative md:px-10 lg:px-20 mt-10 md:mt-0">
          <div className={classes.FormContainer}>
            <div className="w-full">
              <div className="grid lg:grid-cols-2 md:grid-cols-2 sm:grid-cols-1 grid-cols-1  gap-5">
                <div className={classes.FormGroup}>
                  <label className={classes.Label} htmlFor="firstName">
                    First Name
                  </label>
                  <input
                    className={classes.Input}
                    type="text"
                    id="firstName"
                    placeholder="First Name"
                    name="firstName"
                  />
                </div>
                <div className={classes.FormGroup}>
                  <label className={classes.Label} htmlFor="lastName">
                    Last Name
                  </label>
                  <input
                    className={classes.Input}
                    type="text"
                    placeholder="Doe"
                    id="lastName"
                    name="lastName"
                  />
                </div>
                <div className={classes.FormGroup}>
                  <label className={classes.Label} htmlFor="email">
                    Email
                  </label>
                  <input
                    className={classes.Input}
                    type="email"
                    id="email"
                    placeholder="Email"
                    name="email"
                  />
                </div>
              </div>
              <div className="md:mt-14 md:mb-14 mt-5 mb-10">
                <div className={classes.FormGroup}>
                  <h6 className={classes.SelectLabel}>Select Subject</h6>
                  <div className={classes.RadioGroup}>
                    <div className={classes.RadioLabel}>
                      <input
                        type="radio"
                        name="subject"
                        value="general-inquiry"
                      />
                      General Inquiry
                    </div>
                    <div className={classes.RadioLabel}>
                      <input
                        type="radio"
                        name="subject"
                        value="general-inquiry"
                      />
                      General Inquiry
                    </div>
                    <div className={classes.RadioLabel}>
                      <input type="radio" name="subject" value="general-inquiry" />
                      General Inquiry
                    </div>
                    <div className={classes.RadioLabel}>
                      <input
                        type="radio"
                        name="subject"
                        value="general-inquiry"
                      />
                      General Inquiry
                    </div>
                  </div>
                </div>
              </div>

              <div className={classes.FormGroup}>
                <label className={classes.label} htmlFor="message">
                  Message
                </label>
                <textarea
                  className={classes.TextArea}
                  id="message"
                  placeholder="Write your message.."
                  name="message"
                  rows={1}
                ></textarea>
              </div>
              <div className="flex justify-end">
                <Button buttonText="Send Message" />
              </div>
            </div>
          </div>
          <div className="lg:block md:block sm:hidden hidden mt-16 mr-4">
            <Image
              width={250}
              height={200}
              src="/assets/letter_send.png"
              alt="logo"
              className="w-[250px] h-[200px] absolute bottom-[-12%] right-[15%]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContectForm;
