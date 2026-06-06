import SignClient from "@/components/sign/SignClient";

export const metadata = {
  title: "Sign Your Agreement — Solar Flow",
};

export default function SignPage({ params }: { params: { token: string } }) {
  return <SignClient token={params.token} />;
}
