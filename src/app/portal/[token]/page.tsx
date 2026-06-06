import PortalClient from "@/components/portal/PortalClient";

export const metadata = {
  title: "Your Solar Flow Onboarding",
};

export default function PortalPage({ params }: { params: { token: string } }) {
  return <PortalClient token={params.token} />;
}
