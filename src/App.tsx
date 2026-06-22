import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import AdminPage from './pages/AdminPage';
import ManageReservationPage from './pages/ManageReservationPage';
import SupportMessagePage from './pages/SupportMessagePage';

type Page = 'home' | 'booking' | 'admin' | 'manage' | 'support';

export default function App() {
  const [page, setPage] = useState<Page>('home');

  useEffect(() => {
    const route = () => {
      const hash = window.location.hash;
      if (hash === '#/booking') setPage('booking');
      else if (hash === '#/admin') setPage('admin');
      else if (hash === '#/manage') setPage('manage');
      else if (hash === '#/support') setPage('support');
      else setPage('home');
      window.scrollTo(0, 0);
    };

    route();
    window.addEventListener('hashchange', route);
    return () => window.removeEventListener('hashchange', route);
  }, []);

  if (page === 'booking') return <BookingPage />;
  if (page === 'admin') return <AdminPage />;
  if (page === 'manage') return <ManageReservationPage />;
  if (page === 'support') return <SupportMessagePage />;
  return <HomePage />;
}
