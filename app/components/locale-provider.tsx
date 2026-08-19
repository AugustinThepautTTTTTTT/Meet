"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "fr" | "en";
const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({ locale: "fr", setLocale: () => undefined });
const sourceText = new WeakMap<Node, string>();
const sourceAttributes = new WeakMap<Element, Record<string, string>>();

// Canonical product copy remains English in the code and database. This layer
// localises interface-owned text while leaving names, user content and legal
// documents untouched.
const fr: Record<string, string> = {
  "Find a lawyer": "Trouver un avocat", "For lawyers": "Pour les avocats", "Client sign in": "Connexion client", "Lawyer sign in": "Connexion avocat",
  "AI-guided legal matching": "Mise en relation juridique assistée par IA", "Tell us what happened.": "Expliquez-nous votre situation.", "Meet the right lawyer.": "Rencontrez le bon avocat.",
  "Describe your situation in your own words. We’ll understand what you need and introduce you to lawyers who fit.": "Décrivez votre situation avec vos propres mots. Nous identifierons votre besoin et vous présenterons les avocats les plus adaptés.",
  "How Meet works": "Comment fonctionne Meet", "Explain your situation": "Expliquez votre situation", "Review your matches": "Découvrez vos avocats", "Book securely": "Réservez en toute sécurité",
  "Meet helps you find independent lawyers. It does not provide legal advice.": "Meet vous aide à trouver des avocats indépendants. Meet ne fournit pas de conseil juridique.",
  "What do you need help with?": "Pour quelle situation avez-vous besoin d’aide ?", "Private & confidential": "Privé et confidentiel", "A few sentences is enough": "Quelques phrases suffisent",
  "Have a relevant document?": "Vous avez un document utile ?", "Attach it now and Meet will use it to understand your situation.": "Ajoutez-le maintenant : Meet l’utilisera pour mieux comprendre votre situation.",
  "Attach a document": "Joindre un document", "Try an example": "Essayer un exemple", "I lost my job": "J’ai perdu mon emploi", "My visa expires": "Mon titre de séjour expire", "I’m getting divorced": "Je divorce", "Landlord dispute": "Litige locatif",
  "Start conversation": "Démarrer la conversation", "Free to use · No commitment · Takes about 2 minutes": "Gratuit · Sans engagement · Environ 2 minutes",
  "Verified": "Vérifiés", "Every lawyer is credential-checked": "Les informations professionnelles de chaque avocat sont vérifiées", "Relevant": "Pertinents", "Matched to your exact situation": "Sélectionnés selon votre situation précise", "Independent": "Indépendant", "You choose who to contact": "Vous choisissez qui contacter",
  "Meet assistant": "Assistant Meet", "Understanding your employment matter": "Analyse de votre dossier en droit du travail", "Private, document-aware conversation": "Conversation privée tenant compte de vos documents", "Add a document": "Ajouter un document", "Type your answer…": "Écrivez votre réponse…",
  "Change my first message": "Modifier mon premier message", "0/3 · PDF, DOCX or TXT · 8 MB max": "0/3 · PDF, DOCX ou TXT · 8 Mo maximum",
  "Meet is understanding your situation": "Meet analyse votre situation", "Send answer": "Envoyer la réponse", "Your answer": "Votre réponse", "Meet extracts relevant facts with AI. The original stays private and is shared only with the lawyer you contact.": "Meet extrait les éléments utiles avec l’IA. Le document original reste privé et n’est transmis qu’à l’avocat que vous contactez.",
  "I’ve read the useful facts from this document. I’ll only ask about missing or ambiguous details, and share the originals with your lawyer.": "J’ai lu les éléments utiles de ce document. Je vous interrogerai uniquement sur les points manquants ou ambigus, et l’original sera transmis à votre avocat.",
  "I’ve read the useful facts from these documents. I’ll only ask about missing or ambiguous details, and share the originals with your lawyer.": "J’ai lu les éléments utiles de ces documents. Je vous interrogerai uniquement sur les points manquants ou ambigus, et les originaux seront transmis à votre avocat.",
  "Reading document…": "Lecture du document…", "Reading your document…": "Lecture de votre document…", "Remove": "Retirer", "Meeting requested ✓": "Rendez-vous demandé ✓",
  "Optional · Up to 3 PDF, DOCX or TXT files · 8 MB each · Originals stay private": "Facultatif · Jusqu’à 3 fichiers PDF, DOCX ou TXT · 8 Mo chacun · Les originaux restent privés", "Jurisdiction or procedure": "Juridiction ou procédure", "Relevant bar": "Barreau pertinent",
  "Live case summary": "Synthèse en direct", "Your case summary": "Synthèse de votre dossier", "Understanding your situation": "Compréhension de votre situation", "What we understand": "Ce que nous avons compris", "Legal area": "Domaine juridique", "Jurisdiction": "Juridiction", "Timing": "Échéances", "Desired outcome": "Objectif recherché", "Still useful to clarify": "Points restant à préciser", "Not clear yet": "À préciser", "Being assessed": "En cours d’analyse", "Being identified": "En cours d’identification",
  "This summary is prepared for matching, not legal advice.": "Cette synthèse sert à la mise en relation et ne constitue pas un conseil juridique.", "This brief will be shared only with the lawyer you contact.": "Cette synthèse sera uniquement transmise à l’avocat que vous contacterez.",
  "Preparing your brief and shortlist…": "Préparation de votre synthèse et de votre sélection…", "Your shortlist": "Votre sélection", "One lawyer strongly fits your situation": "Un avocat correspond particulièrement à votre situation", "No sufficiently qualified match yet": "Aucune correspondance suffisamment pertinente pour le moment",
  "View profile": "Voir le profil", "Choose a time": "Choisir un créneau", "Contact": "Contacter", "Consultation": "Consultation", "First consultation": "Première consultation", "Next available": "Prochaine disponibilité",
  "Your private space": "Votre espace privé", "Your legal requests.": "Vos demandes juridiques.", "Start another request": "Nouvelle demande", "Start a new request": "Nouvelle demande", "Follow your legal requests.": "Suivez vos demandes juridiques.", "Loading your requests…": "Chargement de vos demandes…", "No requests yet.": "Aucune demande pour le moment.",
  "Client account": "Espace client", "Sign out": "Se déconnecter", "Requests": "Demandes", "Situation": "Situation", "Lawyer": "Avocat", "Proposed time": "Créneau proposé", "Preferred time": "Créneau souhaité", "Deadline": "Échéance", "Urgency": "Urgence", "Key facts": "Éléments clés", "Conflict-check names": "Parties concernées",
  "Case brief": "Synthèse du dossier", "Review your conversation with Meet": "Relire votre conversation avec Meet", "View the brief shared with the lawyer": "Voir la synthèse transmise à l’avocat", "Your current matters": "Vos dossiers en cours", "Opening your secure workspace…": "Ouverture de votre espace sécurisé…",
  "Lawyer workspace": "Espace avocat", "Private profile dashboard": "Tableau de bord privé", "Client inquiries": "Demandes clients", "Confirmed meetings": "Rendez-vous confirmés", "Calendar preview": "Aperçu du calendrier", "Your week": "Votre semaine", "Calendar connection": "Connexion du calendrier", "Connected calendar": "Calendrier connecté",
  "Your practice,": "Votre activité,", "in one place.": "réunie au même endroit.", "Build a profile clients understand, publish useful legal insights and keep every detail of your practice current.": "Créez un profil clair pour vos clients, publiez des analyses utiles et maintenez vos informations professionnelles à jour.", "Create account": "Créer un compte", "Sign in": "Se connecter", "Join Meet as a lawyer": "Rejoindre Meet en tant qu’avocat", "Welcome back": "Bon retour", "Create your workspace": "Créez votre espace", "Sign in to your practice": "Connectez-vous à votre espace", "Start with the essentials, then design your public profile at your own pace.": "Commencez par l’essentiel, puis construisez votre profil public à votre rythme.", "Manage your public profile, articles and visibility.": "Gérez votre profil public, vos articles et votre visibilité.", "Full name": "Nom complet", "Professional email": "E-mail professionnel", "Password": "Mot de passe", "At least 8 characters": "Au moins 8 caractères", "Please wait…": "Veuillez patienter…", "Create lawyer account": "Créer mon compte avocat", "Back to Meet": "Retour à Meet",
  "Open shared workspace": "Ouvrir l’espace partagé", "Complete payment": "Finaliser le paiement", "Join Google Meet": "Rejoindre Google Meet", "View lawyer profile": "Voir le profil de l’avocat", "View Stripe receipt": "Voir le reçu Stripe", "People or organisations": "Personnes ou organisations", "No deadline confirmed": "Aucune échéance confirmée", "Not provided": "Non renseigné", "Video call": "Visioconférence", "You": "Vous",
  "Choose your lawyer": "Choisissez votre avocat", "Employment & workplace": "Droit du travail", "Commercial contracts & startups": "Contrats commerciaux et startups", "First consultation free": "Première consultation offerte", "Within one business day": "Sous un jour ouvré", "Today at 16:30": "Aujourd’hui à 16 h 30", "Tomorrow at 09:00": "Demain à 9 h 00", "Relevant documents": "Documents utiles", "English": "Anglais", "French": "Français", "Portuguese": "Portugais", "Swedish": "Suédois", "Remote": "À distance",
  "Build a profile clients can trust.": "Créez un profil qui inspire confiance.", "Your public card": "Votre fiche publique", "Your basics": "Vos informations", "Your expertise": "Votre expertise", "Your way of working": "Votre méthode de travail", "Professional name": "Nom professionnel", "City or jurisdiction": "Ville ou juridiction", "Areas of expertise": "Domaines de compétence", "Languages": "Langues", "Credentials": "Qualifications", "Experience": "Expérience", "Services": "Services", "Availability": "Disponibilités", "Save profile": "Enregistrer le profil", "Profile published": "Profil publié", "View live page →": "Voir la page publique →",
  "Draft my profile with AI": "Rédiger mon profil avec l’IA", "AI profile researcher": "Recherche de profil par IA", "Let Meet prepare your first draft": "Laissez Meet préparer une première version", "Apply this draft": "Utiliser cette version", "Sources checked": "Sources consultées",
  "Article library": "Bibliothèque d’articles", "Draft and publish articles": "Rédiger et publier des articles", "New": "Nouveau", "Draft": "Brouillon", "Published": "Publié", "Edit": "Modifier", "Preview": "Aperçu", "Publish when ready": "Publier lorsque tout est prêt", "Title": "Titre", "Content": "Contenu", "Add block": "Ajouter un bloc", "Add an image to this section": "Ajouter une image à cette section", "Adjust image": "Ajuster l’image", "Crop": "Recadrer", "Drag to reposition": "Faites glisser pour repositionner",
  "Shared legal matter": "Dossier juridique partagé", "Everything in one timeline": "Tout dans une même chronologie", "Secure messages": "Messagerie sécurisée", "Private documents": "Documents privés", "Shared checklist": "Liste de suivi partagée", "Files shared for this matter": "Fichiers partagés pour ce dossier", "No documents have been shared yet.": "Aucun document partagé pour le moment.", "No messages yet. Start with a focused question or update.": "Aucun message pour le moment. Commencez par une question ou une information précise.", "No tasks yet. The lawyer can create a focused checklist for the matter.": "Aucune tâche pour le moment. L’avocat peut créer une liste de suivi adaptée au dossier.", "Add task": "Ajouter une tâche", "Assign to client": "Attribuer au client", "Assign to me": "M’attribuer", "Download ↓": "Télécharger ↓",
  "Privacy": "Confidentialité", "How it works": "Fonctionnement", "Clear legal help starts with the right introduction.": "Un accompagnement juridique clair commence par la bonne mise en relation.", "Return to Meet": "Retour à Meet", "Back to dashboard": "Retour au tableau de bord", "Open": "Ouvert", "Busy": "Occupé", "Unavailable": "Indisponible", "Needs review": "À examiner", "Accepted meeting": "Rendez-vous accepté", "Payment": "Paiement", "Meeting": "Rendez-vous", "Client": "Client", "People": "Participants", "Objective": "Objectif", "What happened": "Ce qui s’est passé", "What needs to happen next": "Prochaine étape", "Information still requiring your confirmation": "Informations restant à confirmer",
  "Employment": "Droit du travail", "Family": "Droit de la famille", "Housing": "Droit immobilier", "Business": "Droit des affaires", "Immigration": "Droit des étrangers", "Criminal": "Droit pénal", "Injury": "Préjudice corporel", "Estates": "Successions", "Technology": "Numérique et données", "Other": "Autre",
};

const patterns: Array<[RegExp, (match: RegExpMatchArray) => string]> = [
  [/^Contact (.+)$/, m => `Contacter ${m[1]}`], [/^Work with (.+)$/, m => `Travailler avec ${m[1]}`], [/^Hello, (.+)\.$/, m => `Bonjour, ${m[1]}.`],
  [/^(\d+) lawyers fit your situation$/, m => `${m[1]} avocats correspondent à votre situation`], [/^(\d+)% match$/, m => `${m[1]} % de correspondance`],
  [/^Shared with (.+)$/, m => `Partagé avec ${m[1]}`], [/^Write to (.+)…$/, m => `Écrire à ${m[1]}…`],
  [/^Understanding your (.+) matter$/, m => `Analyse de votre dossier — ${fr[m[1][0].toUpperCase() + m[1].slice(1)] || m[1]}`],
  [/^Optional · Up to (\d+) (.+)$/, m => `Facultatif · Jusqu’à ${m[1]} ${m[2]}`],
  [/^(Paris|Lyon|Marseille|Remote) · (.+)$/, m => `${m[1] === "Remote" ? "À distance" : m[1]} · ${m[2].split(", ").map(language => fr[language] || language).join(", ")}`],
  [/^Today at (.+)$/, m => `Aujourd’hui à ${m[1]}`], [/^Tomorrow at (.+)$/, m => `Demain à ${m[1]}`],
];

function translate(value: string) {
  const leading = value.match(/^\s*/)?.[0] || "";
  const trailing = value.match(/\s*$/)?.[0] || "";
  const clean = value.trim();
  if (!clean) return value;
  const exact = fr[clean];
  if (exact) return `${leading}${exact}${trailing}`;
  for (const [pattern, output] of patterns) {
    const match = clean.match(pattern);
    if (match) return `${leading}${output(match)}${trailing}`;
  }
  return value;
}

function localise(root: ParentNode, locale: Locale) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const element = node.parentElement;
    if (!element || element.closest("[data-no-translate], script, style")) continue;
    if (!sourceText.has(node)) sourceText.set(node, node.textContent || "");
    const original = sourceText.get(node) || "";
    if (locale === "fr") {
      node.textContent = translate(original);
    } else node.textContent = original;
  }
  root.querySelectorAll?.("input[placeholder], textarea[placeholder], [aria-label], [title]").forEach((element) => {
    for (const attribute of ["placeholder", "aria-label", "title"]) {
      const current = element.getAttribute(attribute);
      if (!current) continue;
      const originals = sourceAttributes.get(element) || {};
      if (!originals[attribute]) originals[attribute] = current;
      sourceAttributes.set(element, originals);
      element.setAttribute(attribute, locale === "fr" ? translate(originals[attribute]) : originals[attribute]);
    }
  });
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = localStorage.getItem("meet-locale");
      if (stored === "en" || stored === "fr") setLocaleState(stored);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem("meet-locale", locale);
    localise(document.body, locale);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === "characterData") {
          const node = record.target;
          const previous = sourceText.get(node);
          const current = node.textContent || "";
          const expected = previous === undefined ? undefined : locale === "fr" ? translate(previous) : previous;
          if (current !== expected) {
            sourceText.set(node, current);
            node.textContent = locale === "fr" ? translate(current) : current;
          }
        }
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) localise(node as ParentNode, locale);
          if (node.nodeType === Node.TEXT_NODE && node.parentElement) localise(node.parentElement, locale);
        }
      }
    });
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [locale]);
  const value = useMemo(() => ({ locale, setLocale: setLocaleState }), [locale]);
  return <LocaleContext.Provider value={value}>{children}<div className="locale-switcher" data-no-translate><button className={locale === "fr" ? "active" : ""} onClick={() => setLocaleState("fr")}>FR</button><span>/</span><button className={locale === "en" ? "active" : ""} onClick={() => setLocaleState("en")}>EN</button></div></LocaleContext.Provider>;
}

export function useLocale() { return useContext(LocaleContext); }
