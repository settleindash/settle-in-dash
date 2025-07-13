import { useState } from 'react';

export default function CreateContract() {
  const [question, setQuestion] = useState('');
  const [stake, setStake] = useState('');
  const [oddsYes, setOddsYes] = useState('');
  const [oddsNo, setOddsNo] = useState('');
  const [category, setCategory] = useState('Crypto');
  const [terminationDate, setTerminationDate] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Contract created: ${question}, Stake: ${stake} DASH, Odds: Yes ${oddsYes}, No ${oddsNo}, Category: ${category}, Ends: ${terminationDate}`);
    // TODO: Integrer med DASH blockchain
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-4 bg-white shadow rounded">
      <h2 className="text-xl font-semibold font-inter text-primary mb-4">Create a New Contract</h2>
      <div className="mb-4">
        <label className="block text-gray-700">Question</label>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Will Bitcoin exceed $100,000?"
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700">Stake (DASH)</label>
        <input
          type="number"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="10"
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700">Odds (Yes)</label>
        <input
          type="number"
          step="0.1"
          value={oddsYes}
          onChange={(e) => setOddsYes(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="1.8"
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700">Odds (No)</label>
        <input
          type="number"
          step="0.1"
          value={oddsNo}
          onChange={(e) => setOddsNo(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="2.2"
          required
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full p-2 border rounded"
        >
          <option value="Crypto">Crypto</option>
          <option value="Sports">Sports</option>
          <option value="Politics">Politics</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-gray-700">Termination Date</label>
        <input
          type="date"
          value={terminationDate}
          onChange={(e) => setTerminationDate(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
      </div>
      <button type="submit" className="bg-primary text-white px-6 py-2 rounded">Create Contract</button>
    </form>
  );
}