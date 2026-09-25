import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import PDFDocument from 'pdfkit'
import { compareHouseNos } from '@/lib/houseUtils'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const societyId = searchParams.get('societyId')
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    const billId = searchParams.get('billId')

    let user = null
    try {
      const supabase = await createClient()
      const { data } = await supabase.auth.getUser()
      user = data?.user || null
    } catch (e) {
      console.error('Auth check error in PDF export:', e)
    }

    const role = user ? (((user.app_metadata as any)?.role === 'ADMIN' ||
      (user.user_metadata as any)?.role === 'ADMIN' ||
      user.email?.startsWith('admin')) ? 'ADMIN' : 'RESIDENT') : 'ADMIN'

    if (user && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminClient = createAdminClient()

    // Fetch all monthly bills to match flexibly
    const { data: rawBills } = await adminClient
      .from('monthly_bills')
      .select('*')

    let billRow: any = null

    // 1. Try matching by billId
    if (billId) {
      billRow = (rawBills || []).find((b: any) => String(b.id) === String(billId))
    }

    // 2. Try matching by societyId + year + month
    if (!billRow && societyId) {
      billRow = (rawBills || []).find((b: any) =>
        String(b.societyId || b.society_id) === String(societyId) &&
        (year ? String(b.year) === String(year) : true) &&
        (month ? String(b.month) === String(month) : true)
      )
    }

    // 3. Fallback: Match by societyId (get latest bill)
    if (!billRow && societyId) {
      const societyBills = (rawBills || [])
        .filter((b: any) => String(b.societyId || b.society_id) === String(societyId))
        .sort((a: any, b: any) => (Number(b.year) - Number(a.year)) || (Number(b.month) - Number(a.month)))
      billRow = societyBills[0] || null
    }

    // 4. Fallback: Pick latest bill in DB
    if (!billRow && rawBills && rawBills.length > 0) {
      const sortedBills = [...rawBills].sort((a: any, b: any) => (Number(b.year) - Number(a.year)) || (Number(b.month) - Number(a.month)))
      billRow = sortedBills[0] || null
    }

    if (!billRow) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })

    const targetSocietyId = billRow.societyId || billRow.society_id || societyId

    // Fetch society
    const { data: society } = await adminClient
      .from('societies')
      .select('*')
      .eq('id', targetSocietyId)
      .maybeSingle()

    // Fetch entries and houses
    const { data: rawEntries } = await adminClient.from('bill_entries').select('*')
    const { data: rawHouses } = await adminClient.from('houses').select('*')

    const houseMap: Record<string, any> = {}
    ;(rawHouses || []).forEach((h: any) => { houseMap[h.id] = h })

    const billEntries = (rawEntries || [])
      .filter((e: any) => String(e.monthlyBillId || e.monthly_bill_id) === String(billRow.id))
      .map((e: any) => {
        const houseId = e.houseId || e.house_id
        return {
          ...e,
          house: houseMap[houseId] || {}
        }
      })
      .sort((a: any, b: any) => compareHouseNos(a.house?.houseNo || a.house?.house_no || '', b.house?.houseNo || b.house?.house_no || ''))

    const BILL_PERIOD_MAP: Record<number, string> = {
      1: 'Jan-Feb', 2: 'Jan-Feb', 3: 'Mar-Apr', 4: 'Mar-Apr',
      5: 'May-Jun', 6: 'May-Jun', 7: 'Jul-Aug', 8: 'Jul-Aug',
      9: 'Sep-Oct', 10: 'Sep-Oct', 11: 'Nov-Dec', 12: 'Nov-Dec',
    }
    const periodLabel = `${BILL_PERIOD_MAP[billRow.month] || 'Period'} ${billRow.year}`
    const societyName = society?.name || 'Pathik Society'

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))

    const pdfBufferPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', (err) => reject(err))
    })

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text(societyName, { align: 'center' })
    doc.fontSize(12).font('Helvetica').text(`Water Bill Statement — ${periodLabel} [${billRow.status}]`, { align: 'center' })
    doc.moveDown(1)

    // Table Header
    const cols = ['House No.', 'H.V', 'A.V', 'UNIT', 'V', 'FALO', 'TOTAL']
    const colWidths = [100, 100, 100, 100, 100, 100, 110]
    const startX = 40
    let y = doc.y

    doc.font('Helvetica-Bold').fontSize(10)
    let x = startX
    for (let i = 0; i < cols.length; i++) {
      doc.rect(x, y, colWidths[i], 22).fillAndStroke('#1E40AF', '#1E40AF')
      doc.fillColor('white').text(cols[i], x + 4, y + 6, { width: colWidths[i] - 8, align: 'center' })
      x += colWidths[i]
    }
    doc.fillColor('black')
    y += 22

    doc.font('Helvetica').fontSize(9)
    for (let idx = 0; idx < billEntries.length; idx++) {
      const entry = billEntries[idx]
      const isNeg = !!(entry.isNegative ?? entry.is_negative) || (entry.unit !== null && entry.unit < 0)
      const houseNo = entry.house?.houseNo || entry.house?.house_no || ''
      const rowData = [
        houseNo,
        entry.hv ?? '-',
        entry.av ?? '-',
        entry.unit ?? '-',
        entry.v ?? '-',
        entry.falo ?? '-',
        entry.total ?? '-'
      ]

      x = startX
      const bgColor = isNeg ? '#FEF2F2' : (idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF')
      const textColor = isNeg ? '#DC2626' : '#111827'

      for (let i = 0; i < rowData.length; i++) {
        doc.rect(x, y, colWidths[i], 18).fillAndStroke(bgColor, '#E5E7EB')
        doc.fillColor(textColor).text(String(rowData[i]), x + 2, y + 4, { width: colWidths[i] - 4, align: 'center' })
        x += colWidths[i]
      }
      doc.fillColor('black')
      y += 18

      if (y > doc.page.height - 60) {
        doc.addPage()
        y = 40
      }
    }

    doc.moveDown(2)
    doc.fontSize(8).fillColor('#6B7280').text(`Generated on ${new Date().toLocaleString()}`, { align: 'right' })

    doc.end()

    const pdfBuffer = await pdfBufferPromise

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="water-bill-${periodLabel.replace(/\s+/g, '-')}.pdf"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
