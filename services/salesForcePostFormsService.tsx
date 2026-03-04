"use server";
import { attio } from "@/lib/attio";
import { slack } from "@/lib/slack";
import { openphone } from "@/lib/openphone";
import { generateMagicLink } from "@/lib/magic-link";
import { normalizePhone } from "@/lib/normalize-phone";
import { logDebug, logError, logInfo } from "./loggingService";
import {
  FormSubmissionStatus,
  trackFormSubmission,
  updateSubmissionStatus,
} from "./formTrackingService";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://veteranpcs.com";
const THANK_YOU_URL = `${BASE_URL}/thank-you`;

/**
 * Find or create a customer record in Attio
 * Returns the customer record ID
 */
async function findOrCreateCustomer(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  currentLocation?: string;
  destinationCity?: string;
  militaryStatus?: string;
  militaryService?: string;
}): Promise<string> {
  // Try to find existing customer by email
  const existing = await attio.queryRecords("customers", {
    filter: { email: { $eq: data.email } },
    limit: 1,
  });

  if (existing.length > 0) {
    // Update existing customer with any new data
    const customerId = existing[0].id;
    const updates: Record<string, any> = {};

    if (data.phone) {
      const normalized = normalizePhone(data.phone);
      if (normalized) updates.phone = normalized;
    }
    if (data.currentLocation) updates.current_location = data.currentLocation;
    if (data.destinationCity) updates.destination_city = data.destinationCity;
    if (data.militaryStatus) updates.military_status = data.militaryStatus;
    if (data.militaryService) updates.military_service = data.militaryService;

    if (Object.keys(updates).length > 0) {
      await attio.updateRecord("customers", customerId, updates);
    }

    return customerId;
  }

  // Create new customer
  const customerData: Record<string, any> = {
    name: `${data.firstName} ${data.lastName}`,
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email,
  };

  if (data.phone) {
    const normalized = normalizePhone(data.phone);
    if (normalized) customerData.phone = normalized;
  }
  if (data.currentLocation)
    customerData.current_location = data.currentLocation;
  if (data.destinationCity)
    customerData.destination_city = data.destinationCity;
  if (data.militaryStatus) customerData.military_status = data.militaryStatus;
  if (data.militaryService)
    customerData.military_service = data.militaryService;

  const result = await attio.createRecord("customers", customerData);
  return result.data.id.record_id;
}

/**
 * Determine deal type from form data
 */
function getDealType(buyingSelling?: string): "Buying" | "Selling" | "Buying" {
  if (!buyingSelling) return "Buying";
  const lower = buyingSelling.toLowerCase();
  if (lower.includes("sell")) return "Selling";
  return "Buying";
}

export async function contactAgentPostForm(formData: any, queryString: string) {
  const submissionId = await trackFormSubmission(
    "contactAgent",
    formData,
    FormSubmissionStatus.PENDING,
  );

  const params = new URLSearchParams(queryString);
  const agentAttioId = params.get("id"); // Now receives Attio UUID instead of Salesforce ID
  const stateCode = params.get("state");

  logInfo("Processing contact agent form submission", {
    submissionId,
    agent_attio_id: agentAttioId,
  });

  try {
    // 1. Find the agent in Attio by direct record lookup
    let agentInfo = null;
    let agentId: string | null = null;

    if (agentAttioId) {
      try {
        const agent = await attio.getRecord("agents", agentAttioId);
        if (agent) {
          agentInfo = agent;
          agentId = agent.id;
          logDebug("Agent found in Attio", { submissionId, agentId });
        }
      } catch (error) {
        logError(
          "Error fetching agent from Attio",
          { submissionId, agentAttioId },
          error,
        );
      }
    }

    // 2. Create or update customer record
    const customerId = await findOrCreateCustomer({
      firstName: formData.firstName || "",
      lastName: formData.lastName || "",
      email: formData.email || "",
      phone: formData.phone,
      currentLocation: formData.currentBase,
      destinationCity: formData.destinationBase,
      militaryStatus: formData.status_select,
      militaryService: formData.branch_select,
    });

    logDebug("Customer record created/updated", { submissionId, customerId });

    // 3. Create deal in customer_deals pipeline
    const dealType = getDealType(formData.buyingSelling);
    const dealData: Record<string, any> = {
      deal_type: dealType,
      contact_confirmed: false,
      reroute_count: 0,
      last_updated: new Date().toISOString(),
      last_stage_change: new Date().toISOString(),
    };

    // Add agent reference if found
    if (agentId) {
      dealData.agent = { target_object: "agents", target_record_id: agentId };
    }

    // Add form fields to deal for tracking
    if (formData.currentBase) {
      dealData.current_location = formData.currentBase;
    }
    if (formData.destinationBase) {
      dealData.destination_city = formData.destinationBase;
    }
    if (formData.howDidYouHear) {
      dealData.how_did_you_hear = formData.howDidYouHear;
    }
    if (formData.tellusMore) {
      dealData.how_did_you_hear_other = formData.tellusMore;
    }

    // Add notes/comments if provided
    if (formData.additionalComments) {
      dealData.notes = formData.additionalComments;
    }

    const dealResult = await attio.createListEntry(
      "customer_deals",
      "customers",
      customerId,
      dealData,
      "New Lead", // Initial stage
    );

    const dealId = dealResult.data.id.entry_id;
    logInfo("Deal created in Attio", { submissionId, dealId, dealType });

    // 4. Update customer record with buying agent reference
    if (agentId) {
      await attio.updateRecord("customers", customerId, {
        buying_agent: { target_object: "agents", target_record_id: agentId },
      });
      logDebug("Customer buying_agent updated", { submissionId, customerId, agentId });
    }

    // 5. Send SMS notification to agent (Slack handled by Attio WF1)
    if (agentId && agentInfo?.phone) {
      const magicLink = generateMagicLink(agentId, dealId, "agent");
      openphone
        .sendNewLeadNotification({
          to: agentInfo.phone,
          agentName: agentInfo.first_name || agentInfo.name || "Agent",
          customerName: `${formData.firstName} ${formData.lastName}`,
          dealType,
          magicLink,
        })
        .catch((error) => {
          logError("SMS notification failed", { submissionId }, error);
        });
    }

    // Track success
    await updateSubmissionStatus(
      submissionId,
      FormSubmissionStatus.SUCCESS,
      null,
    );

    logInfo("Contact agent form submitted successfully", {
      submissionId,
      dealId,
    });
    return {
      message: "Form submitted successfully!",
      dealId,
      redirectUrl: THANK_YOU_URL,
    };
  } catch (error) {
    await updateSubmissionStatus(
      submissionId,
      FormSubmissionStatus.FAILURE,
      null,
      error instanceof Error ? error : new Error("Unknown error"),
    );

    logError("Error in contactAgentPostForm", { submissionId }, error);
    throw new Error("Failed to submit form");
  }
}

export async function GetListedAgentsPostForm(formData: any) {
  const submissionId = await trackFormSubmission(
    "getListedAgents",
    formData,
    FormSubmissionStatus.PENDING,
  );

  logInfo("Processing agent listing form submission", { submissionId });

  try {
    // Create agent record in agents object (pending status)
    const agentData: Record<string, any> = {
      name: `${formData.firstName} ${formData.lastName}`,
      first_name: formData.firstName || "",
      last_name: formData.lastName || "",
      email: formData.email || "",
      military_status: formData.status_select || null,
      military_service: formData.branch_select || null,
      brokerage_name: formData.brokerageName || null,
      brokerage_license: formData.licenseNumber || null,
      managing_broker_name: formData.managingBrokerName || null,
      active_on_website: false, // Not active until approved
    };

    if (formData.phone) {
      const normalized = normalizePhone(formData.phone);
      if (normalized) agentData.phone = normalized;
    }

    const agentResult = await attio.createRecord("agents", agentData);
    const agentId = agentResult.data.id.record_id;

    logDebug("Agent record created", { submissionId, agentId });

    // Create entry in agent_onboarding pipeline
    const onboardingData: Record<string, any> = {
      primary_state: formData.primaryState || null,
      other_states: formData.otherStates
        ? Array.isArray(formData.otherStates)
          ? formData.otherStates.join(", ")
          : formData.otherStates
        : null,
      cities_serviced: formData.citiesServiced || null,
      bases_serviced: formData.basesServiced || null,
      personally_pcs: formData.personallyPCS || null,
      lead_acceptance: formData.leadAcceptance || null,
      how_did_you_hear: formData.howDidYouHear || null,
      tell_us_more: formData.tellusMore || null,
    };

    await attio.createListEntry(
      "agent_onboarding",
      "agents",
      agentId,
      onboardingData,
      "New Application", // Initial stage
    );

    logInfo("Agent onboarding entry created", { submissionId, agentId });

    // Slack notification handled by Attio WF3a

    await updateSubmissionStatus(
      submissionId,
      FormSubmissionStatus.SUCCESS,
      null,
    );

    logInfo("Agent listing form submitted successfully", { submissionId });
    return {
      message: "Form submitted successfully!",
      redirectUrl: THANK_YOU_URL,
    };
  } catch (error) {
    await updateSubmissionStatus(
      submissionId,
      FormSubmissionStatus.FAILURE,
      null,
      error instanceof Error ? error : new Error("Unknown error"),
    );

    logError("Error in GetListedAgentsPostForm", { submissionId }, error);
    throw new Error("Failed to submit form");
  }
}

export async function GetListedLendersPostForm(formData: any) {
  const submissionId = await trackFormSubmission(
    "getListedLenders",
    formData,
    FormSubmissionStatus.PENDING,
  );

  logInfo("Processing lender listing form submission", { submissionId });

  try {
    // Create lender record in lenders object (pending status)
    const lenderData: Record<string, any> = {
      name: `${formData.firstName} ${formData.lastName}`,
      first_name: formData.firstName || "",
      last_name: formData.lastName || "",
      email: formData.email || "",
      military_status: formData.status_select || null,
      military_service: formData.branch_select || null,
      company_name: formData.name || null, // Company name field
      individual_nmls: formData.nmlsId || null,
      company_nmls: formData.companyNMLSId || null,
      active_on_website: false, // Not active until approved
    };

    if (formData.phone) {
      const normalized = normalizePhone(formData.phone);
      if (normalized) lenderData.phone = normalized;
    }

    const lenderResult = await attio.createRecord("lenders", lenderData);
    const lenderId = lenderResult.data.id.record_id;

    logDebug("Lender record created", { submissionId, lenderId });

    // Create entry in lender_onboarding pipeline
    const onboardingData: Record<string, any> = {
      primary_state: formData.primaryState || null,
      other_states: formData.otherStates
        ? Array.isArray(formData.otherStates)
          ? formData.otherStates.join(", ")
          : formData.otherStates
        : null,
      local_cities: formData.localCities || null,
      how_did_you_hear: formData.howDidYouHear || null,
      tell_us_more: formData.tellusMore || null,
    };

    await attio.createListEntry(
      "lender_onboarding",
      "lenders",
      lenderId,
      onboardingData,
      "New Application", // Initial stage
    );

    logInfo("Lender onboarding entry created", { submissionId, lenderId });

    // Slack notification handled by Attio WF4a

    await updateSubmissionStatus(
      submissionId,
      FormSubmissionStatus.SUCCESS,
      null,
    );

    logInfo("Lender listing form submitted successfully", { submissionId });
    return {
      message: "Form submitted successfully!",
      redirectUrl: THANK_YOU_URL,
    };
  } catch (error) {
    await updateSubmissionStatus(
      submissionId,
      FormSubmissionStatus.FAILURE,
      null,
      error instanceof Error ? error : new Error("Unknown error"),
    );

    logError("Error in GetListedLendersPostForm", { submissionId }, error);
    throw new Error("Failed to submit form");
  }
}

export async function KeepInTouchForm(formData: any) {
  const submissionId = await trackFormSubmission(
    "keepInTouch",
    formData,
    FormSubmissionStatus.PENDING,
  );

  logInfo("Processing keep in touch form submission", { submissionId });

  try {
    // Create simple customer record for newsletter signup
    await findOrCreateCustomer({
      firstName: formData.firstName || "",
      lastName: formData.lastName || "",
      email: formData.email || "",
    });

    // Send Slack notification
    slack
      .sendAlert("New Keep In Touch Submission", {
        Name: `${formData.firstName} ${formData.lastName}`,
        Email: formData.email || "",
      })
      .catch((error) => {
        logError(
          "Error sending keep in touch notifications",
          { submissionId },
          error,
        );
      });

    await updateSubmissionStatus(
      submissionId,
      FormSubmissionStatus.SUCCESS,
      null,
    );

    logInfo("Keep in touch form submitted successfully", { submissionId });
    return { success: true, message: "Form submitted successfully!" };
  } catch (error) {
    await updateSubmissionStatus(
      submissionId,
      FormSubmissionStatus.FAILURE,
      null,
      error instanceof Error ? error : new Error("Unknown error"),
    );

    logError("Error in KeepInTouchForm", { submissionId }, error);
    throw new Error("Failed to submit form");
  }
}

export async function contactLenderPostForm(
  formData: any,
  fullQueryString: string,
) {
  const submissionId = await trackFormSubmission(
    "contactLender",
    formData,
    FormSubmissionStatus.PENDING,
  );

  const params = new URLSearchParams(fullQueryString);
  const lenderAttioId = params.get("id"); // Now receives Attio UUID instead of Salesforce ID
  const stateCode = params.get("state");

  logInfo("Processing contact lender form submission", {
    submissionId,
    lender_attio_id: lenderAttioId,
  });

  try {
    // 1. Find the lender in Attio by direct record lookup
    let lenderInfo = null;
    let lenderId: string | null = null;

    if (lenderAttioId) {
      try {
        const lender = await attio.getRecord("lenders", lenderAttioId);
        if (lender) {
          lenderInfo = lender;
          lenderId = lender.id;
          logDebug("Lender found in Attio", { submissionId, lenderId });
        }
      } catch (error) {
        logError(
          "Error fetching lender from Attio",
          { submissionId, lenderAttioId },
          error,
        );
      }
    }

    // 2. Create or update customer record
    const customerId = await findOrCreateCustomer({
      firstName: formData.firstName || "",
      lastName: formData.lastName || "",
      email: formData.email || "",
      phone: formData.phone,
      currentLocation: formData.currentBase,
      destinationCity: formData.destinationBase,
    });

    logDebug("Customer record created/updated", { submissionId, customerId });

    // 3. Create deal in customer_deals pipeline
    const dealData: Record<string, any> = {
      deal_type: "Lender",
      contact_confirmed: false,
      reroute_count: 0,
      last_updated: new Date().toISOString(),
      last_stage_change: new Date().toISOString(),
    };

    // Add lender reference if found
    if (lenderId) {
      dealData.lender = {
        target_object: "lenders",
        target_record_id: lenderId,
      };
    }

    // Add form fields to deal for tracking
    if (formData.currentBase) {
      dealData.current_location = formData.currentBase;
    }
    if (formData.destinationBase) {
      dealData.destination_city = formData.destinationBase;
    }
    if (formData.howDidYouHear) {
      dealData.how_did_you_hear = formData.howDidYouHear;
    }
    if (formData.tellusMore) {
      dealData.how_did_you_hear_other = formData.tellusMore;
    }

    // Add notes/comments if provided
    if (formData.additionalComments) {
      dealData.notes = formData.additionalComments;
    }

    const dealResult = await attio.createListEntry(
      "customer_deals",
      "customers",
      customerId,
      dealData,
      "New Lead", // Initial stage
    );

    const dealId = dealResult.data.id.entry_id;
    logInfo("Lender deal created in Attio", { submissionId, dealId });

    // 4. Update customer record with lender reference
    if (lenderId) {
      await attio.updateRecord("customers", customerId, {
        lender: { target_object: "lenders", target_record_id: lenderId },
      });
      logDebug("Customer lender updated", { submissionId, customerId, lenderId });
    }

    // 5. Send SMS notification to lender (Slack handled by Attio WF1)
    if (lenderId && lenderInfo?.phone) {
      const magicLink = generateMagicLink(lenderId, dealId, "lender");
      openphone
        .sendNewLeadNotification({
          to: lenderInfo.phone,
          agentName: lenderInfo.first_name || lenderInfo.name || "Lender",
          customerName: `${formData.firstName} ${formData.lastName}`,
          dealType: "Lender",
          magicLink,
        })
        .catch((error) => {
          logError("SMS notification failed", { submissionId }, error);
        });
    }

    // Track success
    await updateSubmissionStatus(
      submissionId,
      FormSubmissionStatus.SUCCESS,
      null,
    );

    logInfo("Contact lender form submitted successfully", {
      submissionId,
      dealId,
    });
    return {
      message: "Form submitted successfully!",
      dealId,
      redirectUrl: THANK_YOU_URL,
    };
  } catch (error) {
    await updateSubmissionStatus(
      submissionId,
      FormSubmissionStatus.FAILURE,
      null,
      error instanceof Error ? error : new Error("Unknown error"),
    );

    logError("Error in contactLenderPostForm", { submissionId }, error);
    throw new Error("Failed to submit form");
  }
}

export async function contactPostForm(formData: any) {
  const submissionId = await trackFormSubmission(
    "contact",
    formData,
    FormSubmissionStatus.PENDING,
  );

  logInfo("Processing contact form submission", { submissionId });

  try {
    // Create simple customer record
    await findOrCreateCustomer({
      firstName: formData.firstName || "",
      lastName: formData.lastName || "",
      email: formData.email || "",
    });

    // Send Slack notification
    slack
      .sendAlert("New Contact Form Submission", {
        Name: `${formData.firstName} ${formData.lastName}`,
        Email: formData.email || "",
        Message: formData.additionalComments || "No message",
      })
      .catch((error) => {
        logError(
          "Error sending contact form notifications",
          { submissionId },
          error,
        );
      });

    await updateSubmissionStatus(
      submissionId,
      FormSubmissionStatus.SUCCESS,
      null,
    );

    logInfo("Contact form submitted successfully", { submissionId });
    return { success: true, message: "Form submitted successfully!" };
  } catch (error) {
    await updateSubmissionStatus(
      submissionId,
      FormSubmissionStatus.FAILURE,
      null,
      error instanceof Error ? error : new Error("Unknown error"),
    );

    logError("Error in contactPostForm", { submissionId }, error);
    throw new Error("Failed to submit form");
  }
}

export async function vaLoanGuideForm(formData: any) {
  const submissionId = await trackFormSubmission(
    "vaLoanGuide",
    formData,
    FormSubmissionStatus.PENDING,
  );

  logInfo("Processing VA loan guide form submission", { submissionId });

  try {
    // Create simple customer record for download
    await findOrCreateCustomer({
      firstName: formData.firstName || "",
      lastName: formData.lastName || "",
      email: formData.email || "",
    });

    // Send Slack notification
    slack
      .sendAlert("New VA Loan Guide Download", {
        Name: `${formData.firstName} ${formData.lastName}`,
        Email: formData.email || "",
      })
      .catch((error) => {
        logError(
          "Error sending VA loan guide notifications",
          { submissionId },
          error,
        );
      });

    await updateSubmissionStatus(
      submissionId,
      FormSubmissionStatus.SUCCESS,
      null,
    );

    logInfo("VA loan guide form submitted successfully", { submissionId });
    return { success: true, message: "Form submitted successfully!" };
  } catch (error) {
    await updateSubmissionStatus(
      submissionId,
      FormSubmissionStatus.FAILURE,
      null,
      error instanceof Error ? error : new Error("Unknown error"),
    );

    logError("Error in vaLoanGuideForm", { submissionId }, error);
    throw new Error("Failed to submit form");
  }
}

export async function internshipFormSubmission(formData: any) {
  const submissionId = await trackFormSubmission(
    "internship",
    formData,
    FormSubmissionStatus.PENDING,
  );

  logInfo("Processing internship form submission", { submissionId });

  try {
    // Map form internship type to Attio select value
    // Form sends "Intern - Agent" or "Intern - Lender"
    const internshipTypeRaw = formData["00N4x00000QPK7L"] || "";
    let internshipType: string | null = null;
    if (internshipTypeRaw.includes("Agent")) {
      internshipType = "Real Estate Agent";
    } else if (internshipTypeRaw.includes("Lender")) {
      internshipType = "Mortgage Lender";
    }

    // Map military status from form to Attio select value
    // Form uses: Active, National Guard, Reserves, Retired, Spouse, Veteran
    // Attio uses: Active Duty, National Guard, Reserves, Retired, Spouse, Veteran
    const militaryStatusRaw = formData["00N4x00000LsnP2"] || "";
    let militaryStatus: string | null = null;
    if (militaryStatusRaw === "Active") {
      militaryStatus = "Active Duty";
    } else if (militaryStatusRaw) {
      militaryStatus = militaryStatusRaw;
    }

    // Map military service from form to Attio select value
    // Form uses: Air Force, Army, Coast Guard, Navy, Marine Corps, Space Force
    // Attio uses: Air Force, Army, Coast Guard, Navy, Marines, Space Force
    const militaryServiceRaw = formData["00N4x00000LsnOx"] || "";
    let militaryService: string | null = null;
    if (militaryServiceRaw === "Marine Corps") {
      militaryService = "Marines";
    } else if (militaryServiceRaw) {
      militaryService = militaryServiceRaw;
    }

    // Create intern record in interns object with ALL form fields
    const internData: Record<string, any> = {
      // Identity
      name: `${formData.first_name} ${formData.last_name}`,
      first_name: formData.first_name || "",
      last_name: formData.last_name || "",
      email: formData.email || "",

      // Military Information
      military_service: militaryService,
      military_status: militaryStatus,
      discharge_status: formData["00N4x00000QQ0Vz"] || null,

      // Current Location
      current_state: formData.state_code || null,
      current_city: formData.city || null,
      current_base: formData.base || null,

      // Internship Details
      internship_type: internshipType,
      desired_state: formData["00N4x00000LspV2"] || null,
      desired_city: formData["00N4x00000LspUi"] || null,
      preferred_start_date: formData["00N4x00000QPLQY"] || null,
      licensed: formData["00N4x00000QPLQd"] || null,

      // Marketing Attribution
      how_did_you_hear: formData["00N4x00000QPksj"] || null,
      how_did_you_hear_other: formData["00N4x00000QPS7V"] || null,

      // Tracking
      application_date: new Date().toISOString().split("T")[0], // Today's date
    };

    // Normalize phone number
    if (formData.mobile) {
      const normalized = normalizePhone(formData.mobile);
      if (normalized) internData.phone = normalized;
    }

    const internResult = await attio.createRecord("interns", internData);
    const internId = internResult.data.id.record_id;

    logDebug("Intern record created", { submissionId, internId });

    // Create entry in intern_placements pipeline at "New Application" stage
    const placementData: Record<string, any> = {
      notes: null, // Admin will add notes during review
    };

    await attio.createListEntry(
      "intern_placements",
      "interns",
      internId,
      placementData,
      "New Application",
    );

    logInfo("Intern placement entry created", { submissionId, internId });

    // Slack notification handled by Attio WF5a

    await updateSubmissionStatus(
      submissionId,
      FormSubmissionStatus.SUCCESS,
      internId, // Pass the Attio record ID
    );

    logInfo("Internship form submitted successfully", {
      submissionId,
      internId,
    });
    return {
      message: "Form submitted successfully!",
      redirectUrl: THANK_YOU_URL,
    };
  } catch (error) {
    await updateSubmissionStatus(
      submissionId,
      FormSubmissionStatus.FAILURE,
      null,
      error instanceof Error ? error : new Error("Unknown error"),
    );

    logError("Error in internshipFormSubmission", { submissionId }, error);
    throw new Error("Failed to submit form");
  }
}
