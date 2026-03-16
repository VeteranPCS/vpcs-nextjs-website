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

/** Reusable row for displaying a label/value pair */
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
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-0">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide sm:w-24 sm:flex-shrink-0 sm:pt-0.5">
        {label}
      </span>
      {href ? (
        <a
          href={href}
          className="text-accent-blue hover:underline text-sm font-medium break-all"
        >
          {value}
        </a>
      ) : (
        <span className="text-gray-900 text-sm">{value}</span>
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
          <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600">Loading lead details...</p>
        </div>
      )}

      {/* Error State */}
      {pageState === "error" && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
            <svg
              className="w-7 h-7 text-accent-red"
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
        <div className="space-y-4">
          {/* Welcome card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <p className="text-gray-600 text-sm">
              Hi{" "}
              <span className="font-semibold text-gray-900">{agent.name}</span>,
              you have a new lead from VeteranPCS.
            </p>
          </div>

          {/* Customer info card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-primary px-6 py-3">
              <h2 className="text-white font-semibold text-sm tracking-wide uppercase">
                Customer Details
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <InfoRow label="Name" value={deal.customer_name} />
              {deal.customer_phone && (
                <InfoRow
                  label="Phone"
                  value={formatPhone(deal.customer_phone)}
                  href={`tel:${deal.customer_phone}`}
                />
              )}
              {deal.customer_email && (
                <InfoRow
                  label="Email"
                  value={deal.customer_email}
                  href={`mailto:${deal.customer_email}`}
                />
              )}
            </div>
          </div>

          {/* Deal info card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-primary px-6 py-3">
              <h2 className="text-white font-semibold text-sm tracking-wide uppercase">
                Lead Details
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <InfoRow label="Type" value={deal.type} />
              <InfoRow label="Stage" value={deal.stage} />
              {deal.property_address && (
                <InfoRow label="Address" value={deal.property_address} />
              )}
              {deal.notes && <InfoRow label="Notes" value={deal.notes} />}
              {deal.created_at && (
                <InfoRow
                  label="Submitted"
                  value={formatDate(deal.created_at)}
                />
              )}
            </div>
          </div>

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full bg-primary hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200 text-base shadow-sm"
          >
            {confirming ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Confirming...
              </span>
            ) : (
              "Confirm \u2014 I'll reach out to this customer"
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
                ? "Contact Confirmed"
                : "Already Confirmed"}
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              {pageState === "confirmed"
                ? `Thank you for confirming. Please reach out to ${deal.customer_name} as soon as possible.`
                : `You have already confirmed contact for this lead (${deal.customer_name}).`}
            </p>

            {/* Quick contact actions */}
            {(deal.customer_phone || deal.customer_email) && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {deal.customer_phone && (
                  <a
                    href={`tel:${deal.customer_phone}`}
                    className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-medium py-3 px-5 rounded-lg transition-colors duration-200 text-sm"
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
                    className="inline-flex items-center justify-center gap-2 bg-white border border-primary text-primary hover:bg-gray-50 font-medium py-3 px-5 rounded-lg transition-colors duration-200 text-sm"
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

/** Loading fallback shown while Suspense resolves useSearchParams */
function PortalLoading() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
      <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-gray-600">Loading...</p>
    </div>
  );
}

export default function PortalPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-12 md:py-20">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-primary">
            Lead Portal
          </h1>
          <p className="text-gray-500 mt-1 text-sm">VeteranPCS</p>
        </div>

        <Suspense fallback={<PortalLoading />}>
          <PortalContent />
        </Suspense>
      </div>
    </main>
  );
}
