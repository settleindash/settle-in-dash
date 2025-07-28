// src/App.jsx
// Main app component with routing and conditional footers shown only on the home page.
// Uses min-h-[100dvh] to ensure footers stay at the bottom with scrolling on home page.

import { Routes, Route, useLocation, NavLink } from "react-router-dom"; // Added NavLink
import Header from "./components/Header";
import Home from "./pages/Home";
import Marketplace from "./pages/Marketplace";
import Transparency from "./pages/Transparency";
import About from "./pages/About";
import Support from "./pages/Support";
import CreateContract from "./components/CreateContract";
import Contract from "./pages/Contract";
import Settle from "./pages/Settle";
import TermsAndConditions from "./pages/TermsAndConditions";

// Main content component with routing and conditional footers
const AppContent = () => {
  const location = useLocation();
  // Show footers only on the home page
  const showFooters = location.pathname === "/";

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      {/* Render header component */}
      <Header />
      {/* Main content area with flexible growth */}
      <main className="flex-grow flex flex-col">
        <Routes>
          {/* Home page route */}
          <Route path="/" element={<Home />} />
          {/* Marketplace page route */}
          <Route path="/marketplace" element={<Marketplace />} />
          {/* Settle page route for contract settlement */}
          <Route path="/settle" element={<Settle />} />
          {/* Transparency page route */}
          <Route path="/transparency" element={<Transparency />} />
          {/* About page route */}
          <Route path="/about" element={<About />} />
          {/* Support page route */}
          <Route path="/support" element={<Support />} />
          {/* Create contract page route */}
          <Route path="/create" element={<CreateContract />} />
          {/* Dynamic contract page route with contract_id parameter */}
          <Route path="/contract/:contract_id" element={<Contract />} />
          {/* Terms and Conditions page route */}
          <Route path="/terms" element={<TermsAndConditions />} />
        </Routes>
      </main>
      {/* Conditionally render footers on home page */}
      {showFooters && (
        <>
          {/* Upper footer: Why Settle In DASH? */}
          <footer className="bg-blue-50 py-4 sm:py-6">
            <div className="max-w-3xl mx-auto px-4 sm:px-8">
              <h2 className="text-lg sm:text-xl font-semibold font-inter text-primary mb-2 sm:mb-3">
                Why Settle In DASH?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <div className="text-center">
                  <h3 className="text-sm sm:text-base font-semibold text-primary">Decentralized</h3>
                  <p className="text-gray-600 text-sm sm:text-base">
                    No intermediaries, fully powered by DASH blockchain.
                  </p>
                </div>
                <div className="text-center">
                  <h3 className="text-sm sm:text-base font-semibold text-primary">Anonymous</h3>
                  <p className="text-gray-600 text-sm sm:text-base">
                    Interact using only your DASH wallet address.
                  </p>
                </div>
                <div className="text-center">
                  <h3 className="text-sm sm:text-base font-semibold text-primary">Peer to Peer</h3>
                  <p className="text-gray-600 text-sm sm:text-base">
                    Create or accept contracts, like making a wager with a friend.
                  </p>
                </div>
              </div>
            </div>
          </footer>
          {/* Lower footer: Contact and social links */}
          <footer className="bg-primary text-white py-4 sm:py-6">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-4">
              <NavLink
                to="/terms"
                className="font-inter text-sm sm:text-base hover:underline"
                aria-label="Terms and Conditions"
              >
                Terms and Conditions
              </NavLink>
              <p className="font-inter text-sm sm:text-base">Contact: hello@SettleInDASH.com</p>
              <a
                href="https://x.com/SettleInDASH"
                className="font-inter text-sm sm:text-base hover:underline"
                aria-label="Follow Settle In DASH on X"
              >
                Follow On X
              </a>
            </div>
          </footer>
        </>
      )}
    </div>
  );
};

// Root component with wildcard route to render AppContent
const App = () => {
  return (
    <Routes>
      <Route path="/*" element={<AppContent />} />
    </Routes>
  );
};

export default App;