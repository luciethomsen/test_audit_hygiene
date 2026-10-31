(function () {
  "use strict";

  var CLE = "auditsHygiene.v1";
  var app = document.getElementById("app");
  var titre = document.getElementById("titre");
  var btnRetour = document.getElementById("btn-retour");
  var barreDroite = document.getElementById("barre-droite");
  var feuille = document.getElementById("feuille");
  var feuilleFond = document.getElementById("feuille-fond");

  var audits = charger();
  var ecran = "accueil";
  var auditCourant = null;
  var retour = null;

  /* ---------- Stockage ---------- */
  function charger() {
    try { return JSON.parse(localStorage.getItem(CLE)) || []; } catch (e) { return []; }
  }
  function sauver() {
    if (auditCourant) auditCourant.modifieLe = new Date().toISOString();
    try { localStorage.setItem(CLE, JSON.stringify(audits)); }
    catch (e) { toast("Stockage plein : exporte une sauvegarde puis supprime d'anciens audits."); }
  }

  /* ---------- Utilitaires ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  function dateFr(iso) { if (!iso) return ""; var p = iso.slice(0, 10).split("-"); return p[2] + "/" + p[1] + "/" + p[0]; }
  function aujourdhui() { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
  function toast(msg) {
    var t = document.getElementById("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 2600);
  }
  function compter(a) {
    var r = { total: 0, C: 0, NC: 0, NA: 0 };
    a.grille.forEach(function (rub) { rub.points.forEach(function (p) {
      r.total++; if (r[p.statut] !== undefined) r[p.statut]++;
    }); });
    r.evalues = r.C + r.NC + r.NA;
    r.taux = (r.C + r.NC) ? Math.round((r.C / (r.C + r.NC)) * 100) : null;
    return r;
  }
  function texteCommentaire(p) {
    var parts = p.choix.slice();
    if (p.texte && p.texte.trim()) parts.push(p.texte.trim());
    return parts.join(" ; ");
  }

  /* Photos d'un point : [{ id, cible }] où cible = un message prédéfini, LIBRE (texte libre) ou "" (autre).
     Les anciennes versions stockaient seulement des identifiants : on les convertit. */
  var LIBRE = "__libre__";
  function photosDe(p) {
    if (!p.photos) p.photos = [];
    p.photos = p.photos.map(function (x) { return typeof x === "string" ? { id: x, cible: "" } : x; });
    return p.photos;
  }
  /* Regroupe les photos par sous-commentaire, dans l'ordre : messages cochés, texte libre, autres. */
  function groupesPhotos(p) {
    var photos = photosDe(p), cibles = [];
    p.choix.forEach(function (m) { cibles.push(m); });
    cibles.push(LIBRE);
    photos.forEach(function (x) { if (cibles.indexOf(x.cible) < 0 && x.cible !== "") cibles.push(x.cible); });
    cibles.push("");
    return cibles.map(function (c) {
      var libelle = c === LIBRE ? (p.texte && p.texte.trim()) || "Texte libre" : c || "Autre photo";
      return { cible: c, libelle: libelle,
        ids: photos.filter(function (x) { return x.cible === c; }).map(function (x) { return x.id; }) };
    }).filter(function (g) { return g.ids.length; });
  }
  window.AuditUtils = { compter: compter, dateFr: dateFr, texteCommentaire: texteCommentaire,
    photosDe: photosDe, groupesPhotos: groupesPhotos, LIBRE: LIBRE };

  function barre(t, onRetour, droite) {
    titre.textContent = t;
    retour = onRetour || null;
    btnRetour.hidden = !onRetour;
    barreDroite.innerHTML = "";
    if (droite) barreDroite.appendChild(droite);
  }
  btnRetour.addEventListener("click", function () { if (retour) retour(); });

  function nettoyerBarreBas() {
    var b = document.querySelector(".barre-bas"); if (b) b.remove();
  }

  /* ---------- Accueil ---------- */
  function afficherAccueil() {
    ecran = "accueil"; auditCourant = null; nettoyerBarreBas();
    barre("Audit hygiène");
    app.innerHTML = "";

    var tries = audits.slice().sort(function (a, b) { return (b.modifieLe || "").localeCompare(a.modifieLe || ""); });
    if (!tries.length) {
      app.appendChild(el('<div class="vide"><p>Aucun audit pour le moment.</p><p class="discret">Commence par créer un audit.</p></div>'));
    }
    tries.forEach(function (a) {
      var c = compter(a);
      var carte = el('<div class="carte liste-audit">' +
        '<div class="info"><h2>' + esc(a.etablissement) + '</h2>' +
        '<div class="discret">' + esc(a.typeNom) + ' · ' + dateFr(a.date) + '</div></div>' +
        '<span class="pastille' + (a.termine ? ' fini' : '') + '">' +
        (a.termine ? "Terminé" : c.evalues + "/" + c.total) + '</span></div>');
      carte.addEventListener("click", function () { ouvrirAudit(a.id); });
      app.appendChild(carte);
    });

    var bas = el('<div class="barre-bas"><div class="interieur">' +
      '<button class="btn btn-principal" id="nouveau">+ Nouvel audit</button></div></div>');
    document.body.appendChild(bas);
    bas.querySelector("#nouveau").addEventListener("click", afficherCreation);

    var outils = el('<div class="carte"><h2>Sauvegarde</h2>' +
      '<p class="discret">Les audits sont enregistrés sur cet appareil uniquement. Exporte régulièrement une sauvegarde.</p>' +
      '<div class="rangee"><button class="btn" id="sauv">Exporter la sauvegarde</button>' +
      '<button class="btn" id="imp">Importer</button></div>' +
      '<input type="file" id="fichier-imp" accept=".json,application/json" hidden></div>');
    app.appendChild(outils);
    outils.querySelector("#sauv").addEventListener("click", function () {
      Promise.resolve().then(function () { return Exports.sauvegarde(audits); })
        .catch(function (e) { toast("Sauvegarde impossible : " + (e && e.message)); });
    });
    var input = outils.querySelector("#fichier-imp");
    outils.querySelector("#imp").addEventListener("click", function () { input.click(); });
    input.addEventListener("change", function () {
      var f = input.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var data = JSON.parse(r.result);
          var liste = Array.isArray(data) ? data : data.audits;
          if (!Array.isArray(liste)) throw new Error();
          var ajoutes = 0;
          liste.forEach(function (a) {
            if (!a || !a.id || !a.grille) return;
            var i = audits.findIndex(function (x) { return x.id === a.id; });
            if (i >= 0) audits[i] = a; else audits.push(a);
            ajoutes++;
          });
          sauver();
          var photos = (data && data.photos) || {};
          Promise.all(Object.keys(photos).map(function (id) { return Photos.enregistrer(id, photos[id]); }))
            .then(function () {
              afficherAccueil();
              var n = Object.keys(photos).length;
              toast(ajoutes + " audit(s) importé(s)" + (n ? ", " + n + " photo(s)" : ""));
            })
            .catch(function () { afficherAccueil(); toast("Audits importés, mais certaines photos n'ont pas pu être enregistrées"); });
        } catch (e) { toast("Fichier de sauvegarde invalide"); }
      };
      r.readAsText(f);
    });
  }

  /* ---------- Création ---------- */
  function afficherCreation() {
    ecran = "creation"; nettoyerBarreBas();
    barre("Nouvel audit", afficherAccueil);
    var options = TYPES_ETABLISSEMENT.map(function (t) {
      return '<option>' + esc(t) + '</option>';
    }).join("");
    app.innerHTML =
      '<div class="carte">' +
      '<label class="champ"><span>Établissement</span><input id="f-etab" autocomplete="off" placeholder="Boulangerie Martin"><div class="erreur" id="err-etab" hidden>Indique le nom de l\'établissement.</div></label>' +
      '<label class="champ"><span>Type d\'établissement</span><select id="f-type">' + options + '</select></label>' +
      '<label class="champ"><span>Adresse</span><input id="f-adr" autocomplete="off" placeholder="12 rue de la République, Lyon"></label>' +
      '<label class="champ"><span>N° d\'audit</span><input id="f-num" autocomplete="off" inputmode="numeric"></label>' +
      '<label class="champ"><span>Réalisé le</span><input id="f-date" type="date" value="' + aujourdhui() + '"></label>' +
      '<label class="champ"><span>Par (auditeur)</span><input id="f-aud" autocomplete="off" value="' + esc(localStorage.getItem("auditeur") || "") + '"></label>' +
      '<label class="champ"><span>Responsable rencontré</span><input id="f-resp" autocomplete="off"></label>' +
      '<label class="champ"><span>Rapport</span><select id="f-rap"><option value="">Non précisé</option><option>Mail</option><option>Courrier</option></select></label>' +
      '<button class="btn btn-principal btn-bloc" id="creer">Commencer l\'audit</button></div>';

    var etab = document.getElementById("f-etab");
    etab.addEventListener("input", function () { document.getElementById("err-etab").hidden = true; });
    document.getElementById("creer").addEventListener("click", function () {
      if (!etab.value.trim()) { document.getElementById("err-etab").hidden = false; etab.focus(); return; }
      var type = document.getElementById("f-type").value;
      var auditeur = document.getElementById("f-aud").value.trim();
      try { localStorage.setItem("auditeur", auditeur); } catch (e) {}
      var a = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        etablissement: etab.value.trim(),
        adresse: document.getElementById("f-adr").value.trim(),
        typeNom: type,
        numero: document.getElementById("f-num").value.trim(),
        date: document.getElementById("f-date").value || aujourdhui(),
        auditeur: auditeur,
        responsable: document.getElementById("f-resp").value.trim(),
        rapport: document.getElementById("f-rap").value,
        creeLe: new Date().toISOString(), modifieLe: new Date().toISOString(),
        termine: false,
        /* copie de la grille : un audit garde sa grille même si le référentiel change */
        grille: GRILLE.map(function (r) {
          return { titre: r.titre, points: r.points.map(function (p) {
            return { libelle: p.libelle, messages: p.messages.slice(), statut: "", choix: [], texte: "" };
          }) };
        })
      };
      audits.push(a); sauver(); ouvrirAudit(a.id);
    });
  }

  /* ---------- Grille d'audit ---------- */
  function ouvrirAudit(id) {
    auditCourant = audits.find(function (a) { return a.id === id; });
    if (!auditCourant) return afficherAccueil();
    afficherGrille();
  }

  function modeTableau() { return window.matchMedia("(min-width: 700px)").matches; }

  function afficherGrille() {
    ecran = "grille"; nettoyerBarreBas();
    var a = auditCourant;
    barre(a.etablissement, afficherAccueil);
    var c = compter(a);
    var html = '<div class="discret">' + esc(a.typeNom) + ' · ' + dateFr(a.date) + ' · ' + c.evalues + '/' + c.total + ' points évalués</div>' +
      '<div class="progression"><div style="width:' + Math.round(c.evalues / c.total * 100) + '%"></div></div>';

    if (modeTableau()) {
      html += '<table class="grille"><colgroup><col style="width:16%"><col style="width:32%"><col style="width:168px"><col></colgroup>' +
        '<thead><tr><th>Type de points</th><th>Points audités</th><th>C / NC</th><th>Commentaire / détails</th></tr></thead><tbody>';
      a.grille.forEach(function (rub, i) {
        rub.points.forEach(function (p, j) {
          html += '<tr>';
          if (j === 0) html += '<td class="rubrique" rowspan="' + rub.points.length + '">' + esc(rub.titre) + '</td>';
          html += '<td>' + esc(p.libelle) + '</td><td>' + boutonsCNC(p, i, j) + '</td>' + cellCommentaire(p, i, j, "td") + '</tr>';
        });
      });
      html += '</tbody></table>';
    } else {
      a.grille.forEach(function (rub, i) {
        var n = rub.points.filter(function (p) { return p.statut; }).length;
        html += '<div class="rub-titre"><span>' + esc(rub.titre) + '</span><span>' + n + '/' + rub.points.length + '</span></div>';
        rub.points.forEach(function (p, j) {
          html += '<div class="point"><div class="entete"><div class="libelle">' + esc(p.libelle) + '</div>' +
            boutonsCNC(p, i, j) + '</div>' + cellCommentaire(p, i, j, "div") + '</div>';
        });
      });
    }
    var y = window.scrollY;
    app.innerHTML = html;
    window.scrollTo(0, y);

    var bas = el('<div class="barre-bas"><div class="interieur">' +
      '<button class="btn btn-principal" id="synthese">Synthèse et export</button></div></div>');
    document.body.appendChild(bas);
    bas.querySelector("#synthese").addEventListener("click", afficherSynthese);
  }

  var STATUTS = ["C", "NC", "NA"];
  var TITRES_STATUT = { C: "Conforme", NC: "Non conforme", NA: "Non applicable" };
  function boutonsCNC(p, i, j) {
    return '<div class="cnc">' + STATUTS.map(function (s) {
      return '<button data-statut="' + s + '" data-i="' + i + '" data-j="' + j + '" title="' + TITRES_STATUT[s] + '" class="' +
        (p.statut === s ? "on-" + s : "") + '" aria-pressed="' + (p.statut === s) + '">' + s + '</button>';
    }).join("") + '</div>';
  }
  function cellCommentaire(p, i, j, tag) {
    var contenu, photos = photosDe(p);
    var vide = !p.choix.length && !(p.texte && p.texte.trim()) && !photos.length;
    function nb(cible) {
      var n = photos.filter(function (x) { return x.cible === cible; }).length;
      return n ? ' <span class="nb-photos">' + n + ' photo' + (n > 1 ? 's' : '') + '</span>' : "";
    }
    if (vide) {
      contenu = "Ajouter un commentaire ou une photo";
    } else {
      var aTexte = !!(p.texte && p.texte.trim());
      var autres = photos.filter(function (x) {
        return !(x.cible === LIBRE && aTexte) && p.choix.indexOf(x.cible) < 0;
      }).length;
      contenu = p.choix.map(function (c) { return '<span class="choix">• ' + esc(c) + nb(c) + '</span>'; }).join("") +
        (p.texte && p.texte.trim() ? '<span class="choix">' + esc(p.texte.trim()) + nb(LIBRE) + '</span>' : "") +
        (autres ? '<span class="choix"><span class="nb-photos">' + autres + ' autre' + (autres > 1 ? 's' : '') + ' photo' + (autres > 1 ? 's' : '') + '</span></span>' : "");
    }
    return '<' + tag + ' class="commentaire' + (vide ? ' vide-c' : '') + '" data-com="1" data-i="' + i + '" data-j="' + j + '">' + contenu + '</' + tag + '>';
  }

  app.addEventListener("click", function (e) {
    if (ecran !== "grille") return;
    var b = e.target.closest("[data-statut]");
    if (b) {
      var p = auditCourant.grille[b.dataset.i].points[b.dataset.j];
      p.statut = p.statut === b.dataset.statut ? "" : b.dataset.statut;
      sauver(); afficherGrille(); return;
    }
    var c = e.target.closest("[data-com]");
    if (c) ouvrirFeuille(+c.dataset.i, +c.dataset.j);
  });

  var dernierMode = modeTableau();
  window.addEventListener("resize", function () {
    if (ecran === "grille" && modeTableau() !== dernierMode) { dernierMode = modeTableau(); afficherGrille(); }
  });

  /* ---------- Feuille de commentaire ---------- */
  /* Tout est enregistré au fur et à mesure (statut, messages, texte, photos). */
  function ouvrirFeuille(i, j) {
    var p = auditCourant.grille[i].points[j];
    photosDe(p);
    feuille.innerHTML =
      '<div class="discret">' + esc(auditCourant.grille[i].titre) + '</div>' +
      '<h3>' + esc(p.libelle) + '</h3>' +
      '<div class="cnc" style="margin-top:10px">' + STATUTS.map(function (s) {
        return '<button data-s="' + s + '" title="' + TITRES_STATUT[s] + '" class="' + (p.statut === s ? "on-" + s : "") + '">' + s + '</button>';
      }).join("") + '</div>' +
      '<div class="puces">' + p.messages.map(function (m, k) {
        return '<button class="puce' + (p.choix.indexOf(m) >= 0 ? ' sel' : '') + '" data-k="' + k + '" aria-pressed="' + (p.choix.indexOf(m) >= 0) + '">' + esc(m) + '</button>';
      }).join("") + '</div>' +
      '<textarea id="texte-libre" placeholder="Texte libre (précisions, localisation, action corrective...)">' + esc(p.texte) + '</textarea>' +
      '<div class="photos-titre">Photos par commentaire (mises en annexe)</div>' +
      '<div id="lignes-photos"></div>' +
      '<input type="file" accept="image/*" capture="environment" id="f-camera" hidden>' +
      '<input type="file" accept="image/*" id="f-photo" hidden>' +
      '<div class="rangee" style="margin-top:12px"><button class="btn" id="f-effacer">Effacer le commentaire</button>' +
      '<button class="btn btn-principal" id="f-ok">Terminé</button></div>';

    var zone = feuille.querySelector("#lignes-photos");
    var texte = feuille.querySelector("#texte-libre");
    var cibleEnCours = null;

    feuille.querySelectorAll("[data-s]").forEach(function (b) {
      b.addEventListener("click", function () {
        p.statut = p.statut === b.dataset.s ? "" : b.dataset.s;
        feuille.querySelectorAll("[data-s]").forEach(function (x) {
          x.className = p.statut === x.dataset.s ? "on-" + p.statut : "";
        });
        sauver();
      });
    });
    feuille.querySelectorAll(".puce").forEach(function (b) {
      b.addEventListener("click", function () {
        var m = p.messages[b.dataset.k], idx = p.choix.indexOf(m);
        if (idx >= 0) p.choix.splice(idx, 1); else p.choix.push(m);
        b.classList.toggle("sel", idx < 0); b.setAttribute("aria-pressed", idx < 0);
        sauver(); afficherLignes();
      });
    });
    var avaitTexte = !!texte.value.trim();
    texte.addEventListener("input", function () {
      p.texte = texte.value; sauver();
      var aTexte = !!texte.value.trim();
      if (aTexte !== avaitTexte) { avaitTexte = aTexte; afficherLignes(); }
      else {
        var l = ligneDe(LIBRE);
        if (l) l.querySelector(".ligne-libelle").textContent = texte.value.trim();
      }
    });

    /* Une ligne par sous-commentaire coché, une pour le texte libre, une « Autre photo ».
       Une photo dont le commentaire a été décoché reste affichée pour pouvoir la supprimer. */
    function cibles() {
      var cs = p.choix.slice();
      if (texte.value.trim()) cs.push(LIBRE);
      p.photos.forEach(function (x) { if (cs.indexOf(x.cible) < 0 && x.cible !== "") cs.push(x.cible); });
      cs.push("");
      return cs;
    }
    function libelleCible(c) {
      if (c === LIBRE) return texte.value.trim() || "Texte libre";
      if (c === "") return "Autre photo (sans commentaire précis)";
      return c;
    }
    function ligneDe(c) {
      var t = zone.querySelectorAll(".ligne-photo");
      for (var k = 0; k < t.length; k++) if (t[k].dataset.cible === c) return t[k];
      return null;
    }
    function afficherLignes() {
      zone.innerHTML = "";
      cibles().forEach(function (c) {
        var orpheline = c !== "" && c !== LIBRE && p.choix.indexOf(c) < 0 ||
          (c === LIBRE && !texte.value.trim());
        var ligne = el('<div class="ligne-photo"><div class="ligne-entete"><span class="ligne-libelle"></span>' +
          '<span class="ligne-btns"><button class="btn-mini" data-act="camera">Photo</button>' +
          '<button class="btn-mini" data-act="galerie">Galerie</button></span></div><div class="vignettes"></div></div>');
        ligne.dataset.cible = c;
        ligne.querySelector(".ligne-libelle").textContent = libelleCible(c) + (orpheline ? " (décoché)" : "");
        if (c === "") ligne.classList.add("ligne-autre");
        var vig = ligne.querySelector(".vignettes");
        p.photos.filter(function (x) { return x.cible === c; }).forEach(function (x) {
          var v = el('<div class="vignette"><img alt="Photo"><button class="suppr-photo" aria-label="Supprimer la photo">&times;</button></div>');
          Photos.lire(x.id).then(function (d) { if (d) v.querySelector("img").src = d; });
          v.querySelector(".suppr-photo").addEventListener("click", function () {
            if (!confirm("Supprimer cette photo ?")) return;
            p.photos = p.photos.filter(function (y) { return y.id !== x.id; });
            sauver(); Photos.supprimer(x.id).catch(function () {}); afficherLignes();
          });
          vig.appendChild(v);
        });
        ligne.querySelectorAll("[data-act]").forEach(function (b) {
          b.addEventListener("click", function () {
            cibleEnCours = c;
            var input = feuille.querySelector(b.dataset.act === "camera" ? "#f-camera" : "#f-photo");
            input.value = ""; input.click();
          });
        });
        zone.appendChild(ligne);
      });
    }
    afficherLignes();

    function ajouterPhoto(input) {
      var f = input.files && input.files[0]; if (!f || cibleEnCours === null) return;
      var cible = cibleEnCours;
      var ligne = ligneDe(cible);
      if (ligne) ligne.querySelectorAll("[data-act]").forEach(function (b) { b.disabled = true; });
      Photos.compresser(f).then(function (r) {
        var id = Photos.nouvelId();
        return Photos.enregistrer(id, r.dataUrl).then(function () {
          p.photos.push({ id: id, cible: cible }); sauver();
        });
      }).catch(function (e) {
        toast("Photo non enregistrée : " + (e && e.message ? e.message : "erreur"));
      }).then(afficherLignes);
    }
    feuille.querySelector("#f-camera").addEventListener("change", function () { ajouterPhoto(this); });
    feuille.querySelector("#f-photo").addEventListener("change", function () { ajouterPhoto(this); });

    feuille.querySelector("#f-effacer").addEventListener("click", function () {
      if ((p.choix.length || texte.value.trim()) && !confirm("Effacer les commentaires de ce point ? (les photos sont conservées)")) return;
      p.choix = []; p.texte = ""; texte.value = ""; avaitTexte = false;
      feuille.querySelectorAll(".puce").forEach(function (b) { b.classList.remove("sel"); });
      sauver(); afficherLignes();
    });
    feuille.querySelector("#f-ok").addEventListener("click", fermerFeuille);
    feuille.hidden = false; feuilleFond.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function fermerFeuille() {
    feuille.hidden = true; feuilleFond.hidden = true; document.body.style.overflow = "";
    if (ecran === "grille") afficherGrille();
  }
  feuilleFond.addEventListener("click", fermerFeuille);

  /* ---------- Synthèse ---------- */
  function afficherSynthese() {
    ecran = "synthese"; nettoyerBarreBas();
    var a = auditCourant, c = compter(a);
    barre("Synthèse", afficherGrille);
    var ncs = [];
    a.grille.forEach(function (r) { r.points.forEach(function (p) { if (p.statut === "NC") ncs.push({ r: r.titre, p: p }); }); });

    app.innerHTML =
      '<div class="carte"><h2>' + esc(a.etablissement) + '</h2><div class="discret">' +
      (a.numero ? 'Audit n° ' + esc(a.numero) + ' · ' : '') + esc(a.typeNom) + ' · ' + dateFr(a.date) +
      (a.auditeur ? ' · ' + esc(a.auditeur) : '') + (a.adresse ? '<br>' + esc(a.adresse) : '') +
      (a.responsable ? '<br>Responsable rencontré : ' + esc(a.responsable) : '') +
      (a.rapport ? '<br>Rapport : ' + esc(a.rapport) : '') + '</div></div>' +
      '<div class="stats">' +
      '<div class="stat"><b>' + (c.taux === null ? "–" : c.taux + " %") + '</b><span>Taux de conformité</span></div>' +
      '<div class="stat"><b style="color:var(--c)">' + c.C + '</b><span>Conformes</span></div>' +
      '<div class="stat"><b style="color:var(--nc)">' + c.NC + '</b><span>Non conformes</span></div>' +
      '<div class="stat"><b>' + (c.total - c.evalues) + '</b><span>Non évalués' + (c.NA ? ' (' + c.NA + ' NA)' : '') + '</span></div></div>' +
      '<div class="carte"><h2>Exporter</h2><p class="discret">Le menu de partage s\'ouvre : choisis Drive, Mail, Fichiers...</p>' +
      '<div class="rangee"><button class="btn" data-exp="pdf">Rapport PDF</button>' +
      '<button class="btn" data-exp="xlsx">Excel</button><button class="btn" data-exp="csv">CSV</button></div></div>' +
      '<div class="carte"><h2>Non-conformités (' + ncs.length + ')</h2>' +
      (ncs.length ? ncs.map(function (x) {
        return '<div class="nc-item"><small>' + esc(x.r) + '</small>' + esc(x.p.libelle) +
          (texteCommentaire(x.p) ? '<small>' + esc(texteCommentaire(x.p)) + '</small>' : '') +
          ((x.p.photos || []).length ? '<small>' + x.p.photos.length + ' photo(s) en annexe</small>' : '') + '</div>';
      }).join("") : '<p class="discret">Aucune non-conformité relevée.</p>') + '</div>' +
      '<div class="rangee"><button class="btn" id="terminer">' + (a.termine ? "Rouvrir l'audit" : "Marquer comme terminé") + '</button>' +
      '<button class="btn btn-danger" id="supprimer">Supprimer l\'audit</button></div>';

    app.querySelectorAll("[data-exp]").forEach(function (b) {
      b.addEventListener("click", function () {
        var texte = b.textContent;
        b.textContent = "Préparation…";
        Promise.resolve().then(function () { return Exports[b.dataset.exp](a); })
          .catch(function (err) { console.error(err); toast("Export impossible : " + (err && err.message)); })
          .then(function () { b.textContent = texte; });
      });
    });
    document.getElementById("terminer").addEventListener("click", function () {
      a.termine = !a.termine; sauver(); afficherSynthese();
      toast(a.termine ? "Audit terminé" : "Audit rouvert");
    });
    document.getElementById("supprimer").addEventListener("click", function () {
      if (!confirm("Supprimer définitivement cet audit ?")) return;
      a.grille.forEach(function (r) { r.points.forEach(function (p) {
        photosDe(p).forEach(function (x) { Photos.supprimer(x.id).catch(function () {}); });
      }); });
      audits = audits.filter(function (x) { return x.id !== a.id; });
      sauver(); afficherAccueil(); toast("Audit supprimé");
    });
  }

  window.AuditApp = { toast: toast };

  /* ---------- Démarrage ---------- */
  afficherAccueil();
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
})();
