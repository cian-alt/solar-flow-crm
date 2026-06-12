/**
 * Solar Flow company details used on generated SLA documents.
 * No company-settings store exists yet, so these live here as editable constants.
 */
export const SOLAR_FLOW_COMPANY = {
  name: "Solar Flow",
  legalName: "Beo Software Solutions",
  address: "Unit 4, Riverside Business Park, Dublin, D01 X2Y3, Ireland",
  email: "hello@solarflow.ie",
  phone: "+353 1 555 0123",
  website: "www.solarflow.ie",
  vat: "IE1234567A",
  registration: "IE 654321",
};

/** Standard Solar Flow SLA terms & conditions (numbered on the document). */
export const SLA_TERMS: string[] = [
  "This Service Level Agreement (\"Agreement\") is entered into between Solar Flow and the Client named below for the provision of the Solar Flow job-management platform and related services.",
  "Subscription fees are billed in advance per the payment schedule set out in this Agreement. All amounts are in Euro (€) and exclusive of VAT unless otherwise stated.",
  "The subscription term begins on the Contract Start Date and continues for the Contract Duration specified. The Agreement renews on a rolling monthly basis thereafter unless cancelled with 30 days' written notice.",
  "Onboarding services are delivered per the selected onboarding package. Onboarding fees are once-off and non-refundable once onboarding has commenced.",
  "Solar Flow targets 99.5% platform availability measured monthly, excluding scheduled maintenance notified in advance.",
  "Support is provided via the Client's dedicated Account Manager during business hours (Mon–Fri, 9:00–17:30 IST).",
  "Either party may terminate this Agreement for material breach not remedied within 30 days of written notice. Fees due up to the termination date remain payable.",
  "The Client's data remains the property of the Client. Solar Flow processes personal data in accordance with the GDPR and the Irish Data Protection Act 2018.",
  "This Agreement is governed by the laws of Ireland and subject to the exclusive jurisdiction of the Irish courts.",
];
