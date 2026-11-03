import { toCsv } from "@/lib/download";

const FIRST = ["Aarav", "Bhavna", "Chetan", "Deepa", "Esha", "Faisal", "Gita", "Hemant", "Indira", "Jatin", "Kiran", "Lata", "Mohit", "Nandini", "Ojas"];
const LAST = ["Sharma", "Patel", "Reddy", "Nair", "Gupta", "Mishra", "Rao", "Kulkarni", "Banerjee", "Chauhan"];
const COMPANIES = ["TCS", "Infosys", "Wipro", "Cognizant", "Accenture", "Capgemini", "HCL"];
const DOMAINS = ["Backend", "QA", "Support", "Testing", "SAP", "Data"];
const UTM = ["linkedin", "google", "referral", "webinar", "naukri"];

export const TEMPLATE_HEADERS = ["Full name", "Email", "Phone", "Current company", "CTC range", "Graduation year", "Current domain", "Source attribution"];

export function templateCsv(): string {
  return toCsv([TEMPLATE_HEADERS, ["Asha Verma", "asha.verma@example.com", "9876543210", "TCS", "4-6 LPA", "2021", "Backend", "referral"]]);
}

/** A file shaped like a real export from another tool, with a few bad rows and a few existing leads. */
export function sampleCsv(): string {
  const rows: string[][] = [["Full Name", "Email Address", "Mobile", "Company", "CTC (LPA)", "Grad Year", "Domain", "Notice Period", "Utm Source", "Lead Score"]];
  for (let i = 0; i < 48; i++) {
    const first = FIRST[i % FIRST.length]!;
    const last = LAST[(i * 7) % LAST.length]!;
    rows.push([
      `${first} ${last}`, `${first}.${last}${i}@example.com`.toLowerCase(), `9${String(100000000 + i * 104729).slice(0, 9)}`,
      COMPANIES[i % COMPANIES.length]!, `${3 + (i % 9)}`, String(2018 + (i % 7)), DOMAINS[i % DOMAINS.length]!,
      ["Immediate", "30 days", "60 days", "90 days"][i % 4]!, UTM[i % UTM.length]!, String(40 + ((i * 13) % 60)),
    ]);
  }
  rows.push(["Rohan Mehta", "rohan.mehta@gmail.com", "9810000000", "TCS", "6", "2020", "Java", "30 days", "linkedin", "88"]);
  rows.push(["Priya Sharma", "priya.sharma@yahoo.com", "", "TCS", "5", "2021", "Backend", "60 days", "google", "52"]);
  rows.push(["Aarav Bhatt", "aarav.bhatt@example", "9876500011", "Wipro", "4", "2022", "QA", "Immediate", "referral", "61"]);
  rows.push(["", "no.name@example.com", "9876500012", "Infosys", "5", "2021", "Support", "30 days", "naukri", "35"]);
  rows.push(["Tara Menon", "", "12345", "HCL", "7", "2019", "SAP", "90 days", "webinar", "72"]);
  rows.push(["Esha Reddy", "esha.reddy1@example.com", "9876500013", "Accenture", "6", "2020", "Data", "60 days", "linkedin", "58"]);
  return toCsv(rows);
}
