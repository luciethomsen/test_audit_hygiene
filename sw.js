/* Service worker : met l'application en cache pour un fonctionnement hors ligne.
   Augmenter VERSION à chaque mise à jour (code ou référentiels). */
var VERSION = "audit-v12";
var FICHIERS = [
  "./", "index.html", "app.css", "app.js", "exports.js", "referentiels.js", "photos.js", "rapport.js", "biblio.js", "logo.js", "modele_rapport.docx", "manifest.webmanifest",
  "lib/xlsx.full.min.js", "lib/jspdf.umd.min.js", "lib/jspdf.plugin.autotable.min.js", "lib/jszip.min.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/logo_chsa_2026.png"
];

self.addEventListener("install", function (e) {
  /* cache: "reload" : toujours télécharger la version en ligne (et non une copie gardée par le navigateur) */
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return c.addAll(FICHIERS.map(function (f) { return new Request(f, { cache: "reload" }); }));
  }));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (cles) {
    return Promise.all(cles.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (r) {
    return r || fetch(e.request);
  }));
});
