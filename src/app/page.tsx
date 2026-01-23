import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { LandingShell } from "@/components/landing/shell";
import { LandingHero } from "@/components/landing/hero";
import { LandingPreview } from "@/components/landing/preview";
import { LandingTrust } from "@/components/landing/trust";
import { LandingHowItWorks } from "@/components/landing/how-it-works";
import { LandingFeatures } from "@/components/landing/features";
import { LandingSafety } from "@/components/landing/safety";
import { LandingTestimonials } from "@/components/landing/testimonials";
import { LandingCta } from "@/components/landing/cta";
import { CreatorHome } from "@/components/home/creator-home";
import { BrandHome } from "@/components/home/brand-home";
import { AdminHome } from "@/components/home/admin-home";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    return (
      <LandingShell>
        <LandingHero />
        <LandingPreview />
        <LandingTrust />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingSafety />
        <LandingTestimonials />
        <LandingCta />
      </LandingShell>
    );
  }

  if (user.role === "CREATOR") {
    return <CreatorHome userId={user.id} creatorProfileId={user.creatorProfileId} />;
  }
  if (user.role === "BRAND") {
    return <BrandHome userId={user.id} brandProfileId={user.brandProfileId} />;
  }

  return <AdminHome />;
}
