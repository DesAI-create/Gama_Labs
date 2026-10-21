"""Construit le dossier de déploiement Netlify (site/) à partir de l'export Claude Design.

Source : source/  (Gama_Labs.dc.html + support.js + assets, copiés depuis l'export Claude Design)
Sortie : site/    (index.html, support.js, enhance.css/js, assets optimisés, pages légales)

Usage : python tools/build.py   (nécessite Pillow et ffmpeg)
"""
import re, shutil, subprocess, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "source"
OUT = ROOT / "site"
STATIC = ROOT / "static"          # fichiers écrits à la main (enhance.*, pages légales, netlify.toml…)

def fail(msg):
    print("ERREUR :", msg); sys.exit(1)

def rep(s, a, b, count=1):
    n = s.count(a)
    if n != count: fail(f"motif trouvé {n} fois au lieu de {count} : {a[:80]!r}")
    return s.replace(a, b)

# ---------- 1. Dossier propre ----------
# OneDrive verrouille parfois les dossiers vides : on vide les fichiers et on tolère les dossiers restants.
if OUT.exists():
    for f in sorted(OUT.rglob("*"), reverse=True):
        try: f.unlink() if f.is_file() else f.rmdir()
        except OSError: pass
OUT.mkdir(exist_ok=True)
shutil.copy(SRC / "support.js", OUT / "support.js")
for f in STATIC.rglob("*"):
    if f.is_file():
        d = OUT / f.relative_to(STATIC); d.parent.mkdir(parents=True, exist_ok=True); shutil.copy(f, d)

html = (SRC / "Gama_Labs.dc.html").read_text(encoding="utf8")
html = html.replace('src="./support.js"', 'src="support.js"')

# ---------- 2. Images : seules celles utilisées, en WebP redimensionné ----------
MAXW = {"team": 900, "projects": 1600}
used = sorted(set(re.findall(r'assets/[A-Za-z0-9_./-]+\.(?:png|jpe?g)', html)))
before = after = 0
for rel in used:
    src = SRC / rel
    if not src.exists(): fail(f"image manquante {rel}")
    sub = rel.split("/")[1] if rel.count("/") > 1 else ""
    maxw = MAXW.get(sub, 1200)
    if "logo" in rel: maxw = 512
    im = Image.open(src)
    if im.width > maxw: im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    if im.mode not in ("RGB", "RGBA"): im = im.convert("RGBA")
    dst_rel = re.sub(r"\.(png|jpe?g)$", ".webp", rel)
    dst = OUT / dst_rel; dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "WEBP", quality=82, method=6)
    before += src.stat().st_size; after += dst.stat().st_size
    html = html.replace(rel, dst_rel)
print(f"Images : {len(used)} fichiers, {before/1e6:.1f} Mo -> {after/1e6:.1f} Mo")

# Icônes et image de partage
logo = Image.open(SRC / "assets/logo-gama-cube.png").convert("RGBA")
logo.resize((32, 32), Image.LANCZOS).save(OUT / "favicon.png")
logo.resize((180, 180), Image.LANCZOS).save(OUT / "apple-touch-icon.png")
og = Image.new("RGB", (1200, 630), (247, 247, 244))
l2 = logo.copy(); l2.thumbnail((300, 300))
og.paste(l2, ((1200 - l2.width) // 2, (630 - l2.height) // 2), l2)
og.save(OUT / "og-image.jpg", quality=85)

# ---------- 3. Vidéo compressée + image d'attente ----------
vids = sorted(set(re.findall(r'assets/[A-Za-z0-9_./-]+\.mp4', html)))
for rel in vids:
    dst = OUT / rel; dst.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(SRC / rel), "-vf", "scale='min(1280,iw)':-2",
                        "-c:v", "libx264", "-crf", "28", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", str(dst)])
    if r.returncode: shutil.copy(SRC / rel, dst)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(dst), "-frames:v", "1", "-q:v", "4", str(dst.with_suffix(".jpg"))])
    print(f"Vidéo {rel} : {(SRC/rel).stat().st_size/1e6:.1f} Mo -> {dst.stat().st_size/1e6:.1f} Mo")

# ---------- 4. En-tête : SEO, partage, icônes, améliorations ----------
HEAD = """<title>Gama_Labs · Sites, applications et logiciels sur mesure à Abidjan</title>
<meta name="description" content="Gama_Labs conçoit des sites web, applications web et mobiles et logiciels dédiés qui simplifient le quotidien. Startup tech basée à Abidjan. Apprendre · Créer · Impacter.">
<meta name="theme-color" content="#F7F7F4">
<link rel="icon" type="image/png" href="favicon.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:title" content="Gama_Labs · Apprendre · Créer · Impacter">
<meta property="og:description" content="Sites web, applications web et mobiles, logiciels dédiés. Startup tech basée à Abidjan.">
<meta property="og:image" content="/og-image.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://unpkg.com" crossorigin>
<link rel="stylesheet" href="enhance.css">
<script src="enhance.js" defer></script>
"""
html = rep(html, '<meta name="viewport" content="width=device-width, initial-scale=1">',
           '<meta name="viewport" content="width=device-width, initial-scale=1">\n' + HEAD)
html = html.replace("<html>", '<html lang="fr">', 1)

# ---------- 5. Contenu ----------
html = html.replace("Bienvenu sur", "Bienvenue sur")
# Menu : refléter toutes les sections principales
html = rep(html, '<a href="#formation" style="color:#111">Formation</a>\n      <a href="#manifeste" style="color:#111">À propos</a>',
           '<a href="#equipe" style="color:#111">Équipe</a>\n      <a href="#formation" style="color:#111">Formation</a>\n      <a href="#faq" style="color:#111">FAQ</a>')
html = rep(html, '<div style="display:flex;gap:30px;font-size:14px;font-weight:500">',
           '<div data-navlinks="1" style="display:flex;gap:26px;font-size:14px;font-weight:500">')
# Coordonnées réelles
html = html.replace("mailto:contact@gamalabs.tech", "mailto:gamalabs2.0@gmail.com")
html = re.sub(r'<a href="#"([^>]*>\s*<span[^>]*>\s*<span[^>]*>WhatsApp)', r'<a href="https://wa.me/2250172489331" target="_blank" rel="noopener"\1', html)
html = re.sub(r'<a href="#"([^>]*>\s*<span[^>]*>\s*<span[^>]*>Bureau)', r'<a href="https://maps.google.com/?q=Abidjan,+Côte+d%27Ivoire" target="_blank" rel="noopener"\1', html)
# Réseaux sociaux pas encore créés : retirés
html, n = re.subn(r'\s*<a href="#"[^>]*>(?:in|X|ig|gh)</a>', "", html)
if n != 4: fail(f"{n} liens sociaux retirés au lieu de 4")
# Pages légales
html = re.sub(r'<a href="#"([^>]*)>Mentions légales</a>', r'<a href="mentions-legales.html"\1>Mentions légales</a>', html)
html = re.sub(r'<a href="#"([^>]*)>Confidentialité</a>', r'<a href="confidentialite.html"\1>Confidentialité</a>', html)
html = re.sub(r'<a href="#"([^>]*)>Cookies</a>', r'<a href="confidentialite.html#cookies"\1>Cookies</a>', html)
if 'href="#"' in html: fail("il reste des liens href=\"#\"")

# ---------- 6. Formulaires réels (Netlify Forms) ----------
POST = "fetch('/',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(%s).toString()})"
html = rep(html, "submit: e=>{e.preventDefault();this.setState({sent:true});},",
  "submit: e=>{e.preventDefault(); const f=e.currentTarget, i=f.querySelectorAll('input'), t=f.querySelector('textarea'), b=f.querySelector('button[type=submit]');"
  " const d={'form-name':'contact',nom:i[0]?i[0].value:'',structure:i[1]?i[1].value:'',email:i[2]?i[2].value:'',besoin:this.state.ptype??'Site web',budget:this.state.budget??'1 – 5 M',message:t?t.value:''};"
  " if(b) b.disabled=true; " + (POST % "d") + ".then(r=>{ if(!r.ok) throw new Error(r.status); this.setState({sent:true}); })"
  ".catch(()=>{ if(b) b.disabled=false; window.alert(\"L'envoi a échoué. Écrivez-nous à gamalabs2.0@gmail.com ou sur WhatsApp au +225 01 72 48 93 31.\"); }); },")
html = rep(html, "wlSubmit:e=>{ e.preventDefault(); const l=",
  "wlSubmit:e=>{ e.preventDefault(); " + (POST % "{'form-name':'liste-attente',nom:S.wlName||'',email:S.wlEmail||'',interets:(wl||[]).join(', ')}") + ".catch(()=>{}); const l=")

FORMS = """
<!-- Formulaires déclarés pour Netlify (détection au déploiement, jamais affichés) -->
<form name="contact" data-netlify="true" netlify-honeypot="bot-field" hidden>
  <input name="bot-field"><input name="nom"><input name="structure"><input name="email"><input name="besoin"><input name="budget"><textarea name="message"></textarea>
</form>
<form name="liste-attente" data-netlify="true" netlify-honeypot="bot-field" hidden>
  <input name="bot-field"><input name="nom"><input name="email"><input name="interets">
</form>
<noscript><p style="padding:24px;font-family:system-ui">Ce site nécessite JavaScript. Contact : gamalabs2.0@gmail.com · WhatsApp +225 01 72 48 93 31</p></noscript>
"""
html = rep(html, "</body>", FORMS + "</body>")

(OUT / "index.html").write_text(html, encoding="utf8")
total = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file())
print(f"OK : site/ construit ({total/1e6:.1f} Mo au total)")
