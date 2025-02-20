"use client";
import { useForm, SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReCAPTCHA from 'react-google-recaptcha';
import { internshipFormSubmission } from "@/services/salesForcePostFormsService";

export interface FormData {
    first_name: string;
    last_name: string;
    email: string;
    mobile: string;
    "00N4x00000LsnP2": string[];
    "00N4x00000LsnOx": string;
    "00N4x00000QQ0Vz": string[];
    state_code: string;
    city: string;
    base?: string;
    "00N4x00000QPK7L": string;
    "00N4x00000LspV2": string;
    "00N4x00000LspUi": string;
    "00N4x00000QPLQY": string;
    "00N4x00000QPLQd": string;
    "00N4x00000QPksj": string;
    "00N4x00000QPS7V"?: string;
    "g-recaptcha-response": string;
}

const schema = yup.object().shape({
    first_name: yup.string().required("First name is required"),
    last_name: yup.string().required("Last name is required"),
    email: yup.string().email("Invalid email").required("Email is required"),
    mobile: yup.string().required("Phone is required"),
    "00N4x00000LsnP2": yup.array().of(yup.string().defined()).required().min(1, "Military status is required"),
    "00N4x00000LsnOx": yup.string().required("Military branch is required"),
    "00N4x00000QQ0Vz": yup.array().of(yup.string().defined()).required().min(1, "Discharge status is required"),
    state_code: yup.string().required("State is required"),
    city: yup.string().required("City is required"),
    base: yup.string(),
    "00N4x00000QPK7L": yup.string().required("Internship type is required"),
    "00N4x00000LspV2": yup.string().required("Destination state is required"),
    "00N4x00000LspUi": yup.string().required("Desired city is required"),
    "00N4x00000QPLQY": yup.string().required("Start date is required"),
    "00N4x00000QPLQd": yup.string().required("License status is required"),
    "00N4x00000QPksj": yup.string().required("How did you hear is required"),
    "00N4x00000QPS7V": yup.string().when("00N4x00000QPksj", {
        is: "Other",
        then: (schema) => schema.required("Please tell us more"),
        otherwise: (schema) => schema.nullable(),
    }),
    "g-recaptcha-response": yup.string().required("Please complete the CAPTCHA"),
});

const WebToLeadForm = () => {
    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FormData>({
        resolver: yupResolver(schema),
        defaultValues: {
            first_name: "",
            last_name: "",
            email: "",
            mobile: "",
            "00N4x00000LsnP2": [],
            "00N4x00000LsnOx": "",
            "00N4x00000QQ0Vz": [],
            state_code: "",
            city: "",
            base: "",
            "00N4x00000QPK7L": "",
            "00N4x00000LspV2": "",
            "00N4x00000LspUi": "",
            "00N4x00000QPLQY": "",
            "00N4x00000QPLQd": "",
            "00N4x00000QPksj": "",
            "00N4x00000QPS7V": "",
            "g-recaptcha-response": "",
        },
    });

    const howDidYouHear = watch("00N4x00000QPksj");

    const handleFormSubmit: SubmitHandler<FormData> = async (data) => {
        try {
            console.log(data);
            await internshipFormSubmission(data);
            return true;
        } catch (error) {
            console.error('Error submitting form:', error);
            // You might want to handle the error appropriately here
            // e.g., show an error message to the user
            return false;
        }
    };

    const onCaptchaChange = (token: string | null) => {
        setValue("g-recaptcha-response", token || "");
    };

    return (
        <div className="md:py-12 py-4 md:px-0 px-5">
            <div className="md:w-[456px] mx-auto my-10">
                <form
                    onSubmit={handleSubmit(handleFormSubmit)}
                >
                    <input type="hidden" name="oid" value="00D4x000003yaV2" />
                    <input type="hidden" name="retURL" value={`${process.env.NEXT_PUBLIC_API_BASE_URL}/thank-you`} />
                    <input type="hidden" name="recordType" value="0124x000000ZGKv" />
                    <input type="hidden" name="lead_source" value="Website" />
                    <input type="hidden" name="00N4x00000Lsr0G" value="true" />
                    <input type="hidden" name="country_code" value="US" />
                    <input
                        type="hidden"
                        name="00N4x00000QQ1LB"
                        value="https://veteranpcs.com/kick-start-your-career/"
                    />

                    <div className="flex flex-col gap-8">
                        <div className="md:text-left text-center">
                            <h1 className="text-[#7E1618] tahoma lg:text-[32px] md:text-[32px] sm:text-[24px] text-[24px] font-bold leading-8">
                                Kick Start Your Career
                            </h1>
                            <p className="text-[#575F6E] roboto text-base font-black mt-8">
                                Are you a Veteran, Military Spouse, or Service Member who is interested in starting a career in real estate or mortgage lending? Fill out the information below to get started.                            </p>
                        </div>

                        <div className="border rounded-lg border-[#E2E4E5] p-8">
                            {/* First Name */}
                            <div className="mb-8 flex flex-col">
                                <label className="text-[#242426] tahoma text-sm font-normal mb-1">
                                    First Name*
                                </label>
                                <input
                                    {...register("first_name")}
                                    id="first_name"
                                    type="text"
                                    maxLength={40}
                                    className="border-b border-[#E2E4E5] px-2 py-1"
                                    placeholder="First Name"
                                />
                                {errors.first_name && (
                                    <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>
                                )}
                            </div>

                            {/* Last Name */}
                            <div className="mb-8 flex flex-col">
                                <label className="text-[#242426] tahoma text-sm font-normal mb-1">
                                    Last Name*
                                </label>
                                <input
                                    {...register("last_name")}
                                    id="last_name"
                                    type="text"
                                    maxLength={80}
                                    className="border-b border-[#E2E4E5] px-2 py-1"
                                    placeholder="Last Name"
                                />
                                {errors.last_name && (
                                    <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>
                                )}
                            </div>

                            {/* Email */}
                            <div className="mb-8 flex flex-col">
                                <label className="text-[#242426] tahoma text-sm font-normal mb-1">
                                    Email*
                                </label>
                                <input
                                    {...register("email")}
                                    id="email"
                                    type="text"
                                    maxLength={80}
                                    className="border-b border-[#E2E4E5] px-2 py-1"
                                    placeholder="Email"
                                />
                                {errors.email && (
                                    <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                                )}
                            </div>

                            {/* Phone */}
                            <div className="mb-8 flex flex-col">
                                <label className="text-[#242426] tahoma text-sm font-normal mb-1">
                                    Phone*
                                </label>
                                <input
                                    {...register("mobile")}
                                    id="mobile"
                                    type="text"
                                    maxLength={40}
                                    className="border-b border-[#E2E4E5] px-2 py-1"
                                    placeholder="Phone"
                                />
                                {errors.mobile && (
                                    <p className="text-red-500 text-xs mt-1">{errors.mobile.message}</p>
                                )}
                            </div>

                            {/* Military Service */}
                            <fieldset className="mb-8">
                                <legend className="text-[#242426] tahoma text-sm font-normal mb-1">
                                    Military Service
                                </legend>

                                {/* Military Status */}
                                <div className="mb-4 flex flex-col">
                                    <label className="text-[#242426] tahoma text-sm font-normal mb-1">
                                        Status*
                                    </label>
                                    <select
                                        {...register("00N4x00000LsnP2")}
                                        id="00N4x00000LsnP2"
                                        multiple
                                        className="border-b border-[#E2E4E5] px-2 py-1 h-32"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="National Guard">National Guard</option>
                                        <option value="Reserves">Reserves</option>
                                        <option value="Retired">Retired</option>
                                        <option value="Spouse">Spouse</option>
                                        <option value="Veteran">Veteran</option>
                                    </select>
                                    {errors["00N4x00000LsnP2"] && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors["00N4x00000LsnP2"].message}
                                        </p>
                                    )}
                                </div>

                                {/* Military Branch */}
                                <div className="mb-4 flex flex-col">
                                    <label className="text-[#242426] tahoma text-sm font-normal mb-1">
                                        Branch*
                                    </label>
                                    <select
                                        {...register("00N4x00000LsnOx")}
                                        id="00N4x00000LsnOx"
                                        className="border-b border-[#E2E4E5] px-2 py-1"
                                    >
                                        <option value="">--None--</option>
                                        <option value="Air Force">Air Force</option>
                                        <option value="Army">Army</option>
                                        <option value="Coast Guard">Coast Guard</option>
                                        <option value="Navy">Navy</option>
                                        <option value="Marine Corps">Marine Corps</option>
                                        <option value="Space Force">Space Force</option>
                                    </select>
                                    {errors["00N4x00000LsnOx"] && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors["00N4x00000LsnOx"].message}
                                        </p>
                                    )}
                                </div>

                                {/* Discharge Status */}
                                <div className="mb-4 flex flex-col">
                                    <label className="text-[#242426] tahoma text-sm font-normal mb-1">
                                        Discharge Status(es)*
                                    </label>
                                    <select
                                        {...register("00N4x00000QQ0Vz")}
                                        id="00N4x00000QQ0Vz"
                                        multiple
                                        className="border-b border-[#E2E4E5] px-2 py-1 h-24"
                                    >
                                        <option value="Honorable Discharge">Honorable Discharge</option>
                                        <option value="Retired">Retired</option>
                                        <option value="Medical Retirement">Medical Retirement</option>
                                        <option value="Currently Serving">Currently Serving</option>
                                    </select>
                                    {errors["00N4x00000QQ0Vz"] && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors["00N4x00000QQ0Vz"].message}
                                        </p>
                                    )}
                                </div>
                            </fieldset>

                            {/* Current Location */}
                            <fieldset className="mb-8">
                                <legend className="text-[#242426] tahoma text-sm font-normal mb-1">
                                    Current Location
                                </legend>

                                {/* State */}
                                <div className="mb-4 flex flex-col">
                                    <label className="text-[#242426] tahoma text-sm font-normal mb-1">
                                        State*
                                    </label>
                                    <select
                                        {...register("state_code")}
                                        id="state_code"
                                        className="border-b border-[#E2E4E5] px-2 py-1"
                                    >
                                        <option value="">--State*--</option>
                                        <option value="AL">AL</option>
                                        <option value="AK">AK</option>
                                        <option value="AZ">AZ</option>
                                        <option value="AR">AR</option>
                                        <option value="CA">CA</option>
                                        <option value="CO">CO</option>
                                        <option value="CT">CT</option>
                                        <option value="DE">DE</option>
                                        <option value="DC">DC</option>
                                        <option value="FL">FL</option>
                                        <option value="GA">GA</option>
                                        <option value="GU">GU</option>
                                        <option value="HI">HI</option>
                                        <option value="ID">ID</option>
                                        <option value="IL">IL</option>
                                        <option value="IN">IN</option>
                                        <option value="IA">IA</option>
                                        <option value="KS">KS</option>
                                        <option value="KY">KY</option>
                                        <option value="LA">LA</option>
                                        <option value="ME">ME</option>
                                        <option value="MD">MD</option>
                                        <option value="MA">MA</option>
                                        <option value="MI">MI</option>
                                        <option value="MN">MN</option>
                                        <option value="MS">MS</option>
                                        <option value="MO">MO</option>
                                        <option value="MT">MT</option>
                                        <option value="NE">NE</option>
                                        <option value="NV">NV</option>
                                        <option value="NH">NH</option>
                                        <option value="NJ">NJ</option>
                                        <option value="NM">NM</option>
                                        <option value="NY">NY</option>
                                        <option value="NC">NC</option>
                                        <option value="ND">ND</option>
                                        <option value="OH">OH</option>
                                        <option value="OK">OK</option>
                                        <option value="OR">OR</option>
                                        <option value="PA">PA</option>
                                        <option value="PR">PR</option>
                                        <option value="RI">RI</option>
                                        <option value="SC">SC</option>
                                        <option value="SD">SD</option>
                                        <option value="TN">TN</option>
                                        <option value="TX">TX</option>
                                        <option value="UT">UT</option>
                                        <option value="VT">VT</option>
                                        <option value="VA">VA</option>
                                        <option value="WA">WA</option>
                                        <option value="WV">WV</option>
                                        <option value="WI">WI</option>
                                        <option value="WY">WY</option>
                                    </select>
                                    {errors.state_code && (
                                        <p className="text-red-500 text-xs mt-1">{errors.state_code.message}</p>
                                    )}
                                </div>

                                {/* City */}
                                <div className="mb-4 flex flex-col">
                                    <label className="text-[#242426] tahoma text-sm font-normal mb-1">
                                        City*
                                    </label>
                                    <input
                                        {...register("city")}
                                        id="city"
                                        type="text"
                                        maxLength={40}
                                        className="border-b border-[#E2E4E5] px-2 py-1"
                                        placeholder="City"
                                    />
                                    {errors.city && (
                                        <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>
                                    )}
                                </div>

                                {/* Base */}
                                <div className="mb-4 flex flex-col">
                                    <label className="text-[#242426] tahoma text-sm font-normal mb-1">
                                        Base
                                    </label>
                                    <input
                                        {...register("base")}
                                        id="base"
                                        type="text"
                                        maxLength={40}
                                        className="border-b border-[#E2E4E5] px-2 py-1"
                                        placeholder="Base"
                                    />
                                </div>
                            </fieldset>

                            {/* Internship */}
                            <fieldset className="mb-8">
                                <legend className="text-[#242426] tahoma text-sm font-normal mb-1">
                                    Internship
                                </legend>

                                {/* Type */}
                                <div className="mb-4 flex flex-col">
                                    <label className="text-[#242426] tahoma text-sm font-normal mb-1">
                                        Type*
                                    </label>
                                    <select
                                        {...register("00N4x00000QPK7L")}
                                        id="00N4x00000QPK7L"
                                        className="border-b border-[#E2E4E5] px-2 py-1"
                                    >
                                        <option value="">--TYPE*--</option>
                                        <option value="Intern - Agent">Real Estate Agent</option>
                                        <option value="Intern - Lender">Mortgage Lending</option>
                                    </select>
                                    {errors["00N4x00000QPK7L"] && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors["00N4x00000QPK7L"].message}
                                        </p>
                                    )}
                                </div>

                                {/* Destination State */}
                                <div className="mb-4 flex flex-col">
                                    <label className="text-[#242426] tahoma text-sm font-normal mb-1">
                                        Desired State*
                                    </label>
                                    <select
                                        {...register("00N4x00000LspV2")}
                                        id="00N4x00000LspV2"
                                        className="border-b border-[#E2E4E5] px-2 py-1"
                                    >
                                        <option value="">--Desired State*--</option>
                                        <option value="AL">AL</option>
                                        <option value="AK">AK</option>
                                        <option value="AZ">AZ</option>
                                        <option value="AR">AR</option>
                                        <option value="CA">CA</option>
                                        <option value="CO">CO</option>
                                        <option value="CT">CT</option>
                                        <option value="DE">DE</option>
                                        <option value="DC">DC</option>
                                        <option value="FL">FL</option>
                                        <option value="GA">GA</option>
                                        <option value="GU">GU</option>
                                        <option value="HI">HI</option>
                                        <option value="ID">ID</option>
                                        <option value="IL">IL</option>
                                        <option value="IN">IN</option>
                                        <option value="IA">IA</option>
                                        <option value="KS">KS</option>
                                        <option value="KY">KY</option>
                                        <option value="LA">LA</option>
                                        <option value="ME">ME</option>
                                        <option value="MD">MD</option>
                                        <option value="MA">MA</option>
                                        <option value="MI">MI</option>
                                        <option value="MN">MN</option>
                                        <option value="MS">MS</option>
                                        <option value="MO">MO</option>
                                        <option value="MT">MT</option>
                                        <option value="NE">NE</option>
                                        <option value="NV">NV</option>
                                        <option value="NH">NH</option>
                                        <option value="NJ">NJ</option>
                                        <option value="NM">NM</option>
                                        <option value="NY">NY</option>
                                        <option value="NC">NC</option>
                                        <option value="ND">ND</option>
                                        <option value="OH">OH</option>
                                        <option value="OK">OK</option>
                                        <option value="OR">OR</option>
                                        <option value="PA">PA</option>
                                        <option value="PR">PR</option>
                                        <option value="RI">RI</option>
                                        <option value="SC">SC</option>
                                        <option value="SD">SD</option>
                                        <option value="TN">TN</option>
                                        <option value="TX">TX</option>
                                        <option value="UT">UT</option>
                                        <option value="VT">VT</option>
                                        <option value="VA">VA</option>
                                        <option value="WA">WA</option>
                                        <option value="WV">WV</option>
                                        <option value="WI">WI</option>
                                        <option value="WY">WY</option>
                                    </select>
                                    {errors["00N4x00000LspV2"] && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors["00N4x00000LspV2"].message}
                                        </p>
                                    )}
                                </div>

                                {/* Desired City */}
                                <div className="mb-4 flex flex-col">
                                    <label className="text-[#242426] tahoma text-sm font-normal mb-1">
                                        Desired City*
                                    </label>
                                    <input
                                        {...register("00N4x00000LspUi")}
                                        id="00N4x00000LspUi"
                                        type="text"
                                        maxLength={32}
                                        className="border-b border-[#E2E4E5] px-2 py-1"
                                        placeholder="Desired City"
                                    />
                                    {errors["00N4x00000LspUi"] && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors["00N4x00000LspUi"].message}
                                        </p>
                                    )}
                                </div>

                                {/* Start Date */}
                                <div className="mb-4 flex flex-col">
                                    <label className="text-[#242426] tahoma text-sm font-normal mb-1">
                                        Date you would like to start*
                                    </label>
                                    <input
                                        {...register("00N4x00000QPLQY")}
                                        id="00N4x00000QPLQY"
                                        type="text"
                                        className="border-b border-[#E2E4E5] px-2 py-1"
                                        placeholder="mm/dd/yyyy"
                                    />
                                    {errors["00N4x00000QPLQY"] && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors["00N4x00000QPLQY"].message}
                                        </p>
                                    )}
                                </div>

                                {/* Licensed */}
                                <div className="mb-4 flex flex-col">
                                    <label className="text-[#242426] tahoma text-sm font-normal mb-1">
                                        Are you licensed?*
                                    </label>
                                    <select
                                        {...register("00N4x00000QPLQd")}
                                        id="00N4x00000QPLQd"
                                        className="border-b border-[#E2E4E5] px-2 py-1"
                                    >
                                        <option value="">--</option>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                        <option value="In Progress">In Progress</option>
                                    </select>
                                    {errors["00N4x00000QPLQd"] && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors["00N4x00000QPLQd"].message}
                                        </p>
                                    )}
                                </div>
                            </fieldset>

                            {/* How Did You Hear */}
                            <div className="mb-8 flex flex-col">
                                <label className="text-[#242426] tahoma text-sm font-normal mb-1">
                                    How Did You Hear About Us?*
                                </label>
                                <select
                                    {...register("00N4x00000QPksj")}
                                    id="00N4x00000QPksj"
                                    className="border-b border-[#E2E4E5] px-2 py-1"
                                >
                                    <option value="">--None--</option>
                                    <option value="Google">Google</option>
                                    <option value="Facebook">Facebook</option>
                                    <option value="Instagram">Instagram</option>
                                    <option value="LinkedIn">LinkedIn</option>
                                    <option value="TikTok">TikTok</option>
                                    <option value="Base Event">Base Event</option>
                                    <option value="Transition Brief">Transition Brief</option>
                                    <option value="Agent Referral">Agent Referral</option>
                                    <option value="Friend Referral">Friend Referral</option>
                                    <option value="Skillbridge">Skillbridge</option>
                                    <option value="ILE Brief">ILE Brief</option>
                                    <option value="Other">Other</option>
                                </select>
                                {errors["00N4x00000QPksj"] && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {errors["00N4x00000QPksj"].message}
                                    </p>
                                )}
                            </div>

                            {/* Tell Us More */}
                            {howDidYouHear === "Other" && (
                                <div className="mb-8 flex flex-col">
                                    <label className="text-[#242426] tahoma text-sm font-normal mb-1">
                                        Tell Us More!*
                                    </label>
                                    <input
                                        {...register("00N4x00000QPS7V")}
                                        id="00N4x00000QPS7V"
                                        type="text"
                                        maxLength={255}
                                        className="border-b border-[#E2E4E5] px-2 py-1"
                                        placeholder="Tell Us More!"
                                    />
                                    {errors["00N4x00000QPS7V"] && (
                                        <p className="text-red-500 text-xs mt-1">
                                            {errors["00N4x00000QPS7V"].message}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* reCAPTCHA */}
                            <div className="mt-8 flex flex-col">
                                <ReCAPTCHA
                                    sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
                                    onChange={onCaptchaChange}
                                />
                                {errors["g-recaptcha-response"] && (
                                    <p className="text-red-500 text-xs mt-1">
                                        {errors["g-recaptcha-response"].message}
                                    </p>
                                )}
                            </div>

                            <p className="text-[#575F6E] roboto text-base mt-4">
                                Be sure to check your spam/junk folder if you do not receive a confirmation
                                email.
                            </p>
                        </div>

                        {/* Submit Button */}
                        <div className="flex md:justify-start justify-center">
                            <button
                                type="submit"
                                name="submit"
                                className="rounded-md border border-[#BBBFC1] bg-[#292F6C] px-8 py-2 text-center text-white font-medium flex items-center gap-2 shadow-lg"
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WebToLeadForm;