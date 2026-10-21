/* Améliorations de navigation ajoutées par-dessus l'export Claude Design :
   menu mobile, section active, retour en haut, affichage immédiat des sections atteintes par un lien. */
(function () {
  var SECTIONS = [
    ['services', 'Services'], ['realisations', 'Réalisations'], ['methode', 'Méthode'],
    ['equipe', 'Équipe'], ['formation', 'Formation'], ['faq', 'FAQ'], ['contact', 'Contact']
  ];
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;

  /* ---------- Menu mobile ---------- */
  var burger = document.createElement('button');
  burger.className = 'gm-burger';
  burger.type = 'button';
  burger.setAttribute('aria-label', 'Ouvrir le menu');
  burger.setAttribute('aria-expanded', 'false');
  burger.innerHTML = '<span></span>';
  var menu = document.createElement('div');
  menu.className = 'gm-menu';
  menu.id = 'gm-menu';
  menu.setAttribute('aria-hidden', 'true');
  menu.innerHTML = SECTIONS.filter(function (s) { return s[0] !== 'contact'; }).map(function (s, i) {
    return '<a href="#' + s[0] + '" style="transition-delay:' + (60 + i * 40) + 'ms"><small>0' + (i + 1) + '</small>' + s[1] + '</a>';
  }).join('') + '<a class="gm-cta" href="#contact">Démarrer un projet →</a>';
  burger.setAttribute('aria-controls', 'gm-menu');

  function setMenu(open) {
    root.classList.toggle('gm-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    menu.setAttribute('aria-hidden', String(!open));
  }
  burger.addEventListener('click', function () { setMenu(!root.classList.contains('gm-open')); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', function () { if (window.innerWidth >= 960) setMenu(false); });

  /* ---------- Retour en haut ---------- */
  var top = document.createElement('button');
  top.className = 'gm-top';
  top.type = 'button';
  top.setAttribute('aria-label', 'Revenir en haut de la page');
  top.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>';
  top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  document.body.appendChild(menu);
  document.body.appendChild(burger);
  document.body.appendChild(top);

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () { top.classList.toggle('on', window.scrollY > window.innerHeight * 1.2); ticking = false; });
  }, { passive: true });

  /* ---------- Apparition au défilement, fiable ----------
     Le moteur Claude Design n'observe que les éléments présents au premier rendu. Sur mobile, la page est
     re-rendue juste après (largeur différente) : les nouveaux éléments restaient invisibles (accueil vide).
     On observe donc aussi chaque élément [data-reveal] ajouté plus tard. */
  var rio = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      el.style.transitionDelay = ((+el.dataset.reveal || 0) * 80) + 'ms';
      el.style.opacity = '1'; el.style.translate = '0 0';
      rio.unobserve(el);
    });
  }, { threshold: 0.12 });
  function scanReveal() {
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      if (el.__gmSeen) return; el.__gmSeen = true; rio.observe(el);
    });
  }
  var scanT = null;
  new MutationObserver(function () { clearTimeout(scanT); scanT = setTimeout(scanReveal, 120); })
    .observe(document.body, { childList: true, subtree: true });
  scanReveal();
  /* Filet de sécurité : rien de visible à l'écran ne doit rester transparent plus de 2,5 s. */
  function revealOnScreen() {
    var h = window.innerHeight;
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      if (el.style.opacity === '1') return;
      var r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < h) { el.style.opacity = '1'; el.style.translate = '0 0'; }
    });
  }
  setTimeout(revealOnScreen, 2500);
  var safeT = null;
  window.addEventListener('scroll', function () { clearTimeout(safeT); safeT = setTimeout(revealOnScreen, 900); }, { passive: true });

  /* ---------- Afficher tout de suite une section atteinte par un lien ---------- */
  function revealIn(el) {
    if (!el) return;
    el.querySelectorAll('[data-reveal]').forEach(function (n) {
      n.style.transitionDelay = '0ms'; n.style.opacity = '1'; n.style.translate = '0 0';
    });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var target = id ? document.getElementById(id) : null;
    if (target) revealIn(target);
  }, true);
  window.addEventListener('hashchange', function () { revealIn(document.getElementById(location.hash.slice(1))); });

  /* ---------- Section active dans les menus ---------- */
  /* La marque est posée sur <html> (data-active) : React peut recréer les liens du menu sans l'effacer. */
  var current = null;
  function markActive(id) {
    if (id === current) return; current = id;
    if (id) root.setAttribute('data-active', id); else root.removeAttribute('data-active');
    menu.querySelectorAll('a').forEach(function (a) {
      if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  /* Liens du menu mobile : on ferme d'abord (la page est bloquée tant que le menu est ouvert), puis on fait défiler. */
  menu.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a) return;
    var t = document.getElementById(a.getAttribute('href').slice(1)); if (!t) return;
    e.preventDefault(); setMenu(false); revealIn(t);
    requestAnimationFrame(function () {
      t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      history.replaceState(null, '', a.getAttribute('href'));
    });
  });
  /* Le moteur Claude Design peut recréer les sections : on les relit à chaque calcul plutôt que de les observer. */
  function updateActive() {
    var mid = window.innerHeight * 0.45, hit = null;
    for (var i = 0; i < SECTIONS.length; i++) {
      var s = document.getElementById(SECTIONS[i][0]);
      if (!s) continue;
      var r = s.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) { hit = SECTIONS[i][0]; break; }
    }
    markActive(hit);
  }
  var tickA = false;
  window.addEventListener('scroll', function () {
    if (tickA) return; tickA = true;
    requestAnimationFrame(function () { updateActive(); tickA = false; });
  }, { passive: true });

  /* La page est rendue par le moteur Claude Design après le chargement : on attend les sections. */
  var tries = 0;
  (function waitSections() {
    var found = SECTIONS.map(function (s) { return document.getElementById(s[0]); }).filter(Boolean);
    if (found.length < SECTIONS.length && tries++ < 100) { setTimeout(waitSections, 150); return; }
    updateActive();
    if (location.hash) {
      var t = document.getElementById(location.hash.slice(1));
      /* La page grandit encore pendant le chargement (images, vidéo) : on recale la position deux fois. */
      if (t) {
        revealIn(t); t.scrollIntoView();
        var touched = false;
        ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) {
          window.addEventListener(ev, function () { touched = true; }, { once: true, passive: true });
        });
        [700, 1800].forEach(function (ms) {
          setTimeout(function () { if (!touched && Math.abs(t.getBoundingClientRect().top - 84) > 40) t.scrollIntoView(); }, ms);
        });
      }
    }
  })();
})();
