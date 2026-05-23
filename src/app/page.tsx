import { PortalLayout } from "@/components/layout/PortalLayout";
import { FooterSection } from "@/components/sections/FooterSection";
import { LoginCTASection } from "@/components/sections/LoginCTASection";
import { QuickAccessSection } from "@/components/sections/QuickAccessSection";
import { getPublicSignupPolicy } from "@/lib/signup-access";

export default function HomePage() {
  const signupPolicy = getPublicSignupPolicy();

  return (
    <PortalLayout>
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
        <LoginCTASection signupPolicy={signupPolicy} />
        <QuickAccessSection />
        <FooterSection />
      </div>
    </PortalLayout>
  );
}
