import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import CreateContract from './components/CreateContract';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/marketplace" element={<div>Marketplace (TBD)</div>} />
        <Route path="/about" element={<div>About (TBD)</div>} />
        <Route path="/support" element={<div>Support (TBD)</div>} />
        <Route path="/create" element={<CreateContract />} />
      </Routes>
    </Router>
  );
}