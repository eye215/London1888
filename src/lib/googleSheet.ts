const SHEET_WEBAPP_URL =
  import.meta.env.VITE_GOOGLE_SHEET_WEBAPP_URL ||
  'https://script.google.com/macros/s/AKfycbygWxhLegW-xVGypB--JrqCBIUhSZdDirh1YG_YtsgJHvNTnxMCfic-OSEl9sO4SU_5Tg/exec';

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

  fetch(SHEET_WEBAPP_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  }).catch(error => {
    console.warn('Google Sheet sync failed', error);
  });
};
