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

  /* Numérote les photos dans l'ordre de la grille : { idPhoto: 1, ... } */
  function numeroterPhotos(a) {
    var num = {}, n = 0;
    a.grille.forEach(function (r) { r.points.forEach(function (p) {
      (p.photos || []).forEach(function (id) { num[id] = ++n; });
    }); });
    return num;
  }
  function refPhotos(p, num) {
    var ns = (p.photos || []).map(function (id) { return num[id]; }).filter(Boolean);
    if (!ns.length) return "";
    return (ns.length > 1 ? "Photos " : "Photo ") + ns.join(", ") + " en annexe";
  }
  function tousIdsPhotos(audits) {
    var ids = [];
    audits.forEach(function (a) { a.grille.forEach(function (r) { r.points.forEach(function (p) {
      (p.photos || []).forEach(function (id) { ids.push(id); });
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
        out.push({ rubrique: r.titre, point: p.libelle, statut: p.statut,
          commentaire: U().texteCommentaire(p), photos: refPhotos(p, num) });
      });
    });
    return out;
  }

  /* ---------- Partage ---------- */
  function partager(blob, nom, mime) {
    var fichier;
    try { fichier = new File([blob], nom, { type: mime }); } catch (e) { fichier = null; }
    if (fichier && navigator.canShare && navigator.canShare({ files: [fichier] })) {
      return navigator.share({ files: [fichier], title: nom }).catch(function (e) {
        if (e && e.name === "AbortError") return;
        /* Sur iPhone, le partage doit suivre immédiatement un appui : si la préparation
           a pris du temps (photos), on propose un bouton « Partager ». */
        afficherPret(fichier, blob, nom);
      });
    }
    telecharger(blob, nom);
  }
  function afficherPret(fichier, blob, nom) {
    var ancien = document.querySelector(".pret"); if (ancien) ancien.remove();
    var d = document.createElement("div");
    d.className = "pret";
    d.innerHTML = '<span></span><button class="btn btn-principal">Partager</button><button class="btn" aria-label="Fermer">&times;</button>';
    d.querySelector("span").textContent = nom;
    var b = d.querySelectorAll("button");
    b[0].addEventListener("click", function () {
      d.remove();
      navigator.share({ files: [fichier], title: nom }).catch(function (e) {
        if (e && e.name === "AbortError") return;
        telecharger(blob, nom);
      });
    });
    b[1].addEventListener("click", function () { d.remove(); });
    document.body.appendChild(d);
  }
  function telecharger(blob, nom) {
    var url = URL.createObjectURL(blob);
    var lien = document.createElement("a");
    lien.href = url; lien.download = nom;
    document.body.appendChild(lien); lien.click(); lien.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    toast("Fichier enregistré : " + nom);
  }

  /* ---------- CSV (séparateur ; et BOM UTF-8 pour Excel en français) ---------- */
  function champCsv(v) {
    v = String(v == null ? "" : v);
    return /[";\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function csv(a) {
    var entete = ["N° audit", "Établissement", "Adresse", "Type d'établissement", "Date", "Auditeur",
      "Responsable rencontré", "Rapport", "Type de points", "Points audités", "C/NC", "Commentaire / détails", "Photos"];
    var rows = [entete].concat(lignes(a).map(function (l) {
      return [a.numero || "", a.etablissement, a.adresse || "", a.typeNom, U().dateFr(a.date), a.auditeur || "",
        a.responsable || "", a.rapport || "", l.rubrique, l.point, l.statut, l.commentaire, l.photos];
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
      ["Taux de conformité", c.taux === null ? "" : c.taux + " %"],
      [],
      ["Type de points", "Points audités", "C/NC", "Commentaire / détails", "Photos"]
    ];
    var debut = aoa.length;
    var merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
    a.grille.forEach(function (r) {
      var premiere = aoa.length;
      r.points.forEach(function (p, j) {
        aoa.push([j === 0 ? r.titre : "", p.libelle, p.statut, U().texteCommentaire(p), refPhotos(p, num)]);
      });
      if (r.points.length > 1) merges.push({ s: { r: premiere, c: 0 }, e: { r: aoa.length - 1, c: 0 } });
    });
    var ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!merges"] = merges;
    ws["!cols"] = [{ wch: 26 }, { wch: 48 }, { wch: 8 }, { wch: 70 }, { wch: 22 }];
    ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: debut - 1, c: 0 }, e: { r: aoa.length - 1, c: 4 } }) };
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
      a.responsable ? "Responsable rencontré : " + a.responsable : "",
      "Points évalués : " + c.evalues + "/" + c.total + "     Conformes : " + c.C + "     Non conformes : " + c.NC +
        (c.NA ? "     Non applicables : " + c.NA : "") + "     Taux de conformité : " + (c.taux === null ? "-" : c.taux + " %")
    ].filter(Boolean);
    infos.forEach(function (t, k) { doc.text(pdfTxt(t), 14, y + k * 5.5); });

    /* Tableau */
    var body = [];
    a.grille.forEach(function (r) {
      r.points.forEach(function (p, j) {
        var ligne = [];
        if (j === 0) ligne.push({ content: pdfTxt(r.titre), rowSpan: r.points.length,
          styles: { valign: "middle", fontStyle: "bold", fillColor: [225, 239, 236], textColor: ACCENT } });
        var com = U().texteCommentaire(p), ref = refPhotos(p, num);
        ligne.push(pdfTxt(p.libelle), p.statut || "", pdfTxt(com + (ref ? (com ? "\n" : "") + "(" + ref + ")" : "")));
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

  /* Annexe : pour chaque point ayant des photos, le point, son statut, son commentaire, puis les photos */
  function annexePhotos(doc, a, photos, num, limiteBas) {
    var groupes = [];
    a.grille.forEach(function (r) { r.points.forEach(function (p) {
      var ids = (p.photos || []).filter(function (id) { return photos[id]; });
      if (ids.length) groupes.push({ r: r, p: p, ids: ids });
    }); });
    if (!groupes.length) return;

    var HAUT = 18, LARG_MAX = 130, HAUT_MAX = 100;
    doc.addPage();
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.text("Annexe - Photos", 14, HAUT);
    var y = HAUT + 9;

    groupes.forEach(function (g) {
      var com = U().texteCommentaire(g.p) || "Pas de commentaire.";
      doc.setFontSize(9.5);
      var lignesCom = doc.splitTextToSize(pdfTxt(com), 182);
      var hEntete = 6 + lignesCom.length * 4.3 + 3;
      if (y + hEntete + 45 > limiteBas) { doc.addPage(); y = HAUT; }

      doc.setFillColor(225, 239, 236); doc.rect(14, y - 4.5, 182, 6.5, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
      var titre = pdfTxt(g.r.titre + " > " + g.p.libelle);
      doc.text(doc.splitTextToSize(titre, 160)[0], 16, y);
      if (g.p.statut) {
        var col = couleurStatut(g.p.statut);
        doc.setTextColor(col[0], col[1], col[2]);
        doc.text(g.p.statut, 194, y, { align: "right" });
      }
      y += 6;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(30, 30, 30);
      doc.text(lignesCom, 14, y);
      y += lignesCom.length * 4.3 + 3;

      g.ids.forEach(function (id) {
        var prop = doc.getImageProperties(photos[id]);
        var w = LARG_MAX, h = w * prop.height / prop.width;
        if (h > HAUT_MAX) { h = HAUT_MAX; w = h * prop.width / prop.height; }
        if (y + h + 7 > limiteBas) {
          doc.addPage(); y = HAUT;
          doc.setFont("helvetica", "italic"); doc.setFontSize(8.5); doc.setTextColor(120);
          doc.text(pdfTxt("(suite) " + g.p.libelle), 14, y); y += 5;
        }
        doc.addImage(photos[id], "JPEG", 14, y, w, h, id);
        doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(80);
        doc.text("Photo " + num[id], 14, y + h + 4);
        y += h + 9;
      });
      doc.setDrawColor(210); doc.setLineWidth(0.2); doc.line(14, y - 3, 196, y - 3);
      y += 3;
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

  window.Exports = { csv: csv, xlsx: xlsx, pdf: pdf, sauvegarde: sauvegarde };
})();
