import { PortalLayout } from "@/components/layout/PortalLayout";
import { FooterSection } from "@/components/sections/FooterSection";
import { LoginCTASection } from "@/components/sections/LoginCTASection";
import { Suspense } from "react";

export default function HomePage() {
  return (
    <PortalLayout>
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
        <Suspense fallback={null}>
          <LoginCTASection />
        </Suspense>
        <FooterSection />
      </div>
    </PortalLayout>
  );
}
