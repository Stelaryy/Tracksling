# Tracksling

Tracksling est une application desktop Electron pour organiser des tableaux de suivi locaux.
Chaque projet contient un ou plusieurs tableaux, des widgets visuels et une table editable. Les donnees sont enregistrees dans un fichier JSON choisi par l'utilisateur sur sa machine.

## Vue d'ensemble

Le depot contient aujourd'hui une seule application exploitable : `electron-app/`.

Tracksling permet de :

- creer un nouveau projet local
- ouvrir un projet existant depuis un fichier `.json`
- gerer plusieurs tableaux dans un meme projet
- personnaliser chaque tableau avec un nom, une description et des couleurs
- ajouter des widgets predefinis (donut, courbe, nombre)
- reordonner, renommer ou supprimer les widgets
- gerer une table editable avec lignes, colonnes et cellules
- personnaliser l'interface avec des themes, un GIF de fond et des effets visuels

## Architecture du projet

```text
Tracksling/
|-- README.md
`-- electron-app/
	|-- main.js
	|-- preload.js
	|-- package.json
	`-- src/
		|-- index.html
		|-- renderer.js
		`-- styles.css
```

### Role des fichiers principaux

- `electron-app/main.js` : process principal Electron, creation de la fenetre, dialogues d'ouverture/enregistrement, lecture/ecriture des fichiers projet JSON, suivi des modifications non enregistrees.
- `electron-app/preload.js` : pont IPC securise entre Electron et l'interface.
- `electron-app/src/index.html` : structure de l'interface, page d'accueil, espace de travail, modales.
- `electron-app/src/renderer.js` : logique front, gestion des tableaux, widgets, table editable, personnalisation et navigation.
- `electron-app/src/styles.css` : styles applicatifs.

## Fonctionnement des donnees

- Les donnees metier sont stockees dans un fichier projet `.json` choisi par l'utilisateur.
- Tant qu'aucun fichier n'est selectionne via `Enregistrer sous`, les changements restent seulement en memoire.
- Les preferences visuelles (theme, GIF, effets) sont stockees localement dans le `localStorage` du renderer.
- Il n'y a ni base de donnees, ni serveur, ni API distante.

En pratique, un projet contient :

- un `activeBoardId`
- une liste de `boards`
- pour chaque tableau : son nom, sa description, ses couleurs, ses widgets, ses colonnes et ses lignes

## Prerequis

- Node.js
- npm

Remarque importante : les commandes npm doivent etre lancees depuis `electron-app/`, car le dossier racine ne contient pas de `package.json`.

## Installation et lancement

Depuis la racine du projet :

```powershell
cd .\electron-app
npm install
npm run start
```

Commande alternative :

```powershell
npm run dev
```

`npm run dev` lance actuellement la meme commande que `npm run start`.

## Premiere utilisation

1. Lance l'application.
2. Depuis la page d'accueil, cree un nouveau projet ou ouvre un fichier projet existant.
3. Cree un tableau avec `Nouveau tableau`.
4. Ajoute des widgets depuis la liste de presets.
5. Ajoute des colonnes et des lignes pour remplir la table.
6. Sauvegarde le projet avec `Enregistrer` ou `Enregistrer sous`.

## Ecrans et fonctionnalites

### 1. Page d'accueil

- resume le projet courant
- affiche le nombre de tableaux
- permet de reprendre le tableau actif
- permet d'ouvrir un projet, creer un tableau ou demarrer un nouveau projet

### 2. Sidebar

- nouveau projet
- ouvrir projet
- enregistrer
- enregistrer sous
- retour a la page d'accueil
- creation et suppression de tableaux
- personnalisation visuelle
- bascule theme sombre/clair

### 3. Espace tableau

- edition du nom du tableau
- edition de la couleur de bordure et de la couleur interieure
- gestion des widgets
- gestion de la table editable

### 4. Personnalisation visuelle

- themes `light`, `dark`, `neon`, `pastel`
- effets `mist`, `rain`, `flowers`
- choix de la zone d'effet : arriere-plan, premier plan ou cartes
- GIF de fond par URL

## Particularites techniques

- application Electron avec `contextIsolation: true`
- `nodeIntegration` desactive dans le renderer
- stockage local via fichiers JSON
- interface HTML/CSS/JavaScript sans framework front lourd
- Tailwind est charge via CDN dans `src/index.html`

Consequences pratiques :

- aucune compilation front separee n'est necessaire pour lancer l'application
- une connexion Internet peut etre utile pour charger Tailwind depuis le CDN si rien n'est mis en cache localement

## Lancement en developpement

Il n'y a pas de pipeline distinct `build` ou `test` defini dans `package.json`.
Le flux actuel pour developper est donc simplement :

```powershell
cd .\electron-app
npm install
npm run start
```

## Points d'attention

- si tu lances `npm` depuis le mauvais dossier, les commandes echoueront car `package.json` est dans `electron-app/`
- si tu fermes ou remplaces un projet non enregistre, l'application demande une confirmation
- sans `Enregistrer sous`, le projet reste temporaire
- les preferences d'apparence ne sont pas stockees dans le fichier projet mais localement sur la machine

## Resume rapide

Tracksling est une application Electron locale de gestion de tableaux avec widgets et table editable.
Pour la lancer : `cd electron-app`, `npm install`, puis `npm run start`.
