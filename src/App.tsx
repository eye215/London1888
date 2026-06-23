import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import AdminPage from './pages/AdminPage';
import ManageReservationPage from './pages/ManageReservationPage';
import SupportMessagePage from './pages/SupportMessagePage';
import ReviewCheckPage from './pages/ReviewCheckPage';
import ReviewPage from './pages/ReviewPage';
import AdminReviewsPage from './pages/AdminReviewsPage';
import ReservationCheckPage from './pages/ReservationCheckPage';

type Page = 'home' | 'booking' | 'admin' | 'manage' | 'support' | 'review-check' | 'review' | 'admin-reviews' | 'reservation-check';

export default function App() {
  const [page, setPage] = useState<Page>('home');

  useEffect(() => {
    const route = () => {
      const hash = window.location.hash;
      if (hash === '#/booking') setPage('booking');
      else if (hash === '#/admin') setPage('admin');
      else if (hash === '#/manage') setPage('manage');
      else if (hash === '#/support') setPage('support');
      else if (hash === '#/reservation-check') setPage('reservation-check');
      else if (hash === '#/review-check') setPage('review-check');
      else if (hash === '#/review') setPage('review');
      else if (hash === '#/admin/reviews') setPage('admin-reviews');
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
  if (page === 'reservation-check') return <ReservationCheckPage />;
  if (page === 'review-check') return <ReviewCheckPage />;
  if (page === 'review') return <ReviewPage />;
  if (page === 'admin-reviews') return <AdminReviewsPage />;
  return <HomePage />;
}
