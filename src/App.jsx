// src/App.jsx
// Main app component with routing and conditional footers shown only on the home page.

import { Routes, Route, useLocation, NavLink } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import Marketplace from "./pages/Marketplace";
import Transparency from "./pages/Transparency";
import About from "./pages/About";
import Support from "./pages/Support";
import CreateEvent from "./components/CreateEvent";
import CreateContract from "./components/CreateContract";
import Contract from "./pages/Contract";
import Settle from "./pages/Settle";
import OrderBook from "./components/OrderBook";
import TermsAndConditions from "./pages/TermsAndConditions";

const AppContent = () => {
  const location = useLocation();
  const showFooters = location.pathname === "/";

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <Header />
      <main className="flex-grow flex flex-col">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/settle" element={<Settle />} />
          <Route path="/transparency" element={<Transparency />} />
          <Route path="/about" element={<About />} />
          <Route path="/support" element={<Support />} />
          <Route path="/create-event" element={<CreateEvent />} />
          <Route path="/create-contract" element={<CreateContract />} />
          <Route path="/contract/:contract_id" element={<Contract />} />
          <Route path="/order-book" element={<OrderBook />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="*" element={<div className="p-4 text-center">404: Page Not Found</div>} />
        </Routes>
      </main>
      {showFooters && (
        <>
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

const App = () => {
  return (
    <Routes>
      <Route path="/*" element={<AppContent />} />
    </Routes>
  );
};

export default App;