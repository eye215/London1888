import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUp, CalendarDays, Clock3, Heart, MapPin, Menu, MessageSquareText, Share2, Ticket, X } from 'lucide-react';
import { cast } from '../data/show';
import { supabase } from '../lib/supabase';

type PublicMessage = {
  id: string;
  actor_name: string | null;
  message: string;
  author_display: string | null;
  source: 'reservation' | 'supporter';
  created_at: string;
};

const FIRST_SHOW_DATE = new Date('2026-07-25T13:00:00+09:00');
const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`.replace(/\/+/g, '/');

const go = (hash: string) => {
  if (window.location.hash === hash) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  window.location.hash = hash;
};

export default function HomePage() {
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [visibleMessageCount, setVisibleMessageCount] = useState(5);
  const [showTopButton, setShowTopButton] = useState(false);
  const [toast, setToast] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const dDay = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const target = new Date(FIRST_SHOW_DATE.getFullYear(), FIRST_SHOW_DATE.getMonth(), FIRST_SHOW_DATE.getDate()).getTime();
    const diff = Math.ceil((target - start) / 86400000);
    if (diff > 0) return `D-${diff}`;
    if (diff === 0) return 'D-DAY';
    return '공연 종료';
  }, []);

  const loadMessages = useCallback(async (attempt = 1) => {
    const { data, error } = await supabase
      .from('public_messages')
      .select('id, actor_name, message, author_display, source, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error(error);
      if (attempt < 2) window.setTimeout(() => void loadMessages(attempt + 1), 700);
      return;
    }
    setMessages((data || []) as PublicMessage[]);
  }, []);

  useEffect(() => {
    const savedToast = localStorage.getItem('toastMessage');
    if (savedToast) {
      setToast(savedToast);
      localStorage.removeItem('toastMessage');
      window.setTimeout(() => setToast(''), 3600);
    }
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const onScroll = () => setShowTopButton(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: '1888, 런던의 밤', url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setToast('링크를 복사했어요.');
        window.setTimeout(() => setToast(''), 2600);
      }
    } catch {
      // 공유 취소
    }
  };

  const menuGo = (hash: string) => {
    setMenuOpen(false);
    go(hash);
  };

  const displayedMessages = messages.slice(0, visibleMessageCount);
  const canViewMore = visibleMessageCount < messages.length;

  return (
    <main className="site-shell">
      {toast && <div className="toast">{toast}</div>}

      <button className="hamburger-button" type="button" onClick={() => setMenuOpen(true)} aria-label="전체 메뉴 열기">
        <Menu size={22} />
      </button>

      {menuOpen && (
        <div className="global-menu-layer" role="dialog" aria-modal="true" aria-label="전체 메뉴">
          <button className="global-menu-close" type="button" onClick={() => setMenuOpen(false)} aria-label="전체 메뉴 닫기"><X size={24} /></button>
          <nav className="global-menu-nav">
            <div className="global-menu-primary">
              <button type="button" onClick={() => menuGo('#/booking')}>예매하기</button>
              <button type="button" onClick={() => menuGo('#/reservation-check')}>예매내역확인</button>
              <button type="button" onClick={() => menuGo('#/support')}>미관람자 응원메시지 남기기</button>
              <button type="button" onClick={() => menuGo('#/review-check')}>공연후기</button>
            </div>
            <button className="global-menu-bottom" type="button" onClick={() => menuGo('#/manage')}>갑자기 일정이 변경되셨나요?</button>
          </nav>
        </div>
      )}

      <header className="hero poster-hero compact-hero">
        <div className="poster-stage" aria-label="1888, 런던의 밤 공연 포스터">
          <img className="poster-layer poster-background" src={asset('assets/jack-main.jpg')} alt="붉은 심장과 장미가 있는 공연 포스터" />
          <img className="poster-layer poster-dagger" src={asset('assets/falling-dagger.png')} alt="" aria-hidden="true" />
          <img className="poster-layer poster-title" src={asset('assets/show-title.png')} alt="1888, 런던의 밤" />
        </div>
        <div className="hero-actions hero-date-only">
          <strong className="hero-dday">{dDay}</strong>
          <p><span className="hero-date-range">07.25 SAT — 07.26 SUN</span><span className="hero-time-range">1PM / 4PM</span></p>
        </div>
        <div className="scroll-cue">SCROLL <span /></div>
      </header>

      <section className="section intro">
        <div>
          <p className="section-no">01 · THE STORY</p>
          <h2>멈춰 있던 밤,<br /><em>진실은 다시 심장을 뛴다.</em></h2>
        </div>
        <p className="body-copy">
          1888년 런던. 붉은 안개가 내려앉은 밤, 서로 다른 이유로 모인 사람들이 하나의 선택 앞에 선다.
          빛과 그림자, 침묵과 고백이 교차하는 시간 속에서 당신은 밤이 어느 쪽으로 기울지 목격하게 된다.
        </p>
      </section>

      <section className="info-strip">
        <div><CalendarDays /><span>DATES<strong>2026. 07. 25 — 07. 26</strong></span></div>
        <div><Clock3 /><span>TIME<strong>13:00 / 16:00</strong></span></div>
        <div><MapPin /><span>VENUE<strong>공연장 추후 안내</strong></span></div>
      </section>

      <section className="section program-section">
        <div className="section-heading">
          <p className="section-no">02 · PROGRAM</p>
          <h2>공연 일정과 캐스트</h2>
        </div>

        <div className="cast-list cast-schedule-list">
          {([
            { type: 'A' as const, dates: ['07.25 SAT · 1PM', '07.26 SUN · 4PM'] },
            { type: 'B' as const, dates: ['07.25 SAT · 4PM', '07.26 SUN · 1PM'] },
          ]).map(({ type, dates }) => (
            <div className="cast-row cast-schedule-row" key={type}>
              <div className="cast-session-block" aria-label={`CAST ${type} 공연 일정`}>
                <span className="cast-date-heading">CAST {type}</span>
                <div className="cast-schedule-chips">
                  {dates.map(date => <span className="cast-schedule-chip" key={date}>{date}</span>)}
                </div>
              </div>
              <div className="cast-members">
                <h3>{[...cast[type].main, '흥섭'].join(' · ')}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section message-section">
        <div className="section-heading">
          <p className="section-no">03 · MESSAGES</p>
          <h2>응원의 마음</h2>
          <p className="message-intro">예매자와 관객의 마음을 함께 담아두는 공간입니다.</p>
        </div>

        <div className="message-actions">
          <button type="button" className="primary soft-primary" onClick={() => go('#/booking')}>예매하여 메시지 남기기</button>
          <button type="button" className="text-link-button" onClick={() => go('#/support')}>관람이 어려우신가요? 응원만 남겨주세요</button>
        </div>

        {messages.length > 0 ? (
          <>
            <div className="message-grid">
              {displayedMessages.map(item => (
                <article className="message-card" key={item.id}>
                  <div>
                    <Heart size={15} />
                    <span>{item.actor_name ? `TO. ${item.actor_name}` : 'TO. 1888'}</span>
                  </div>
                  <p>{item.message}</p>
                  <footer>
                    <small>from, {item.author_display || '익명'}</small>
                    <time>{new Date(item.created_at).toLocaleDateString('ko-KR')}</time>
                  </footer>
                </article>
              ))}
            </div>
            {canViewMore && <button className="view-more-button" onClick={() => setVisibleMessageCount(count => count + 5)}>View more +</button>}
          </>
        ) : (
          <div className="message-empty">
            <Heart size={20} />
            <p>아직 등록된 응원 메시지가 없습니다. 첫 마음을 남겨주세요.</p>
          </div>
        )}
      </section>

      <footer className="site-footer">
        <div>
          <span className="footer-title">1888</span>
          <p>런던의 밤이 당신을 기다립니다.</p>
        </div>
        <div className="footer-actions">
          <a href="#/manage">갑자기 일정이 변경되셨나요?</a>
          <a href="#/reservation-check">예매내역확인</a>
          <a href="#/admin">ADMIN</a>
        </div>
      </footer>

      <div className="mobile-book">
        <button type="button" onClick={share} aria-label="공유하기"><Share2 /></button>
        <button type="button" className="review-entry-button" onClick={() => go('#/review-check')}><MessageSquareText size={17} /> 공연후기</button>
        <button type="button" className="primary" onClick={() => go('#/booking')}><Ticket size={18} /> 예매하기</button>
      </div>

      <button className={showTopButton ? 'quick-top-button visible' : 'quick-top-button'} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="최상단으로 이동">
        <ArrowUp size={18} />
      </button>
    </main>
  );
}
