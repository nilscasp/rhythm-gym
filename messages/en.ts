import type { Messages } from './de'
import { TIER_NAMES } from '../app/lib/tiers'

/**
 * English strings for the school's public pages.
 *
 * Typed against the German source, so a forgotten key is a build error rather
 * than a blank spot on the page. The tone follows the German: second person,
 * plain words, no marketing gloss — „Innerer Kreis" stays a circle, not a tier.
 */
export const en: Messages = {
  nav: {
    courses: 'Courses',
    events: 'Events',
    patterns: 'Patterns',
    glossary: 'Glossary',
    profile: 'Profile',
    coach: 'Coach',
    tool: 'Workshop',
    login: 'Log in',
    signup: 'Create account',
    menu: 'Menu',
    close: 'Close',
    openMenu: 'Open menu',
    language: 'Language',
    toGerman: 'Auf Deutsch',
    toEnglish: 'In English',
    today: 'Today',
    practice: 'Practice',
    live: 'Live',
    together: 'Together',
    myPath: 'My path',
    mainNav: 'Main navigation',
    news: 'News',
  },

  events: {
    eyebrow: 'The school',
    title: 'Upcoming events',
    intro:
      'Live trainings, question rounds and workshops. What is open, you can see without an account.',
    empty: 'Nothing is scheduled right now. As soon as something is set, you will find it here.',
    allDay: 'all day',
    // Month calendar and view toggle
    viewMonth: 'Month',
    viewList: 'List',
    calendarLabel: 'Event calendar',
    today: 'Today',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    monthEmpty: 'Nothing is scheduled this month.',
    dayEmpty: 'Nothing is scheduled on this day.',
    eventOne: 'event',
    eventMany: 'events',
    back: '← All events',
    door: 'Enter the room',
    doorSoon: 'The door opens shortly before we begin.',
    moreOnWebsite: 'More on handpan.schule',
    hintLogin: 'Log in and the door to the room appears here.',
    hintCircle: `This one belongs to ${TIER_NAMES.premium}.`,
    hintVip: `This one belongs to ${TIER_NAMES.vip}.`,
    hintProgram: 'This one belongs to a course. Everyone taking it comes in here.',
    circleOpens: 'I will let you know in good time.',
    toCourses: 'To your courses',
    login: 'Log in',
    freeAccount: 'Free account',
    addToCalendar: 'Add to calendar',
    calendarNote: 'The room link is not in the file — it always goes through this page.',
    subscribeFeed: 'Subscribe to all events',
    recordingTitle: 'Recording',
    recordingOpen: 'Watch in the library',
    recordingCircle: `The recording belongs to ${TIER_NAMES.premium}.`,
    recordingVip: `The recording belongs to ${TIER_NAMES.vip}.`,
    recordingProgram: 'The recording belongs to a course.',
    recordingLogin: 'Log in and the recording appears here.',
    questionTitle: 'Your question in advance',
    questionIntro: 'Tell me beforehand what is on your mind. Only I see your question, nobody else.',
    questionPlaceholder: 'What would you like to ask?',
    questionSubmit: 'Send question',
    questionSent: 'Thank you, your question has arrived.',
    questionWithdraw: 'Withdraw',
    questionMine: 'Your questions',
    questionLimit: 'You have already asked three questions for this event.',
    questionInvalid: 'Please write between 3 and 1000 characters.',
    questionError: 'That did not work. Please try again.',
    questionClosed: 'The event has started — I take questions live now.',
    kinds: {
      live_training: 'Live training',
      qa: 'Question round',
      workshop: 'Workshop',
      retreat: 'Retreat',
      community: 'Together',
    },
  },

  courses: {
    eyebrow: 'The school',
    title: 'Self-study courses',
    intro:
      'Finished courses you walk at your own pace. Video by video, exercise by exercise, no fixed dates.',
    selfStudyNote:
      'These run without accompaniment: no live sessions, no group. You get the material and walk your own way.',
    preparing: 'In preparation',
    preparingNote:
      'The English version is being made right now. Leave your address and I will tell you the moment it opens.',
    buy: 'Buy the course',
    included: 'What is inside',
    germanNote: 'This course is taught in German today. The English version is in the making.',
    notifyTitle: 'Tell me when it opens',
  },

  briefe: {
    consent:
      'Yes, send me letters from the school: thoughts on handpan and awareness, dates and invitations to courses. You can unsubscribe from any email. More in the privacy policy.',
    privacyWord: 'privacy policy',
    submit: 'Get day 1',
    sending: 'One moment …',
    success:
      'Almost there: check your inbox and click the confirmation link. Then day 1 opens.',
    error: 'That did not work just now. Try again in a moment, or write to me.',
    emailLabel: 'Your email address',
  },
}
