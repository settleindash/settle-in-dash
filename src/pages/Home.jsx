import Header from '../components/Header';
import Hero from '../components/Hero';
import FeaturedContracts from '../components/FeaturedContracts';
import WhySection from '../components/WhySection';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <div className="font-inter">
      <Header />
      <main>
        <Hero />
        <FeaturedContracts />
        <WhySection />
      </main>
      <Footer />
    </div>
  );
}