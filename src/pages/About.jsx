// src/pages/About.jsx
import { Link } from "react-router-dom";

const About = () => (
  <div className="min-h-screen bg-gray-100 p-4">
    <main className="max-w-3xl mx-auto mt-6">
      <h2 className="text-2xl font-semibold text-blue-800 mb-4">Our Vision</h2>
      <p className="text-gray-600 text-base mb-6">
        At Settle In DASH, we envision a world where anyone can predict and bet on future events with complete trust, privacy, and freedom. By harnessing the power of the DASH blockchain, we aim to redefine prediction markets, making them fully decentralized, transparent, and accessible to all.
      </p>

      <h2 className="text-2xl font-semibold text-blue-800 mb-4">Our Mission</h2>
      <p className="text-gray-600 text-base mb-6">
        Settle In DASH is a decentralized prediction marketplace built on the DASH blockchain, empowering users to create and accept contracts on real-world outcomes—such as politics, sports, or finance—without intermediaries. Our mission is to provide a trustless, anonymous platform where users interact solely through DASH wallet addresses, leveraging smart contracts for secure, transparent settlements and an AI-driven oracle (Grok) for fair dispute resolution. We prioritize simplicity, fairness, and user control, ensuring a seamless experience for all.
      </p>

      <h2 className="text-2xl font-semibold text-blue-800 mb-4">Why DASH?</h2>
      <p className="text-gray-600 text-base mb-4">
        Settle In DASH is built on the DASH blockchain for its unmatched advantages in speed, cost, scalability, and innovation. Unlike centralized platforms like Polymarket or slower blockchains like Bitcoin, DASH delivers:
      </p>
      <ul className="list-disc list-inside text-gray-600 text-base mb-6 space-y-2">
        <li>
          <strong>Lightning-Fast Transactions</strong>: DASH’s InstantSend enables confirmations in 1-2 seconds, compared to Bitcoin’s 10-60 minutes, ensuring quick contract creation and settlement.
        </li>
        <li>
          <strong>Low-Cost Fees</strong>: With median transaction fees of $0.0002-$0.001, DASH is ideal for microtransactions, unlike Bitcoin’s $1-$5 fees during peak times.
        </li>
        <li>
          <strong>Scalability</strong>: DASH’s two-tier network with masternodes supports up to 56 transactions per second, far surpassing Bitcoin’s 7 TPS, making it ready for global adoption.
        </li>
        <li>
          <strong>Decentralized Governance</strong>: DASH allocates 10% of block rewards to fund development, enabling rapid innovation through community voting, unlike Bitcoin’s slow consensus model.
        </li>
        <li>
          <strong>Privacy</strong>: DASH’s PrivateSend offers optional anonymity via coin mixing, balancing user privacy and efficiency, while Bitcoin’s transparent blockchain requires costly external mixers.
        </li>
        <li>
          <strong>Future-Ready Roadmap</strong>: DASH’s 2025-2026 platform rollout will enable decentralized applications (dApps) like Settle In DASH, with plans for 100+ TPS and merchant adoption in emerging markets.
        </li>
      </ul>
      <p className="text-gray-600 text-base mb-6">
        By choosing DASH, Settle In DASH ensures a fast, affordable, and scalable platform that empowers users to bet on the future with confidence, free from the limitations of centralized systems or outdated blockchains.
      </p>

      <h2 className="text-2xl font-semibold text-blue-800 mb-4">Join Our Team</h2>
      <p className="text-gray-600 text-base mb-6">
        Are you passionate about blockchain and prediction markets? Join our team at Settle In DASH to help expand the possibilities for all DASH users! We’re looking for innovative, collaborative individuals who want to build a decentralized future while having fun. Whether you’re a developer, designer, or community advocate, let’s create something extraordinary together. Reach out to us at{" "}
        <a
          href="mailto:hello@SettleInDASH.com"
          className="text-blue-500 hover:underline"
          aria-label="Email to join the team"
        >
          hello@SettleInDASH.com
        </a>{" "}
        to explore opportunities.
      </p>

      <div className="mt-6">
        <Link
          to="/marketplace"
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 min-h-[48px] text-sm"
          aria-label="Back to Marketplace"
        >
          Back to Marketplace
        </Link>
      </div>
    </main>
  </div>
);

export default About;