import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/marketplace" element={<div>Marketplace (TBD)</div>} />
        <Route path="/about" element={<div>About (TBD)</div>} />
        <Route path="/support" element={<div>Support (TBD)</div>} />
      </Routes>
    </Router>
  );
}