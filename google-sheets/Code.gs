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
  'notebooklm-2026-11-28': {
    titre: 'Formation NotebookLM',
    quand: 'samedi 28 novembre 2026, de 19:00 à 20:30 (heure d’Abidjan)',
    places: 100,
    meet: 'https://meet.google.com/xxx-xxxx-xxx'   // ← COLLER ICI LE LIEN GOOGLE MEET
  }
};
var CONTACT = 'contact@gama-labs.com';
var ENVOYER_CONFIRMATION = true;   // e-mail de confirmation au participant

var ONGLET_ATTENTE = "Liste d'attente";
var ONGLET_INSCRITS = 'Inscrits';
var ENTETES_INSCRITS = ['Date', 'Formation', 'Nom', 'E-mail', 'Téléphone', 'Profession', 'E-mail envoyé'];

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
  var ligneAttente = trouver_(attente, 3, email);
  if (!ligneAttente) return { ok: false, code: 'not_waitlisted' };
  var infos = attente.getRange(ligneAttente, 1, 1, 6).getValues()[0];   // téléphone et profession saisis sur la liste d'attente

  var sh = onglet_(ONGLET_INSCRITS, ENTETES_INSCRITS);
  var lignes = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues() : [];
  var pris = 0, deja = false;
  lignes.forEach(function (l) {
    if (l[1] === d.event) { pris++; if (norm_(l[3]) === email) deja = true; }
  });
  if (deja) return { ok: true, already: true, taken: pris, capacity: f.places };
  if (pris >= f.places) return { ok: false, code: 'full', taken: pris, capacity: f.places };

  var nom = String(d.nom).trim();
  var envoye = ENVOYER_CONFIRMATION ? envoyerConfirmation_(f, nom, email) : false;
  sh.appendRow([new Date(), d.event, nom, email, String(d.telephone || infos[3] || ''), String(infos[4] || ''), envoye ? 'oui' : 'non']);
  pris++;
  return { ok: true, taken: pris, capacity: f.places };
}

/* ---------- E-mail de confirmation avec le lien Meet ---------- */
function envoyerConfirmation_(f, nom, email) {
  var prenom = nom.split(/\s+/)[0];
  var html =
    '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#111">' +
    '<h2 style="color:#1D4ED8;margin:0 0 12px">Votre place est réservée ✅</h2>' +
    '<p>Bonjour ' + prenom + ',</p>' +
    '<p>Votre inscription à la <b>' + f.titre + '</b> est confirmée.</p>' +
    '<p style="background:#F2F6FF;border-radius:12px;padding:14px 16px">📅 <b>' + f.quand + '</b><br>💻 En ligne, sur Google Meet</p>' +
    '<p style="text-align:center;margin:24px 0"><a href="' + f.meet + '" style="background:#1D4ED8;color:#fff;padding:14px 26px;border-radius:999px;text-decoration:none;font-weight:bold">Rejoindre le Google Meet</a></p>' +
    '<p style="font-size:13px;color:#555">Lien : <a href="' + f.meet + '">' + f.meet + '</a><br>Gardez cet e-mail : ce lien vous servira le jour de la formation.</p>' +
    '<p>À très vite,<br>L’équipe Gama_Labs<br><a href="mailto:' + CONTACT + '">' + CONTACT + '</a></p></div>';
  try {
    MailApp.sendEmail({
      to: email, replyTo: CONTACT, name: 'Gama_Labs',
      subject: 'Inscription confirmée · ' + f.titre + ' · lien Google Meet',
      htmlBody: html,
      body: 'Bonjour ' + prenom + ',\n\nVotre inscription à la ' + f.titre + ' est confirmée.\nQuand : ' + f.quand +
            '\nLien Google Meet : ' + f.meet + '\n\nÀ très vite,\nL’équipe Gama_Labs\n' + CONTACT
    });
    return true;
  } catch (err) { return false; }   // quota e-mail atteint : l'inscription reste valide
}

/* ---------- À lancer à la main depuis l'éditeur : renvoyer le lien Meet à tous les inscrits ----------
   Exemple : la veille de la formation, choisir « envoyerRappelATous » puis ▶ Exécuter. */
function envoyerRappelATous() {
  var sh = onglet_(ONGLET_INSCRITS, ENTETES_INSCRITS);
  if (sh.getLastRow() < 2) return;
  sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues().forEach(function (l) {
    var f = FORMATIONS[l[1]];
    if (f && l[3]) envoyerConfirmation_(f, String(l[2]), String(l[3]));
  });
}

/* ---------- Places restantes ---------- */
function stats_() {
  var sh = onglet_(ONGLET_INSCRITS, ENTETES_INSCRITS);
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
