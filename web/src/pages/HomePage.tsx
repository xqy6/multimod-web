import { About } from "@/components/home/About";
import { Faq } from "@/components/home/Faq";
import { Features } from "@/components/home/Features";
import { Footer } from "@/components/home/Footer";
import { Hero } from "@/components/home/Hero";
import { ModulePicker } from "@/components/home/ModulePicker";
import { Navbar } from "@/components/home/Navbar";
import { Showcase } from "@/components/home/Showcase";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-ink-950 text-mist-100">
      <Navbar />
      <Hero />
      <Features />
      <Showcase />
      <ModulePicker />
      <About />
      <Faq />
      <Footer />
    </main>
  );
}
