import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { GST_RATE, packageLabel } from '@/lib/mockPackages'

const NAVY = '#0f172a'
const AMBER = '#f59e0b'
const GREY = '#64748b'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: NAVY },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: AMBER,
    paddingBottom: 12,
    marginBottom: 20,
  },
  brand: { fontSize: 22, fontFamily: 'Helvetica-Bold' },
  tagline: { fontSize: 9, color: GREY, marginTop: 2 },
  quoteNo: { fontSize: 14, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  meta: { fontSize: 9, color: GREY, textAlign: 'right', marginTop: 2 },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  customer: { marginBottom: 20 },
  line: { marginBottom: 2 },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: NAVY,
    color: '#ffffff',
    padding: 6,
    fontFamily: 'Helvetica-Bold',
  },
  row: {
    flexDirection: 'row',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  colItem: { flex: 4 },
  colQty: { flex: 1.2, textAlign: 'right' },
  colPrice: { flex: 1.6, textAlign: 'right' },
  colAmount: { flex: 1.8, textAlign: 'right' },
  totals: { marginTop: 14, alignSelf: 'flex-end', width: 200 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  grand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: NAVY,
    paddingTop: 5,
    marginTop: 3,
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
  },
  notes: { marginTop: 20, fontSize: 9, color: GREY },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: GREY,
  },
})

// The standard PDF font cannot draw the rupee sign, so the PDF uses "Rs."
const money = (n) => 'Rs. ' + Number(n).toLocaleString('en-IN')

export default function QuotePdf({ quote, lead }) {
  return (
    <Document title={`Quote ${quote.number}`} author="Kiran">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Kiran</Text>
            <Text style={styles.tagline}>Solar installation, subsidy-ready rooftop systems</Text>
          </View>
          <View>
            <Text style={styles.quoteNo}>Quote {quote.number}</Text>
            <Text style={styles.meta}>Date: {quote.createdAt}</Text>
          </View>
        </View>

        <View style={styles.customer}>
          <Text style={styles.sectionTitle}>Prepared for</Text>
          <Text style={styles.line}>{lead.name}</Text>
          <Text style={styles.line}>{lead.address}</Text>
          <Text style={styles.line}>Phone: {lead.phone}</Text>
          <Text style={styles.line}>Package: {packageLabel(quote.type, quote.kw)}</Text>
        </View>

        <View style={styles.tableHead}>
          <Text style={styles.colItem}>Item</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colPrice}>Price each</Text>
          <Text style={styles.colAmount}>Amount</Text>
        </View>
        {quote.items.map((item, i) => (
          <View key={i} style={styles.row} wrap={false}>
            <Text style={styles.colItem}>{item.name}</Text>
            <Text style={styles.colQty}>{item.qty} {item.unit}</Text>
            <Text style={styles.colPrice}>{money(item.price)}</Text>
            <Text style={styles.colAmount}>{money(item.qty * item.price)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{money(quote.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>GST ({GST_RATE}%)</Text>
            <Text>{money(quote.gst)}</Text>
          </View>
          <View style={styles.grand}>
            <Text>Total</Text>
            <Text>{money(quote.total)}</Text>
          </View>
        </View>

        {quote.notes ? <Text style={styles.notes}>Notes: {quote.notes}</Text> : null}

        <Text style={styles.footer} fixed>
          Kiran Solar, Punjab. Warranty: 20 years on panels, 2 years on inverter and battery.
        </Text>
      </Page>
    </Document>
  )
}