/**
 * Deutsche Texte der öffentlichen Seiten der Schule.
 *
 * Deutsch ist die Quelle: hier wird formuliert, `en.ts` folgt. Die Struktur ist
 * bewusst flach verschachtelt, damit next-intl die Dateien später ohne Umbau
 * übernehmen kann.
 *
 * Nur öffentliche Oberflächen (Landing, Termine, Tag 1, Navigation). Der
 * Bereich hinter dem Login bleibt vorerst deutsch — die Extraktion dort ist
 * ein eigener Schritt (Phasenplan KW43), und Kursinhalt folgt in KW47.
 */
export const de = {
  nav: {
    courses: 'Kurse',
    events: 'Termine',
    patterns: 'Patterns',
    glossary: 'Glossar',
    profile: 'Profil',
    coach: 'Coach',
    tool: 'Werkzeug',
    login: 'Einloggen',
    signup: 'Konto erstellen',
    menu: 'Menü',
    close: 'Schließen',
    openMenu: 'Menü öffnen',
    language: 'Sprache',
    toGerman: 'Auf Deutsch',
    toEnglish: 'In English',
  },

  events: {
    eyebrow: 'Die Schule',
    title: 'Kommende Termine',
    intro:
      'Live-Trainings, Fragerunden und Workshops. Was offen ist, siehst du auch ohne Konto.',
    empty: 'Gerade ist nichts geplant. Sobald ein Termin steht, findest du ihn hier.',
    allDay: 'ganztägig',
    back: '← Alle Termine',
    door: 'Zum Raum',
    doorSoon: 'Die Tür öffnet kurz vor Beginn.',
    moreOnWebsite: 'Mehr auf handpan.schule',
    hintLogin: 'Melde dich an, dann siehst du hier die Tür zum Raum.',
    hintCircle: 'Dieser Termin gehört zum Inneren Kreis.',
    hintProgram:
      'Dieser Termin gehört zu einem Kurs. Wer dabei ist, kommt hier hinein.',
    circleOpens: 'Dazu sage ich dir rechtzeitig Bescheid.',
    toCourses: 'Zu den Kursen',
    login: 'Einloggen',
    freeAccount: 'Kostenloses Konto',
    kinds: {
      live_training: 'Live-Training',
      qa: 'Fragerunde',
      workshop: 'Workshop',
      retreat: 'Retreat',
      community: 'Gemeinsam',
    },
  },

  courses: {
    eyebrow: 'Die Schule',
    title: 'Kurse zum Selbststudium',
    intro:
      'Fertige Kurse, die du in deinem Tempo gehst. Video für Video, Übung für Übung, ohne feste Termine.',
    selfStudyNote:
      'Diese Kurse laufen ohne Begleitung: kein Live-Termin, keine Gruppe. Du bekommst das Material und gehst deinen Weg.',
    preparing: 'In Vorbereitung',
    preparingNote:
      'Die englische Fassung entsteht gerade. Trag dich ein, dann sage ich dir Bescheid, sobald sie offen ist.',
    buy: 'Kurs kaufen',
    included: 'Was drin ist',
    germanNote:
      'Der Kurs läuft heute auf Deutsch. Die englische Fassung ist in Arbeit.',
    notifyTitle: 'Sag mir Bescheid',
  },

  briefe: {
    consent:
      'Ja, schick mir Briefe aus der Schule: Impulse zu Handpan und Bewusstsein, Termine und Einladungen zu Kursen. Abmelden geht in jeder Mail. Mehr in der Datenschutzerklärung.',
    privacyWord: 'Datenschutzerklärung',
    submit: 'Tag 1 holen',
    sending: 'Einen Moment …',
    success:
      'Fast geschafft: Schau in dein Postfach und klick den Bestätigungslink. Dann öffnet sich Tag 1.',
    error:
      'Das hat gerade nicht geklappt. Versuch es gleich noch einmal oder schreib mir.',
    emailLabel: 'Deine E-Mail-Adresse',
  },
}

/**
 * Kein `as const`: sonst wäre jeder deutsche Text sein eigener Literaltyp und
 * `en.ts` könnte keinen anderen Wortlaut haben. Geprüft werden die Schlüssel,
 * nicht die Wörter — genau das soll die Übersetzung ja ändern.
 */
export type Messages = typeof de
