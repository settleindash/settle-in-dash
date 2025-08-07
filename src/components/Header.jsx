// src/components/Header.jsx
// This component renders the header with a logo and navigation links.
// Wallet functionality is removed as email is now used to identify users in the useContracts hook.

import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    console.log("Header: Hamburger menu toggled:", !isOpen);
  };

  console.log("Header: Rendering header component");

  return (
    <header className="bg-primary text-white p-4">
      <div className="flex justify-center items-center max-w-7xl mx-auto gap-4">
        {/* Logo image for Settle In DASH */}
        <Link to="/" aria-label="Settle In DASH Home">
          <img
            src="/src/assets/logo.png"
            alt="Settle In DASH"
            className="h-[50px] w-[50px]"
          />
        </Link>
        {/* Hamburger Icon for Mobile */}
        <button
          className="sm:hidden flex flex-col gap-1.5 w-8 h-8 justify-center items-center"
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
        >
          <span className="w-full h-0.5 bg-white"></span>
          <span className="w-full h-0.5 bg-white"></span>
          <span className="w-full h-0.5 bg-white"></span>
        </button>
        {/* Desktop Navigation */}
        <nav className="hidden sm:flex gap-4">
          <NavLink
            to="/"
            className={({ isActive }) => `text-base hover:underline ${isActive ? "font-bold" : ""}`}
            aria-label="Home"
          >
            Home
          </NavLink>
          <NavLink
            to="/create-event"
            className={({ isActive }) => `text-base hover:underline ${isActive ? "font-bold" : ""}`}
            aria-label="Create Event"
          >
            Create Event
          </NavLink>
          <NavLink
            to="/marketplace"
            className={({ isActive }) => `text-base hover:underline ${isActive ? "font-bold" : ""}`}
            aria-label="Marketplace"
          >
            Marketplace
          </NavLink>
          <NavLink
            to="/settle"
            className={({ isActive }) => `text-base hover:underline ${isActive ? "font-bold" : ""}`}
            aria-label="Settle Contracts"
          >
            Settle
          </NavLink>
          <NavLink
            to="/transparency"
            className={({ isActive }) => `text-base hover:underline ${isActive ? "font-bold" : ""}`}
            aria-label="Transparency"
          >
            Transparency
          </NavLink>
          <NavLink
            to="/support"
            className={({ isActive }) => `text-base hover:underline ${isActive ? "font-bold" : ""}`}
            aria-label="Support"
          >
            Support
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) => `text-base hover:underline ${isActive ? "font-bold" : ""}`}
            aria-label="About"
          >
            About
          </NavLink>
        </nav>
      </div>
      {/* Mobile Navigation (Dropdown) */}
      {isOpen && (
        <nav className="sm:hidden mt-4 flex flex-col gap-2">
          <NavLink
            to="/"
            className={({ isActive }) => `text-base hover:underline ${isActive ? "font-bold" : ""}`}
            onClick={() => setIsOpen(false)}
            aria-label="Home"
          >
            Home
          </NavLink>
          <NavLink
            to="/create-event"
            className={({ isActive }) => `text-base hover:underline ${isActive ? "font-bold" : ""}`}
            onClick={() => setIsOpen(false)}
            aria-label="Create Event"
          >
            Create Event
          </NavLink>
          <NavLink
            to="/marketplace"
            className={({ isActive }) => `text-base hover:underline ${isActive ? "font-bold" : ""}`}
            onClick={() => setIsOpen(false)}
            aria-label="Marketplace"
          >
            Marketplace
          </NavLink>
          <NavLink
            to="/settle"
            className={({ isActive }) => `text-base hover:underline ${isActive ? "font-bold" : ""}`}
            onClick={() => setIsOpen(false)}
            aria-label="Settle Contracts"
          >
            Settle
          </NavLink>
          <NavLink
            to="/transparency"
            className={({ isActive }) => `text-base hover:underline ${isActive ? "font-bold" : ""}`}
            onClick={() => setIsOpen(false)}
            aria-label="Transparency"
          >
            Transparency
          </NavLink>
          <NavLink
            to="/support"
            className={({ isActive }) => `text-base hover:underline ${isActive ? "font-bold" : ""}`}
            onClick={() => setIsOpen(false)}
            aria-label="Support"
          >
            Support
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) => `text-base hover:underline ${isActive ? "font-bold" : ""}`}
            onClick={() => setIsOpen(false)}
            aria-label="About"
          >
            About
          </NavLink>
        </nav>
      )}
    </header>
  );
};

export default Header;