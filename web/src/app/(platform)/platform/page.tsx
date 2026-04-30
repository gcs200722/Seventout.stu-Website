import { PlatformLandingClientEffects } from "@/components/platform/landing/PlatformLandingClientEffects";
import { PlatformLandingEasyFactor } from "@/components/platform/landing/PlatformLandingEasyFactor";
import { PlatformLandingFeatureDeepDive } from "@/components/platform/landing/PlatformLandingFeatureDeepDive";
import { PlatformLandingFinalCta } from "@/components/platform/landing/PlatformLandingFinalCta";
import { PlatformLandingFooter } from "@/components/platform/landing/PlatformLandingFooter";
import { PlatformLandingHero } from "@/components/platform/landing/PlatformLandingHero";
import { PlatformLandingNavbar } from "@/components/platform/landing/PlatformLandingNavbar";
import { PlatformLandingShowcase } from "@/components/platform/landing/PlatformLandingShowcase";
import { PlatformLandingTestimonial } from "@/components/platform/landing/PlatformLandingTestimonial";
import "@/components/platform/landing/platform-landing.css";

export default function PlatformLandingPage() {
  return (
    <div className="platform-landing bg-[#fdf8f8] text-[#1c1b1b] antialiased">
      <PlatformLandingClientEffects />
      <PlatformLandingNavbar />
      <PlatformLandingHero />
      <PlatformLandingEasyFactor />
      <PlatformLandingFeatureDeepDive />
      <PlatformLandingShowcase />
      <PlatformLandingTestimonial />
      <PlatformLandingFinalCta />
      <PlatformLandingFooter />
    </div>
  );
}
