import { redirect } from "next/navigation";

// Arrivals & Departures merged into unified Front Desk page.
export default function ArrivalsDeparturesPage() {
  redirect("/dashboard/front-desk");
}
