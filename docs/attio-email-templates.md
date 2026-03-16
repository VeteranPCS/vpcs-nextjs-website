# VeteranPCS Attio Email Templates

This document contains all 18 email templates ready to copy/paste into Attio Sequences.

---

## Architecture Note

**All emails are sent via Resend from application code** (not Attio sequences). Templates are implemented as React Email components in `emails/templates/`. This document contains the email content reference.

---

## Template Summary

| ID | Template | Recipient | Sequence |
|----|----------|-----------|----------|
| **Customer Emails** ||||
| C1 | Contact Form Confirmation | Customer | Customer Welcome - Unassigned |
| C2 | Lead Confirmation with Agent | Customer | Customer Welcome - Agent |
| C3 | Lead Confirmation with Lender | Customer | Customer Welcome - Lender |
| C4 | Under Contract Congratulations | Customer | Customer Under Contract |
| C5 | Transaction Closed | Customer | Customer Closed |
| C6 | Welcome Video (Optional) | Customer | (Future: Customer Nurture) |
| **Agent Emails** ||||
| A1 | New Lead Alert | Agent | Agent Lead Alert |
| A2 | Application Welcome | Agent | Agent Onboarding (Step 1) |
| A3 | Application Follow-Up | Agent | Agent Onboarding (Step 2) |
| A4 | Contract Ready | Agent | Agent Contract Ready |
| A5 | Onboarding Complete | Agent | Agent Live |
| **Lender Emails** ||||
| L1 | New Lead Alert | Lender | Lender Lead Alert |
| L2 | Application Welcome | Lender | Lender Onboarding (Step 1) |
| L3 | Application Follow-Up | Lender | Lender Onboarding (Step 2) |
| L4 | Contract Ready | Lender | Lender Contract Ready |
| L5 | Onboarding Complete | Lender | Lender Live |
| **Intern Emails** ||||
| I1 | Application Welcome | Intern | Intern Onboarding (Step 1) |
| I2 | Application Follow-Up | Intern | Intern Onboarding (Step 2) |
| **Referral Emails** ||||
| R1 | Referral Thank You | Referrer | (Future: Referral Thank You) |

---

## Template Props

Templates receive data as typed React props — no merge field limitations. Each template component is in `emails/templates/` and receives exactly the data it needs.

---

## Customer Emails

### C1: Contact Form Confirmation (Unassigned Lead)

**Trigger:** Customer submits contact form without selecting specific agent/lender
**Sent via:** WF1 → Customer Welcome - Unassigned sequence

**Subject:**
```
Thank You for Contacting VeteranPCS
```

**Body:**
```
Hi {{customer.first_name}},

Thank you for reaching out to VeteranPCS. We received your message and a member of our team will be in touch with you shortly.

At VeteranPCS, we connect veterans, active duty service members, and military families with trusted real estate agents and lenders who understand the unique needs of military life.

One of our team members will personally follow up with you to learn more about your situation and connect you with the right professional for your needs.

In the meantime, feel free to explore our website to learn more about our mission and the services we offer.

Thank you for your service, and we look forward to helping you with your real estate journey.

Warm regards,

The VeteranPCS Team

---

VeteranPCS | Serving Those Who Served
Website: https://veteranpcs.com
```

---

### C2: Lead Confirmation with Assigned Agent

**Trigger:** Customer submits form with specific agent selected
**Sent via:** WF1 → Customer Welcome - Agent sequence

**Subject:**
```
Your VeteranPCS Agent: {{agent.first_name}} {{agent.last_name}}
```

**Body:**
```
Hi {{customer.first_name}},

Thank you for choosing VeteranPCS! We're excited to connect you with one of our trusted real estate professionals.

YOUR AGENT:

{{agent.first_name}} {{agent.last_name}}
{{agent.brokerage_name}}

Phone: {{agent.phone}}
Email: {{agent.email}}

---

WHAT HAPPENS NEXT:

1. {{agent.first_name}} will reach out to you within the next 24-48 hours to introduce themselves and learn more about your real estate needs.

2. Be on the lookout for a call, text, or email from {{agent.first_name}}.

3. If you don't hear back within 48 hours, please let us know at info@veteranpcs.com and we'll follow up on your behalf.

---

ABOUT {{agent.first_name}}:

{{agent.first_name}} is a verified member of the VeteranPCS network, committed to providing exceptional service to veterans and military families. All of our agents understand VA loans, PCS moves, and the unique challenges of military life.

---

ABOUT VETERANPCS:

VeteranPCS is a veteran-owned company dedicated to connecting military families with real estate professionals who truly understand their needs. When you work with a VeteranPCS agent, you're also supporting veteran-owned businesses and charities.

Thank you for your service, and best of luck with your real estate journey!

Warm regards,

The VeteranPCS Team

---

VeteranPCS | Serving Those Who Served
Website: https://veteranpcs.com
```

---

### C3: Lead Confirmation with Assigned Lender

**Trigger:** Customer submits form with specific lender selected
**Sent via:** WF1 → Customer Welcome - Lender sequence

**Subject:**
```
Your VeteranPCS Lender: {{lender.first_name}} {{lender.last_name}}
```

**Body:**
```
Hi {{customer.first_name}},

Thank you for choosing VeteranPCS! We're excited to connect you with one of our trusted mortgage professionals who specializes in VA loans and military lending.

YOUR LENDER:

{{lender.first_name}} {{lender.last_name}}
{{lender.company_name}}
NMLS# {{lender.individual_nmls}}

Phone: {{lender.phone}}
Email: {{lender.email}}

---

WHAT HAPPENS NEXT:

1. {{lender.first_name}} will reach out to you within the next 24-48 hours to discuss your financing options and answer any questions.

2. Be on the lookout for a call, text, or email from {{lender.first_name}}.

3. If you don't hear back within 48 hours, please let us know at info@veteranpcs.com and we'll follow up on your behalf.

---

ABOUT {{lender.first_name}}:

{{lender.first_name}} is a verified member of the VeteranPCS lender network, specializing in VA loans and military lending. Our lenders understand BAH, deployment considerations, and the unique financial situations of military families.

---

VA LOAN BENEFITS:

As a veteran or active duty service member, you may be eligible for:
- $0 down payment on your home purchase
- No private mortgage insurance (PMI)
- Competitive interest rates
- Flexible credit requirements

{{lender.first_name}} can help you understand your VA loan eligibility and options.

---

Thank you for your service, and we look forward to helping you achieve your homeownership goals!

Warm regards,

The VeteranPCS Team

---

VeteranPCS | Serving Those Who Served
Website: https://veteranpcs.com
```

---

### C4: Under Contract Congratulations

**Trigger:** Customer Deal moves to "Under Contract" stage
**Sent via:** WF2 → Customer Under Contract sequence

**Subject:**
```
Congratulations from VeteranPCS - You're Under Contract!
```

**Body:**
```
Hi {{customer.first_name}},

CONGRATULATIONS! We heard the exciting news - you're under contract on your new home!

This is a huge milestone, and we're thrilled to have been part of your journey. The VeteranPCS team wants to celebrate this achievement with you.

---

WHAT TO EXPECT NEXT:

1. Home Inspection - Your agent will help coordinate the inspection process
2. Appraisal - Required for VA loans to ensure the home meets value requirements
3. Final Walkthrough - One last look before closing day
4. Closing Day - Sign the papers and get your keys!

---

YOUR VETERANPCS MOVE-IN BONUS:

As a thank you for using VeteranPCS, you'll receive a Move-In Bonus after your transaction closes! The amount is based on your home's sale price, and we'll send you details once the transaction is complete.

We'll also make a donation to a veteran-focused charity in your honor.

---

QUESTIONS?

Your agent {{agent.first_name}} {{agent.last_name}} is your best resource during this time. Don't hesitate to reach out to them with any questions.

If you need anything from the VeteranPCS team, we're always here at info@veteranpcs.com.

Congratulations again, and thank you for your service!

Warm regards,

The VeteranPCS Team

---

VeteranPCS | Serving Those Who Served
Website: https://veteranpcs.com
```

---

### C5: Transaction Closed - Congratulations & Review Request

**Trigger:** Customer Deal moves to "Paid Complete" stage
**Sent via:** WF2 → Customer Closed sequence

**Subject:**
```
Welcome Home! Your VeteranPCS Move-In Bonus Details
```

**Body:**
```
Hi {{customer.first_name}},

WELCOME TO YOUR NEW HOME!

Congratulations on closing! This is an incredible achievement, and the entire VeteranPCS team is honored to have been part of your journey.

---

YOUR VETERANPCS MOVE-IN BONUS:

As promised, here are the details of your Move-In Bonus:

Bonus Amount: ${{deal.move_in_bonus}}
Charity Donation: ${{deal.charity_amount}} donated in your honor

Your bonus check will be mailed to your new address within 2-3 weeks of closing. The charity donation will be made to a veteran-focused organization on your behalf.

---

HELP OTHER VETERANS:

Your experience can help other military families make informed decisions. Would you take a moment to share your experience?

Leave a Review:
- Google: [Add Google Review Link]
- Facebook: [Add Facebook Review Link]

Your feedback helps us continue serving the military community and helps other veterans find trusted professionals.

---

REFER A FRIEND:

Know another veteran or military family who could benefit from VeteranPCS? Send them our way! Every referral helps us grow our mission of serving those who served.

---

STAY CONNECTED:

Follow us on social media to stay connected with the VeteranPCS community:
- Facebook: @VeteranPCS
- Instagram: @VeteranPCS

---

Thank you for trusting VeteranPCS with your real estate journey. We wish you all the best in your new home!

With gratitude,

The VeteranPCS Team

---

VeteranPCS | Serving Those Who Served
Website: https://veteranpcs.com
```

---

### C6: Welcome Video / About VeteranPCS (Optional Nurture)

**Trigger:** 24 hours after lead created (optional)
**Sent via:** Customer Nurture Sequence (optional)

**Subject:**
```
What's VeteranPCS All About?
```

**Body:**
```
Hi {{customer.first_name}},

We wanted to share a little more about who we are and why we started VeteranPCS.

Watch Our Story: [Add Video Link]

---

OUR MISSION:

VeteranPCS was founded by veterans, for veterans. We understand the challenges of military life - the PCS moves, the uncertainty, and the unique financial situations that come with service.

That's why we created a network of real estate agents and lenders who truly understand what military families go through.

---

WHAT MAKES US DIFFERENT:

- Veteran-Owned: We're a veteran-owned company that gives back to the military community
- Verified Network: Every agent and lender in our network is vetted for their expertise with VA loans and military clients
- Move-In Bonus: We give back to you with a cash bonus when your transaction closes
- Charity Giving: We donate to veteran-focused charities with every closed transaction

---

YOUR NEXT STEPS:

If you haven't already connected with an agent or lender, we're here to help. Just reply to this email or visit our website to find the right professional for your needs.

Thank you for considering VeteranPCS. We're honored to serve those who served.

Warm regards,

The VeteranPCS Team

---

VeteranPCS | Serving Those Who Served
Website: https://veteranpcs.com
```

---

## Agent Emails

### A1: New Lead Alert to Agent

**Trigger:** Customer submits form with this agent selected
**Sent via:** WF1 → Agent Lead Alert sequence

**Subject:**
```
New Lead from VeteranPCS - Please Reply When Received
```

**Body:**
```
Hi {{agent.first_name}},

Great news! You have a new lead from VeteranPCS.

PLEASE REPLY TO THIS EMAIL TO CONFIRM YOU RECEIVED THIS LEAD.

---

LEAD DETAILS:

Name: {{customer.first_name}} {{customer.last_name}}
Phone: {{customer.phone}}
Email: {{customer.email}}
Destination: {{deal.destination_city}}, {{deal.destination_state}}

Transaction Type: {{deal.deal_type}}
Military Status: {{customer.military_status}}

Additional Notes:
{{deal.notes}}

---

NEXT STEPS:

1. Contact {{customer.first_name}} within 24 hours - First impressions matter!
2. Reply to this email to confirm you received the lead
3. Update the lead status when you make contact

---

IMPORTANT REMINDER:

VeteranPCS customers expect prompt, professional service. If you're unable to work with this lead, please let us know immediately so we can reassign to another agent.

If we don't hear from you within 48 hours, the lead may be reassigned.

---

Thank you for being part of the VeteranPCS network!

Best regards,

The VeteranPCS Team

---

VeteranPCS | Serving Those Who Served
info@veteranpcs.com
```

---

### A2: Agent Application Welcome

**Trigger:** Agent submits registration form
**Sent via:** Agent Onboarding Sequence (immediate)

**Subject:**
```
Welcome to VeteranPCS - Thank You for Your Application
```

**Body:**
```
Hi {{first_name}},

Thank you for your interest in joining the VeteranPCS network! We're excited to learn more about you and how we can work together to serve military families.

---

WHAT IS VETERANPCS?

VeteranPCS is a veteran-owned platform that connects military families with trusted real estate professionals. Our agents understand VA loans, PCS moves, and the unique challenges of military life.

By joining our network, you'll have the opportunity to:
- Receive qualified leads from veterans and military families
- Be featured on our state and area pages
- Connect with a community of like-minded professionals
- Give back to veterans through our charity program

---

WHAT HAPPENS NEXT:

1. Application Review - Our team will review your application within 2-3 business days
2. Brief Interview - We'll schedule a quick call to learn more about your experience
3. Agreement - If approved, we'll send you our partnership agreement to sign
4. Go Live - Once complete, you'll be listed on our website and eligible for leads

---

IN THE MEANTIME:

Feel free to explore our website and learn more about our mission:
- Website: https://veteranpcs.com
- About Us: https://veteranpcs.com/about

If you have any questions, don't hesitate to reach out to us at info@veteranpcs.com.

---

We look forward to potentially welcoming you to the VeteranPCS family!

Warm regards,

The VeteranPCS Team

---

VeteranPCS | Serving Those Who Served
Website: https://veteranpcs.com
Email: info@veteranpcs.com
```

---

### A3: Agent Application Follow-Up (7-Day Reminder)

**Trigger:** 7 days after A2, if still in "New Application" stage
**Sent via:** Agent Onboarding Sequence (7-day delay)

**Subject:**
```
Following Up on Your VeteranPCS Application
```

**Body:**
```
Hi {{first_name}},

We wanted to follow up on your VeteranPCS application. We haven't heard from you in a little while and wanted to make sure our previous email didn't get lost in your inbox.

---

QUICK RECAP:

You started an application to join the VeteranPCS agent network. We'd love to move forward with the process and learn more about how you serve military families.

---

NEXT STEPS:

If you're still interested in joining our network, please reply to this email and let us know the best time to connect for a brief introductory call.

If your circumstances have changed or you're no longer interested, no worries at all - just let us know and we'll close out your application.

---

WHY JOIN VETERANPCS?

- Qualified Leads: Connect with veterans and military families actively looking for agents
- Featured Listings: Be prominently displayed on our state and area pages
- Community: Join a network of professionals dedicated to serving military families
- Give Back: Every transaction supports veteran-focused charities

---

We'd hate to lose you from our pipeline, so please reach out if you have any questions or concerns.

Looking forward to hearing from you!

Best regards,

The VeteranPCS Team

---

VeteranPCS | Serving Those Who Served
Email: info@veteranpcs.com
```

---

### A4: Agent Contract Ready for Signature

**Trigger:** Agent Onboarding moves to "Contract Sent" stage
**Sent via:** WF3b → Agent Contract Ready sequence

**Subject:**
```
Your VeteranPCS Partnership Agreement is Ready to Sign
```

**Body:**
```
Hi {{first_name}},

Great news! Your VeteranPCS application has been approved, and we're ready to move forward.

YOUR PARTNERSHIP AGREEMENT IS READY FOR SIGNATURE.

---

NEXT STEPS:

1. Review the Agreement - You'll receive a separate email from our e-signature provider (SignWell) with the agreement attached

2. Sign Electronically - The process takes just a few minutes

3. Complete Your Profile - Once signed, we'll need a few items to complete your listing:
   - Professional headshot
   - Brief bio (2-3 paragraphs about your experience)
   - Your service areas

4. Go Live - Once everything is complete, you'll be listed on VeteranPCS and eligible to receive leads!

---

WHAT'S IN THE AGREEMENT:

- Referral fee structure and payment terms
- Lead handling expectations
- Branding and marketing guidelines
- Terms of partnership

If you have any questions about the agreement before signing, please don't hesitate to reach out to us.

---

TIMELINE:

Please sign the agreement within the next 7 days to keep your application moving forward. If you need more time or have concerns, just let us know.

---

We're excited to have you join the VeteranPCS network!

Best regards,

The VeteranPCS Team

---

VeteranPCS | Serving Those Who Served
Email: info@veteranpcs.com
```

---

### A5: Agent Onboarding Complete - Welcome to the Network!

**Trigger:** Agent Onboarding moves to "Live on Website" stage
**Sent via:** WF3b → Agent Live sequence

**Subject:**
```
Welcome to VeteranPCS - You're Now Live!
```

**Body:**
```
Hi {{first_name}},

CONGRATULATIONS AND WELCOME TO THE VETERANPCS NETWORK!

Your profile is now live on our website, and you're ready to start receiving leads from veterans and military families in your area.

---

YOUR LIVE PROFILE:

You can view your listing at:
https://veteranpcs.com/{{state_slug}}/{{area_slug}}

Please take a moment to review your profile and let us know if anything needs to be updated.

---

WHAT TO EXPECT:

- Leads: When a veteran or military family in your area requests an agent, you'll receive an email with their contact information. Please respond promptly - first impressions matter!

- Response Time: We ask that you contact new leads within 24 hours and reply to our lead notification email to confirm receipt.

- Updates: Keep us informed of any changes to your contact information, service areas, or availability.

---

TIPS FOR SUCCESS:

1. Respond Quickly - The first agent to respond often wins the client
2. Be Knowledgeable - Brush up on VA loan requirements and military-specific considerations
3. Communicate - Keep your clients (and us) informed throughout the transaction
4. Give Back - Remember that every closed transaction supports veteran charities

---

TEST YOUR LEAD FLOW:

Want to see how leads come through? Visit your profile page and submit a test inquiry to yourself. This helps you understand the customer experience.

---

QUESTIONS?

We're always here to help. Reach out anytime at info@veteranpcs.com.

Thank you for joining our mission to serve those who served!

Welcome to the team,

The VeteranPCS Team

---

VeteranPCS | Serving Those Who Served
Website: https://veteranpcs.com
Email: info@veteranpcs.com
```

---

## Lender Emails

### L1: New Lead Alert to Lender

**Trigger:** Customer submits form with this lender selected
**Sent via:** WF1 → Lender Lead Alert sequence

**Subject:**
```
New Lead from VeteranPCS - Please Reply When Received
```

**Body:**
```
Hi {{lender.first_name}},

Great news! You have a new lead from VeteranPCS.

PLEASE REPLY TO THIS EMAIL TO CONFIRM YOU RECEIVED THIS LEAD.

---

LEAD DETAILS:

Name: {{customer.first_name}} {{customer.last_name}}
Phone: {{customer.phone}}
Email: {{customer.email}}
Destination: {{deal.destination_city}}, {{deal.destination_state}}

Transaction Type: {{deal.deal_type}}
Military Status: {{customer.military_status}}

Additional Notes:
{{deal.notes}}

---

NEXT STEPS:

1. Contact {{customer.first_name}} within 24 hours - First impressions matter!
2. Reply to this email to confirm you received the lead
3. Update the lead status when you make contact

---

IMPORTANT REMINDER:

VeteranPCS customers expect prompt, professional service. If you're unable to work with this lead, please let us know immediately so we can reassign to another lender.

If we don't hear from you within 48 hours, the lead may be reassigned.

---

Thank you for being part of the VeteranPCS network!

Best regards,

The VeteranPCS Team

---

VeteranPCS | Serving Those Who Served
info@veteranpcs.com
```

---

### L2: Lender Application Welcome

**Trigger:** Lender submits registration form
**Sent via:** Lender Onboarding Sequence (immediate)

**Subject:**
```
Welcome to VeteranPCS - Thank You for Your Application
```

**Body:**
```
Hi {{first_name}},

Thank you for your interest in joining the VeteranPCS lender network! We're excited to learn more about you and how we can work together to serve military families.

---

WHAT IS VETERANPCS?

VeteranPCS is a veteran-owned platform that connects military families with trusted real estate and mortgage professionals. Our lenders specialize in VA loans and understand the unique financial situations of service members.

By joining our network, you'll have the opportunity to:
- Receive qualified leads from veterans and military families seeking financing
- Be featured on our state pages as a trusted VA loan specialist
- Connect with a community of like-minded professionals
- Give back to veterans through our charity program

---

WHAT HAPPENS NEXT:

1. Application Review - Our team will review your application within 2-3 business days
2. Verification - We'll verify your NMLS licensing and credentials
3. Agreement - If approved, we'll send you our partnership agreement to sign
4. Go Live - Once complete, you'll be listed on our website and eligible for leads

---

IN THE MEANTIME:

Feel free to explore our website and learn more about our mission:
- Website: https://veteranpcs.com
- About Us: https://veteranpcs.com/about

If you have any questions, don't hesitate to reach out to us at info@veteranpcs.com.

---

We look forward to potentially welcoming you to the VeteranPCS family!

Warm regards,

The VeteranPCS Team

---

VeteranPCS | Serving Those Who Served
Website: https://veteranpcs.com
Email: info@veteranpcs.com
```

---

### L3: Lender Application Follow-Up (7-Day Reminder)

**Trigger:** 7 days after L2, if still in "New Application" stage
**Sent via:** Lender Onboarding Sequence (7-day delay)

**Subject:**
```
Following Up on Your VeteranPCS Application
```

**Body:**
```
Hi {{first_name}},

We wanted to follow up on your VeteranPCS lender application. We haven't heard from you in a little while and wanted to make sure our previous email didn't get lost in your inbox.

---

QUICK RECAP:

You started an application to join the VeteranPCS lender network. We'd love to move forward with the process and learn more about how you serve military families with VA loans.

---

NEXT STEPS:

If you're still interested in joining our network, please reply to this email and let us know the best time to connect for a brief introductory call.

If your circumstances have changed or you're no longer interested, no worries at all - just let us know and we'll close out your application.

---

WHY JOIN VETERANPCS?

- Qualified Leads: Connect with veterans and military families actively seeking VA financing
- State Coverage: Be featured on state pages where you're licensed
- Community: Join a network of professionals dedicated to serving military families
- Give Back: Every transaction supports veteran-focused charities

---

We'd hate to lose you from our pipeline, so please reach out if you have any questions or concerns.

Looking forward to hearing from you!

Best regards,

The VeteranPCS Team

---

VeteranPCS | Serving Those Who Served
Email: info@veteranpcs.com
```

---

### L4: Lender Contract Ready for Signature

**Trigger:** Lender Onboarding moves to "Contract Sent" stage
**Sent via:** WF4b → Lender Contract Ready sequence

**Subject:**
```
Your VeteranPCS Partnership Agreement is Ready to Sign
```

**Body:**
```
Hi {{first_name}},

Great news! Your VeteranPCS application has been approved, and we're ready to move forward.

YOUR PARTNERSHIP AGREEMENT IS READY FOR SIGNATURE.

---

NEXT STEPS:

1. Review the Agreement - You'll receive a separate email from our e-signature provider (SignWell) with the agreement attached

2. Sign Electronically - The process takes just a few minutes

3. Complete Your Profile - Once signed, we'll need a few items to complete your listing:
   - Professional headshot
   - Brief bio (2-3 paragraphs about your VA loan experience)
   - States where you're licensed to lend

4. Go Live - Once everything is complete, you'll be listed on VeteranPCS and eligible to receive leads!

---

WHAT'S IN THE AGREEMENT:

- Referral fee structure and payment terms
- Lead handling expectations
- Branding and marketing guidelines
- Terms of partnership

If you have any questions about the agreement before signing, please don't hesitate to reach out to us.

---

TIMELINE:

Please sign the agreement within the next 7 days to keep your application moving forward. If you need more time or have concerns, just let us know.

---

We're excited to have you join the VeteranPCS lender network!

Best regards,

The VeteranPCS Team

---

VeteranPCS | Serving Those Who Served
Email: info@veteranpcs.com
```

---

### L5: Lender Onboarding Complete - Welcome to the Network!

**Trigger:** Lender Onboarding moves to "Live on Website" stage
**Sent via:** WF4b → Lender Live sequence

**Subject:**
```
Welcome to VeteranPCS - You're Now Live!
```

**Body:**
```
Hi {{first_name}},

CONGRATULATIONS AND WELCOME TO THE VETERANPCS LENDER NETWORK!

Your profile is now live on our website, and you're ready to start receiving leads from veterans and military families seeking VA financing.

---

YOUR LIVE PROFILE:

You're now listed on the following state pages:
[List of states where lender is licensed - Attio will need to iterate over states array]

Please take a moment to review your profile and let us know if anything needs to be updated.

---

WHAT TO EXPECT:

- Leads: When a veteran or military family requests a lender in your coverage area, you'll receive an email with their contact information. Please respond promptly - first impressions matter!

- Response Time: We ask that you contact new leads within 24 hours and reply to our lead notification email to confirm receipt.

- Updates: Keep us informed of any changes to your contact information, licensed states, or availability.

---

TIPS FOR SUCCESS:

1. Respond Quickly - The first lender to respond often wins the client
2. Educate - Many veterans don't fully understand their VA loan benefits - help them!
3. Communicate - Keep your clients (and us) informed throughout the loan process
4. Give Back - Remember that every closed transaction supports veteran charities

---

QUESTIONS?

We're always here to help. Reach out anytime at info@veteranpcs.com.

Thank you for joining our mission to serve those who served!

Welcome to the team,

The VeteranPCS Team

---

VeteranPCS | Serving Those Who Served
Website: https://veteranpcs.com
Email: info@veteranpcs.com
```

---

## Intern Emails

### I1: Intern Application Welcome

**Trigger:** Intern submits application
**Sent via:** WF5a → Intern Onboarding sequence (immediate)

**Subject:**
```
VeteranPCS Internship - Thank You for Your Application
```

**Body:**
```
Hi {{first_name}},

Thank you for your interest in the VeteranPCS Internship Program! We're excited to learn more about you and explore how we can help you transition into a career in real estate or mortgage lending.

---

ABOUT THE VETERANPCS INTERNSHIP PROGRAM:

Our internship program connects transitioning service members with experienced agents and lenders in our network who can mentor you as you build your new career.

Whether you're interested in becoming a real estate agent or a mortgage lender, we'll work to match you with a mentor who can guide you through licensing, training, and your first transactions.

---

WHAT HAPPENS NEXT:

1. Application Review - Our team will review your application within 3-5 business days
2. Initial Conversation - We'll schedule a call to learn more about your goals and timeline
3. Mentor Matching - Based on your preferences and location, we'll identify potential mentors
4. Introduction - Once a match is made, we'll introduce you to your mentor

---

WHAT WE RECEIVED:

We have your application on file with the following details:
- Internship Type: {{internship_type}}
- Desired Location: {{desired_city}}, {{desired_state}}
- Preferred Start Date: {{preferred_start_date}}

If any of this information needs to be updated, please reply to this email.

---

IN THE MEANTIME:

If you haven't already started the licensing process, now is a great time to research requirements in your desired state. Your mentor can provide more guidance, but getting a head start never hurts!

---

We look forward to helping you on your journey from service member to real estate professional.

Thank you for your service,

The VeteranPCS Team

---

VeteranPCS | Serving Those Who Served
Website: https://veteranpcs.com
Email: info@veteranpcs.com
```

---

### I2: Intern Application Follow-Up (7-Day Reminder)

**Trigger:** 7 days after I1, if still in "New Application" stage
**Sent via:** Intern Onboarding sequence (7-day delay)

**Subject:**
```
Following Up on Your VeteranPCS Internship Application
```

**Body:**
```
Hi {{first_name}},

We wanted to follow up on your VeteranPCS internship application. We haven't heard from you in a little while and wanted to check in.

---

QUICK RECAP:

You applied to join the VeteranPCS Internship Program to pursue a career in {{internship_type}}. We'd love to move forward with the process and learn more about your goals.

---

NEXT STEPS:

If you're still interested in the internship program, please reply to this email and let us know:
1. The best time to connect for an introductory call
2. Any updates to your timeline or preferred location
3. Any questions you have about the program

If your plans have changed or you're no longer interested, no worries at all - just let us know and we'll close out your application.

---

WHAT TO EXPECT:

Our internship program is designed to help transitioning service members like you build a successful career in real estate or lending. We'll match you with an experienced mentor who can guide you through:
- Licensing requirements
- Initial training and education
- Your first clients and transactions
- Building your business

---

We'd love to help you on your journey, so please reach out when you have a chance.

Thank you for your service,

The VeteranPCS Team

---

VeteranPCS | Serving Those Who Served
Email: info@veteranpcs.com
```

---

## Referral Emails

### R1: Agent Referral Thank You

**Trigger:** Someone submits agent referral form
**Sent via:** Future workflow (when referral form is implemented)

**Subject:**
```
Thank You for Your Agent Referral
```

**Body:**
```
Hi {{referrer.first_name}},

Thank you for referring an agent to VeteranPCS! We truly appreciate you helping us grow our network of professionals serving military families.

---

REFERRAL DETAILS:

You referred: {{referred_agent.first_name}} {{referred_agent.last_name}}
Location: {{referred_agent.city}}, {{referred_agent.state}}

---

WHAT HAPPENS NEXT:

Our team will reach out to {{referred_agent.first_name}} to introduce them to VeteranPCS and walk them through our application process. We'll let you know once they've joined our network!

---

KNOW MORE GREAT AGENTS?

If you know other real estate professionals who would be a great fit for VeteranPCS, please send them our way! Our mission grows stronger with every agent who joins our network.

You can refer agents at: https://veteranpcs.com/refer-an-agent

---

WHY REFERRALS MATTER:

Every agent who joins our network helps us serve more military families. Your referrals directly support our mission of connecting veterans with trusted professionals who understand their unique needs.

---

Thank you again for supporting VeteranPCS and our mission to serve those who served.

Warm regards,

The VeteranPCS Team

---

VeteranPCS | Serving Those Who Served
Website: https://veteranpcs.com
Email: info@veteranpcs.com
```

---

## Implementation Notes

### React Email Templates

All emails are implemented as React Email components in `emails/templates/`:

```
emails/templates/
├── components/   # Shared Layout, Footer
├── customer/     # C1-C5 + C2b
├── agent/        # A1-A5
├── lender/       # L1-L5
└── intern/       # I1-I2
```

Each template receives typed props with all necessary data — no merge field limitations.

### Testing Checklist

- [ ] Submit test forms and verify email delivery via Resend dashboard
- [ ] Check email renders properly on mobile
- [ ] Verify Attio notes are logged on records
- [ ] Verify links work
