/**
 * Gama_Labs · Inscriptions aux formations (Google Apps Script relié à un Google Sheets)
 *
 * Le site appelle ce script pour :
 *   - inscrire une personne sur la liste d'attente   (onglet « Liste d'attente »)
 *   - réserver un ticket, si la personne est sur la liste d'attente (onglet « Inscrits »)
 *   - lire le nombre de places restantes, affiché en direct à tous les visiteurs
 *
 * Installation : voir google-sheets/README.md
 */

// Formations ouvertes et nombre de places. L'identifiant doit être le même que sur le site.
var FORMATIONS = {
  'notebooklm-2026-11-28': { titre: 'Formation NotebookLM · webinaire du samedi 28 novembre, 19:00 – 20:30', places: 100 }
};
var CONTACT = 'contact@gama-labs.com';
var ENVOYER_CONFIRMATION = true;   // e-mail de confirmation au participant

var ONGLET_ATTENTE = "Liste d'attente";
var ONGLET_INSCRITS = 'Inscrits';

function doGet(e) {
  var attente = onglet_(ONGLET_ATTENTE, ['Date', 'Nom', 'E-mail', 'Téléphone', 'Profession', 'Intérêts']);
  return json_({ ok: true, events: stats_(), waitlist: Math.max(0, attente.getLastRow() - 1) });
}

function doPost(e) {
  var data = {};
  try { data = JSON.parse(e.postData.contents || '{}'); } catch (err) { return json_({ ok: false, code: 'bad_request' }); }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);   // une réservation à la fois : jamais plus de tickets que de places
  try {
    if (data.action === 'waitlist') return json_(inscrireAttente_(data));
    if (data.action === 'ticket') return json_(reserverTicket_(data));
    return json_({ ok: false, code: 'bad_request' });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Liste d'attente ---------- */
function inscrireAttente_(d) {
  var email = norm_(d.email);
  if (!email || !d.nom) return { ok: false, code: 'missing' };
  var sh = onglet_(ONGLET_ATTENTE, ['Date', 'Nom', 'E-mail', 'Téléphone', 'Profession', 'Intérêts']);
  var ligne = trouver_(sh, 3, email);
  var valeurs = [new Date(), String(d.nom).trim(), email, String(d.telephone || ''), String(d.profession || ''), String(d.interets || '')];
  if (ligne) sh.getRange(ligne, 1, 1, 6).setValues([valeurs]);   // déjà inscrit : on met à jour
  else sh.appendRow(valeurs);
  return { ok: true };
}

/* ---------- Ticket ---------- */
function reserverTicket_(d) {
  var f = FORMATIONS[d.event];
  var email = norm_(d.email);
  if (!f) return { ok: false, code: 'unknown_event' };
  if (!email || !d.nom) return { ok: false, code: 'missing' };

  // Obligatoire : être sur la liste d'attente
  var attente = onglet_(ONGLET_ATTENTE, ['Date', 'Nom', 'E-mail', 'Téléphone', 'Profession', 'Intérêts']);
  if (!trouver_(attente, 3, email)) return { ok: false, code: 'not_waitlisted' };

  var sh = onglet_(ONGLET_INSCRITS, ['Date', 'Formation', 'Nom', 'E-mail', 'Téléphone']);
  var lignes = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues() : [];
  var pris = 0, deja = false;
  lignes.forEach(function (l) {
    if (l[1] === d.event) { pris++; if (norm_(l[3]) === email) deja = true; }
  });
  if (deja) return { ok: true, already: true, taken: pris, capacity: f.places };
  if (pris >= f.places) return { ok: false, code: 'full', taken: pris, capacity: f.places };

  sh.appendRow([new Date(), d.event, String(d.nom).trim(), email, String(d.telephone || '')]);
  pris++;

  if (ENVOYER_CONFIRMATION) {
    try {
      MailApp.sendEmail({
        to: email, replyTo: CONTACT, name: 'Gama_Labs',
        subject: 'Votre ticket · ' + f.titre,
        body: 'Bonjour ' + String(d.nom).trim() + ',\n\nVotre place est réservée pour : ' + f.titre +
              '.\nLe lien de connexion vous sera envoyé avant le début.\n\nÀ très vite,\nL\'équipe Gama_Labs\n' + CONTACT
      });
    } catch (err) { /* quota e-mail atteint : l'inscription reste valide */ }
  }
  return { ok: true, taken: pris, capacity: f.places };
}

/* ---------- Places restantes ---------- */
function stats_() {
  var sh = onglet_(ONGLET_INSCRITS, ['Date', 'Formation', 'Nom', 'E-mail', 'Téléphone']);
  var compte = {};
  if (sh.getLastRow() > 1) {
    sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues().forEach(function (l) { compte[l[0]] = (compte[l[0]] || 0) + 1; });
  }
  var out = {};
  Object.keys(FORMATIONS).forEach(function (id) { out[id] = { taken: compte[id] || 0, capacity: FORMATIONS[id].places }; });
  return out;
}

/* ---------- Outils ---------- */
function onglet_(nom, entetes) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(nom);
  if (!sh) {
    sh = ss.insertSheet(nom);
    sh.appendRow(entetes);
    sh.getRange(1, 1, 1, entetes.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
function trouver_(sh, col, email) {
  if (sh.getLastRow() < 2) return 0;
  var v = sh.getRange(2, col, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < v.length; i++) if (norm_(v[i][0]) === email) return i + 2;
  return 0;
}
function norm_(s) { return String(s || '').trim().toLowerCase(); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
