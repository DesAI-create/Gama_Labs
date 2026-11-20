// Google Apps Script — associer au classeur « Inscriptions GAMA_LABS ».
// Onglets créés automatiquement : Tickets et ListeAttente.
const EVENT_ID = 'notebooklm-2026-11-28';
const CAPACITY = 100;

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function sheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(name);
  if (!s) { s = ss.insertSheet(name); s.appendRow(headers); }
  return s;
}
function safe(value) {
  const str = String(value == null ? '' : value).trim();
  return /^[=+\-@\t\r]/.test(str) ? "'" + str : str;
}
function counts() {
  const tickets = sheet('Tickets', ['Date', 'Événement', 'Nom', 'Email', 'Téléphone']);
  const waiting = sheet('ListeAttente', ['Date', 'Nom', 'Email', 'Téléphone', 'Profession', 'Intérêts']);
  const data = tickets.getLastRow() > 1 ? tickets.getRange(2, 2, tickets.getLastRow() - 1, 1).getValues() : [];
  const taken = data.filter(row => row[0] === EVENT_ID).length;
  return { events: { [EVENT_ID]: { taken, capacity: CAPACITY } }, waitlist: Math.max(0, waiting.getLastRow() - 1) };
}
function doGet() {
  return out(counts());
}
function doPost(e) {
  let lock;
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    if (!['ticket', 'waitlist'].includes(data.action)) return out({ ok: false, code: 'invalid_action' });
    const name = String(data.nom || '').trim();
    const email = String(data.email || '').trim().toLowerCase();
    const phone = String(data.telephone || '').trim();
    if (!name || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length > 35) {
      return out({ ok: false, code: 'invalid_data' });
    }
    lock = LockService.getScriptLock();
    lock.waitLock(20000);
    if (data.action === 'ticket') {
      if (data.event !== EVENT_ID) return out({ ok: false, code: 'unknown_event' });
      const s = sheet('Tickets', ['Date', 'Événement', 'Nom', 'Email', 'Téléphone']);
      const rows = s.getLastRow() > 1 ? s.getRange(2, 1, s.getLastRow() - 1, 5).getValues() : [];
      const eventRows = rows.filter(r => r[1] === EVENT_ID);
      if (eventRows.some(r => String(r[3]).trim().toLowerCase() === email)) {
        return out({ ok: true, already: true, taken: eventRows.length, capacity: CAPACITY });
      }
      if (eventRows.length >= CAPACITY) return out({ ok: false, code: 'full', taken: eventRows.length, capacity: CAPACITY });
      s.appendRow([new Date(), EVENT_ID, safe(name), safe(email), safe(phone)]);
      SpreadsheetApp.flush();
      return out({ ok: true, already: false, taken: eventRows.length + 1, capacity: CAPACITY });
    }
    const s = sheet('ListeAttente', ['Date', 'Nom', 'Email', 'Téléphone', 'Profession', 'Intérêts']);
    const rows = s.getLastRow() > 1 ? s.getRange(2, 3, s.getLastRow() - 1, 1).getValues() : [];
    if (rows.some(r => String(r[0]).trim().toLowerCase() === email)) return out({ ok: true, already: true });
    s.appendRow([new Date(), safe(name), safe(email), safe(phone), safe(data.profession), safe(data.interets)]);
    return out({ ok: true, already: false });
  } catch (error) {
    console.error(error);
    return out({ ok: false, code: 'server_error' });
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}
