# Tracksling (Electron)

Le projet est maintenant orienté JavaScript/Electron.

Le code applicatif est dans `electron-app/`.

## Lancer l'application

```
cd electron-app
npm install
npm run start
```

## Structure

- `electron-app/main.js` : process principal Electron + persistance locale
- `electron-app/preload.js` : API IPC exposée au renderer
- `electron-app/src/index.html` : UI
- `electron-app/src/styles.css` : styles
- `electron-app/src/renderer.js` : logique front
