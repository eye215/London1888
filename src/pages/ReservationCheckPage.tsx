import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ImageDown, Search, Share2 } from 'lucide-react';
import { getScheduleLabel } from '../data/show';
import { isDatabaseConfigured, supabase } from '../lib/supabase';

type FoundReservation = {
  id: string;
  num_people: number;
  schedule: string;
  actor_name: string;
  created_at: string;
};

const formatPhone = (value: string) => {
  const n = value.replace(/\D/g, '').slice(0, 11);
  return n.length <= 3 ? n : n.length <= 7 ? `${n.slice(0, 3)}-${n.slice(3)}` : `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7)}`;
};

export default function ReservationCheckPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [reservation, setReservation] = useState<FoundReservation | null>(null);
  const [status, setStatus] = useState('');
  const [working, setWorking] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }), []);

  const findReservation = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus('');
    setReservation(null);

    if (!name.trim() || !/^010-\d{4}-\d{4}$/.test(phone)) {
      setStatus('예매 시 입력한 실명과 전화번호를 정확히 입력해주세요.');
      return;
    }
    if (!isDatabaseConfigured) {
      setStatus('데이터베이스 연결 정보를 확인해주세요.');
      return;
    }

    setWorking(true);
    const { data, error } = await supabase.rpc('find_reservation_by_contact', { p_name: name.trim(), p_phone: phone });
    setWorking(false);

    if (error) {
      console.error(error);
      setStatus('예매 내역을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    const found = Array.isArray(data) ? data[0] : null;
    if (!found) {
      setStatus('일치하는 예매 내역이 없습니다.');
      return;
    }

    setReservation(found as FoundReservation);
  };

  const createShareImage = async () => {
    if (!reservation) return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#080707';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1b0d10';
    ctx.fillRect(70, 70, 940, 1210);
    ctx.strokeStyle = '#7f1c25';
    ctx.lineWidth = 4;
    ctx.strokeRect(70, 70, 940, 1210);

    ctx.fillStyle = '#b71926';
    ctx.font = '38px serif';
    ctx.fillText('1888, 런던의 밤', 120, 165);
    ctx.fillStyle = '#fff8f2';
    ctx.font = '76px serif';
    ctx.fillText('예매 확인', 120, 275);

    const rows = [
      ['예매자', name.trim()],
      ['관람 회차', getScheduleLabel(reservation.schedule)],
      ['관람 인원', `${reservation.num_people}명`],
      ['응원 배우', reservation.actor_name],
    ];

    ctx.font = '34px sans-serif';
    rows.forEach(([label, value], index) => {
      const y = 430 + index * 150;
      ctx.fillStyle = '#9f918a';
      ctx.fillText(label, 120, y);
      ctx.fillStyle = '#fff8f2';
      wrapCanvasText(ctx, value, 120, y + 55, 820, 46);
    });

    ctx.fillStyle = '#756a64';
    ctx.font = '28px sans-serif';
    ctx.fillText('2026.07.25 — 07.26 · 1PM / 4PM', 120, 1190);

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    return blob;
  };

  const shareImage = async () => {
    if (!reservation) return;
    const blob = await createShareImage();
    if (!blob) return setStatus('공유 이미지를 만들지 못했습니다.');
    const file = new File([blob], '1888-reservation.png', { type: 'image/png' });

    try {
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ title: '1888 예매 확인', files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '1888-reservation.png';
        a.click();
        URL.revokeObjectURL(url);
        setStatus('이미지를 저장했어요. 저장된 이미지를 공유해주세요.');
      }
    } catch {
      setStatus('이미지 공유가 취소되었습니다.');
    }
  };

  return (
    <main className="utility-page reservation-check-page">
      <header className="booking-header">
        <button className="text-button" onClick={() => window.location.hash = '#/'}><ArrowLeft size={18} /> 돌아가기</button>
        <span>1888 · RESERVATION CHECK</span>
      </header>

      <section className="utility-hero">
        <p>YOUR RESERVATION</p>
        <h1>예매 내역을<br />확인하세요</h1>
        <span>예매 시 입력한 실명과 휴대전화번호로 예매 정보를 확인할 수 있습니다.</span>
      </section>

      <section className="utility-card">
        {!reservation && (
          <form onSubmit={findReservation} className="lookup-form">
            <label className="field"><span className="field-label">예매자 실명</span><input value={name} onChange={event => setName(event.target.value)} placeholder="실명을 입력해주세요" /></label>
            <label className="field"><span className="field-label">전화번호</span><input inputMode="numeric" value={phone} onChange={event => setPhone(formatPhone(event.target.value))} placeholder="010-0000-0000" /></label>
            <button className="submit-button" disabled={working}><Search size={18} /> {working ? '예매 확인 중' : '예매확인하기'}</button>
          </form>
        )}

        {status && <p className="status-message">{status}</p>}

        {reservation && (
          <div className="reservation-confirm-card" ref={cardRef}>
            <span>RESERVATION CONFIRMED</span>
            <h2>{name.trim()}님의 예매</h2>
            <dl>
              <div><dt>관람 회차</dt><dd>{getScheduleLabel(reservation.schedule)}</dd></div>
              <div><dt>관람 인원</dt><dd>{reservation.num_people}명</dd></div>
              <div><dt>응원 배우</dt><dd>{reservation.actor_name}</dd></div>
              <div><dt>예매일</dt><dd>{new Date(reservation.created_at).toLocaleString('ko-KR')}</dd></div>
            </dl>
            <button type="button" className="share-image-button" onClick={shareImage}><Share2 size={16} /> 이미지 공유</button>
          </div>
        )}
      </section>
    </main>
  );
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}
