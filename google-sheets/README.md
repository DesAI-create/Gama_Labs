# NotebookLM — inscriptions gratuites (100 places)

Le site GAMA_LABS est construit depuis `source/Gama_Labs.dc.html` vers `site/index.html` avec `python tools/build.py`. Le formulaire NotebookLM est gratuit, sans paiement.

## Google Apps Script déjà déployé

Le script utilisé pour cette version est `google-sheets/Code.gs`. Il doit correspondre au code déjà publié dans Apps Script : onglets `Tickets` et `ListeAttente`, événement `notebooklm-2026-11-28`, capacité 100. **Ne le redéployez pas si vous utilisez déjà cette même version.**

1. Ouvrez l'URL Apps Script `/exec` dans le navigateur ; elle doit retourner `events`, `taken`, `capacity`.
2. Ne renseignez aucun identifiant Google dans le HTML.
3. L'API Vercel `api/gama.js` transmet les requêtes au script ; l'URL existante y est déjà inscrite.
4. `config/api-url.txt` contient `/api/gama` ; c'est l'URL appelée par le site.
5. Après inscription effective, un enregistrement apparaît dans `Tickets`. La liste d'attente va dans `ListeAttente` et ne décompte pas les places.
6. Dans Sheets : Fichier > Télécharger > Microsoft Excel (.xlsx).

## Publication

Exécuter `python tools/build.py` uniquement pour régénérer les fichiers publics lorsqu'on modifie `source/` ; `site/` a été régénéré dans le projet fourni. Faire le commit et push sur la branche connectée à Vercel. Le fichier `vercel.json` déploie `site/`, tandis que `api/gama.js` est une fonction Vercel.

## Limites et sécurité

L'URL Apps Script est actuellement dans un fichier suivi par Git. Si le dépôt est public, cela permet potentiellement des appels non autorisés. Le système évite le dépassement des 100 places grâce à `LockService`, et les doublons par email, mais ne vérifie pas la propriété des emails, ni le spam automatisé. Avant une campagne publique, ajouter une authentification entre API et Apps Script, un anti-bot et du contrôle de débit. Une limite absolue est appliquée côté Apps Script, pas seulement sur le bouton.

Les emails de confirmation sont maintenant gérés par le script Apps Script déployé (avec `envoyerConfirmation`). Attention : le `Code.gs` de ce dépôt peut être plus ancien que le script actuel dans l'éditeur Google Apps Script. Ne pas écraser la version de l'éditeur avec cet ancien fichier.
