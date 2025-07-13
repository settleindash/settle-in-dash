import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <section className="bg-gray-100 py-16 text-center">
      <h1 className="text-4xl font-bold font-inter text-primary mb-4">Welcome to Settle In DASH</h1>
      <p className="text-lg text-gray-600 mb-6">Bet on the Future with DASH</p>
      <div className="space-x-4">
        <Link to="/create" className="bg-secondary text-white px-6 py-3 rounded text-lg font-inter">Create Contract</Link>
        <button className="bg-primary text-white px-6 py-3 rounded text-lg font-inter">Explore Marketplace</button>
      </div>
    </section>
  );
}