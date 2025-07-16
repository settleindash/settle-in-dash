// src/components/WalletModal.jsx
import { useWallet } from "../context/WalletContext";

const WalletModal = ({ isOpen, onClose }) => {
  const { connectWallet } = useWallet();

  if (!isOpen) return null;

  console.log("WalletModal: Opened");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
        <h2 className="text-xl font-semibold mb-4">Connect Wallet</h2>
        <p className="text-gray-600 mb-4">Please select a wallet to continue.</p>
        <select
          className="border p-2 rounded w-full mb-4"
          onChange={(e) => {
            console.log("WalletModal: Connecting wallet:", e.target.value);
            connectWallet(e.target.value);
            onClose();
          }}
          aria-label="Select Wallet"
        >
          <option value="">Select Wallet</option>
          <option value="0xMockCreator">Creator Wallet</option>
          <option value="0xMockAccepter">Accepter Wallet</option>
        </select>
        <button
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          onClick={() => {
            console.log("WalletModal: Closed");
            onClose();
          }}
          aria-label="Close Modal"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default WalletModal;