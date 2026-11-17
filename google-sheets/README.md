# Inscriptions aux formations (Google Sheets)

Le site enregistre la liste d'attente et les tickets dans un Google Sheets, et affiche en direct le nombre de places restantes.

## Installation (5 minutes, une seule fois)

1. Sur le compte Google de Gama_Labs, créer un Google Sheets nommé **Gama_Labs · Formations**.
2. Menu **Extensions > Apps Script**. Effacer le code présent, coller tout le contenu de `Code.gs`, enregistrer.
3. **Déployer > Nouveau déploiement** > type **Application Web** :
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
4. Cliquer **Déployer**, autoriser l'accès (Google affiche un avertissement : « Paramètres avancés > Accéder au projet »).
5. Copier l'**URL de l'application Web** (elle finit par `/exec`) et la coller dans `config/api-url.txt`.
6. Lancer `python tools/build.py`, puis commit et push.

Les onglets **Liste d'attente** et **Inscrits** se créent tout seuls au premier usage.

## Ajouter ou modifier une formation

- Places et titre : objet `FORMATIONS` en haut de `Code.gs`, puis **Déployer > Gérer les déploiements > Modifier > Nouvelle version** (l'URL ne change pas).
- Date et texte sur le site : tableau `evs` dans `source/Gama_Labs.dc.html` ; l'`id` doit être identique à celui de `Code.gs`.
