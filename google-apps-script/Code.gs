const SPREADSHEET_ID = '1f9gfxWvypp_Pavmp-1usM4ozgvrO2Zhqc6nbKrkbT4o';
const SHEET_NAME = '예매내역';
const HEADERS = ['예매 ID', '예매번호', '실명', '전화번호', '인원', '공연 일정', '선택 배우', '응원 메시지', '예매일시'];

function doGet() {
  return json_({ ok: true, service: 'London1888 reservation sync' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const payload = JSON.parse((e.postData && e.postData.contents) || '{}');
    const sheet = getReservationSheet_();

    if (payload.action === 'create') appendReservation_(sheet, payload);
    else if (payload.action === 'update') updateReservation_(sheet, payload);
    else if (payload.action === 'delete') deleteReservation_(sheet, payload);
    else throw new Error('지원하지 않는 action입니다.');

    return json_({ ok: true });
  } catch (error) {
    return json_({ ok: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

function getReservationSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function appendReservation_(sheet, payload) {
  const existingRow = findReservationRow_(sheet, payload.id);
  const values = [[
    payload.id || '', payload.bookingNumber || '', payload.name || '', payload.phone || '',
    Number(payload.numPeople || 0), payload.schedule || '', payload.actorName || '',
    payload.message || '', payload.createdAt ? new Date(payload.createdAt) : new Date()
  ]];
  if (existingRow) sheet.getRange(existingRow, 1, 1, HEADERS.length).setValues(values);
  else sheet.getRange(sheet.getLastRow() + 1, 1, 1, HEADERS.length).setValues(values);
}

function updateReservation_(sheet, payload) {
  const row = findReservationRow_(sheet, payload.id);
  if (!row) throw new Error('수정할 예매 ID를 찾을 수 없습니다.');
  sheet.getRange(row, 3, 1, 5).setValues([[
    payload.name || '', payload.phone || '', Number(payload.numPeople || 0),
    payload.schedule || '', payload.actorName || ''
  ]]);
}

function deleteReservation_(sheet, payload) {
  const row = findReservationRow_(sheet, payload.id);
  if (!row) throw new Error('삭제할 예매 ID를 찾을 수 없습니다.');
  sheet.deleteRow(row);
}

function findReservationRow_(sheet, id) {
  if (!id || sheet.getLastRow() < 2) return 0;
  const match = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(id)).matchEntireCell(true).findNext();
  return match ? match.getRow() : 0;
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
