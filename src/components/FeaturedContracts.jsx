import contracts from '../mocks/contracts.json';

export default function FeaturedContracts() {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-semibold font-inter text-primary mb-6">Featured Contracts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {contracts.map((contract) => (
            <div key={contract.id} className="border rounded-lg p-4 bg-white shadow hover:shadow-lg transition-shadow">
              <span className="text-primary font-bold mr-2">[C]</span>
              <h3 className="text-lg font-semibold">{contract.question}</h3>
              <p className="text-gray-600">Stake: {contract.stake} DASH</p>
              <p className="text-gray-600">Odds: Yes {contract.odds.yes} | No {contract.odds.no}</p>
              <button className="mt-2 bg-primary text-white px-4 py-2 rounded">View</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}