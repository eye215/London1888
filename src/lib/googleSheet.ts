const SHEET_WEBAPP_URL =
  import.meta.env.VITE_GOOGLE_SHEET_WEBAPP_URL ||
  'https://script.google.com/macros/s/AKfycbxr_8J3bFftYzAjIrDkprq1hzbZjgN_4xEiekaEA-Tkhq-qzaUH-t7u_xhnxCAj_XiX/exec';

type SheetAction = 'create' | 'update' | 'delete';

export type SheetPayload = {
  action: SheetAction;
  id?: string;
  bookingNumber?: string;
  name?: string;
  phone?: string;
  numPeople?: number;
  schedule?: string;
  actorName?: string;
  message?: string;
  createdAt?: string;
};

export const syncGoogleSheet = (payload: SheetPayload) => {
  if (!SHEET_WEBAPP_URL) return;

  const body = JSON.stringify(payload);
  const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });

  if (navigator.sendBeacon?.(SHEET_WEBAPP_URL, blob)) return;

  fetch(SHEET_WEBAPP_URL, {
    method: 'POST',
    mode: 'no-cors',
    keepalive: true,
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body,
  }).catch(error => {
    console.warn('Google Sheet sync failed', error);
  });
};
