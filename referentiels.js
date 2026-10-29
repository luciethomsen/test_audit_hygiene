/*
 * GRILLE D'AUDIT
 * --------------
 * C'est le seul fichier à modifier pour changer la grille.
 *
 *   rubrique (colonne 1)  -> { titre, points: [...] }
 *   point    (colonne 2)  -> { libelle, messages: [...] }
 *   messages (colonne 4)  -> textes proposés quand on touche la case commentaire
 *
 * Après modification, augmenter VERSION dans sw.js pour que les téléphones
 * récupèrent la nouvelle grille.
 */

/* En-tête et mention de bas de page du rapport PDF (laisser "" pour masquer une ligne) */
const ENTETE = {
  societe: "Centre d'Hygiène et de Sécurité Alimentaire",
  adresse: "147 Av Marcel Mérieux 69530 Brignais",
  contact: "04 37 70 82 40 - contact@chsahygiene.com",
  mention: "Les points audités sont une liste indicative établie dans l'esprit de l'arrêté du 09/05/95 modifié relatif à l'hygiène des aliments remis au consommateur. La société CHSA ne pourra être tenue pour responsable en cas de divergence avec les avis et recommandations de l'administration chargée des contrôles officiels."
};

/* Types proposés à la création d'un audit (information seulement, la grille est la même) */
const TYPES_ETABLISSEMENT = [
  "Restaurant", "Boulangerie / pâtisserie", "Boucherie / charcuterie",
  "Traiteur", "Snack / restauration rapide", "Autre"
];

const GRILLE = [
  {
    titre: "Hygiène",
    points: [
      { libelle: "Vestiaires (séparation tenues travail/perso)",
        messages: ["Absence de vestiaire", "Tenues de travail et personnelles mélangées", "Vestiaire encombré / sale", "Vestiaire situé en zone de production", "Chaussures au sol"] },
      { libelle: "Toilettes séparées",
        messages: ["Toilettes donnant directement sur une zone alimentaire", "Absence de robinet non manuel", "Toilettes sales", "Absence de lave-mains dans les toilettes"] },
      { libelle: "Tenue de travail",
        messages: ["Tenue sale", "Charlotte / coiffe absente", "Tenue incomplète", "Bijoux portés", "Chaussures non dédiées", "Pas de chaussures fermées"] },
      { libelle: "Robinet Lave-mains (non manuel)",
        messages: ["Commande manuelle", "Non fonctionnel", "Lave-mains absent", "Lave-mains encombré", "Pas d'eau chaude", "Lave-mains éloigné du poste de travail"] },
      { libelle: "Distributeur de savon",
        messages: ["Absent", "Vide", "Savon en pain", "Distributeur sale / défectueux"] },
      { libelle: "Savon bactéricide",
        messages: ["Savon non bactéricide", "Fiche technique absente", "Savon non adapté (produit vaisselle...)"] },
      { libelle: "Papiers Essuie-mains à usage unique",
        messages: ["Absents", "Distributeur vide", "Torchon / essuie-mains textile utilisé", "Poubelle à proximité absente"] }
    ]
  },
  {
    titre: "Traçabilité et suivi qualité",
    points: [
      { libelle: "Contrôles à réception",
        messages: ["Contrôles non effectués", "Températures non relevées", "Enregistrements absents", "Bons de livraison non conservés"] },
      { libelle: "Contrôle quotidien des DLC/DDM",
        messages: ["Produits à DLC dépassée", "Contrôle non enregistré", "Produits retirés lors de l'audit"] },
      { libelle: "Conservation des étiquettes",
        messages: ["Étiquettes non conservées", "Classement absent", "Durée de conservation insuffisante"] },
      { libelle: "Marche en avant (séparation sain/souillé)",
        messages: ["Croisement des flux", "Pas de séparation sain/souillé", "Déchets traversant la zone de production", "Déconditionnement en zone propre"] },
      { libelle: "Balances en métrologie légale",
        messages: ["Vignette de vérification absente", "Vérification périodique dépassée", "Balance non homologuée"] },
      { libelle: "Affichage de l'origine des viandes (UE + pays)",
        messages: ["Affichage absent", "Affichage incomplet", "Origine bovine non précisée", "Affichage non visible du client"] },
      { libelle: "Liste des Allergènes",
        messages: ["Liste absente", "Liste incomplète", "Liste non à jour", "Non accessible au client"] },
      { libelle: "Mention Allergènes sur les produits",
        messages: ["Mention absente", "Mention incomplète", "Allergènes non mis en évidence"] },
      { libelle: "Fait maison",
        messages: ["Logo / mention absent", "Mention utilisée à tort", "Affichage non conforme"] },
      { libelle: "Existence du PMS / DU (analyse microbio)",
        messages: ["PMS absent", "PMS non à jour", "Document unique absent", "Analyses microbiologiques absentes", "Analyses non à jour"] }
    ]
  },
  {
    titre: "Nettoyage/désinfection",
    points: [
      { libelle: "Absence d'insectes / rongeurs (crotte)",
        messages: ["Présence de crottes", "Présence d'insectes", "Traces de rongeurs", "Denrées attaquées"] },
      { libelle: "Dératisation/désinsectisation par prestataire agréé",
        messages: ["Pas de contrat", "Contrat non disponible", "Passages non à jour", "Plan des appâts absent"] },
      { libelle: "Facilité de nettoyage des locaux",
        messages: ["Zones difficiles d'accès", "Matériel non déplaçable", "Encombrement", "Revêtements non lessivables"] },
      { libelle: "Plan de nettoyage/désinfection",
        messages: ["Plan absent", "Plan non affiché", "Plan non à jour", "Enregistrements non renseignés"] },
      { libelle: "Séparation des produits d'entretien",
        messages: ["Stockés avec les denrées", "Stockés au-dessus des denrées", "Pas de zone dédiée"] },
      { libelle: "Conformité des produits nettoyage/désinfection",
        messages: ["Produits non agréés contact alimentaire", "Fiches techniques absentes", "Produits non conformes aux normes EN"] },
      { libelle: "Conditions d'utilisation des produits",
        messages: ["Dosage non respecté", "Temps de contact non respecté", "Produit déconditionné non étiqueté", "Rinçage non effectué"] },
      { libelle: "Conformité du matériel d'entretien (abs bois)",
        messages: ["Matériel en bois", "Matériel usé / sale", "Éponges / lavettes en mauvais état", "Matériel non séparé (toilettes / production)"] }
    ]
  },
  {
    titre: "Etat général et propreté des locaux & matériels",
    points: [
      { libelle: "Sols", messages: ["Sol sale", "Revêtement dégradé", "Joints encrassés", "Raccord mur-sol non arrondi"] },
      { libelle: "Murs", messages: ["Murs sales", "Revêtement dégradé", "Peinture écaillée", "Moisissures", "Revêtement non lessivable"] },
      { libelle: "Plafonds", messages: ["Plafond sale", "Peinture écaillée", "Moisissures / condensation", "Dalles manquantes ou abîmées"] },
      { libelle: "Eclairage (+ protection)", messages: ["Éclairage insuffisant", "Néons sans protection", "Luminaires sales", "Ampoule défectueuse"] },
      { libelle: "Ventilation & aération", messages: ["Ventilation insuffisante", "Grilles encrassées", "Condensation", "Odeurs"] },
      { libelle: "Fenêtres & ouvertures (+ moustiquaires)", messages: ["Moustiquaire absente", "Moustiquaire abîmée", "Porte laissée ouverte", "Encadrements sales"] },
      { libelle: "Evacuation eau (bonde)", messages: ["Bonde sale", "Grille absente", "Évacuation bouchée / lente", "Odeurs"] },
      { libelle: "Plans de travail", messages: ["Sales", "Revêtement dégradé", "Plan en bois", "Encombrés"] },
      { libelle: "Etagères et clayettes (pas de bois)", messages: ["Étagères en bois", "Sales", "Rouillées", "Surchargées"] },
      { libelle: "Piano / micro-ondes", messages: ["Piano encrassé", "Micro-ondes sale", "Graisse accumulée", "Matériel défectueux"] },
      { libelle: "Ustensiles de cuisine", messages: ["Ustensiles sales", "Ustensiles en bois", "Ustensiles abîmés", "Rangement non protégé"] },
      { libelle: "Trancheuse (propreté + housse)", messages: ["Trancheuse sale", "Housse absente", "Nettoyage non effectué après usage", "Lame abîmée"] },
      { libelle: "Friteuse / Huile de friteuse (+ tests)", messages: ["Huile usagée / noire", "Tests d'huile non réalisés", "Friteuse encrassée", "Enregistrements absents"] },
      { libelle: "Hottes (+ dégraissage annuel)", messages: ["Filtres encrassés", "Graisse accumulée", "Dégraissage annuel non justifié", "Attestation absente"] },
      { libelle: "Banques réfrigérées (Joint : étanchéité)", messages: ["Joints abîmés", "Joints sales", "Défaut d'étanchéité", "Givre / condensation"] },
      { libelle: "Réfrigérateurs (+ étanchéité)", messages: ["Joints abîmés", "Intérieur sale", "Défaut d'étanchéité", "Réfrigérateur domestique"] },
      { libelle: "Congélateurs (+ étanchéité)", messages: ["Givre important", "Joints abîmés", "Intérieur sale", "Défaut d'étanchéité"] },
      { libelle: "Thermomètres", messages: ["Thermomètre absent", "Thermomètre défectueux", "Non étalonné / non vérifié", "Pas de sonde à cœur"] },
      { libelle: "Eviers (+ joint)", messages: ["Évier sale", "Joints noircis / abîmés", "Fuite", "Évier encombré"] },
      { libelle: "Plonge (+ séparation plonge)", messages: ["Plonge non séparée de la production", "Vaisselle sale accumulée", "Lave-vaisselle sale", "Zone encombrée"] },
      { libelle: "Poubelles (+ pédale/couvercle)", messages: ["Sans couvercle", "Commande manuelle", "Poubelle sale", "Poubelle débordante"] },
      { libelle: "Gestion des déchets (huile usagée)", messages: ["Pas de collecte de l'huile usagée", "Justificatif de collecte absent", "Stockage des déchets non conforme", "Local poubelles sale"] }
    ]
  },
  {
    titre: "Sécurité",
    points: [
      { libelle: "Installations électriques (+ vérification périodique)",
        messages: ["Vérification périodique non justifiée", "Rapport de vérification absent", "Prises / câbles détériorés", "Multiprises en cascade"] },
      { libelle: "Extincteurs (+ vérification périodique)",
        messages: ["Extincteur absent", "Vérification annuelle dépassée", "Extincteur non accessible", "Type d'extincteur non adapté"] },
      { libelle: "Sécurité du matériel",
        messages: ["Protections de sécurité absentes", "Matériel défectueux", "Arrêt d'urgence absent / inopérant", "Notice non disponible"] }
    ]
  },
  {
    titre: "Stockage",
    points: [
      { libelle: "Propreté des réserves", messages: ["Réserves sales", "Encombrement", "Présence de nuisibles", "Produits non alimentaires stockés"] },
      { libelle: "Absence de stockage à même le sol", messages: ["Denrées au sol", "Cartons au sol", "Absence de palettes / caillebotis"] },
      { libelle: "Absence de cartons/cagettes", messages: ["Cartons en chambre froide", "Cagettes en bois", "Cartons en zone de production"] },
      { libelle: "Protection des denrées entamées (emballage refermé)", messages: ["Denrées non filmées", "Emballages ouverts", "Contenants sans couvercle"] },
      { libelle: "Absence de conserves entamées", messages: ["Conserves ouvertes stockées en l'état", "Contenu non transvasé"] },
      { libelle: "Présence des dates de fabric. / ouverture / congél.", messages: ["Date de fabrication absente", "Date d'ouverture absente", "Date de congélation absente", "Étiquetage illisible"] },
      { libelle: "Rotation des stocks (FIFO)", messages: ["FIFO non respecté", "Produits anciens au fond", "Stock excessif"] },
      { libelle: "Contenants (ne pas réutiliser emballages des MP)", messages: ["Emballages de matières premières réutilisés", "Contenants non alimentaires", "Contenants abîmés"] },
      { libelle: "Identification des produits destinés au personnel", messages: ["Produits du personnel non identifiés", "Mélangés avec les denrées", "Pas de zone dédiée"] }
    ]
  },
  {
    titre: "Maîtrise de la chaîne du froid",
    points: [
      { libelle: "Température congélateurs (-18°)", messages: ["Température > -18 °C", "Afficheur absent / défectueux", "Pas de thermomètre"] },
      { libelle: "Température chambres froides (4°)", messages: ["Température > 4 °C", "Afficheur absent / défectueux", "Pas de thermomètre"] },
      { libelle: "Température réfrigérateurs (4°)", messages: ["Température > 4 °C", "Pas de thermomètre", "Réfrigérateur surchargé"] },
      { libelle: "Température banques réfrigérées (4°)", messages: ["Température > 4 °C", "Pas de thermomètre", "Couvercles / portes laissés ouverts"] },
      { libelle: "Suivi Contrôle journalier des températures", messages: ["Relevés non effectués", "Relevés incomplets", "Écarts non traités", "Pas d'action corrective notée"] }
    ]
  },
  {
    titre: "Affichage obligatoire",
    points: [
      { libelle: "Mentions légales sur carte (abus d'alcool/prix TTC)", messages: ["Mention abus d'alcool absente", "Prix TTC non indiqués", "Mention service compris absente", "Origine des viandes absente"] },
      { libelle: "Affichage obligatoire (si salariés)", messages: ["Affichage absent", "Affichage incomplet", "Affichage non à jour", "Non visible des salariés"] },
      { libelle: "Interdiction de fumer + animaux", messages: ["Affichage interdiction de fumer absent", "Affichage animaux absent", "Signalétique non conforme"] },
      { libelle: "Conditions de décongélation", messages: ["Affichage absent", "Décongélation à température ambiante", "Produits décongelés non datés"] },
      { libelle: "Prix du pain (unité et au kg)", messages: ["Prix au kg absent", "Prix à l'unité absent", "Affichage non visible"] }
    ]
  },
  {
    titre: "Label",
    points: [
      { libelle: "Label CHSA affiché", messages: ["Label non affiché", "Label non visible du client", "Label périmé"] }
    ]
  }
];
