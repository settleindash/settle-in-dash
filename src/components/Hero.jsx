export default function Hero() {
  return (
    <section className="bg-background min-h-screen flex items-center justify-center">
      <div className="text-center max-w-3xl mx-auto px-4">
        <h1 className="text-4xl font-semibold font-inter text-primary">Welcome to Settle In DASH</h1>
        <p className="text-xl mt-4 text-gray-700">Bet on the Future with DASH</p>
        <div className="mt-6 flex justify-center gap-4">
          <button className="bg-secondary text-white px-6 py-3 rounded text-lg font-inter">Create Contract</button>
          <button className="bg-primary text-white px-6 py-3 rounded text-lg font-inter">Explore Marketplace</button>
        </div>
      </div>
    </section>
  );
}