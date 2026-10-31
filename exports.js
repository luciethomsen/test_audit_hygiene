/* Exports CSV, Excel, PDF (avec annexe photos) et sauvegarde JSON.
 * Tout est généré sur l'appareil, puis envoyé au menu de partage natif
 * (Drive, Mail, Fichiers, WhatsApp...). Repli : téléchargement classique. */
(function () {
  "use strict";

  function U() { return window.AuditUtils; }
  function toast(m) { if (window.AuditApp) window.AuditApp.toast(m); }

  function slug(s) {
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "audit";
  }
  function nomFichier(a, ext) { return "audit_" + slug(a.etablissement) + "_" + a.date + "." + ext; }

  /* Numérote les photos dans l'ordre de la grille puis des sous-commentaires : { idPhoto: 1, ... } */
  function numeroterPhotos(a) {
    var num = {}, n = 0;
    a.grille.forEach(function (r) { r.points.forEach(function (p) {
      U().groupesPhotos(p).forEach(function (g) { g.ids.forEach(function (id) { num[id] = ++n; }); });
    }); });
    return num;
  }
  function ref(ids, num) {
    var ns = ids.map(function (id) { return num[id]; }).filter(Boolean);
    if (!ns.length) return "";
    return " (photo" + (ns.length > 1 ? "s " : " ") + ns.join(", ") + ")";
  }
  /* Commentaire avec, après chaque sous-commentaire, le renvoi vers ses photos en annexe */
  function commentaireRefs(p, num) {
    var L = U().LIBRE, groupes = U().groupesPhotos(p), parts = [];
    function idsDe(c) { var g = groupes.filter(function (x) { return x.cible === c; })[0]; return g ? g.ids : []; }
    p.choix.forEach(function (m) { parts.push(m + ref(idsDe(m), num)); });
    var aTexte = !!(p.texte && p.texte.trim());
    if (aTexte) parts.push(p.texte.trim() + ref(idsDe(L), num));
    var autres = [];
    groupes.forEach(function (g) {
      if (p.choix.indexOf(g.cible) >= 0 || (g.cible === L && aTexte)) return;
      autres = autres.concat(g.ids);
    });
    if (autres.length) parts.push((autres.length > 1 ? "Autres photos" : "Autre photo") + ref(autres, num));
    return parts.join(" ; ");
  }
  function tousIdsPhotos(audits) {
    var ids = [];
    audits.forEach(function (a) { a.grille.forEach(function (r) { r.points.forEach(function (p) {
      U().photosDe(p).forEach(function (x) { ids.push(x.id); });
    }); }); });
    return ids;
  }
  function chargerPhotos(ids) {
    if (!ids.length || !window.Photos) return Promise.resolve({});
    return window.Photos.lirePlusieurs(ids).catch(function () { return {}; });
  }

  function lignes(a) {
    var out = [], num = numeroterPhotos(a);
    a.grille.forEach(function (r) {
      r.points.forEach(function (p) {
        out.push({ rubrique: r.titre, point: p.libelle, statut: p.statut, commentaire: commentaireRefs(p, num) });
      });
    });
    return out;
  }

  /* ---------- Livraison du fichier ----------
   Un bandeau propose « Enregistrer » (dossier Téléchargements, Android / ordinateur)
   et « Partager » (Drive, Mail, Fichiers...). Sur iPhone, « Partager » suffit :
   il contient « Enregistrer dans Fichiers ». */
  var IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  function partager(blob, nom, mime) {
    var fichier = null;
    try { fichier = new File([blob], nom, { type: mime }); } catch (e) {}
    var peutPartager = !!(fichier && navigator.canShare && navigator.canShare({ files: [fichier] }));
    if (!peutPartager) { telecharger(blob, nom); return; }

    var ancien = document.querySelector(".pret"); if (ancien) ancien.remove();
    var d = document.createElement("div");
    d.className = "pret";
    d.innerHTML = '<span></span>' + (IOS ? '' : '<button class="btn" data-a="enr">Enregistrer</button>') +
      '<button class="btn btn-principal" data-a="par">' + (IOS ? 'Partager / enregistrer' : 'Partager') + '</button>' +
      '<button class="btn" data-a="fer" aria-label="Fermer">&times;</button>';
    d.querySelector("span").textContent = nom;
    d.addEventListener("click", function (e) {
      var b = e.target.closest("[data-a]"); if (!b) return;
      if (b.dataset.a === "enr") telecharger(blob, nom);
      if (b.dataset.a === "par") navigator.share({ files: [fichier], title: nom }).catch(function (err) {
        if (err && err.name === "AbortError") return;
        telecharger(blob, nom);
      });
      d.remove();
    });
    document.body.appendChild(d);
  }
  function telecharger(blob, nom) {
    var url = URL.createObjectURL(blob);
    var lien = document.createElement("a");
    lien.href = url; lien.download = nom;
    document.body.appendChild(lien); lien.click(); lien.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    toast("Enregistré dans Téléchargements : " + nom);
  }

  /* ---------- CSV (séparateur ; et BOM UTF-8 pour Excel en français) ---------- */
  function champCsv(v) {
    v = String(v == null ? "" : v);
    return /[";\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function csv(a) {
    var entete = ["N° audit", "Établissement", "Adresse", "Type d'établissement", "Date", "Auditeur",
      "Responsable rencontré", "Rapport", "Échantillons prélevés", "Type de points", "Points audités", "C/NC", "Commentaire / détails"];
    var ech = U().lignesEchantillons(a).join(" | ");
    var rows = [entete].concat(lignes(a).map(function (l) {
      return [a.numero || "", a.etablissement, a.adresse || "", a.typeNom, U().dateFr(a.date), a.auditeur || "",
        a.responsable || "", a.rapport || "", ech, l.rubrique, l.point, l.statut, l.commentaire];
    }));
    var texte = "﻿" + rows.map(function (r) { return r.map(champCsv).join(";"); }).join("\r\n");
    return partager(new Blob([texte], { type: "text/csv;charset=utf-8" }), nomFichier(a, "csv"), "text/csv");
  }

  /* ---------- Excel (colonne 1 fusionnée) ---------- */
  function xlsx(a) {
    if (!window.XLSX) throw new Error("bibliothèque Excel non chargée");
    var c = U().compter(a), num = numeroterPhotos(a);
    var aoa = [
      ["Audit hygiène" + (a.numero ? " n° " + a.numero : "")],
      ["Établissement", a.etablissement],
      ["Adresse", a.adresse || ""],
      ["Type", a.typeNom],
      ["Réalisé le", U().dateFr(a.date)],
      ["Par", a.auditeur || ""],
      ["Responsable rencontré", a.responsable || ""],
      ["Rapport", a.rapport || ""],
      ["Taux de conformité", c.taux === null ? "" : c.taux + " %"]
    ];
    U().lignesEchantillons(a).forEach(function (l) {
      var k = l.indexOf(" : "); aoa.push([l.slice(0, k), l.slice(k + 3)]);
    });
    aoa = aoa.concat([
      [],
      ["Type de points", "Points audités", "C/NC", "Commentaire / détails"]
    ]);
    var debut = aoa.length;
    var merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
    a.grille.forEach(function (r) {
      var premiere = aoa.length;
      r.points.forEach(function (p, j) {
        aoa.push([j === 0 ? r.titre : "", p.libelle, p.statut, commentaireRefs(p, num)]);
      });
      if (r.points.length > 1) merges.push({ s: { r: premiere, c: 0 }, e: { r: aoa.length - 1, c: 0 } });
    });
    var ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!merges"] = merges;
    ws["!cols"] = [{ wch: 26 }, { wch: 48 }, { wch: 8 }, { wch: 80 }];
    ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: debut - 1, c: 0 }, e: { r: aoa.length - 1, c: 3 } }) };
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit");
    var data = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    var mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    return partager(new Blob([data], { type: mime }), nomFichier(a, "xlsx"), mime);
  }

  /* ---------- PDF ---------- */
  /* Les polices standard du PDF ne couvrent que le jeu Windows-1252 :
     on remplace les quelques symboles hors de ce jeu. */
  function pdfTxt(s) {
    return String(s == null ? "" : s)
      .replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/[‐‑‒–—]/g, "-")
      .replace(/[^\x00-\xFF€ŒœŠšŽžŸƒ‘’“”•…™]/g, "?");
  }
  var VERT = [46, 125, 50], ROUGE = [198, 40, 40], GRIS = [120, 120, 120], ACCENT = [31, 92, 85];
  function couleurStatut(s) { return s === "C" ? VERT : s === "NC" ? ROUGE : s === "NA" ? GRIS : [30, 30, 30]; }

  function pdf(a) {
    if (!window.jspdf) throw new Error("bibliothèque PDF non chargée");
    var ids = tousIdsPhotos([a]);
    return chargerPhotos(ids).then(function (photos) {
      var blob = construirePdf(a, photos);
      return partager(blob, nomFichier(a, "pdf"), "application/pdf");
    });
  }

  function construirePdf(a, photos) {
    var doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    var c = U().compter(a), num = numeroterPhotos(a);
    var E = (typeof ENTETE !== "undefined" && ENTETE) || {};
    var limiteBas = E.mention ? 274 : 282;

    /* En-tête */
    if (E.societe) {
      doc.setDrawColor(30); doc.setLineWidth(0.4); doc.rect(14, 9, 92, 18);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(30, 30, 30);
      doc.text(pdfTxt(E.societe), 16, 14);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
      if (E.adresse) doc.text(pdfTxt(E.adresse), 16, 19);
      if (E.contact) doc.text(pdfTxt(E.contact), 16, 24);
    }
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.text(pdfTxt("Audit hygiène" + (a.numero ? " n° " + a.numero : "")), 196, 15, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(30, 30, 30);
    doc.text(pdfTxt("Réalisé le " + U().dateFr(a.date) + (a.auditeur ? " par " + a.auditeur : "")), 196, 21, { align: "right" });
    if (a.rapport) doc.text(pdfTxt("Rapport : " + a.rapport), 196, 26, { align: "right" });
    var y = 34;
    doc.setFontSize(10);
    var infos = [
      "Établissement : " + a.etablissement + " (" + a.typeNom + ")" + (a.adresse ? " - " + a.adresse : ""),
      a.responsable ? "Responsable rencontré : " + a.responsable : ""
    ].concat(U().lignesEchantillons(a)).concat([
      "Points évalués : " + c.evalues + "/" + c.total + "     Conformes : " + c.C + "     Non conformes : " + c.NC +
        (c.NA ? "     Non applicables : " + c.NA : "") + "     Taux de conformité : " + (c.taux === null ? "-" : c.taux + " %")
    ]).filter(Boolean);
    infos.forEach(function (t, k) { doc.text(pdfTxt(t), 14, y + k * 5.5); });

    /* Tableau */
    var body = [];
    a.grille.forEach(function (r) {
      r.points.forEach(function (p, j) {
        var ligne = [];
        if (j === 0) ligne.push({ content: pdfTxt(r.titre), rowSpan: r.points.length,
          styles: { valign: "middle", fontStyle: "bold", fillColor: [225, 239, 236], textColor: ACCENT } });
        ligne.push(pdfTxt(p.libelle), p.statut || "", pdfTxt(commentaireRefs(p, num)));
        body.push(ligne);
      });
    });
    doc.autoTable({
      startY: y + infos.length * 5.5 + 2,
      margin: { bottom: 297 - limiteBas },
      head: [["Type de points", "Points audités", "C/NC", "Commentaire / détails"]],
      body: body,
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.2, textColor: [30, 30, 30] },
      headStyles: { fillColor: ACCENT, textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 32 }, 1: { cellWidth: 58 }, 2: { cellWidth: 14, halign: "center", fontStyle: "bold" }, 3: { cellWidth: "auto" } },
      didParseCell: function (d) {
        if (d.section === "body" && d.column.index === 2) d.cell.styles.textColor = couleurStatut(d.cell.raw);
      }
    });

    annexePhotos(doc, a, photos, num, limiteBas);

    /* Pied de page sur toutes les pages */
    var total = doc.internal.getNumberOfPages();
    for (var n = 1; n <= total; n++) {
      doc.setPage(n);
      doc.setFont("helvetica", "normal"); doc.setTextColor(120);
      if (E.mention) { doc.setFontSize(6.5); doc.text(doc.splitTextToSize(pdfTxt(E.mention), 182), 14, 280); }
      doc.setFontSize(8);
      doc.text(pdfTxt(a.etablissement + " - " + U().dateFr(a.date)), 14, 291);
      doc.text("Page " + n + " / " + total, 196, 291, { align: "right" });
    }
    return doc.output("blob");
  }

  /* Annexe : pour chaque point ayant des photos, le point et son statut,
     puis chaque sous-commentaire suivi de ses photos */
  function annexePhotos(doc, a, photos, num, limiteBas) {
    var points = [];
    a.grille.forEach(function (r) { r.points.forEach(function (p) {
      var groupes = U().groupesPhotos(p).map(function (g) {
        return { libelle: g.libelle, ids: g.ids.filter(function (id) { return photos[id]; }) };
      }).filter(function (g) { return g.ids.length; });
      if (groupes.length) points.push({ r: r, p: p, groupes: groupes });
    }); });
    if (!points.length) return;

    var HAUT = 18, LARG_MAX = 130, HAUT_MAX = 100, y;
    doc.addPage();
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.text("Annexe - Photos", 14, HAUT);
    y = HAUT + 9;

    function enTetePoint(pt, suite) {
      doc.setFillColor(225, 239, 236); doc.rect(14, y - 4.5, 182, 6.5, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
      doc.text(doc.splitTextToSize(pdfTxt(pt.r.titre + " > " + pt.p.libelle + (suite ? " (suite)" : "")), 160)[0], 16, y);
      if (pt.p.statut) {
        var col = couleurStatut(pt.p.statut);
        doc.setTextColor(col[0], col[1], col[2]);
        doc.text(pt.p.statut, 194, y, { align: "right" });
      }
      y += 7;
    }

    points.forEach(function (pt) {
      if (y + 60 > limiteBas) { doc.addPage(); y = HAUT; }
      enTetePoint(pt, false);
      pt.groupes.forEach(function (g) {
        doc.setFontSize(9.5);
        var lignes = doc.splitTextToSize(pdfTxt(g.libelle), 182);
        g.ids.forEach(function (id, k) {
          var prop = doc.getImageProperties(photos[id]);
          var w = LARG_MAX, h = w * prop.height / prop.width;
          if (h > HAUT_MAX) { h = HAUT_MAX; w = h * prop.width / prop.height; }
          var hTexte = k === 0 ? lignes.length * 4.3 + 1.5 : 0;
          if (y + hTexte + h + 7 > limiteBas) { doc.addPage(); y = HAUT; enTetePoint(pt, true); if (k > 0) hTexte = -1; }
          if (k === 0 || hTexte === -1) {
            /* Le sous-commentaire précède ses photos */
            doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.setTextColor(30, 30, 30);
            doc.text(lignes, 14, y);
            y += lignes.length * 4.3 + 1.5;
          }
          doc.addImage(photos[id], "JPEG", 14, y, w, h, id);
          doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(90);
          doc.text("Photo " + num[id], 14, y + h + 4);
          y += h + 9;
        });
      });
      doc.setDrawColor(210); doc.setLineWidth(0.2); doc.line(14, y - 3, 196, y - 3);
      y += 4;
    });
  }

  /* ---------- Sauvegarde complète (audits + photos) ---------- */
  function sauvegarde(audits) {
    return chargerPhotos(tousIdsPhotos(audits)).then(function (photos) {
      var d = new Date().toISOString().slice(0, 10);
      var blob = new Blob([JSON.stringify({ app: "audit-hygiene", version: 2, exporteLe: new Date().toISOString(),
        audits: audits, photos: photos })], { type: "application/json" });
      return partager(blob, "sauvegarde_audits_" + d + ".json", "application/json");
    });
  }

  /* ---------- Texte pour l'assistant IA ----------
     Résumé de l'audit (en-tête, échantillons, constats) à coller dans l'assistant
     qui rédige le rapport Word. Les points conformes sans commentaire et les NA sont omis. */
  function texteAssistant(a) {
    var L = U().LIBRE, out = [];
    out.push("AUDIT HYGIÈNE - données saisies dans l'application");
    out.push("Établissement : " + a.etablissement);
    out.push("Type d'établissement : " + a.typeNom);
    if (a.adresse || a.cpVille) out.push("Adresse : " + [a.adresse, a.cpVille].filter(Boolean).join(", "));
    if (a.numero) out.push("N° audit : " + a.numero);
    out.push("Date audit : " + U().dateFr(a.date));
    if (a.auditeur) out.push("Technicienne : " + a.auditeur);
    if (a.responsable) out.push("Responsable rencontré : " + a.responsable);
    var ech = U().lignesEchantillons(a);
    out.push("Échantillons prélevés : " + (ech.length ? "" : "aucun"));
    ech.forEach(function (l) { out.push("- " + l); });
    out.push("");
    out.push("CONSTATS");
    var n = 0;
    a.grille.forEach(function (r) { r.points.forEach(function (p) {
      var aTexte = !!(p.texte && p.texte.trim());
      if (p.statut === "NA") return;
      if (p.statut !== "NC" && !p.choix.length && !aTexte) return;
      n++;
      out.push("");
      out.push("[" + r.titre + "] " + p.libelle + " : " + (p.statut === "NC" ? "NC (non conforme)" : p.statut === "C" ? "C (conforme, avec remarque)" : "non noté"));
      p.choix.forEach(function (m) { out.push("- Message prédéfini : " + m); });
      if (aTexte) out.push("- Texte libre : " + p.texte.trim());
      if (!p.choix.length && !aTexte) out.push("- (aucun commentaire)");
    }); });
    if (!n) out.push("Aucun constat.");
    return out.join("\n");
  }
  function assistant(a) {
    var texte = texteAssistant(a);
    var copie = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(texte) : Promise.reject();
    return copie.then(function () {
      toast("Texte copié : colle-le dans l'assistant");
    }, function () {
      return partager(new Blob([texte], { type: "text/plain;charset=utf-8" }), nomFichier(a, "txt"), "text/plain");
    });
  }

  window.Exports = { csv: csv, xlsx: xlsx, pdf: pdf, sauvegarde: sauvegarde, assistant: assistant, texteAssistant: texteAssistant, livrer: partager };
})();
