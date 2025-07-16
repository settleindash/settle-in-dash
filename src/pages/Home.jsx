// src/pages/Home.jsx
// Front page with a spacious Hero section and "Why Settle In DASH?" at the bottom.
// Ensures "Why Settle In DASH?" stays above the footer without overlapping Hero.
// Hero spacing scales dynamically (very large on desktop, smaller on mobile).

import { Link } from "react-router-dom";

const Home = () => {
  console.log("Home: Rendering");

  return (
    <div className="font-inter flex flex-col min-h-full">
      {/* Main content area, expands to fill space */}
      <main className="flex-grow flex flex-col justify-between bg-gray-100">
        {/* Hero section with spacious padding, takes flexible space */}
        <section className="flex items-center justify-center py-12 sm:py-16 md:py-20 lg:py-24 xl:py-28">
          <div className="text-center max-w-3xl mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold font-inter text-primary mb-4 sm:mb-6 md:mb-8 lg:mb-10 xl:mb-12">
              Welcome to Settle In DASH
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl text-gray-600 mb-6 sm:mb-8 md:mb-10 lg:mb-12 xl:mb-14">
              Bet on the Future with DASH
            </p>
            <div className="space-x-2 sm:space-x-4">
              <Link
                to="/create"
                className="bg-secondary text-white px-3 sm:px-4 py-2 rounded text-sm sm:text-lg font-inter"
              >
                Create Contract
              </Link>
              <Link
                to="/marketplace"
                className="bg-primary text-white px-3 sm:px-4 py-2 rounded text-sm sm:text-lg font-inter"
              >
                Explore Marketplace
              </Link>
            </div>
          </div>
        </section>
        {/* Why Settle In DASH? section pinned to the bottom */}
        <section className="py-1 sm:py-1.5 bg-blue-50">
          <div className="max-w-3xl mx-auto px-4 sm:px-8">
            <h2 className="text-base sm:text-lg font-semibold font-inter text-primary mb-1">
              Why Settle In DASH?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
              <div className="text-center">
                <h3 className="text-xs font-semibold text-primary">Decentralized</h3>
                <p className="text-gray-600 text-xs">
                  No intermediaries, fully powered by DASH blockchain.
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-xs font-semibold text-primary">Anonymous</h3>
                <p className="text-gray-600 text-xs">
                  Interact using only your email address.
                </p>
              </div>
              <div className="text-center">
                <h3 className="text-xs font-semibold text-primary">Transparent</h3>
                <p className="text-gray-600 text-xs">
                  All Twist resolutions publicly verifiable on IPFS.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;