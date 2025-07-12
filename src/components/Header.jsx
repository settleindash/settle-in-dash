import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="fixed top-0 w-full bg-primary text-white shadow-md z-10">
      <div className="max-w-7xl mx-auto px-4 py-2 flex justify-between items-center">
        <div className="text-lg font-semibold font-inter" aria-label="Settle In DASH Logo">Settle In DASH</div>
        <nav className="flex space-x-4">
          <Link to="/" className="hover:underline">Home</Link>
          <Link to="/marketplace" className="hover:underline">Marketplace</Link>
          <Link to="/about" className="hover:underline">About</Link>
          <Link to="/support" className="hover:underline">Support</Link>
        </nav>
        <select className="bg-secondary text-white px-4 py-2 rounded" onChange={(e) => alert(`Connected to ${e.target.value}`)}>
          <option value="">Connect Wallet</option>
          <option value="0xMockCreator">Creator Wallet</option>
          <option value="0xMockAccepter">Accepter Wallet</option>
        </select>
      </div>
    </header>
  );
}