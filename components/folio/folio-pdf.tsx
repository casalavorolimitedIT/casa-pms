"use client";

import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrencyMinor } from "@/lib/pms/formatting";

interface FolioPdfProps {
  folioId: string;
  guestName: string;
  currencyCode: string;
  charges: Array<{ category: string; description: string | null; amount_minor: number }>;
  payments: Array<{ method: string; provider_reference: string | null; amount_minor: number }>;
}

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 11, color: "#111827" },
  heading: { fontSize: 16, marginBottom: 8, fontWeight: 700 },
  subheading: { fontSize: 10, marginBottom: 14, color: "#4b5563" },
  sectionTitle: { fontSize: 12, marginTop: 10, marginBottom: 6, fontWeight: 700 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: "1 solid #d1d5db" },
  muted: { color: "#6b7280" },
});

function FolioInvoiceDocument({ folioId, guestName, currencyCode, charges, payments }: FolioPdfProps) {
  const chargeTotal = charges.reduce((sum, c) => sum + c.amount_minor, 0);
  const paymentTotal = payments.reduce((sum, p) => sum + p.amount_minor, 0);
  const balance = chargeTotal - paymentTotal;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.heading}>Casa PMS Invoice</Text>
        <Text style={styles.subheading}>Folio {folioId.slice(0, 8).toUpperCase()} · Guest: {guestName || "N/A"}</Text>

        <Text style={styles.sectionTitle}>Charges</Text>
        {charges.length === 0 ? (
          <Text style={styles.muted}>No charges posted.</Text>
        ) : (
          charges.map((c, idx) => (
            <View key={`${c.category}-${idx}`} style={styles.row}>
              <Text>{c.category}{c.description ? ` - ${c.description}` : ""}</Text>
              <Text>{formatCurrencyMinor(c.amount_minor, currencyCode)}</Text>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Payments</Text>
        {payments.length === 0 ? (
          <Text style={styles.muted}>No payments posted.</Text>
        ) : (
          payments.map((p, idx) => (
            <View key={`${p.method}-${idx}`} style={styles.row}>
              <Text>{p.method}{p.provider_reference ? ` - ${p.provider_reference}` : ""}</Text>
              <Text>{formatCurrencyMinor(-Math.abs(p.amount_minor), currencyCode)}</Text>
            </View>
          ))
        )}

        <View style={styles.totalRow}>
          <Text>Total Balance</Text>
          <Text>{formatCurrencyMinor(balance, currencyCode)}</Text>
        </View>
      </Page>
    </Document>
  );
}

export function FolioPdfCard(props: FolioPdfProps) {
  return (
    <Card className="border-zinc-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Invoice / PDF Export</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-600">Download a branded folio invoice PDF for guest checkout or accounting records.</p>
        <PDFDownloadLink
          document={<FolioInvoiceDocument {...props} />}
          fileName={`folio-${props.folioId.slice(0, 8).toLowerCase()}.pdf`}
        >
          {({ loading }) => (
            <Button type="button" size="sm" variant="outline" disabled={loading}>
              {loading ? "Preparing PDF..." : "Download PDF"}
            </Button>
          )}
        </PDFDownloadLink>
      </CardContent>
    </Card>
  );
}
