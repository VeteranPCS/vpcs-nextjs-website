"use client";
import { useForm, SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReCAPTCHA from 'react-google-recaptcha';
import { internshipFormSubmission } from "@/services/salesForcePostFormsService";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export interface FormData {
    first_name: string;
    last_name: string;
    email: string;
    mobile: string;
    "00N4x00000LsnP2": string;
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
    captcha_settings?: string;
}

const schema = yup.object().shape({
    first_name: yup.string().required("First name is required"),
    last_name: yup.string().required("Last name is required"),
    email: yup.string().email("Invalid email").required("Email is required"),
    mobile: yup.string().required("Phone is required"),
    "00N4x00000LsnP2": yup.string().required("Military status is required"),
    "00N4x00000LsnOx": yup.string().required("Military branch is required"),
    "00N4x00000QQ0Vz": yup.array().of(yup.string().defined()).required().min(1, "Discharge status is required"),
    state_code: yup.string().required("State is required"),
    city: yup.string().required("City is required"),
    base: yup.string(),
    "00N4x00000QPK7L": yup.string().required("Internship type is required"),
    "00N4x00000LspV2": yup.string().required("Destination state is required"),
    "00N4x00000LspUi": yup.string().required("Desired city is required"),
    "00N4x00000QPLQY": yup
        .string()
        .required("Start date is required")
        .matches(
            /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/,
            "Date must be in mm/dd/yyyy format"
        )
        .test("valid-date", "Please enter a valid date", (value) => {
            if (!value) return false;
            const [month, day, year] = value.split("/").map(Number);
            const date = new Date(year, month - 1, day);
            return date instanceof Date && !isNaN(date.getTime()) &&
                date.getMonth() === month - 1 &&
                date.getDate() === day &&
                date.getFullYear() === year;
        })
        .test("future-date", "Start date must be in the future", (value) => {
            if (!value) return false;
            const [month, day, year] = value.split("/").map(Number);
            const inputDate = new Date(year, month - 1, day);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time to start of day for fair comparison
            return inputDate >= today;
        }),
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
            "00N4x00000LsnP2": "",
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
            captcha_settings: '{}',
        },
    });

    const router = useRouter();

    const howDidYouHear = watch("00N4x00000QPksj");
    const militaryStatus = watch("00N4x00000LsnP2");

    useEffect(() => {
        if (militaryStatus.includes("Active")) {
            setValue("00N4x00000QQ0Vz", ["Currently Serving"]);
        }
    }, [militaryStatus, setValue]);

    const handleFormSubmit: SubmitHandler<FormData> = async (data) => {
        try {
            const response = await internshipFormSubmission(data);
            if (response.redirectUrl) {
                router.push(response.redirectUrl);
            }
        } catch (error) {
            console.error('Error submitting form:', error);
        }
    };

    const onCaptchaChange = (token: string | null) => {
        if (token) {
            const captchaSettingsElem = document.getElementById('captcha_settings') as HTMLInputElement | null;
            if (captchaSettingsElem) {
                const captchaSettings = JSON.parse(captchaSettingsElem.value);
                captchaSettings.ts = JSON.stringify(new Date().getTime());
                captchaSettingsElem.value = JSON.stringify(captchaSettings);
                setValue('captcha_settings', captchaSettingsElem.value);
                setValue('g-recaptcha-response', token);
            }
        }
    };

    const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
        if (value.length > 8) value = value.slice(0, 8);

        // Add slashes
        if (value.length >= 4) {
            value = value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4);
        } else if (value.length >= 2) {
            value = value.slice(0, 2) + '/' + value.slice(2);
        }

        setValue('00N4x00000QPLQY', value);
    };

    return (
        <div className="md:py-12 py-4 md:px-0 px-5">
            <div className="md:w-[456px] mx-auto my-10">
                <form
                    onSubmit={handleSubmit(handleFormSubmit)}
                >
                    <input
                        type="hidden"
                        name="00N4x00000QQ1LB"
                        value={`${process.env.NEXT_PUBLIC_API_BASE_URL}/kick-start-your-career`}
                    />
                    <input className="hidden" id="captcha_settings" value='{"keyname":"vpcs_next_website","fallback":"true","orgId":"00D4x000003yaV2","ts":""}' readOnly />

                    <div className="flex flex-col gap-8">
                        <div className="md:text-left text-center">
                            <h1 className="text-[#7E1618] tahoma lg:text-[32px] md:text-[32px] sm:text-[24px] text-[24px] font-bold leading-8">
                                Kick Start Your Career
                            </h1>
                            <p className="text-[#575F6E] roboto text-base font-black mt-8">
                                Are you a Veteran, Military Spouse, or Service Member who is interested in starting a career in real estate or mortgage lending? Fill out the information below to get started.                            </p>
                        </div>

                        <div className="border rounded-lg border-[#E2E4E5] p-8">
                            <h3 className="text-[#000080] font-bold tahoma text-lg mb-1">Personal Information</h3>
                            <p className="text-sm text-[#575F6E] roboto mb-8">No spam mail, no fees.</p>
                            {/* First Name */}
                            <div className="mb-8 flex flex-col">
                                <label className="hidden">
                                    First Name
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
                                <label className="hidden">
                                    Last Name
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
                                <label className="hidden">
                                    Email
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
                                <label className="hidden">
                                    Phone
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
                                <legend className="text-[#000080] font-bold tahoma text-lg mb-1">
                                    Military Service Information
                                </legend>
                                {/* Military Branch */}
                                <div className="mb-4 flex flex-col">
                                    <label className="text-[#242426] tahoma text-sm font-normal mb-1">
                                        Branch of Service
                                    </label>
                                    <select
                                        {...register("00N4x00000LsnOx")}
                                        id="00N4x00000LsnOx"
                                        className={`border-b border-[#E2E4E5] px-2 py-1 ${!watch("00N4x00000LsnOx") ? "text-[#6B7280]" : "text-black"}`}
                                    >
                                        <option value="" disabled>--Select--</option>
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

                                {/* Military Status */}
                                <div className="mb-4 flex flex-col">
                                    <label className="text-[#242426] tahoma text-sm font-normal mb-1">
                                        Military Status
                                    </label>
                                    <select
                                        {...register("00N4x00000LsnP2")}
                                        id="00N4x00000LsnP2"
                                        className={`border-b border-[#E2E4E5] px-2 py-1 ${!watch("00N4x00000LsnP2") ? "text-[#6B7280]" : "text-black"}`}
                                    >
                                        <option value="" disabled>--Select--</option>
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

                                {/* Discharge Status */}
                                <div className="mb-4 flex flex-col">
                                    <label className="text-[#242426] tahoma text-sm font-normal mb-1">
                                        Discharge Status
                                    </label>
                                    <select
                                        {...register("00N4x00000QQ0Vz")}
                                        id="00N4x00000QQ0Vz"
                                        className={`border-b border-[#E2E4E5] px-2 py-1 ${!watch("00N4x00000QQ0Vz") ? "text-[#6B7280]" : "text-black"}`}
                                    >
                                        <option value="" disabled>--Select--</option>
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
                            <h3 className="text-[#000080] font-bold tahoma text-lg mb-8">Location & Internship</h3>

                            <fieldset className="mb-8">
                                <legend className="text-[#242426] tahoma text-sm font-normal mb-1">
                                    Current Location
                                </legend>

                                {/* State */}
                                <div className="mb-4 flex flex-col">
                                    <label className="hidden">
                                        State
                                    </label>
                                    <select
                                        {...register("state_code")}
                                        id="state_code"
                                        className={`border-b border-[#E2E4E5] px-2 py-1 ${!watch("state_code") ? "text-[#6B7280]" : "text-black"}`}
                                    >
                                        <option value="" disabled>--Select--</option>
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
                                    <label className="hidden">
                                        City
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
                                    <label className="hidden">
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
                                    Internship Type
                                </legend>

                                {/* Type */}
                                <div className="mb-4 flex flex-col">
                                    <label className="hidden">
                                        Internship Type
                                    </label>
                                    <select
                                        {...register("00N4x00000QPK7L")}
                                        id="00N4x00000QPK7L"
                                        className={`border-b border-[#E2E4E5] px-2 py-1 ${!watch("00N4x00000QPK7L") ? "text-[#6B7280]" : "text-black"}`}
                                    >
                                        <option value="" disabled>--Select--</option>
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
                                        Desired Location
                                    </label>
                                    <select
                                        {...register("00N4x00000LspV2")}
                                        id="00N4x00000LspV2"
                                        className={`border-b border-[#E2E4E5] px-2 py-1 ${!watch("00N4x00000LspV2") ? "text-[#6B7280]" : "text-black"}`}
                                    >
                                        <option value="" disabled>--Select--</option>
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
                                    <label className="hidden">
                                        Desired City
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
                                        Preferred Start Date
                                    </label>
                                    <input
                                        {...register("00N4x00000QPLQY")}
                                        id="00N4x00000QPLQY"
                                        type="text"
                                        pattern="\d{2}/\d{2}/\d{4}"
                                        className="border-b border-[#E2E4E5] px-2 py-1"
                                        placeholder="mm/dd/yyyy"
                                        onChange={handleDateInput}
                                        maxLength={10}
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
                                        Are you licensed?
                                    </label>
                                    <select
                                        {...register("00N4x00000QPLQd")}
                                        id="00N4x00000QPLQd"
                                        className={`border-b border-[#E2E4E5] px-2 py-1 ${!watch("00N4x00000QPLQd") ? "text-[#6B7280]" : "text-black"}`}
                                    >
                                        <option value="" disabled>--Select--</option>
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
                                    How Did You Hear About Us?
                                </label>
                                <select
                                    {...register("00N4x00000QPksj")}
                                    id="00N4x00000QPksj"
                                    className={`border-b border-[#E2E4E5] px-2 py-1 ${!watch("00N4x00000QPksj") ? "text-[#6B7280]" : "text-black"}`}
                                >
                                    <option value="" disabled>--Select--</option>
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
                                        Tell Us More!
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