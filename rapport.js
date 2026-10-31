/* Génération du rapport Word (.docx) à partir du modèle CHSA (modele_rapport.docx).
 *
 * Le modèle contient des champs {{...}} :
 *   {{ETAB}} {{ADR1}} {{ADR2}} {{DATE_LETTRE}} {{CIVILITE}} {{TECH_LETTRE}}
 *   {{NUMERO}} {{DATE_AUDIT}} {{TECH_RAPPORT}}
 *   paragraphe modèle d'échantillon : {{ECH_LIBELLE}} : {{ECH_NATURE}}
 *   paragraphe modèle de titre de section : {{SECTION_NUM}}. {{SECTION_TITRE}} (numéro officiel 1 à 4 conservé)
 *   emplacements : {{CORPS}} (recommandations) et {{ANNEXE}} (photos)
 *
 * Le texte du rapport (rédigé par l'IA ou collé) est au format :
 *   ## 1. LOCAUX - EQUIPEMENTS
 *   - **Action en gras** suite du texte. *Document joint à ce rapport.*
 *   ...
 *   ---            (tout ce qui suit = notes pour la technicienne, ignorées)
 */
(function () {
  "use strict";

  function U() { return window.AuditUtils; }

  var MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  function dateLongue(d) { return d.getDate() + " " + MOIS[d.getMonth()] + " " + d.getFullYear(); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ---------- Lecture du texte du rapport ---------- */
  function lire(texte) {
    var corps = String(texte || "").replace(/\r/g, "");
    var coupe = corps.search(/^\s*(---|___|\*\*\*)\s*$/m);
    if (coupe >= 0) corps = corps.slice(0, coupe);
    var sections = [], courante = null;
    corps.split("\n").forEach(function (ligne) {
      var l = ligne.trim();
      if (!l) return;
      var t = l.replace(/^#{1,4}\s*/, "").replace(/\*\*/g, "").trim();
      var m = t.match(/^(\d)\s*[.)]\s*(.+)$/);
      if (m && m[2].length < 80 && m[2] === m[2].toUpperCase()) {
        courante = { num: m[1], titre: m[2].trim(), lignes: [] }; sections.push(courante); return;
      }
      if (!courante) return;                         /* en-tête (n° audit...) : repris de l'app */
      if (/^#{1,4}\s/.test(l)) return;
      var puce = /^[-•–·]\s*/.test(l);
      courante.lignes.push({ puce: puce, texte: l.replace(/^[-•–·]\s*/, "") });
    });
    return sections.filter(function (s) { return s.lignes.length; });
  }

  /* ---------- Paragraphes Word ---------- */
  function rPr(gras, italique, surligne) {
    return '<w:rPr><w:rFonts w:ascii="Calibri" w:eastAsia="Times New Roman" w:hAnsi="Calibri" w:cs="Times New Roman"/>' +
      (gras ? "<w:b/><w:bCs/>" : "") + (italique ? "<w:i/><w:iCs/>" : "") +
      '<w:color w:val="000000"/>' + (surligne ? '<w:highlight w:val="yellow"/>' : "") +
      '<w:lang w:eastAsia="fr-FR"/></w:rPr>';
  }
  function run(t, gras, italique, surligne) {
    return t ? "<w:r>" + rPr(gras, italique, surligne) + '<w:t xml:space="preserve">' + esc(t) + "</w:t></w:r>" : "";
  }
  /* **gras** et *italique* -> runs Word */
  function runsMarkdown(texte, surligne) {
    var out = "", gras = false, ital = false, buf = "", i = 0;
    function vider() { out += run(buf, gras, ital, surligne); buf = ""; }
    while (i < texte.length) {
      if (texte.substr(i, 2) === "**") { vider(); gras = !gras; i += 2; continue; }
      if (texte[i] === "*" && texte[i + 1] !== " " || texte[i] === "*" && ital) { vider(); ital = !ital; i++; continue; }
      buf += texte[i]; i++;
    }
    vider();
    return out;
  }
  var PPR_PUCE = '<w:pPr><w:keepLines/><w:spacing w:before="160"/><w:jc w:val="both"/></w:pPr>';
  var P_VIDE = '<w:p><w:pPr><w:spacing w:before="160"/><w:jc w:val="both"/></w:pPr></w:p>';
  function paragraphe(ligne) {
    var aVerifier = /\[\s*À\s*VÉRIFIER\s*\]/i.test(ligne.texte);
    return "<w:p>" + PPR_PUCE + (ligne.puce ? run("- ", false, false, aVerifier) : "") +
      runsMarkdown(ligne.texte, aVerifier) + "</w:p>";
  }

  /* Trouve le paragraphe <w:p>...</w:p> qui contient un champ */
  function paragrapheDe(xml, champ) {
    var k = xml.indexOf(champ); if (k < 0) return null;
    var debut = Math.max(xml.lastIndexOf("<w:p ", k), xml.lastIndexOf("<w:p>", k));
    var fin = xml.indexOf("</w:p>", k) + 6;
    return { debut: debut, fin: fin, xml: xml.slice(debut, fin) };
  }
  function remplacerParagraphe(xml, champ, nouveau) {
    var p = paragrapheDe(xml, champ); if (!p) return xml;
    return xml.slice(0, p.debut) + nouveau + xml.slice(p.fin);
  }

  /* ---------- Photos en annexe ---------- */
  var EMU_CM = 360000;
  function dimensions(dataUrl) {
    return new Promise(function (ok) {
      var img = new Image();
      img.onload = function () { ok({ l: img.naturalWidth, h: img.naturalHeight }); };
      img.onerror = function () { ok({ l: 4, h: 3 }); };
      img.src = dataUrl;
    });
  }
  function octets(dataUrl) {
    var b = atob(dataUrl.split(",")[1]), u = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return u;
  }
  function imageXml(rid, n, cx, cy) {
    return '<w:r><w:rPr><w:noProof/></w:rPr><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">' +
      '<wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:docPr id="' + (9000 + n) + '" name="Photo ' + n + '"/>' +
      '<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="' + (9000 + n) + '" name="photo' + n + '.jpeg"/><pic:cNvPicPr/></pic:nvPicPr>' +
      '<pic:blipFill><a:blip r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
      '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  }
  function annexe(a, photos, zip) {
    var points = [], n = 0;
    a.grille.forEach(function (r) { r.points.forEach(function (p) {
      var groupes = U().groupesPhotos(p).map(function (g) {
        return { libelle: g.libelle, ids: g.ids.filter(function (id) { return photos[id]; }) };
      }).filter(function (g) { return g.ids.length; });
      if (groupes.length) points.push({ r: r, p: p, groupes: groupes });
    }); });
    if (!points.length) return Promise.resolve({ xml: "", rels: "" });

    var taches = [];
    points.forEach(function (pt) { pt.groupes.forEach(function (g) { g.ids.forEach(function (id) {
      taches.push(dimensions(photos[id]).then(function (d) { return { id: id, d: d }; }));
    }); }); });
    return Promise.all(taches).then(function (dims) {
      var dimDe = {}; dims.forEach(function (x) { dimDe[x.id] = x.d; });
      var xml = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>' +
        '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr>' +
        '<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:color w:val="000000"/><w:sz w:val="28"/><w:u w:val="single"/></w:rPr><w:t>ANNEXE – PHOTOS</w:t></w:r></w:p>';
      var rels = "";
      points.forEach(function (pt) {
        xml += '<w:p><w:pPr><w:keepNext/><w:spacing w:before="240"/></w:pPr>' +
          run(pt.r.titre + " – " + pt.p.libelle, true, false, false) +
          (pt.p.statut ? run("  (" + pt.p.statut + ")", true, false, false) : "") + "</w:p>";
        pt.groupes.forEach(function (g) {
          g.ids.forEach(function (id, k) {
            n++;
            var rid = "rIdPhoto" + n, d = dimDe[id];
            var l = 14 * EMU_CM, h = Math.round(l * d.h / d.l);
            if (h > 10 * EMU_CM) { h = 10 * EMU_CM; l = Math.round(h * d.l / d.h); }
            zip.file("word/media/photo" + n + ".jpeg", octets(photos[id]));
            rels += '<Relationship Id="' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/photo' + n + '.jpeg"/>';
            if (k === 0) xml += '<w:p><w:pPr><w:keepNext/><w:spacing w:before="120"/></w:pPr>' + runsMarkdown(g.libelle, false) + "</w:p>";
            xml += '<w:p><w:pPr><w:keepNext/><w:jc w:val="center"/><w:spacing w:before="60"/></w:pPr>' + imageXml(rid, n, l, h) + "</w:p>" +
              '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="120"/></w:pPr>' + run("Photo " + n, false, true, false) + "</w:p>";
          });
        });
      });
      return { xml: xml, rels: rels };
    });
  }

  /* ---------- Assemblage ---------- */
  function generer(a, texte) {
    if (!window.JSZip) return Promise.reject(new Error("bibliothèque Word non chargée"));
    var sections = lire(texte);
    if (!sections.length) return Promise.reject(new Error("aucune section trouvée dans le texte du rapport (titres « 1. LOCAUX - EQUIPEMENTS »...)"));
    var ids = [];
    a.grille.forEach(function (r) { r.points.forEach(function (p) { U().photosDe(p).forEach(function (x) { ids.push(x.id); }); }); });

    return Promise.all([
      fetch("modele_rapport.docx").then(function (r) { if (!r.ok) throw new Error("modèle Word introuvable"); return r.arrayBuffer(); }),
      ids.length && window.Photos ? Photos.lirePlusieurs(ids).catch(function () { return {}; }) : Promise.resolve({})
    ]).then(function (res) {
      return JSZip.loadAsync(res[0]).then(function (zip) {
        return zip.file("word/document.xml").async("string").then(function (doc) {
          var tech = a.auditeur || "";
          var champs = {
            ETAB: (a.etablissement || "").toUpperCase(),
            ADR1: a.adresse || "",
            ADR2: a.cpVille || "",
            DATE_LETTRE: dateLongue(new Date()),
            CIVILITE: a.civilite || "Monsieur",
            TECH_LETTRE: tech,
            NUMERO: a.numero || "",
            DATE_AUDIT: U().dateFr(a.date),
            TECH_RAPPORT: tech
          };
          Object.keys(champs).forEach(function (k) { doc = doc.split("{{" + k + "}}").join(esc(champs[k])); });

          /* Échantillons */
          var modeleEch = paragrapheDe(doc, "{{ECH_NATURE}}");
          var ech = U().lignesEchantillons(a).map(function (l) {
            var k = l.indexOf(" : ");
            return modeleEch.xml.split("{{ECH_LIBELLE}}").join(esc(l.slice(0, k))).split("{{ECH_NATURE}}").join(esc(l.slice(k + 3)));
          }).join("");
          doc = doc.slice(0, modeleEch.debut) + ech + doc.slice(modeleEch.fin);

          /* Sections et recommandations */
          var modeleTitre = paragrapheDe(doc, "{{SECTION_TITRE}}");
          doc = doc.slice(0, modeleTitre.debut) + doc.slice(modeleTitre.fin);
          var corps = sections.map(function (s, k) {
            return (k ? P_VIDE : "") + modeleTitre.xml.split("{{SECTION_NUM}}").join(esc(s.num)).split("{{SECTION_TITRE}}").join(esc(s.titre)) + P_VIDE +
              s.lignes.map(paragraphe).join("");
          }).join("");
          doc = remplacerParagraphe(doc, "{{CORPS}}", corps);

          return annexe(a, res[1], zip).then(function (ann) {
            doc = remplacerParagraphe(doc, "{{ANNEXE}}", ann.xml);
            zip.file("word/document.xml", doc);
            if (!ann.rels) return zip;
            return zip.file("word/_rels/document.xml.rels").async("string").then(function (rels) {
              zip.file("word/_rels/document.xml.rels", rels.replace("</Relationships>", ann.rels + "</Relationships>"));
              return zip;
            });
          });
        }).then(function (zip) {
          return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", compression: "DEFLATE" });
        });
      });
    });
  }

  function nomFichier(a) {
    var nom = String(a.etablissement || "audit").normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
    var d = U().dateFr(a.date).replace(/\//g, ".");
    return "CHSA_" + nom + "_" + d + ".docx";
  }

  window.RapportWord = { generer: generer, lire: lire, nomFichier: nomFichier };
})();
