"use client";
import { useForm, SubmitHandler, Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

export type StatusOptions =
  | 'Active'
  | 'National Guard'
  | 'Retired'
  | 'Spouse'
  | 'Veteran'
  | '';

export type BranchOptions =
  | 'Air Force'
  | 'Coast Guard'
  | 'Navy'
  | 'Marine Corps'
  | 'Space Force'
  | 'Army'
  | '';

export type DischargeStatusOptions =
  | 'Honorable Discharge'
  | 'Retired'
  | 'Medical Retirement'
  | 'Currently Serving'
  | '';

export interface ContactFormData {
  status_select: StatusOptions;
  branch_select: BranchOptions;
  discharge_status: DischargeStatusOptions;
}

interface ContactFormProps {
  onSubmit: (data: ContactFormData) => void;
  onBack: () => void;
  shouldValidate: boolean;
}

const StatusOptions: StatusOptions[] = [
  'Active',
  'National Guard',
  'Retired',
  'Spouse',
  'Veteran',
];

const BranchOptions: BranchOptions[] = [
  'Air Force',
  'Coast Guard',
  'Navy',
  'Marine Corps',
  'Space Force',
  'Army',
];

const DischargeStatusOptions: DischargeStatusOptions[] = [
  'Honorable Discharge',
  'Retired',
  'Medical Retirement',
  'Currently Serving',
];

const contactFormSchema = (shouldValidate: boolean) => yup.object().shape({
  status_select: shouldValidate ? yup
    .string()
    .required('Please select an option')
    .oneOf(StatusOptions, 'Invalid option selected') : yup.string(),
  branch_select: shouldValidate ? yup
    .string()
    .required('Please select an option')
    .oneOf(BranchOptions, 'Invalid option selected') : yup.string(),
  discharge_status: shouldValidate ? yup
    .string()
    .required('Please select an option')
    .oneOf(DischargeStatusOptions, 'Invalid option selected') : yup.string(),
});

const GetListedLendersProfileInfo = ({ onSubmit, onBack, shouldValidate }: ContactFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue, 
  } = useForm<ContactFormData>({
    resolver: yupResolver(contactFormSchema(shouldValidate)) as Resolver<ContactFormData>,
    defaultValues: {
      status_select: '',
      branch_select: '',
      discharge_status: '',
    },
  });

  const onFormSubmit: SubmitHandler<ContactFormData> = (data) => {
    onSubmit(data);
  };

  const renderError = (fieldName: keyof ContactFormData) => {
    const error = errors[fieldName];
    return error ? (
      <span className="text-error">{error.message}</span>
    ) : null;
  };

  return (
    <div className="md:py-12 py-4 md:px-0 px-5">
      <div className="md:w-[456px] mx-auto my-10">
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <div className="flex flex-col gap-8">
            <div className="md:text-left text-center">
              <h1 className="text-[#7E1618] tahoma lg:text-[32px] md:text-[32px] sm:text-[24px] text-[24px] font-bold leading-8">
                Military Service
              </h1>
            </div>
            <div className="border rounded-lg border-[#E2E4E5] p-8">
              <div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="status_select"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Status*
                  </label>
                  <select
                    {...register('status_select')}
                    id="status_select"
                    name="status_select"
                    className="border-b border-[#E2E4E5] px-2 py-1"
                  >
                    <option value="" disabled selected>
                      Select an option
                    </option>
                    {StatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {renderError('status_select')}
                </div>
                <div className="mb-8 flex flex-col">
                  <label
                    htmlFor="branch_select"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Branch*
                  </label>
                  <select
                    {...register('branch_select')}
                    id="branch_select"
                    name="branch_select"
                    className="border-b border-[#E2E4E5] px-2 py-1"
                  >
                    <option value="" disabled selected>
                      Select an option
                    </option>
                    {BranchOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {renderError('branch_select')}
                </div>
                <div className="flex flex-col">
                  <label
                    htmlFor="discharge_status"
                    className="text-[#242426] tahoma text-sm font-normal mb-1"
                  >
                    Discharge Status(es)*
                  </label>
                  <select
                    {...register('discharge_status')}
                    id="discharge_status"
                    name="discharge_status"
                    className="border-b border-[#E2E4E5] px-2 py-1"
                  >
                    <option value="" disabled selected>
                      Select an option
                    </option>
                    {DischargeStatusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {renderError('discharge_status')}
                </div>
              </div>
            </div>
            <div className="flex md:justify-start justify-center">
              <button
                type="submit"
                className="rounded-md border border-[#BBBFC1] bg-[#292F6C] px-8 py-2 text-center text-white font-medium flex items-center gap-2 shadow-lg"
              >
                Next
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M14.0098 11H5.99976V13H14.0098V16L17.9998 12L14.0098 8.00003V11Z"
                    fill="#FFFFFF"
                  />
                </svg>
              </button>
            </div>
          </div>
        </form>
        <div className="flex md:justify-start justify-center mt-8">
          <button
            onClick={onBack}
            className="rounded-md border border-[#BBBFC1] bg-white px-8 py-2 text-center text-[#242731] font-medium flex items-center gap-2 shadow-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="24"
              viewBox="0 0 22 24"
              fill="none"
            >
              <path
                d="M9.1578 11H16.5003V13H9.1578V16L5.50031 12L9.1578 8.00003V11Z"
                fill="#242731"
              />
            </svg>
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default GetListedLendersProfileInfo;
