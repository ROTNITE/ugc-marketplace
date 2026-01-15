import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { LandingHero } from "@/components/landing/hero";
import { LandingHowItWorks } from "@/components/landing/how-it-works";
import { LandingFeatures } from "@/components/landing/features";
import { LandingSafety } from "@/components/landing/safety";
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
      <div className="bg-background text-foreground">
        <LandingHero />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingSafety />
        <LandingCta />
      </div>
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
