# Site Gama_Labs

Site vitrine de Gama_Labs (Apprendre · Créer · Impacter), conçu avec Claude Design et déployé sur Vercel.

## Structure

| Dossier | Rôle |
|---|---|
| `source/` | Export Claude Design d'origine : `Gama_Labs.dc.html`, `support.js` et `assets/`. On modifie le design ici. |
| `static/` | Fichiers écrits à la main, copiés tels quels : `enhance.css` / `enhance.js` (menu mobile, section active, retour en haut, apparitions fiables), pages légales, 404, `robots.txt`. |
| `tools/build.py` | Construit `site/` : `index.html`, images converties en WebP, vidéo compressée, SEO, formulaires Netlify. |
| `site/` | Le site prêt à publier. **Ne pas modifier à la main**, il est régénéré par le script. |

## Mettre à jour le site

1. Remplacer `source/Gama_Labs.dc.html` (et `source/assets/` si besoin) par le nouvel export Claude Design.
2. Lancer `python tools/build.py` (nécessite Python, `pip install pillow` et ffmpeg).
3. Vérifier en local : `python -m http.server 5174 --directory site` puis ouvrir http://localhost:5174.
4. Commit et push : Vercel republie automatiquement depuis la branche GitHub configurée.

## Déploiement Netlify

- Netlify lit `netlify.toml` : il publie le dossier `site/`, sans commande de construction.
- Formulaires : **contact** et **liste-attente** apparaissent dans Netlify > Forms après le premier déploiement. Activer les notifications e-mail vers contact@gama-labs.com.

## À faire

- Compléter `static/mentions-legales.html` après l'immatriculation (forme juridique, numéro, responsable de publication).
- Remettre les liens réseaux sociaux quand les comptes existent (retirés pour l'instant).
- Billetterie des formations : le paiement est encore simulé, à brancher par l'équipe.
- Nom de domaine : à configurer plus tard dans Netlify.

## NotebookLM — inscription gratuite (100 places)

Voir `google-sheets/README.md`. Les modifications doivent être réalisées dans `source/Gama_Labs.dc.html` puis reconstruites dans `site/index.html`. Le compteur de places, le formulaire de ticket et la liste d’attente utilisent `/api/gama`. Le webinaire NotebookLM n'a pas de moyen de paiement.
