import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import FeaturedContracts from './components/FeaturedContracts';
import WhySection from './components/WhySection';
import Footer from './components/Footer';
import Home from './pages/Home';
import CreateContract from './components/CreateContract';

export default function App() {
  return (
    <Router>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/marketplace" element={<div>Marketplace (TBD)</div>} />
          <Route path="/about" element={<div>About (TBD)</div>} />
          <Route path="/support" element={<div>Support (TBD)</div>} />
          <Route path="/create" element={<CreateContract />} />
        </Routes>
        <Hero />
        <FeaturedContracts />
        <WhySection />
      </main>
      <Footer />
    </Router>
  );
}