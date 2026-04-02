import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Casa PMS Dashboard</CardTitle>
        <CardDescription>
          Milestone 00 foundation is in place. Continue with rooms, guests, and reservations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Sidebar navigation, payment routing, and foundational PMS modules are scaffolded.
        </p>
      </CardContent>
    </Card>
  );
}
