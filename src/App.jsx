// src/App.jsx
// Main app component with routing and a taller sticky footer.
// Uses min-h-[100dvh] to ensure footer stays at the bottom.

import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import Marketplace from "./pages/Marketplace";
import Transparency from "./pages/Transparency";
import About from "./pages/About";
import Support from "./pages/Support";
import CreateContract from "./components/CreateContract";
import Contract from "./pages/Contract";

const App = () => {
  console.log("App: Rendering");
  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <Header />
      <main className="flex-grow flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/transparency" element={<Transparency />} />
          <Route path="/about" element={<About />} />
          <Route path="/support" element={<Support />} />
          <Route path="/create" element={<CreateContract />} />
          <Route path="/contract/:id" element={<Contract />} />
        </Routes>
      </main>
      <footer className="bg-primary text-white py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4">
          <p className="font-inter text-sm sm:text-base">Settle In DASH</p>
          <p className="font-inter text-sm sm:text-base">Contact: frederik500@msn.com</p>
          <a href="https://x.com" className="font-inter text-sm sm:text-base hover:underline">
            X Link
          </a>
        </div>
      </footer>
    </div>
  );
};

export default App;