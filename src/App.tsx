import { Navigate, Route, Routes } from 'react-router';
import { Home } from './routes/Home.tsx';
import { NodeRoute } from './routes/NodeRoute.tsx';
import { About } from './routes/About.tsx';
import { Review } from './routes/Review.tsx';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/q/:nodeId" element={<NodeRoute kind="question" />} />
      <Route path="/outcome/:nodeId" element={<NodeRoute kind="outcome" />} />
      <Route path="/about" element={<About />} />
      <Route path="/review" element={<Review />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
