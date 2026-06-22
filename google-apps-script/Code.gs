const SPREADSHEET_ID = '1f9gfxWvypp_Pavmp-1usM4ozgvrO2Zhqc6nbKrkbT4o';
const LEGACY_SHEET_NAME = '예매내역';
const HEADERS = ['예매 ID', '예매번호', '실명', '전화번호', '인원', '공연 일정', '선택 배우', '응원 메시지', '예매일시'];
const SCHEDULE_SHEETS = Object.freeze({
  '2026-07-25 13:00': '07.25 SAT 1PM',
  '2026-07-25 16:00': '07.25 SAT 4PM',
  '2026-07-26 13:00': '07.26 SUN 1PM',
  '2026-07-26 16:00': '07.26 SUN 4PM',
});

function doGet() {
  return json_({ ok: true, service: 'London1888 reservation sync', sheets: Object.values(SCHEDULE_SHEETS) });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const payload = JSON.parse((e.postData && e.postData.contents) || '{}');
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = getScheduleSheets_(spreadsheet);
    migrateLegacySheet_(spreadsheet, sheets);

    if (payload.action === 'create') appendReservation_(sheets, payload);
    else if (payload.action === 'update') updateReservation_(sheets, payload);
    else if (payload.action === 'delete') deleteReservation_(sheets, payload);
    else throw new Error('지원하지 않는 action입니다.');

    return json_({ ok: true });
  } catch (error) {
    return json_({ ok: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

function getScheduleSheets_(spreadsheet) {
  const sheets = {};
  Object.keys(SCHEDULE_SHEETS).forEach(function (schedule) {
    const name = SCHEDULE_SHEETS[schedule];
    let sheet = spreadsheet.getSheetByName(name);
    if (!sheet) sheet = spreadsheet.insertSheet(name);
    initializeSheet_(sheet);
    sheets[schedule] = sheet;
  });
  return sheets;
}

function initializeSheet_(sheet) {
  if (sheet.getLastRow() > 0) return;
  sheet.appendRow(HEADERS);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#8f111b').setFontColor('#ffffff');
  sheet.autoResizeColumns(1, HEADERS.length);
}

function migrateLegacySheet_(spreadsheet, sheets) {
  const legacy = spreadsheet.getSheetByName(LEGACY_SHEET_NAME);
  if (!legacy) return;

  if (legacy.getLastRow() > 1) {
    const rows = legacy.getRange(2, 1, legacy.getLastRow() - 1, HEADERS.length).getValues();
    rows.forEach(function (row) {
      const schedule = String(row[5] || '');
      const target = sheets[schedule];
      if (!target || !row[0]) return;
      if (!findReservation_(sheets, row[0])) {
        target.getRange(target.getLastRow() + 1, 1, 1, HEADERS.length).setValues([row]);
      }
    });
  }

  spreadsheet.deleteSheet(legacy);
}

function appendReservation_(sheets, payload) {
  const target = sheets[payload.schedule];
  if (!target) throw new Error('유효하지 않은 공연 일정입니다.');

  const existing = findReservation_(sheets, payload.id);
  if (existing) existing.sheet.deleteRow(existing.row);

  target.getRange(target.getLastRow() + 1, 1, 1, HEADERS.length).setValues([[
    payload.id || '', payload.bookingNumber || '', payload.name || '', payload.phone || '',
    Number(payload.numPeople || 0), payload.schedule || '', payload.actorName || '',
    payload.message || '', payload.createdAt ? new Date(payload.createdAt) : new Date()
  ]]);
}

function updateReservation_(sheets, payload) {
  const existing = findReservation_(sheets, payload.id);
  if (!existing) throw new Error('수정할 예매 ID를 찾을 수 없습니다.');

  const nextSchedule = payload.schedule || existing.values[5];
  const target = sheets[nextSchedule];
  if (!target) throw new Error('유효하지 않은 공연 일정입니다.');

  const values = existing.values.slice();
  values[2] = payload.name || values[2];
  values[3] = payload.phone || values[3];
  values[4] = Number(payload.numPeople || values[4]);
  values[5] = nextSchedule;
  values[6] = payload.actorName || values[6];

  if (existing.sheet.getSheetId() === target.getSheetId()) {
    target.getRange(existing.row, 1, 1, HEADERS.length).setValues([values]);
  } else {
    target.getRange(target.getLastRow() + 1, 1, 1, HEADERS.length).setValues([values]);
    existing.sheet.deleteRow(existing.row);
  }
}

function deleteReservation_(sheets, payload) {
  const existing = findReservation_(sheets, payload.id);
  if (!existing) throw new Error('삭제할 예매 ID를 찾을 수 없습니다.');
  existing.sheet.deleteRow(existing.row);
}

function findReservation_(sheets, id) {
  if (!id) return null;
  const schedules = Object.keys(sheets);
  for (let i = 0; i < schedules.length; i += 1) {
    const sheet = sheets[schedules[i]];
    if (sheet.getLastRow() < 2) continue;
    const match = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
      .createTextFinder(String(id)).matchEntireCell(true).findNext();
    if (match) {
      const row = match.getRow();
      return { sheet: sheet, row: row, values: sheet.getRange(row, 1, 1, HEADERS.length).getValues()[0] };
    }
  }
  return null;
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
