export default function WhySection() {
  return (
    <section className="py-12 bg-background">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-semibold font-inter text-primary mb-6">Why Settle In DASH?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-primary">Decentralized</h3>
            <p className="text-gray-600">No intermediaries, fully powered by DASH blockchain.</p>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-primary">Anonymous</h3>
            <p className="text-gray-600">Interact using only your DASH wallet address.</p>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-primary">Transparent</h3>
            <p className="text-gray-600">All Twist resolutions publicly verifiable on IPFS.</p>
          </div>
        </div>
      </div>
    </section>
  );
}