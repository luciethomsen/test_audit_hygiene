/* Exports CSV, Excel, PDF et sauvegarde JSON.
 * Tout est généré sur l'appareil, puis envoyé au menu de partage natif
 * (Drive, Mail, Fichiers, WhatsApp...). Repli : téléchargement classique. */
(function () {
  "use strict";

  function U() { return window.AuditUtils; }

  function slug(s) {
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "audit";
  }
  function nomFichier(a, ext) { return "audit_" + slug(a.etablissement) + "_" + a.date + "." + ext; }

  function lignes(a) {
    var out = [];
    a.grille.forEach(function (r) {
      r.points.forEach(function (p) {
        out.push({ rubrique: r.titre, point: p.libelle, statut: p.statut, commentaire: U().texteCommentaire(p) });
      });
    });
    return out;
  }

  function partager(blob, nom, mime) {
    var fichier;
    try { fichier = new File([blob], nom, { type: mime }); } catch (e) { fichier = null; }
    if (fichier && navigator.canShare && navigator.canShare({ files: [fichier] })) {
      navigator.share({ files: [fichier], title: nom }).catch(function (e) {
        if (e && e.name === "AbortError") return;
        telecharger(blob, nom);
      });
      return;
    }
    telecharger(blob, nom);
  }
  function telecharger(blob, nom) {
    var url = URL.createObjectURL(blob);
    var lien = document.createElement("a");
    lien.href = url; lien.download = nom;
    document.body.appendChild(lien); lien.click(); lien.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    if (window.AuditApp) window.AuditApp.toast("Fichier enregistré : " + nom);
  }

  /* ---------- CSV (séparateur ; et BOM UTF-8 pour Excel en français) ---------- */
  function champCsv(v) {
    v = String(v == null ? "" : v);
    return /[";\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function csv(a) {
    var entete = ["N° audit", "Établissement", "Adresse", "Type d'établissement", "Date", "Auditeur",
      "Responsable rencontré", "Rapport", "Type de points", "Points audités", "C/NC", "Commentaire / détails"];
    var rows = [entete].concat(lignes(a).map(function (l) {
      return [a.numero || "", a.etablissement, a.adresse || "", a.typeNom, U().dateFr(a.date), a.auditeur || "",
        a.responsable || "", a.rapport || "", l.rubrique, l.point, l.statut, l.commentaire];
    }));
    var texte = "﻿" + rows.map(function (r) { return r.map(champCsv).join(";"); }).join("\r\n");
    partager(new Blob([texte], { type: "text/csv;charset=utf-8" }), nomFichier(a, "csv"), "text/csv");
  }

  /* ---------- Excel (colonne 1 fusionnée) ---------- */
  function xlsx(a) {
    if (!window.XLSX) throw new Error("bibliothèque Excel non chargée");
    var c = U().compter(a);
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
      ["Type de points", "Points audités", "C/NC", "Commentaire / détails"]
    ];
    var debut = aoa.length;
    var merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
    a.grille.forEach(function (r) {
      var premiere = aoa.length;
      r.points.forEach(function (p, j) {
        aoa.push([j === 0 ? r.titre : "", p.libelle, p.statut, U().texteCommentaire(p)]);
      });
      if (r.points.length > 1) merges.push({ s: { r: premiere, c: 0 }, e: { r: aoa.length - 1, c: 0 } });
    });
    var ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!merges"] = merges;
    ws["!cols"] = [{ wch: 26 }, { wch: 48 }, { wch: 8 }, { wch: 70 }];
    ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: debut - 1, c: 0 }, e: { r: aoa.length - 1, c: 3 } }) };
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit");
    var data = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    var mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    partager(new Blob([data], { type: mime }), nomFichier(a, "xlsx"), mime);
  }

  /* ---------- PDF ---------- */
  /* Les polices standard du PDF ne couvrent que le jeu Windows-1252 :
     on remplace les quelques symboles hors de ce jeu. */
  function pdfTxt(s) {
    return String(s == null ? "" : s)
      .replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/[‐‑‒–—]/g, "-")
      .replace(/[^\x00-\xFF€ŒœŠšŽžŸƒ‘’“”•…™]/g, "?");
  }
  function pdf(a) {
    if (!window.jspdf) throw new Error("bibliothèque PDF non chargée");
    var doc = new window.jspdf.jsPDF({ unit: "mm", format: "a4" });
    var c = U().compter(a);
    var vert = [46, 125, 50], rouge = [198, 40, 40], accent = [31, 92, 85];

    var E = (typeof ENTETE !== "undefined" && ENTETE) || {};
    var y = 14;
    if (E.societe) {
      doc.setDrawColor(30); doc.setLineWidth(0.4); doc.rect(14, 9, 92, 18);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(30, 30, 30);
      doc.text(pdfTxt(E.societe), 16, 14);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
      if (E.adresse) doc.text(pdfTxt(E.adresse), 16, 19);
      if (E.contact) doc.text(pdfTxt(E.contact), 16, 24);
    }
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(accent[0], accent[1], accent[2]);
    doc.text(pdfTxt("Audit hygiène" + (a.numero ? " n° " + a.numero : "")), 196, 15, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(30, 30, 30);
    doc.text(pdfTxt("Réalisé le " + U().dateFr(a.date) + (a.auditeur ? " par " + a.auditeur : "")), 196, 21, { align: "right" });
    if (a.rapport) doc.text(pdfTxt("Rapport : " + a.rapport), 196, 26, { align: "right" });
    y = 34;
    doc.setFontSize(10);
    var infos = [
      "Établissement : " + a.etablissement + " (" + a.typeNom + ")" + (a.adresse ? " - " + a.adresse : ""),
      a.responsable ? "Responsable rencontré : " + a.responsable : "",
      "Points évalués : " + c.evalues + "/" + c.total + "     Conformes : " + c.C + "     Non conformes : " + c.NC +
        (c.NA ? "     Non applicables : " + c.NA : "") + "     Taux de conformité : " + (c.taux === null ? "-" : c.taux + " %")
    ].filter(Boolean);
    infos.forEach(function (t, k) { doc.text(pdfTxt(t), 14, y + k * 5.5); });
    var debutTableau = y + infos.length * 5.5 + 2;

    var body = [];
    a.grille.forEach(function (r) {
      r.points.forEach(function (p, j) {
        var ligne = [];
        if (j === 0) ligne.push({ content: pdfTxt(r.titre), rowSpan: r.points.length,
          styles: { valign: "middle", fontStyle: "bold", fillColor: [225, 239, 236], textColor: accent } });
        ligne.push(pdfTxt(p.libelle), p.statut || "", pdfTxt(U().texteCommentaire(p)));
        body.push(ligne);
      });
    });

    doc.autoTable({
      startY: debutTableau,
      margin: { bottom: E.mention ? 24 : 16 },
      head: [["Type de points", "Points audités", "C/NC", "Commentaire / détails"]],
      body: body,
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 2, lineColor: [200, 200, 200], lineWidth: 0.2, textColor: [30, 30, 30] },
      headStyles: { fillColor: accent, textColor: 255, fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 32 }, 1: { cellWidth: 58 }, 2: { cellWidth: 14, halign: "center", fontStyle: "bold" }, 3: { cellWidth: "auto" } },
      didParseCell: function (d) {
        if (d.section !== "body" || d.column.index !== 2) return;
        var t = d.cell.raw;
        if (t === "C") d.cell.styles.textColor = vert;
        if (t === "NC") { d.cell.styles.textColor = rouge; }
        if (t === "NA") { d.cell.styles.textColor = [120, 120, 120]; }
      },
      didDrawPage: function () {
        var n = doc.internal.getNumberOfPages();
        doc.setFont("helvetica", "normal"); doc.setTextColor(120);
        if (E.mention) {
          doc.setFontSize(6.5);
          doc.text(doc.splitTextToSize(pdfTxt(E.mention), 182), 14, 280);
        }
        doc.setFontSize(8);
        doc.text(pdfTxt(a.etablissement + " - " + U().dateFr(a.date)), 14, 291);
        doc.text("Page " + n, 196, 291, { align: "right" });
      }
    });

    var blob = doc.output("blob");
    partager(blob, nomFichier(a, "pdf"), "application/pdf");
  }

  /* ---------- Sauvegarde complète ---------- */
  function sauvegarde(audits) {
    var d = new Date().toISOString().slice(0, 10);
    var blob = new Blob([JSON.stringify({ app: "audit-hygiene", version: 1, exporteLe: new Date().toISOString(), audits: audits }, null, 1)],
      { type: "application/json" });
    partager(blob, "sauvegarde_audits_" + d + ".json", "application/json");
  }

  window.Exports = { csv: csv, xlsx: xlsx, pdf: pdf, sauvegarde: sauvegarde };
})();
