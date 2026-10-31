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
  /* Échantillons : [{ type: "produit" | "surface", nature }] -> lignes comme dans le rapport */
  function lignesEchantillons(a) {
    var e = (a.echantillons || []).filter(function (x) { return x.nature && x.nature.trim(); });
    var prod = e.filter(function (x) { return x.type !== "surface"; });
    var surf = e.filter(function (x) { return x.type === "surface"; });
    return prod.map(function (x, k) { return "Nature de l'échantillon n°" + (k + 1) + " : " + x.nature.trim(); })
      .concat(surf.map(function (x, k) {
        return "Nature du prélèvement de surface" + (surf.length > 1 ? " n°" + (k + 1) : "") + " : " + x.nature.trim();
      }));
  }
  window.AuditUtils = { compter: compter, dateFr: dateFr, texteCommentaire: texteCommentaire,
    photosDe: photosDe, groupesPhotos: groupesPhotos, LIBRE: LIBRE, lignesEchantillons: lignesEchantillons };

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
    var reg = el('<div class="carte"><h2>Réglages</h2><p class="discret">Lien du Projet Claude pour les rapports Word, nom de la technicienne.</p>' +
      '<button class="btn" id="reglages">Ouvrir les réglages</button></div>');
    app.appendChild(reg);
    reg.querySelector("#reglages").addEventListener("click", afficherReglages);
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
      '<label class="champ"><span>Adresse (rue)</span><input id="f-adr" autocomplete="off" placeholder="12 rue de la République"></label>' +
      '<label class="champ"><span>Code postal et ville</span><input id="f-cpv" autocomplete="off" placeholder="69007 Lyon"></label>' +
      '<label class="champ"><span>Civilité du gérant (pour la lettre)</span><select id="f-civ"><option>Monsieur</option><option>Madame</option><option>Madame, Monsieur</option></select></label>' +
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
        cpVille: document.getElementById("f-cpv").value.trim(),
        civilite: document.getElementById("f-civ").value,
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
      '<div class="progression"><div style="width:' + Math.round(c.evalues / c.total * 100) + '%"></div></div>' +
      '<button class="btn btn-bloc btn-echantillons" id="btn-echantillons">' + texteBoutonEchantillons(a) + '</button>';

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
    document.getElementById("btn-echantillons").addEventListener("click", ouvrirEchantillons);

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
    if (ecran === "synthese") afficherSynthese();
  }
  feuilleFond.addEventListener("click", fermerFeuille);

  /* ---------- Échantillons prélevés ---------- */
  function texteBoutonEchantillons(a) {
    var n = (a.echantillons || []).filter(function (x) { return x.nature && x.nature.trim(); }).length;
    return "Échantillon(s) prélevé(s)" + (n ? " : " + n : "");
  }
  function ouvrirEchantillons() {
    var a = auditCourant;
    if (!a.echantillons) a.echantillons = [];
    feuille.innerHTML =
      '<h3>Échantillon(s) prélevé(s)</h3>' +
      '<p class="discret" style="margin:4px 0 12px">Repris en tête du rapport : « Nature de l\'échantillon n°1 : ... ».</p>' +
      '<div id="liste-ech"></div>' +
      '<div class="rangee" style="margin-top:8px"><button class="btn" id="aj-produit">+ Échantillon produit</button>' +
      '<button class="btn" id="aj-surface">+ Prélèvement de surface</button></div>' +
      '<div class="rangee" style="margin-top:12px"><button class="btn btn-principal" id="ech-ok">Terminé</button></div>';
    var liste = feuille.querySelector("#liste-ech");
    function afficher() {
      liste.innerHTML = "";
      if (!a.echantillons.length) {
        liste.appendChild(el('<p class="discret">Aucun échantillon prélevé.</p>'));
      }
      var nProd = 0, nSurf = 0;
      a.echantillons.forEach(function (x, k) {
        var libelle = x.type === "surface" ? "Prélèvement de surface n°" + (++nSurf) : "Échantillon n°" + (++nProd);
        var ligne = el('<div class="ech-ligne"><label class="champ"><span></span>' +
          '<input autocomplete="off"></label><button class="suppr-ech" aria-label="Supprimer">&times;</button></div>');
        ligne.querySelector("span").textContent = libelle;
        var input = ligne.querySelector("input");
        input.value = x.nature || "";
        input.placeholder = x.type === "surface" ? "Plan de travail vitrine" : "Poulet mariné";
        input.addEventListener("input", function () { x.nature = input.value; sauver(); });
        ligne.querySelector(".suppr-ech").addEventListener("click", function () {
          if (x.nature && x.nature.trim() && !confirm("Supprimer cet échantillon ?")) return;
          a.echantillons.splice(k, 1); sauver(); afficher();
        });
        liste.appendChild(ligne);
      });
    }
    function ajouter(type) {
      a.echantillons.push({ type: type, nature: "" }); sauver(); afficher();
      var inputs = liste.querySelectorAll("input"); var dernier = inputs[inputs.length - 1];
      if (dernier) dernier.focus();
    }
    /* Ordre d'affichage : produits puis surfaces, comme dans le rapport */
    a.echantillons.sort(function (x, y) { return (x.type === "surface") - (y.type === "surface"); });
    afficher();
    feuille.querySelector("#aj-produit").addEventListener("click", function () {
      var i = a.echantillons.filter(function (x) { return x.type !== "surface"; }).length;
      a.echantillons.splice(i, 0, { type: "produit", nature: "" }); sauver(); afficher();
      liste.querySelectorAll("input")[i].focus();
    });
    feuille.querySelector("#aj-surface").addEventListener("click", function () { ajouter("surface"); });
    feuille.querySelector("#ech-ok").addEventListener("click", fermerFeuille);
    feuille.hidden = false; feuilleFond.hidden = false;
    document.body.style.overflow = "hidden";
  }

  /* ---------- Réglages ---------- */
  function lireReglage(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function ecrireReglage(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function afficherReglages() {
    ecran = "reglages"; nettoyerBarreBas();
    barre("Réglages", afficherAccueil);
    app.innerHTML = '<div class="carte"><h2>Projet Claude</h2>' +
      '<p class="discret">Ouvre ton projet « Rapports CHSA » sur claude.ai, copie l\'adresse de la page (elle commence par https://claude.ai/project/) et colle-la ici.</p>' +
      '<label class="champ"><span>Adresse du projet</span><input id="r-projet" autocomplete="off" inputmode="url" placeholder="https://claude.ai/project/..."></label></div>' +
      '<div class="carte"><h2>Relais IA (facultatif, payant à l\'usage)</h2>' +
      '<p class="discret">Seulement si un relais Cloudflare a été installé. Laisser vide pour utiliser le Projet Claude.</p>' +
      '<label class="champ"><span>Adresse du relais</span><input id="r-url" autocomplete="off" inputmode="url" placeholder="https://rapport-chsa.xxx.workers.dev"></label>' +
      '<label class="champ"><span>Code d\'accès</span><input id="r-code" type="password" autocomplete="off"></label>' +
      '<button class="btn" id="r-test">Tester la connexion</button><div class="discret" id="r-res" style="margin-top:8px"></div></div>' +
      '<div class="carte"><h2>Technicienne</h2><label class="champ"><span>Nom proposé pour les nouveaux audits</span><input id="r-tech" autocomplete="off"></label></div>';
    var url = document.getElementById("r-url"), code = document.getElementById("r-code"), tech = document.getElementById("r-tech");
    var projet = document.getElementById("r-projet");
    url.value = lireReglage("relaisUrl"); code.value = lireReglage("relaisCode"); tech.value = lireReglage("auditeur");
    projet.value = lireReglage("projetClaude");
    projet.addEventListener("input", function () { ecrireReglage("projetClaude", projet.value.trim()); });
    url.addEventListener("input", function () { ecrireReglage("relaisUrl", url.value.trim()); });
    code.addEventListener("input", function () { ecrireReglage("relaisCode", code.value.trim()); });
    tech.addEventListener("input", function () { ecrireReglage("auditeur", tech.value.trim()); });
    document.getElementById("r-test").addEventListener("click", function () {
      var res = document.getElementById("r-res"); res.textContent = "Test en cours…";
      appelRelais({ test: true }).then(function () { res.textContent = "Connexion OK."; },
        function (e) { res.textContent = "Échec : " + e.message; });
    });
  }

  /* Appel du relais (Cloudflare Worker) qui interroge l'IA avec la bibliothèque CHSA */
  function appelRelais(corps) {
    var url = lireReglage("relaisUrl"), code = lireReglage("relaisCode");
    if (!url) return Promise.reject(new Error("adresse du relais non renseignée (Réglages)"));
    var ctrl = window.AbortController ? new AbortController() : null;
    var minuteur = setTimeout(function () { if (ctrl) ctrl.abort(); }, 150000);
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "X-Code-Acces": code },
      body: JSON.stringify(corps), signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok) throw new Error(j.erreur || ("erreur " + r.status));
          return j;
        });
      }, function (e) {
        throw new Error(e && e.name === "AbortError" ? "délai dépassé" : "réseau indisponible ou adresse incorrecte");
      })
      .then(function (j) { clearTimeout(minuteur); return j; }, function (e) { clearTimeout(minuteur); throw e; });
  }

  /* ---------- Rapport Word ---------- */
  function afficherRapport() {
    ecran = "rapport"; nettoyerBarreBas();
    var a = auditCourant;
    barre("Rapport Word", afficherSynthese);
    if (!a.civilite) a.civilite = "Monsieur";
    var relais = !!lireReglage("relaisUrl");
    app.innerHTML =
      '<div class="carte"><h2>Lettre et en-tête</h2>' +
      '<label class="champ"><span>Civilité du gérant</span><select id="w-civ"><option>Monsieur</option><option>Madame</option><option>Madame, Monsieur</option></select></label>' +
      '<label class="champ"><span>Adresse (rue)</span><input id="w-adr" autocomplete="off"></label>' +
      '<label class="champ"><span>Code postal et ville</span><input id="w-cpv" autocomplete="off"></label>' +
      '<label class="champ"><span>N° audit</span><input id="w-num" autocomplete="off" placeholder="1/2"></label>' +
      '<label class="champ"><span>Technicienne</span><input id="w-tech" autocomplete="off"></label></div>' +
      '<div class="carte"><h2>Texte du rapport</h2>' +
      '<button class="btn btn-principal btn-bloc" id="w-copier">1. Copier l\'audit et ouvrir le Projet Claude</button>' +
      '<p class="discret" style="margin:6px 0 12px">Dans le projet : nouvelle conversation, coller, envoyer. Puis bouton « Copier » sous la réponse.</p>' +
      '<button class="btn btn-principal btn-bloc" id="w-coller">2. Coller la réponse de l\'assistant</button>' +
      '<p class="discret" id="w-etat" style="margin:6px 0 12px"></p>' +
      (relais ? '<button class="btn btn-bloc" id="w-ia">' + (a.rapportTexte ? "Rédiger à nouveau via le relais" : "Rédiger via le relais") + '</button>' : '') +
      '<textarea id="w-texte" class="texte-rapport" placeholder="## 1. LOCAUX - EQUIPEMENTS&#10;- **Action** ..."></textarea>' +
      '<p class="discret" style="margin-top:6px">Tu peux corriger le texte ici. Les lignes [À VÉRIFIER] seront surlignées en jaune dans le Word. Ce qui suit la ligne « --- » (notes de l\'assistant) n\'est pas repris.</p></div>';
    var champs = { "w-civ": "civilite", "w-adr": "adresse", "w-cpv": "cpVille", "w-num": "numero", "w-tech": "auditeur", "w-texte": "rapportTexte" };
    Object.keys(champs).forEach(function (id) {
      var e = document.getElementById(id);
      e.value = a[champs[id]] || "";
      e.addEventListener(e.tagName === "SELECT" ? "change" : "input", function () { a[champs[id]] = e.value; sauver(); });
    });
    var etatTxt = document.getElementById("w-etat");
    document.getElementById("w-copier").addEventListener("click", function () {
      var texte = Exports.texteAssistant(a);
      var lien = lireReglage("projetClaude") || "https://claude.ai/projects";
      var copie = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(texte) : Promise.reject();
      /* ouverture immédiate, dans le même appui (sinon le navigateur bloque) */
      window.open(lien, "_blank");
      copie.then(function () { toast("Audit copié : colle-le dans une nouvelle conversation du projet"); },
        function () { toast("Copie impossible : utilise « Texte pour l'assistant IA » dans la synthèse"); });
      if (!lireReglage("projetClaude")) etatTxt.textContent = "Astuce : enregistre l'adresse de ton projet dans les Réglages pour l'ouvrir directement.";
    });
    document.getElementById("w-coller").addEventListener("click", function () {
      var zone = document.getElementById("w-texte");
      function appliquer(t) {
        if (!t || !t.trim()) { etatTxt.textContent = "Le presse-papiers est vide : copie d'abord la réponse de l'assistant."; return; }
        if (a.rapportTexte && a.rapportTexte.trim() && a.rapportTexte !== t && !confirm("Remplacer le texte actuel par la réponse collée ?")) return;
        a.rapportTexte = t; sauver(); zone.value = t;
        var n = RapportWord.lire(t).length;
        if (!n) etatTxt.textContent = "Texte collé, mais aucune section « 1. LOCAUX - EQUIPEMENTS »... trouvée : vérifie que c'est bien la réponse de l'assistant.";
        else if (t.indexOf("**") < 0) etatTxt.textContent = "Texte collé, mais sans le gras : copie la réponse avec le bouton « Copier » sous la réponse plutôt qu'en sélectionnant le texte.";
        else etatTxt.textContent = "Réponse collée (" + n + " section" + (n > 1 ? "s" : "") + "). Relis-la, puis génère le Word.";
      }
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(appliquer, function () {
          zone.focus();
          etatTxt.textContent = "Collage automatique refusé : appui long dans la zone de texte ci-dessous, puis « Coller ».";
        });
      } else {
        zone.focus();
        etatTxt.textContent = "Appui long dans la zone de texte ci-dessous, puis « Coller ».";
      }
    });
    if (relais) document.getElementById("w-ia").addEventListener("click", function () {
      var b = this, etat = document.getElementById("w-etat");
      if (a.rapportTexte && a.rapportTexte.trim() && !confirm("Remplacer le texte actuel par une nouvelle rédaction ?")) return;
      b.disabled = true; b.textContent = "Rédaction en cours…"; etat.textContent = "L'assistant rédige le rapport (30 s à 1 min)…";
      appelRelais({ texte: Exports.texteAssistant(a) }).then(function (j) {
        a.rapportTexte = j.texte || ""; sauver();
        document.getElementById("w-texte").value = a.rapportTexte;
        etat.textContent = "Texte rédigé. Relis-le, puis génère le Word.";
      }).catch(function (e) {
        etat.textContent = "Rédaction impossible : " + e.message;
      }).then(function () { b.disabled = false; b.textContent = "Rédiger à nouveau via le relais"; });
    });

    var bas = el('<div class="barre-bas"><div class="interieur"><button class="btn btn-principal" id="w-gen">Générer le Word</button></div></div>');
    document.body.appendChild(bas);
    bas.querySelector("#w-gen").addEventListener("click", function () {
      var b = this;
      if (!a.rapportTexte || !a.rapportTexte.trim()) { toast("Le texte du rapport est vide"); return; }
      b.disabled = true; b.textContent = "Génération…";
      RapportWord.generer(a, a.rapportTexte).then(function (blob) {
        return Exports.livrer(blob, RapportWord.nomFichier(a), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      }).catch(function (e) { console.error(e); toast("Word impossible : " + (e && e.message)); })
        .then(function () { b.disabled = false; b.textContent = "Générer le Word"; });
    });
  }

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
      '<div class="carte"><h2>Échantillon(s) prélevé(s)</h2>' +
      (lignesEchantillons(a).length ? lignesEchantillons(a).map(function (l) { return '<div class="discret">' + esc(l) + '</div>'; }).join("")
        : '<p class="discret">Aucun échantillon prélevé.</p>') +
      '<button class="btn" id="modif-ech" style="margin-top:8px">Modifier</button></div>' +
      '<div class="stats">' +
      '<div class="stat"><b>' + (c.taux === null ? "–" : c.taux + " %") + '</b><span>Taux de conformité</span></div>' +
      '<div class="stat"><b style="color:var(--c)">' + c.C + '</b><span>Conformes</span></div>' +
      '<div class="stat"><b style="color:var(--nc)">' + c.NC + '</b><span>Non conformes</span></div>' +
      '<div class="stat"><b>' + (c.total - c.evalues) + '</b><span>Non évalués' + (c.NA ? ' (' + c.NA + ' NA)' : '') + '</span></div></div>' +
      '<div class="carte"><h2>Rapport Word</h2><p class="discret">Lettre et rapport au format CHSA, rédigés avec ton Projet Claude, photos en annexe.</p>' +
      '<button class="btn btn-principal btn-bloc" id="vers-rapport">Préparer le rapport Word</button></div>' +
      '<div class="carte"><h2>Exporter</h2><p class="discret">Le menu de partage s\'ouvre : choisis Drive, Mail, Fichiers...</p>' +
      '<div class="rangee"><button class="btn" data-exp="pdf">Rapport PDF</button>' +
      '<button class="btn" data-exp="xlsx">Excel</button><button class="btn" data-exp="csv">CSV</button></div>' +
      '<div class="rangee" style="margin-top:8px"><button class="btn" data-exp="assistant">Texte pour l\'assistant IA</button></div></div>' +
      '<div class="carte"><h2>Non-conformités (' + ncs.length + ')</h2>' +
      (ncs.length ? ncs.map(function (x) {
        return '<div class="nc-item"><small>' + esc(x.r) + '</small>' + esc(x.p.libelle) +
          (texteCommentaire(x.p) ? '<small>' + esc(texteCommentaire(x.p)) + '</small>' : '') +
          (photosDe(x.p).length ? '<small>' + x.p.photos.length + ' photo(s) en annexe</small>' : '') + '</div>';
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
    document.getElementById("modif-ech").addEventListener("click", ouvrirEchantillons);
    document.getElementById("vers-rapport").addEventListener("click", afficherRapport);
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
