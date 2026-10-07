/*
 * Landing page content. Every name, date, figure and quote comes from the
 * bundled sample transcript (src/lib/samples.ts), the plan NovaWorks builds
 * from it, and the team directory in src/db/demo-users.ts.
 */

export type LineKind = "decision" | "superseded" | "excluded";

export type TranscriptLine = {
  time: string;
  speaker: string;
  /** The sentence split around the phrase the reader marks. */
  text: readonly [before: string, phrase: string, after: string];
  kind: LineKind;
};

/** Hero excerpt: the UrbanCart part of the meeting, in speaking order. */
export const HERO_LINES: readonly TranscriptLine[] = [
  {
    time: "09:04",
    speaker: "Ayesha",
    text: ["We initially discussed ", "18 October", " as the delivery date."],
    kind: "superseded",
  },
  {
    time: "09:04",
    speaker: "Ayesha",
    text: ["Don’t add a ", "payment task or an inventory task", "."],
    kind: "excluded",
  },
  {
    time: "09:08",
    speaker: "Ali",
    text: ["Put that down as ", "12 estimated hours, due on 12 October", "."],
    kind: "decision",
  },
  {
    time: "09:08",
    speaker: "Ali",
    text: ["Demo cart UI will take ", "8 hours, due 15 October", "."],
    kind: "decision",
  },
  {
    time: "09:12",
    speaker: "Hamza",
    text: ["For Product and cart APIs, I estimate ", "14 hours", "."],
    kind: "decision",
  },
  {
    time: "09:12",
    speaker: "Ayesha",
    text: ["Let’s start with a six-hour estimate and a ", "17 October", " deadline."],
    kind: "superseded",
  },
  {
    time: "09:12",
    speaker: "Ali",
    text: ["But please move that task to ", "19 October", "."],
    kind: "decision",
  },
  {
    time: "09:12",
    speaker: "Ayesha",
    text: ["The final UrbanCart project deadline is ", "20 October", "."],
    kind: "decision",
  },
];

export type PlanTask = { title: string; owner: string; due: string; hours: number };

export const URBANCART = {
  name: "UrbanCart Website",
  client: "UrbanCart Clothing",
  manager: "Ayesha Khan",
  due: "20 Oct",
  earlierDue: "18 Oct",
} as const;

export const URBANCART_TASKS: readonly PlanTask[] = [
  { title: "Product catalog UI", owner: "Ali Raza", due: "12 Oct", hours: 12 },
  { title: "Demo cart UI", owner: "Ali Raza", due: "15 Oct", hours: 8 },
  { title: "Product and cart APIs", owner: "Hamza Shah", due: "14 Oct", hours: 14 },
  { title: "Website integration and testing", owner: "Ali Raza", due: "19 Oct", hours: 6 },
];

/** The date Ayesha first proposed for the last task, replaced by Ali’s correction. */
export const URBANCART_EARLIER_TASK_DUE = "17 Oct";

export type ProjectSummary = {
  name: string;
  manager: string;
  due: string;
  tasks: number;
  hours: number;
};

export const PROJECTS: readonly ProjectSummary[] = [
  { name: "UrbanCart Website", manager: "Ayesha Khan", due: "20 Oct", tasks: 4, hours: 40 },
  { name: "QuickServe Mobile App", manager: "Bilal Ahmed", due: "24 Oct", tasks: 4, hours: 46 },
  { name: "HelpDeskPro AI Assistant", manager: "Hina Malik", due: "22 Oct", tasks: 4, hours: 38 },
];

/** Scope and people the meeting explicitly kept out of the plan. */
export const LEFT_OUT: readonly { what: string; project: string }[] = [
  { what: "Payment gateway and inventory integration", project: "UrbanCart" },
  { what: "Live maps, driver tracking and payments", project: "QuickServe" },
  { what: "Separate Android and iOS tasks", project: "QuickServe" },
  { what: "Kamran, who is not a NovaWorks employee", project: "HelpDeskPro" },
];

export type Correction = {
  field: string;
  subject: string;
  from: string;
  to: string;
  quote: string;
  speaker: string;
  time: string;
};

export const CORRECTIONS: readonly Correction[] = [
  {
    field: "Project deadline",
    subject: "UrbanCart Website",
    from: "18 Oct",
    to: "20 Oct",
    quote: "That replaces the earlier 18 October date.",
    speaker: "Ayesha",
    time: "09:12",
  },
  {
    field: "Task deadline",
    subject: "Website integration and testing",
    from: "17 Oct",
    to: "19 Oct",
    quote: "But please move that task to 19 October.",
    speaker: "Ali",
    time: "09:12",
  },
  {
    field: "Estimate",
    subject: "Mobile integration and testing",
    from: "8h",
    to: "10h",
    quote: "Make the final estimate 10 hours.",
    speaker: "Usman",
    time: "09:28",
  },
  {
    field: "Owner",
    subject: "Assistant evaluation and testing",
    from: "Zain",
    to: "Maryam",
    quote: "Maryam is the final owner of Assistant evaluation and testing.",
    speaker: "Hina",
    time: "09:44",
  },
];

export const ROLE_VIEWS: readonly {
  role: string;
  who: string;
  rows: readonly { label: string; meta: string }[];
}[] = [
  {
    role: "Admin",
    who: "All projects",
    rows: [
      { label: "UrbanCart Website", meta: "40h" },
      { label: "QuickServe Mobile App", meta: "46h" },
      { label: "HelpDeskPro AI Assistant", meta: "38h" },
    ],
  },
  {
    role: "Manager",
    who: "Bilal Ahmed",
    rows: [
      { label: "QuickServe Mobile App", meta: "24 Oct" },
      { label: "4 tasks, 3 developers", meta: "46h" },
    ],
  },
  {
    role: "Developer",
    who: "Sara Noor",
    rows: [
      { label: "Login and profile screens", meta: "12 Oct" },
      { label: "Service booking screens", meta: "17 Oct" },
    ],
  },
];

export const BOARD: readonly {
  status: string;
  card: { title: string; owner: string; due: string };
}[] = [
  { status: "To do", card: { title: "Assistant evaluation and testing", owner: "Maryam Asif", due: "21 Oct" } },
  { status: "In progress", card: { title: "Service booking screens", owner: "Sara Noor", due: "17 Oct" } },
  { status: "In review", card: { title: "Product and cart APIs", owner: "Hamza Shah", due: "14 Oct" } },
  { status: "Done", card: { title: "FAQ document processing", owner: "Maryam Asif", due: "13 Oct" } },
];

export const TEAM_ROWS: readonly { name: string; role: string; title: string; code: string }[] = [
  { name: "Ayesha Khan", role: "Manager", title: "Web PM", code: "PM01" },
  { name: "Hina Malik", role: "Manager", title: "AI PM", code: "PM03" },
  { name: "Ali Raza", role: "Developer", title: "Full-Stack", code: "DEV01" },
  { name: "Maryam Asif", role: "Developer", title: "AI Developer", code: "DEV06" },
];
