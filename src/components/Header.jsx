// src/components/Header.jsx
// This component renders the header with a logo and navigation links.
// Wallet functionality is removed as email is now used to identify users in the useContracts hook.

import { Link } from "react-router-dom"; // Import Link for navigation between pages.

// Header component: Displays the site logo and navigation menu.
const Header = () => {
  // No wallet context is needed since email identifies users.
  console.log("Header: Rendering header component"); // Log for debugging (visible in browser Console, F12 in VSC).

  return (
    // Header section with primary background color and padding.
    <header className="bg-primary text-white p-4">
      {/* Container to align logo and navigation with max width */}
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        {/* Logo image for Settle In DASH */}
        <img
          src="src/assets/logo.jpg" // Assumes logo.jpg is in the src/assets folder.
          alt="Settle In DASH"
          className="h-[50px] w-[200px]" // Fixed height and width for logo.
        />
        {/* Navigation menu with links to different pages */}
        <nav className="flex gap-4">
          {/* Link to Home page */}
          <Link to="/" className="hover:underline">
            Home
          </Link>
           {/* Link to Create contract page */}
          <Link to="/create" className="hover:underline">
            Create Contract
          </Link>
          {/* Link to Marketplace page */}
          <Link to="/marketplace" className="hover:underline">
            Marketplace
          </Link>
          {/* Link to Transparency page */}
          <Link to="/transparency" className="hover:underline">
            Transparency
          </Link>
           {/* Link to Support page */}
          <Link to="/support" className="hover:underline">
            Support
          </Link>
          {/* Link to About page */}
          <Link to="/about" className="hover:underline">
            About
          </Link>
        </nav>
      </div>
    </header>
  );
};

// Export the Header component as default.
export default Header;