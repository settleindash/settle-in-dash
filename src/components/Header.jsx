import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="fixed top-0 w-full bg-primary text-white shadow-md z-10">
      <div className="max-w-7xl mx-auto px-4 py-2 flex justify-between items-center">
        <img src="/src/assets/logo.webp" alt="Settle In DASH Logo" className="h-12" />
        <nav className="hidden md:flex space-x-4">
          <Link to="/" className="hover:underline">Home</Link>
          <Link to="/marketplace" className="hover:underline">Marketplace</Link>
          <Link to="/about" className="hover:underline">About</Link>
          <Link to="/support" className="hover:underline">Support</Link>
        </nav>
        <div className="md:hidden">
          <button onClick={() => setIsOpen(!isOpen)} className="text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
        <select className="bg-secondary text-white px-4 py-2 rounded hidden md:block" onChange={(e) => alert(`Connected to ${e.target.value}`)}>
          <option value="">Connect Wallet</option>
          <option value="0xMockCreator">Creator Wallet</option>
          <option value="0xMockAccepter">Accepter Wallet</option>
        </select>
      </div>
      {isOpen && (
        <nav className="md:hidden bg-primary text-white">
          <div className="flex flex-col space-y-2 px-4 py-2">
            <Link to="/" className="hover:underline" onClick={() => setIsOpen(false)}>Home</Link>
            <Link to="/marketplace" className="hover:underline" onClick={() => setIsOpen(false)}>Marketplace</Link>
            <Link to="/about" className="hover:underline" onClick={() => setIsOpen(false)}>About</Link>
            <Link to="/support" className="hover:underline" onClick={() => setIsOpen(false)}>Support</Link>
            <select className="bg-secondary text-white px-4 py-2 rounded" onChange={(e) => { alert(`Connected to ${e.target.value}`); setIsOpen(false); }}>
              <option value="">Connect Wallet</option>
              <option value="0xMockCreator">Creator Wallet</option>
              <option value="0xMockAccepter">Accepter Wallet</option>
            </select>
          </div>
        </nav>
      )}
    </header>
  );
}