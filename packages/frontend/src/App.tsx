import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { CanvasGallery } from './pages/CanvasGallery';
import { CategoryPage } from './pages/CategoryPage';
import { EndpointPage } from './pages/EndpointPage';
import { EndpointsPage } from './pages/EndpointsPage';
import { GuidePage } from './pages/GuidePage';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="endpoints" element={<EndpointsPage />} />
          <Route path="c/:slug" element={<CategoryPage />} />
          <Route path="canvas" element={<CanvasGallery />} />
          <Route path="e/:id" element={<EndpointPage />} />
          <Route path="docs" element={<GuidePage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
