import type { UserRole } from "./schema";

/** Shared demo password for every seeded account (fictional, for judging only). */
export const DEMO_PASSWORD = "Demo123!";

type DemoUser = {
  code: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  skills: string[];
};

/** The NovaWorks directory supplied with the challenge. */
export const DEMO_USERS: readonly DemoUser[] = [
  { code: "ADMIN", name: "Admin", email: "admin@novaworks.example", role: "admin", title: "Administrator", skills: ["Company overview", "Transcript creation"] },
  { code: "PM01", name: "Ayesha Khan", email: "ayesha@novaworks.example", role: "manager", title: "Web PM", skills: ["Web projects", "Client coordination"] },
  { code: "PM02", name: "Bilal Ahmed", email: "bilal@novaworks.example", role: "manager", title: "Mobile PM", skills: ["Mobile projects", "Delivery planning"] },
  { code: "PM03", name: "Hina Malik", email: "hina@novaworks.example", role: "manager", title: "AI PM", skills: ["AI projects", "Requirement review"] },
  { code: "DEV01", name: "Ali Raza", email: "ali@novaworks.example", role: "agent", title: "Full-Stack", skills: ["React", "Frontend integration"] },
  { code: "DEV02", name: "Hamza Shah", email: "hamza@novaworks.example", role: "agent", title: "Full-Stack", skills: ["Node.js", "Databases", "APIs"] },
  { code: "DEV03", name: "Sara Noor", email: "sara@novaworks.example", role: "agent", title: "App Developer", skills: ["Flutter", "Mobile UI"] },
  { code: "DEV04", name: "Usman Tariq", email: "usman@novaworks.example", role: "agent", title: "App Developer", skills: ["Flutter", "Integration", "Testing"] },
  { code: "DEV05", name: "Zain Abbas", email: "zain@novaworks.example", role: "agent", title: "AI Developer", skills: ["LLMs", "Extraction", "Prompts"] },
  { code: "DEV06", name: "Maryam Asif", email: "maryam@novaworks.example", role: "agent", title: "AI Developer", skills: ["Retrieval", "Document processing"] },
];
