/* Stockage des photos sur l'appareil (IndexedDB) et compression.
 * Les photos sont trop lourdes pour le stockage des audits (localStorage) :
 * chaque audit garde seulement les identifiants de ses photos. */
(function () {
  "use strict";

  var NOM_BASE = "auditsHygienePhotos", TABLE = "photos";
  var basePromise = null;

  function base() {
    if (basePromise) return basePromise;
    basePromise = new Promise(function (ok, ko) {
      var req = indexedDB.open(NOM_BASE, 1);
      req.onupgradeneeded = function () { req.result.createObjectStore(TABLE); };
      req.onsuccess = function () { ok(req.result); };
      req.onerror = function () { basePromise = null; ko(req.error); };
    });
    return basePromise;
  }

  function transaction(mode, action) {
    return base().then(function (db) {
      return new Promise(function (ok, ko) {
        var tx = db.transaction(TABLE, mode), store = tx.objectStore(TABLE), res;
        var req = action(store);
        if (req) req.onsuccess = function () { res = req.result; };
        tx.oncomplete = function () { ok(res); };
        tx.onerror = tx.onabort = function () { ko(tx.error || new Error("Stockage des photos impossible")); };
      });
    });
  }

  /* Les photos sont stockées en texte (data URL JPEG) : c'est le format le plus fiable sur Safari iOS 16. */
  function enregistrer(id, dataUrl) { return transaction("readwrite", function (s) { return s.put(dataUrl, id); }); }
  function lire(id) { return transaction("readonly", function (s) { return s.get(id); }); }
  function supprimer(id) { return transaction("readwrite", function (s) { return s.delete(id); }); }
  function lirePlusieurs(ids) {
    return Promise.all(ids.map(function (id) { return lire(id).catch(function () { return null; }); }))
      .then(function (vals) { var o = {}; ids.forEach(function (id, k) { if (vals[k]) o[id] = vals[k]; }); return o; });
  }

  function nouvelId() { return "ph_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* Réduit la photo (1600 px max, JPEG qualité 0.72) : environ 150 à 300 Ko par photo. */
  function compresser(fichier, maxCote, qualite) {
    maxCote = maxCote || 1600; qualite = qualite || 0.72;
    return new Promise(function (ok, ko) {
      var url = URL.createObjectURL(fichier);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, r = Math.min(1, maxCote / Math.max(w, h));
        var c = document.createElement("canvas");
        c.width = Math.round(w * r); c.height = Math.round(h * r);
        var ctx = c.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        try { ok({ dataUrl: c.toDataURL("image/jpeg", qualite), largeur: c.width, hauteur: c.height }); }
        catch (e) { ko(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); ko(new Error("Image illisible")); };
      img.src = url;
    });
  }

  /* Demande au navigateur de ne pas effacer les données de l'app en cas de manque de place. */
  if (navigator.storage && navigator.storage.persist) {
    try { navigator.storage.persist(); } catch (e) {}
  }

  window.Photos = {
    enregistrer: enregistrer, lire: lire, supprimer: supprimer, lirePlusieurs: lirePlusieurs,
    nouvelId: nouvelId, compresser: compresser
  };
})();
