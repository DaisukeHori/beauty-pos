import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ExportType =
  | 'sales'
  | 'customers'
  | 'reservations'
  | 'staff_sales'
  | 'daily_report'
  | 'inventory'
  | 'visits'
  | 'points'
  // マスターデータ
  | 'products'
  | 'menus'
  | 'menu_categories'
  | 'staff'
  | 'tags'
  | 'coupons'
  | 'materials'
  | 'processes'
  // 取引データ（詳細）
  | 'sale_items'

interface ExportRequest {
  type: ExportType
  companyId: string
  storeId?: string
  startDate: string
  endDate: string
  format: 'csv' | 'excel'
  staffId?: string
  customerId?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { type, companyId, storeId, startDate, endDate, format, staffId, customerId }: ExportRequest =
      await req.json()

    if (!type || !companyId || !startDate || !endDate) {
      throw new Error('type, companyId, startDate, and endDate are required')
    }

    let data: Record<string, unknown>[] = []
    let headers: string[] = []
    let filename = ''

    switch (type) {
      case 'sales':
        ;({ data, headers, filename } = await exportSales(
          supabase,
          companyId,
          storeId,
          startDate,
          endDate
        ))
        break

      case 'customers':
        ;({ data, headers, filename } = await exportCustomers(supabase, companyId))
        break

      case 'reservations':
        ;({ data, headers, filename } = await exportReservations(
          supabase,
          companyId,
          storeId,
          startDate,
          endDate
        ))
        break

      case 'staff_sales':
        ;({ data, headers, filename } = await exportStaffSales(
          supabase,
          companyId,
          storeId,
          startDate,
          endDate,
          staffId
        ))
        break

      case 'daily_report':
        ;({ data, headers, filename } = await exportDailyReport(
          supabase,
          companyId,
          storeId,
          startDate,
          endDate
        ))
        break

      case 'visits':
        ;({ data, headers, filename } = await exportVisits(
          supabase,
          companyId,
          storeId,
          startDate,
          endDate,
          customerId
        ))
        break

      case 'points':
        ;({ data, headers, filename } = await exportPoints(
          supabase,
          companyId,
          customerId,
          startDate,
          endDate
        ))
        break

      // マスターデータエクスポート
      case 'products':
        ;({ data, headers, filename } = await exportProducts(supabase, companyId, storeId))
        break

      case 'menus':
        ;({ data, headers, filename } = await exportMenus(supabase, companyId))
        break

      case 'menu_categories':
        ;({ data, headers, filename } = await exportMenuCategories(supabase, companyId))
        break

      case 'staff':
        ;({ data, headers, filename } = await exportStaff(supabase, companyId))
        break

      case 'tags':
        ;({ data, headers, filename } = await exportTags(supabase, companyId))
        break

      case 'coupons':
        ;({ data, headers, filename } = await exportCoupons(supabase, companyId))
        break

      case 'materials':
        ;({ data, headers, filename } = await exportMaterials(supabase, companyId))
        break

      case 'processes':
        ;({ data, headers, filename } = await exportProcesses(supabase, companyId))
        break

      case 'sale_items':
        ;({ data, headers, filename } = await exportSaleItems(supabase, companyId, storeId, startDate, endDate))
        break

      default:
        throw new Error(`Unknown export type: ${type}`)
    }

    if (format === 'csv') {
      const csv = convertToCSV(data, headers)
      return new Response(csv, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      })
    } else {
      // For Excel, we'll return CSV with a different content type
      // Real Excel generation would require a library like xlsx
      const csv = convertToCSV(data, headers)
      return new Response(csv, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/vnd.ms-excel',
          'Content-Disposition': `attachment; filename="${filename}.xls"`,
        },
      })
    }
  } catch (error) {
    console.error('Export error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

function convertToCSV(data: Record<string, unknown>[], headers: string[]): string {
  const BOM = '\uFEFF' // UTF-8 BOM for Excel compatibility
  const headerRow = headers.join(',')
  const rows = data.map((row) =>
    headers.map((header) => {
      const value = row[header]
      if (value === null || value === undefined) return ''
      if (typeof value === 'string') {
        // Escape quotes and wrap in quotes if contains comma or newline
        const escaped = value.replace(/"/g, '""')
        if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
          return `"${escaped}"`
        }
        return escaped
      }
      return String(value)
    }).join(',')
  )
  return BOM + [headerRow, ...rows].join('\n')
}

async function exportSales(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  storeId: string | undefined,
  startDate: string,
  endDate: string
) {
  let query = supabase
    .from('sales')
    .select(`
      sale_number,
      sale_date,
      subtotal,
      discount_total,
      tax_total,
      total,
      status,
      points_earned,
      points_used,
      customer:customers(last_name, first_name),
      store:stores(name)
    `)
    .eq('company_id', companyId)
    .gte('sale_date', `${startDate}T00:00:00`)
    .lte('sale_date', `${endDate}T23:59:59`)
    .order('sale_date', { ascending: false })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data: sales, error } = await query

  if (error) throw error

  const headers = [
    '伝票番号',
    '日時',
    '店舗',
    '顧客名',
    '小計',
    '割引',
    '消費税',
    '合計',
    'ポイント使用',
    'ポイント付与',
    'ステータス',
  ]

  const rows = (sales || []).map((sale: any) => ({
    '伝票番号': sale.sale_number,
    '日時': new Date(sale.sale_date).toLocaleString('ja-JP'),
    '店舗': sale.store?.name || '',
    '顧客名': sale.customer ? `${sale.customer.last_name} ${sale.customer.first_name}` : '',
    '小計': sale.subtotal,
    '割引': sale.discount_total,
    '消費税': sale.tax_total,
    '合計': sale.total,
    'ポイント使用': sale.points_used,
    'ポイント付与': sale.points_earned,
    'ステータス': sale.status === 'completed' ? '完了' : sale.status === 'voided' ? '取消' : sale.status,
  }))

  return {
    data: rows,
    headers,
    filename: `sales_${startDate}_${endDate}`,
  }
}

async function exportCustomers(
  supabase: ReturnType<typeof createClient>,
  companyId: string
) {
  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error

  const headers = [
    '顧客番号',
    '姓',
    '名',
    'セイ',
    'メイ',
    '電話番号',
    'メール',
    '生年月日',
    '性別',
    '郵便番号',
    '住所',
    '初回来店日',
    '最終来店日',
    '来店回数',
    '合計利用額',
    'ポイント残高',
    '会員ランク',
    '登録日',
  ]

  const rows = (customers || []).map((c: any) => ({
    '顧客番号': c.customer_number || '',
    '姓': c.last_name || '',
    '名': c.first_name || '',
    'セイ': c.last_name_kana || '',
    'メイ': c.first_name_kana || '',
    '電話番号': c.phone || '',
    'メール': c.email || '',
    '生年月日': c.birth_date || '',
    '性別': c.gender === 'male' ? '男性' : c.gender === 'female' ? '女性' : 'その他',
    '郵便番号': c.postal_code || '',
    '住所': `${c.prefecture || ''}${c.city || ''}${c.address || ''}`,
    '初回来店日': c.first_visit_date || '',
    '最終来店日': c.last_visit_date || '',
    '来店回数': c.visit_count || 0,
    '合計利用額': c.total_spent || 0,
    'ポイント残高': c.points_balance || 0,
    '会員ランク': c.member_rank || '',
    '登録日': c.created_at ? new Date(c.created_at).toLocaleDateString('ja-JP') : '',
  }))

  return {
    data: rows,
    headers,
    filename: `customers_${new Date().toISOString().split('T')[0]}`,
  }
}

async function exportReservations(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  storeId: string | undefined,
  startDate: string,
  endDate: string
) {
  let query = supabase
    .from('reservations')
    .select(`
      *,
      customer:customers(last_name, first_name, phone),
      staff:staff(display_name),
      store:stores(name)
    `)
    .eq('company_id', companyId)
    .gte('start_time', `${startDate}T00:00:00`)
    .lte('start_time', `${endDate}T23:59:59`)
    .order('start_time', { ascending: true })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data: reservations, error } = await query

  if (error) throw error

  const headers = [
    '予約日時',
    '終了予定',
    '店舗',
    '顧客名',
    '電話番号',
    'スタッフ',
    'メニュー',
    'ステータス',
    '備考',
  ]

  const statusLabels: Record<string, string> = {
    pending: '未確定',
    confirmed: '確定',
    checked_in: '来店中',
    completed: '完了',
    cancelled: 'キャンセル',
    no_show: '無断キャンセル',
  }

  const rows = (reservations || []).map((r: any) => ({
    '予約日時': new Date(r.start_time).toLocaleString('ja-JP'),
    '終了予定': new Date(r.end_time).toLocaleString('ja-JP'),
    '店舗': r.store?.name || '',
    '顧客名': r.customer ? `${r.customer.last_name} ${r.customer.first_name}` : '',
    '電話番号': r.customer?.phone || '',
    'スタッフ': r.staff?.display_name || '',
    'メニュー': Array.isArray(r.menu_items)
      ? r.menu_items.map((m: any) => m.name).join(', ')
      : '',
    'ステータス': statusLabels[r.status] || r.status,
    '備考': r.notes || '',
  }))

  return {
    data: rows,
    headers,
    filename: `reservations_${startDate}_${endDate}`,
  }
}

async function exportStaffSales(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  storeId: string | undefined,
  startDate: string,
  endDate: string,
  staffId: string | undefined
) {
  // Get staff performance data
  const { data: staffList, error: staffError } = await supabase
    .from('staff')
    .select('id, display_name')
    .eq('company_id', companyId)

  if (staffError) throw staffError

  let salesQuery = supabase
    .from('sales')
    .select(`
      id,
      total,
      sale_items:sale_items(
        staff_assignments:sale_item_staff_assignments(
          staff_id,
          role,
          amount
        )
      )
    `)
    .eq('company_id', companyId)
    .eq('status', 'completed')
    .gte('sale_date', `${startDate}T00:00:00`)
    .lte('sale_date', `${endDate}T23:59:59`)

  if (storeId) {
    salesQuery = salesQuery.eq('store_id', storeId)
  }

  const { data: sales, error: salesError } = await salesQuery

  if (salesError) throw salesError

  // Calculate staff totals
  const staffTotals: Record<string, { salesTotal: number; productivityTotal: number; count: number }> = {}

  ;(staffList || []).forEach((s: any) => {
    staffTotals[s.id] = { salesTotal: 0, productivityTotal: 0, count: 0 }
  })

  ;(sales || []).forEach((sale: any) => {
    sale.sale_items?.forEach((item: any) => {
      item.staff_assignments?.forEach((assignment: any) => {
        if (staffTotals[assignment.staff_id]) {
          if (assignment.role === 'sales') {
            staffTotals[assignment.staff_id].salesTotal += assignment.amount || 0
          } else if (assignment.role === 'productivity') {
            staffTotals[assignment.staff_id].productivityTotal += assignment.amount || 0
          }
          staffTotals[assignment.staff_id].count++
        }
      })
    })
  })

  const headers = ['スタッフ名', '売上金額', '生産性金額', '担当件数']

  const rows = (staffList || [])
    .filter((s: any) => !staffId || s.id === staffId)
    .map((s: any) => ({
      'スタッフ名': s.display_name,
      '売上金額': staffTotals[s.id]?.salesTotal || 0,
      '生産性金額': staffTotals[s.id]?.productivityTotal || 0,
      '担当件数': staffTotals[s.id]?.count || 0,
    }))

  return {
    data: rows,
    headers,
    filename: `staff_sales_${startDate}_${endDate}`,
  }
}

async function exportDailyReport(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  storeId: string | undefined,
  startDate: string,
  endDate: string
) {
  let salesQuery = supabase
    .from('sales')
    .select('sale_date, total, status')
    .eq('company_id', companyId)
    .gte('sale_date', `${startDate}T00:00:00`)
    .lte('sale_date', `${endDate}T23:59:59`)

  let visitsQuery = supabase
    .from('visits')
    .select('check_in_at, status')
    .eq('company_id', companyId)
    .gte('check_in_at', `${startDate}T00:00:00`)
    .lte('check_in_at', `${endDate}T23:59:59`)

  let reservationsQuery = supabase
    .from('reservations')
    .select('start_time, status')
    .eq('company_id', companyId)
    .gte('start_time', `${startDate}T00:00:00`)
    .lte('start_time', `${endDate}T23:59:59`)

  if (storeId) {
    salesQuery = salesQuery.eq('store_id', storeId)
    visitsQuery = visitsQuery.eq('store_id', storeId)
    reservationsQuery = reservationsQuery.eq('store_id', storeId)
  }

  const [salesResult, visitsResult, reservationsResult] = await Promise.all([
    salesQuery,
    visitsQuery,
    reservationsQuery,
  ])

  if (salesResult.error) throw salesResult.error
  if (visitsResult.error) throw visitsResult.error
  if (reservationsResult.error) throw reservationsResult.error

  // Group by date
  const dailyData: Record<string, {
    sales: number
    salesCount: number
    voidedCount: number
    visits: number
    reservations: number
    cancellations: number
    noShows: number
  }> = {}

  // Initialize dates
  const start = new Date(startDate)
  const end = new Date(endDate)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    dailyData[dateStr] = {
      sales: 0,
      salesCount: 0,
      voidedCount: 0,
      visits: 0,
      reservations: 0,
      cancellations: 0,
      noShows: 0,
    }
  }

  ;(salesResult.data || []).forEach((sale: any) => {
    const dateStr = sale.sale_date.split('T')[0]
    if (dailyData[dateStr]) {
      if (sale.status === 'completed') {
        dailyData[dateStr].sales += sale.total
        dailyData[dateStr].salesCount++
      } else if (sale.status === 'voided') {
        dailyData[dateStr].voidedCount++
      }
    }
  })

  ;(visitsResult.data || []).forEach((visit: any) => {
    const dateStr = visit.check_in_at.split('T')[0]
    if (dailyData[dateStr]) {
      dailyData[dateStr].visits++
    }
  })

  ;(reservationsResult.data || []).forEach((reservation: any) => {
    const dateStr = reservation.start_time.split('T')[0]
    if (dailyData[dateStr]) {
      dailyData[dateStr].reservations++
      if (reservation.status === 'cancelled') {
        dailyData[dateStr].cancellations++
      } else if (reservation.status === 'no_show') {
        dailyData[dateStr].noShows++
      }
    }
  })

  const headers = ['日付', '売上合計', '会計件数', '取消件数', '来店数', '予約数', 'キャンセル数', 'ノーショー数', '平均客単価']

  const rows = Object.entries(dailyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      '日付': date,
      '売上合計': data.sales,
      '会計件数': data.salesCount,
      '取消件数': data.voidedCount,
      '来店数': data.visits,
      '予約数': data.reservations,
      'キャンセル数': data.cancellations,
      'ノーショー数': data.noShows,
      '平均客単価': data.salesCount > 0 ? Math.round(data.sales / data.salesCount) : 0,
    }))

  return {
    data: rows,
    headers,
    filename: `daily_report_${startDate}_${endDate}`,
  }
}

async function exportVisits(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  storeId: string | undefined,
  startDate: string,
  endDate: string,
  customerId: string | undefined
) {
  let query = supabase
    .from('visits')
    .select(`
      *,
      customer:customers(last_name, first_name),
      staff:staff(display_name),
      store:stores(name)
    `)
    .eq('company_id', companyId)
    .gte('check_in_at', `${startDate}T00:00:00`)
    .lte('check_in_at', `${endDate}T23:59:59`)
    .order('check_in_at', { ascending: false })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }
  if (customerId) {
    query = query.eq('customer_id', customerId)
  }

  const { data: visits, error } = await query

  if (error) throw error

  const headers = ['来店日時', '退店日時', '店舗', '顧客名', 'スタッフ', 'ステータス', '備考']

  const statusLabels: Record<string, string> = {
    waiting: '待機中',
    in_service: '施術中',
    checked_out: '退店',
  }

  const rows = (visits || []).map((v: any) => ({
    '来店日時': new Date(v.check_in_at).toLocaleString('ja-JP'),
    '退店日時': v.check_out_at ? new Date(v.check_out_at).toLocaleString('ja-JP') : '',
    '店舗': v.store?.name || '',
    '顧客名': v.customer ? `${v.customer.last_name} ${v.customer.first_name}` : '',
    'スタッフ': v.staff?.display_name || '',
    'ステータス': statusLabels[v.status] || v.status,
    '備考': v.notes || '',
  }))

  return {
    data: rows,
    headers,
    filename: `visits_${startDate}_${endDate}`,
  }
}

async function exportPoints(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  customerId: string | undefined,
  startDate: string,
  endDate: string
) {
  let query = supabase
    .from('point_transactions')
    .select(`
      *,
      customer:customers(last_name, first_name, customer_number)
    `)
    .eq('company_id', companyId)
    .gte('created_at', `${startDate}T00:00:00`)
    .lte('created_at', `${endDate}T23:59:59`)
    .order('created_at', { ascending: false })

  if (customerId) {
    query = query.eq('customer_id', customerId)
  }

  const { data: transactions, error } = await query

  if (error) throw error

  const headers = ['日時', '顧客番号', '顧客名', '種別', 'ポイント', '説明', '有効期限']

  const typeLabels: Record<string, string> = {
    earned: '付与',
    used: '使用',
    expired: '失効',
    adjusted: '調整',
    cancelled: '取消',
  }

  const rows = (transactions || []).map((t: any) => ({
    '日時': new Date(t.created_at).toLocaleString('ja-JP'),
    '顧客番号': t.customer?.customer_number || '',
    '顧客名': t.customer ? `${t.customer.last_name} ${t.customer.first_name}` : '',
    '種別': typeLabels[t.type] || t.type,
    'ポイント': t.type === 'used' ? -t.points : t.points,
    '説明': t.description || '',
    '有効期限': t.expires_at ? new Date(t.expires_at).toLocaleDateString('ja-JP') : '-',
  }))

  return {
    data: rows,
    headers,
    filename: `points_${startDate}_${endDate}`,
  }
}

// ===== マスターデータエクスポート関数 =====

async function exportProducts(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  storeId: string | undefined
) {
  let query = supabase
    .from('products')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true })

  if (storeId) {
    query = query.eq('store_id', storeId)
  }

  const { data: products, error } = await query

  if (error) throw error

  const headers = [
    'ID', '商品コード', '商品名', 'カテゴリ', 'ブランド', '説明', '単位',
    '原価', '販売価格', '在庫数', '最低在庫', '販売用', '店内使用',
    '税率', '画像URL', '表示順', '有効'
  ]

  const rows = (products || []).map((p: any) => ({
    'ID': p.id,
    '商品コード': p.code || '',
    '商品名': p.name,
    'カテゴリ': p.category || '',
    'ブランド': p.brand || '',
    '説明': p.description || '',
    '単位': p.unit || '',
    '原価': p.cost_price || 0,
    '販売価格': p.selling_price || 0,
    '在庫数': p.stock_quantity || 0,
    '最低在庫': p.min_stock_level || 0,
    '販売用': p.is_for_sale ? 'true' : 'false',
    '店内使用': p.is_for_internal_use ? 'true' : 'false',
    '税率': p.tax_rate || 10,
    '画像URL': p.image_url || '',
    '表示順': p.sort_order || 0,
    '有効': p.is_active ? 'true' : 'false',
  }))

  return {
    data: rows,
    headers,
    filename: `products_${new Date().toISOString().split('T')[0]}`,
  }
}

async function exportMenus(
  supabase: ReturnType<typeof createClient>,
  companyId: string
) {
  const { data: menus, error } = await supabase
    .from('menus')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true })

  if (error) throw error

  const headers = [
    'ID', 'メニューコード', 'メニュー名', 'カテゴリID', '説明',
    '基本価格', 'ショート価格', 'ミディアム価格', 'ロング価格',
    '所要時間（分）', 'セットメニュー', '税率', 'チケット適用',
    'クーポン適用', '指名必須', '表示順', '有効'
  ]

  const rows = (menus || []).map((m: any) => ({
    'ID': m.id,
    'メニューコード': m.code || '',
    'メニュー名': m.name,
    'カテゴリID': m.category_id || '',
    '説明': m.description || '',
    '基本価格': m.base_price || 0,
    'ショート価格': m.price_short || '',
    'ミディアム価格': m.price_medium || '',
    'ロング価格': m.price_long || '',
    '所要時間（分）': m.duration_minutes || 0,
    'セットメニュー': m.is_set_menu ? 'true' : 'false',
    '税率': m.tax_rate || 10,
    'チケット適用': m.is_ticket_eligible ? 'true' : 'false',
    'クーポン適用': m.is_coupon_eligible ? 'true' : 'false',
    '指名必須': m.is_nomination_required ? 'true' : 'false',
    '表示順': m.sort_order || 0,
    '有効': m.is_active ? 'true' : 'false',
  }))

  return {
    data: rows,
    headers,
    filename: `menus_${new Date().toISOString().split('T')[0]}`,
  }
}

async function exportMenuCategories(
  supabase: ReturnType<typeof createClient>,
  companyId: string
) {
  const { data: categories, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true })

  if (error) throw error

  const headers = ['ID', 'カテゴリ名', '説明', 'アイコン', '色', '表示順', '有効']

  const rows = (categories || []).map((c: any) => ({
    'ID': c.id,
    'カテゴリ名': c.name,
    '説明': c.description || '',
    'アイコン': c.icon || '',
    '色': c.color || '',
    '表示順': c.sort_order || 0,
    '有効': c.is_active ? 'true' : 'false',
  }))

  return {
    data: rows,
    headers,
    filename: `menu_categories_${new Date().toISOString().split('T')[0]}`,
  }
}

async function exportStaff(
  supabase: ReturnType<typeof createClient>,
  companyId: string
) {
  const { data: staff, error } = await supabase
    .from('staff')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) throw error

  const headers = [
    'ID', 'スタッフコード', '姓', '名', 'セイ', 'メイ',
    'メール', '電話番号', '役職', 'ランク', '指名料',
    '入社日', '生年月日', '有効'
  ]

  const rows = (staff || []).map((s: any) => ({
    'ID': s.id,
    'スタッフコード': s.employee_code || '',
    '姓': s.last_name,
    '名': s.first_name,
    'セイ': s.last_name_kana || '',
    'メイ': s.first_name_kana || '',
    'メール': s.email || '',
    '電話番号': s.phone || '',
    '役職': s.role || '',
    'ランク': s.rank || '',
    '指名料': s.nomination_fee || 0,
    '入社日': s.hire_date || '',
    '生年月日': s.birth_date || '',
    '有効': s.is_active ? 'true' : 'false',
  }))

  return {
    data: rows,
    headers,
    filename: `staff_${new Date().toISOString().split('T')[0]}`,
  }
}

async function exportTags(
  supabase: ReturnType<typeof createClient>,
  companyId: string
) {
  const { data: tags, error } = await supabase
    .from('tags')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true })

  if (error) throw error

  const headers = ['ID', 'タグ名', '色', 'アイコン', '親タグID', '表示順', '有効']

  const rows = (tags || []).map((t: any) => ({
    'ID': t.id,
    'タグ名': t.name,
    '色': t.color || '',
    'アイコン': t.icon || '',
    '親タグID': t.parent_id || '',
    '表示順': t.sort_order || 0,
    '有効': t.is_active ? 'true' : 'false',
  }))

  return {
    data: rows,
    headers,
    filename: `tags_${new Date().toISOString().split('T')[0]}`,
  }
}

async function exportCoupons(
  supabase: ReturnType<typeof createClient>,
  companyId: string
) {
  const { data: coupons, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) throw error

  const headers = [
    'ID', 'クーポンコード', 'クーポン名', '説明', '割引タイプ', '割引値',
    '最小購入額', '最大割引額', '有効開始日', '有効終了日',
    '最大使用回数', '使用回数', '1回限り', '有効'
  ]

  const rows = (coupons || []).map((c: any) => ({
    'ID': c.id,
    'クーポンコード': c.code,
    'クーポン名': c.name,
    '説明': c.description || '',
    '割引タイプ': c.discount_type === 'percentage' ? '割合' : '金額',
    '割引値': c.discount_value || 0,
    '最小購入額': c.min_purchase_amount || '',
    '最大割引額': c.max_discount_amount || '',
    '有効開始日': c.valid_from || '',
    '有効終了日': c.valid_until || '',
    '最大使用回数': c.max_uses || '',
    '使用回数': c.used_count || 0,
    '1回限り': c.is_single_use ? 'true' : 'false',
    '有効': c.is_active ? 'true' : 'false',
  }))

  return {
    data: rows,
    headers,
    filename: `coupons_${new Date().toISOString().split('T')[0]}`,
  }
}

async function exportMaterials(
  supabase: ReturnType<typeof createClient>,
  companyId: string
) {
  const { data: materials, error } = await supabase
    .from('materials')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true })

  if (error) throw error

  const headers = [
    'ID', '材料コード', '材料名', 'カテゴリ', 'ブランド', '説明',
    '単位', '単価', '在庫数', '最低在庫', '画像URL', '表示順', '有効'
  ]

  const rows = (materials || []).map((m: any) => ({
    'ID': m.id,
    '材料コード': m.code || '',
    '材料名': m.name,
    'カテゴリ': m.category || '',
    'ブランド': m.brand || '',
    '説明': m.description || '',
    '単位': m.unit || '',
    '単価': m.cost_price || 0,
    '在庫数': m.stock_quantity || 0,
    '最低在庫': m.min_stock_level || 0,
    '画像URL': m.image_url || '',
    '表示順': m.sort_order || 0,
    '有効': m.is_active ? 'true' : 'false',
  }))

  return {
    data: rows,
    headers,
    filename: `materials_${new Date().toISOString().split('T')[0]}`,
  }
}

async function exportProcesses(
  supabase: ReturnType<typeof createClient>,
  companyId: string
) {
  const { data: processes, error } = await supabase
    .from('processes')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true })

  if (error) throw error

  const headers = [
    'ID', '工程コード', '工程名', '説明', '標準時間（分）',
    '生産性ウェイト', '表示順', '有効'
  ]

  const rows = (processes || []).map((p: any) => ({
    'ID': p.id,
    '工程コード': p.code || '',
    '工程名': p.name,
    '説明': p.description || '',
    '標準時間（分）': p.default_duration_minutes || 0,
    '生産性ウェイト': p.productivity_weight || 1,
    '表示順': p.sort_order || 0,
    '有効': p.is_active ? 'true' : 'false',
  }))

  return {
    data: rows,
    headers,
    filename: `processes_${new Date().toISOString().split('T')[0]}`,
  }
}

async function exportSaleItems(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  storeId: string | undefined,
  startDate: string,
  endDate: string
) {
  // 売上を取得
  let salesQuery = supabase
    .from('sales')
    .select('id, sale_number')
    .eq('company_id', companyId)
    .gte('sale_date', `${startDate}T00:00:00`)
    .lte('sale_date', `${endDate}T23:59:59`)

  if (storeId) {
    salesQuery = salesQuery.eq('store_id', storeId)
  }

  const { data: sales, error: salesError } = await salesQuery

  if (salesError) throw salesError

  const saleIds = (sales || []).map((s: any) => s.id)

  if (saleIds.length === 0) {
    return {
      data: [],
      headers: [
        'ID', '売上ID', '伝票番号', 'アイテム種別', 'アイテムID', '名前',
        '数量', '単価', '髪の長さ', '長さ追加料金', '割引額',
        '税率', '税額', '小計', '指名タイプ', '指名料'
      ],
      filename: `sale_items_${startDate}_${endDate}`,
    }
  }

  const { data: items, error: itemsError } = await supabase
    .from('sale_items')
    .select('*')
    .in('sale_id', saleIds)

  if (itemsError) throw itemsError

  // sale_number のマップを作成
  const saleNumberMap: Record<string, string> = {}
  ;(sales || []).forEach((s: any) => {
    saleNumberMap[s.id] = s.sale_number
  })

  const headers = [
    'ID', '売上ID', '伝票番号', 'アイテム種別', 'アイテムID', '名前',
    '数量', '単価', '髪の長さ', '長さ追加料金', '割引額',
    '税率', '税額', '小計', '指名タイプ', '指名料'
  ]

  const rows = (items || []).map((i: any) => ({
    'ID': i.id,
    '売上ID': i.sale_id,
    '伝票番号': saleNumberMap[i.sale_id] || '',
    'アイテム種別': i.item_type === 'menu' ? 'メニュー' : '商品',
    'アイテムID': i.item_id || '',
    '名前': i.name,
    '数量': i.quantity || 1,
    '単価': i.unit_price || 0,
    '髪の長さ': i.hair_length || '',
    '長さ追加料金': i.hair_length_charge || 0,
    '割引額': i.discount_amount || 0,
    '税率': i.tax_rate || 10,
    '税額': i.tax_amount || 0,
    '小計': i.subtotal || 0,
    '指名タイプ': i.nomination_type || '',
    '指名料': i.nomination_fee || 0,
  }))

  return {
    data: rows,
    headers,
    filename: `sale_items_${startDate}_${endDate}`,
  }
}
