import { toCsv } from "@/lib/download";

export const TEMPLATE_HEADERS = ["Full name", "Email", "Phone", "Current company", "CTC range", "Graduation year", "Current domain", "Working professional or student", "Lead score", "Source details"];

/** A one-row file showing the column names the importer recognises on its own. */
export function templateCsv(): string {
  return toCsv([TEMPLATE_HEADERS, ["Asha Verma", "asha.verma@example.com", "9876543210", "TCS", "4-6 LPA", "2021", "Backend", "Working professional", "20", "Naukri October batch"]]);
}
