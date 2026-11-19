# Inscriptions aux formations (Google Sheets)

Le site enregistre la liste d'attente et les tickets dans un Google Sheets, affiche en direct le nombre de places restantes et envoie à chaque inscrit un e-mail de confirmation avec le lien Google Meet.

## Installation (10 minutes, une seule fois)

1. **Lien Meet** : sur Google Agenda (compte de Gama), créer l'événement du samedi 28 novembre, 19:00 – 20:30, avec « Ajouter une visioconférence Google Meet ». Copier le lien `https://meet.google.com/...`.
2. **Tableur** : créer un Google Sheets nommé **Gama_Labs · Formations**.
3. Menu **Extensions > Apps Script**. Effacer le code présent, coller tout le contenu de `Code.gs`.
4. En haut du code, remplacer `https://meet.google.com/xxx-xxxx-xxx` par le vrai lien Meet. Enregistrer (💾).
5. **Déployer > Nouveau déploiement** > roue dentée > **Application Web** :
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
6. **Déployer**, puis autoriser l'accès (Google affiche un avertissement : « Paramètres avancés » > « Accéder au projet » > « Autoriser »).
7. Copier l'**URL de l'application Web** (elle finit par `/exec`) et l'envoyer à Claude, ou la coller dans `config/api-url.txt` puis lancer `python tools/build.py`.

Les onglets **Liste d'attente** et **Inscrits** se créent tout seuls au premier usage.

## La liste des inscrits

- Onglet **Inscrits** : date, formation, nom, e-mail, téléphone, profession, et si l'e-mail de confirmation est parti.
- Onglet **Liste d'attente** : date, nom, e-mail, téléphone, profession, intérêts.
- Partage : bouton **Partager** du Google Sheets. Export : **Fichier > Télécharger > Excel**.

## Le jour J

- La veille : dans Apps Script, choisir la fonction **envoyerRappelATous** puis ▶ **Exécuter** : chaque inscrit reçoit de nouveau le lien Meet.
- Limite Google : environ 100 e-mails par jour avec un compte Gmail gratuit (1 500 avec Google Workspace).

## Modifier une formation

- Titre, date, places, lien Meet : objet `FORMATIONS` en haut de `Code.gs`, puis **Déployer > Gérer les déploiements > ✏️ Modifier > Version : Nouvelle version > Déployer** (l'URL ne change pas).
- Texte et date sur le site : tableau `evs` dans `source/Gama_Labs.dc.html` ; l'`id` doit être identique à celui de `Code.gs`.
