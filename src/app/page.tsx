import { LandingPage } from "@/components/landing/landing-page";

export default function Home() {
  return (
    <main>
      <LandingPage demoSeedToken={process.env.DEMO_SEED_TOKEN ?? ""} />
    </main>
  );
}
