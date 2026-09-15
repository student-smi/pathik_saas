import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import PDFDocument from 'pdfkit'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const societyId = searchParams.get('societyId')
    const year = searchParams.get('year')
    const month = searchParams.get('month')
    if (!societyId || !year || !month) {
      return NextResponse.json({ error: 'societyId, year, month required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = ((user.app_metadata as any)?.role === 'ADMIN' ||
      (user.user_metadata as any)?.role === 'ADMIN' ||
      user.email?.startsWith('admin')) ? 'ADMIN' : 'RESIDENT'

    if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const adminClient = createAdminClient()
    const { data: billRow } = await adminClient
      .from('monthly_bills')
      .select(`
        *,
        society:societies(name),
        entries:bill_entries(*, house:houses(*))
      `)
      .eq('society_id', societyId)
      .eq('year', Number(year))
      .eq('month', Number(month))
      .maybeSingle()

    if (!billRow) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })

    const BILL_PERIOD_MAP: Record<number, string> = {
      1: 'Jan-Feb', 2: 'Jan-Feb', 3: 'Mar-Apr', 4: 'Mar-Apr',
      5: 'May-Jun', 6: 'May-Jun', 7: 'Jul-Aug', 8: 'Jul-Aug',
      9: 'Sep-Oct', 10: 'Sep-Oct', 11: 'Nov-Dec', 12: 'Nov-Dec',
    }
    const periodLabel = `${BILL_PERIOD_MAP[billRow.month] || 'Period'} ${billRow.year}`
    const societyName = billRow.society?.name || 'Pathik Society'

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

    // Data rows
    const entries = (billRow.entries as any[] || []).sort((a, b) => {
      const numA = parseInt(a.house?.house_no || '0', 10)
      const numB = parseInt(b.house?.house_no || '0', 10)
      return (isNaN(numA) || isNaN(numB))
        ? (a.house?.house_no || '').localeCompare(b.house?.house_no || '')
        : numA - numB
    })

    doc.font('Helvetica').fontSize(9)
    for (let idx = 0; idx < entries.length; idx++) {
      const entry = entries[idx]
      const isNeg = entry.is_negative || (entry.unit !== null && entry.unit < 0)
      const rowData = [
        entry.house?.house_no || '',
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
        'Content-Disposition': `attachment; filename="water-bill-${periodLabel.replace(/\s+/g, '-')}.pdf"`,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

