"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";

interface AgentData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface DealData {
  id: string;
  type: string;
  stage: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  property_address: string | null;
  notes: string | null;
  contact_confirmed: boolean;
  created_at: string | null;
}

type PageState = "loading" | "error" | "deal" | "confirmed" | "already_confirmed";

function InfoRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null;
  href?: string;
}) {
  if (!value) return null;

  return (
    <div className="flex justify-between items-start py-3 border-b border-gray-100 last:border-b-0">
      <span className="text-sm text-gray-500 font-medium">{label}</span>
      {href ? (
        <a
          href={href}
          className="text-[#2563eb] hover:underline text-sm font-medium text-right break-all ml-4"
        >
          {value}
        </a>
      ) : (
        <span className="text-gray-900 text-sm font-medium text-right ml-4">{value}</span>
      )}
    </div>
  );
}

function PortalContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [pageState, setPageState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [deal, setDeal] = useState<DealData | null>(null);
  const [confirming, setConfirming] = useState(false);

  const fetchDealData = useCallback(async () => {
    if (!token) {
      setErrorMessage("No token provided. Please use the link from your SMS.");
      setPageState("error");
      return;
    }

    try {
      const res = await fetch(
        `/api/magic-link/validate?token=${encodeURIComponent(token)}`
      );
      const data = await res.json();

      if (!data.valid || !data.success) {
        setErrorMessage(data.error || "This link is invalid or has expired.");
        setPageState("error");
        return;
      }

      setAgent(data.agent);
      setDeal(data.deal);

      if (data.deal.contact_confirmed) {
        setPageState("already_confirmed");
      } else {
        setPageState("deal");
      }
    } catch {
      setErrorMessage("Unable to load deal information. Please try again.");
      setPageState("error");
    }
  }, [token]);

  useEffect(() => {
    fetchDealData();
  }, [fetchDealData]);

  const handleConfirm = async () => {
    if (!token || confirming) return;

    setConfirming(true);
    try {
      const res = await fetch("/api/magic-link/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          updates: { contact_confirmed: true },
        }),
      });

      const data = await res.json();

      if (data.success) {
        setPageState("confirmed");
      } else {
        setErrorMessage(data.error || "Failed to confirm. Please try again.");
        setPageState("error");
      }
    } catch {
      setErrorMessage(
        "Network error. Please check your connection and try again."
      );
      setPageState("error");
    } finally {
      setConfirming(false);
    }
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return null;
    const match = phone.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      {/* Loading State */}
      {pageState === "loading" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="inline-block w-8 h-8 border-4 border-[#292F6C] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500 text-sm">Loading lead details...</p>
        </div>
      )}

      {/* Error State */}
      {pageState === "error" && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
            <svg
              className="w-7 h-7 text-[#C5203E]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Unable to Load
          </h2>
          <p className="text-gray-600 text-sm">{errorMessage}</p>
          <p className="text-gray-400 text-xs mt-4">
            If this problem persists, contact support at VeteranPCS.
          </p>
        </div>
      )}

      {/* Deal Summary */}
      {pageState === "deal" && deal && agent && (
        <div className="space-y-5">
          {/* Welcome message */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-gray-700 text-sm leading-relaxed">
              Hi{" "}
              <span className="font-bold text-gray-900">{agent.name}</span>,
              you have a new lead from VeteranPCS.
            </p>
          </div>

          {/* Customer info card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-[#292F6C] px-5 py-3">
              <h2 className="text-white font-semibold text-sm tracking-wide">
                Customer Details
              </h2>
            </div>
            <div className="px-5 py-2">
              <InfoRow label="Name" value={deal.customer_name} />
              <InfoRow
                label="Phone"
                value={formatPhone(deal.customer_phone)}
                href={deal.customer_phone ? `tel:${deal.customer_phone}` : undefined}
              />
              <InfoRow
                label="Email"
                value={deal.customer_email}
                href={deal.customer_email ? `mailto:${deal.customer_email}` : undefined}
              />
            </div>
          </div>

          {/* Lead info card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-[#292F6C] px-5 py-3">
              <h2 className="text-white font-semibold text-sm tracking-wide">
                Lead Details
              </h2>
            </div>
            <div className="px-5 py-2">
              <InfoRow label="Type" value={deal.type} />
              <InfoRow label="Stage" value={deal.stage} />
              {deal.property_address && (
                <InfoRow label="Address" value={deal.property_address} />
              )}
              {deal.notes && <InfoRow label="Notes" value={deal.notes} />}
              <InfoRow label="Submitted" value={formatDate(deal.created_at)} />
            </div>
          </div>

          {/* Confirm button — red accent color for clear CTA */}
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full bg-[#C5203E] hover:bg-[#a91b35] disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-colors duration-200 text-base shadow-md"
          >
            {confirming ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Confirming...
              </span>
            ) : (
              "Confirm — I'll reach out to this customer"
            )}
          </button>

          <p className="text-center text-gray-400 text-xs">
            Please contact this customer within 12 hours to avoid lead
            re-routing.
          </p>
        </div>
      )}

      {/* Success / Already Confirmed */}
      {(pageState === "confirmed" || pageState === "already_confirmed") &&
        deal && (
          <div className="bg-white rounded-xl shadow-sm border border-green-200 p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 bg-green-50 rounded-full flex items-center justify-center">
              <svg
                className="w-7 h-7 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {pageState === "confirmed"
                ? "Contact Confirmed!"
                : "Already Confirmed"}
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              {pageState === "confirmed"
                ? `Thank you! Please reach out to ${deal.customer_name} as soon as possible.`
                : `You already confirmed contact for this lead (${deal.customer_name}).`}
            </p>

            {/* Quick contact actions */}
            {(deal.customer_phone || deal.customer_email) && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {deal.customer_phone && (
                  <a
                    href={`tel:${deal.customer_phone}`}
                    className="inline-flex items-center justify-center gap-2 bg-[#292F6C] hover:bg-[#1e2354] text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 text-sm"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    Call {formatPhone(deal.customer_phone)}
                  </a>
                )}
                {deal.customer_email && (
                  <a
                    href={`mailto:${deal.customer_email}`}
                    className="inline-flex items-center justify-center gap-2 bg-white border-2 border-[#292F6C] text-[#292F6C] hover:bg-gray-50 font-semibold py-3 px-6 rounded-lg transition-colors duration-200 text-sm"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Email
                  </a>
                )}
              </div>
            )}
          </div>
        )}
    </>
  );
}

function PortalLoading() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
      <div className="inline-block w-8 h-8 border-4 border-[#292F6C] border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-gray-500 text-sm">Loading...</p>
    </div>
  );
}

export default function PortalPage() {
  return (
    <main className="min-h-[60vh] bg-gray-50 pt-24 pb-8 md:pt-28 md:pb-16">
      <div className="max-w-md mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            New Lead
          </h1>
          <p className="text-gray-400 mt-1 text-xs uppercase tracking-wider">VeteranPCS Agent Portal</p>
        </div>

        <Suspense fallback={<PortalLoading />}>
          <PortalContent />
        </Suspense>
      </div>
    </main>
  );
}
