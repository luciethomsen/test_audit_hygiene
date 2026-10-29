# Audit hygiène — application (PWA)

Application de saisie d'audits d'hygiène et sécurité alimentaire (boulangerie, boucherie, restaurant).
Fonctionne hors ligne sur iPhone (iOS 16 / iPhone 8) et Android, sans store.

## Mettre en ligne gratuitement (GitHub Pages)

1. Créer un compte sur github.com, puis un dépôt public, par exemple `audit-hygiene`.
2. Dans le dépôt : **Add file > Upload files**, glisser **tout le contenu** de ce dossier (pas le dossier lui-même), puis **Commit changes**.
3. **Settings > Pages** : Source = *Deploy from a branch*, Branch = `main`, dossier `/ (root)`, **Save**.
4. Après 1 à 2 minutes, l'app est disponible à `https://<ton-pseudo>.github.io/audit-hygiene/`.

## Installer sur le téléphone

- **iPhone** : ouvrir l'adresse dans **Safari** > bouton Partager > **Sur l'écran d'accueil**.
- **Android** : ouvrir dans **Chrome** > menu ⋮ > **Installer l'application**.

Ouvrir l'app une fois avec du réseau : ensuite elle marche hors ligne.

## Modifier la grille d'audit

Tout est dans `referentiels.js` : la grille (`GRILLE` : rubriques, points, messages prédéfinis), la liste des types d'établissement et l'en-tête / mention de bas de page du PDF (`ENTETE`).
Après chaque modification, changer `VERSION` en haut de `sw.js` (ex. `audit-v2`) pour que les téléphones
récupèrent la mise à jour (fermer puis rouvrir l'app, parfois deux fois).

Les audits déjà commencés gardent leur grille d'origine.

## Exports

Depuis l'écran **Synthèse et export** : PDF (rapport), Excel (colonne 1 fusionnée), CSV (séparateur `;`, s'ouvre
directement dans Excel en français). Le menu de partage du téléphone s'ouvre : Drive, Mail, Fichiers, etc.

## Données

Les audits sont stockés **sur l'appareil uniquement**. Utiliser régulièrement **Exporter la sauvegarde** sur l'accueil
(fichier `.json`, réimportable avec **Importer**, y compris sur un autre appareil).

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Page de l'application |
| `app.js` | Écrans, saisie, stockage local |
| `exports.js` | Exports CSV, Excel, PDF, sauvegarde |
| `referentiels.js` | **Grilles d'audit à personnaliser** |
| `app.css` | Apparence (thème clair/sombre automatique) |
| `sw.js` | Mode hors ligne |
| `manifest.webmanifest`, `icons/` | Installation sur l'écran d'accueil |
| `lib/` | Bibliothèques Excel (SheetJS) et PDF (jsPDF) embarquées |
