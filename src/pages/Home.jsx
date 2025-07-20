// src/pages/Home.jsx
// Front page with a Hero section.
// Allows natural scrolling with footer content handled in App.jsx.

import { Link } from "react-router-dom";

const Home = () => {
  console.log("Home: Rendering");

  return (
    <div className="font-inter flex flex-col min-h-full">
      {/* Main content area, expands to fill available space */}
      <main className="flex-grow flex items-center justify-center bg-gray-100">
        {/* Hero section with spacious, dynamic padding */}
        <section className="text-center max-w-3xl mx-auto px-4 sm:px-8 md:px-12 lg:px-16 xl:px-24 py-12 sm:py-16 md:py-20 lg:py-24 xl:py-28">
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
        </section>
      </main>
    </div>
  );
};

export default Home;