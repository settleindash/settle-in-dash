// src/pages/About.jsx
import { Link } from "react-router-dom";

const About = () => (
  <div className="min-h-screen bg-background p-4">
    <main className="max-w-3xl mx-auto mt-6">
      <h2 className="text-xl font-semibold mb-4">Our Mission</h2>
      <p className="text-gray-600">
        Settle In DASH is a decentralized prediction marketplace built on the DASH blockchain. We aim to provide a trustless, anonymous platform for users to bet on real-world outcomes, leveraging smart contracts for transparency and fairness.
      </p>
      <h2 className="text-xl font-semibold mt-6 mb-4">About the Founder</h2>
      <p className="text-gray-600">
        Founded by  a passionate developer committed to advancing decentralized technologies. Contact: 
      </p>
      <div className="mt-6">
        <Link
          to="/marketplace"
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          aria-label="Back to Marketplace"
        >
          Back to Marketplace
        </Link>
      </div>
    </main>
  </div>
);

export default About;