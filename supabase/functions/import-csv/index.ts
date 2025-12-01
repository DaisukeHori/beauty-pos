import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ===== セキュリティバリデーション =====

// 危険なSQLパターン
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|EXEC|EXECUTE|UNION|OR|AND)\b\s+)/i,
  /('|"|;|--|\*|\/\*|\*\/)/,
  /(\b(1=1|1 = 1|'='|"=")\b)/i,
  /(xp_|sp_|exec\s|execute\s)/i,
]

// 危険なXSSパターン
const XSS_PATTERNS = [
  /<script\b[^>]*>(.*?)<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe\b[^>]*>(.*?)<\/iframe>/gi,
  /<object\b[^>]*>(.*?)<\/object>/gi,
  /<embed\b[^>]*>/gi,
  /<link\b[^>]*>/gi,
  /data:/gi,
  /vbscript:/gi,
  /<svg\b[^>]*onload/gi,
]

function checkSqlInjection(value: string): boolean {
  if (typeof value !== 'string') return false
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value))
}

function checkXss(value: string): boolean {
  if (typeof value !== 'string') return false
  return XSS_PATTERNS.some(pattern => pattern.test(value))
}

function sanitizeString(value: string): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
}

function securityCheck(value: string, field: string, row: number): { row: number; field?: string; message: string } | null {
  if (checkSqlInjection(value)) {
    return {
      row,
      field,
      message: `SQLインジェクションの可能性がある文字列が検出されました: ${field}`,
    }
  }
  if (checkXss(value)) {
    return {
      row,
      field,
      message: `XSSの可能性がある文字列が検出されました: ${field}`,
    }
  }
  return null
}

// CSVアクション
type CsvAction = 'create' | 'update' | 'delete'

// エンティティタイプ
type EntityType =
  | 'products'
  | 'menus'
  | 'menu_categories'
  | 'staff'
  | 'customers'
  | 'sales'
  | 'sale_items'
  | 'reservations'
  | 'tags'
  | 'coupons'
  | 'tickets'
  | 'materials'
  | 'processes'

// インポート結果
interface ImportResult {
  success: number
  failed: number
  created: number
  updated: number
  deleted: number
  errors: Array<{
    row: number
    field?: string
    message: string
    data?: Record<string, unknown>
  }>
}

// フィールドマッピング
interface FieldMapping {
  csvField: string
  dbField: string
  required?: boolean
  type?: 'string' | 'number' | 'boolean' | 'date' | 'json'
  transform?: (value: string) => unknown
}

// リクエスト
interface ImportRequest {
  entityType: EntityType
  csvData: string
  companyId: string
  storeId?: string
  dryRun?: boolean
}

// フィールドマッピング定義
const FIELD_MAPPINGS: Record<EntityType, FieldMapping[]> = {
  products: [
    { csvField: 'ID', dbField: 'id', type: 'string' },
    { csvField: '商品コード', dbField: 'code', required: true, type: 'string' },
    { csvField: '商品名', dbField: 'name', required: true, type: 'string' },
    { csvField: 'カテゴリ', dbField: 'category', required: true, type: 'string' },
    { csvField: 'ブランド', dbField: 'brand', type: 'string' },
    { csvField: '説明', dbField: 'description', type: 'string' },
    { csvField: '単位', dbField: 'unit', type: 'string' },
    { csvField: '原価', dbField: 'cost_price', type: 'number' },
    { csvField: '販売価格', dbField: 'selling_price', required: true, type: 'number' },
    { csvField: '在庫数', dbField: 'stock_quantity', type: 'number' },
    { csvField: '最低在庫', dbField: 'min_stock_level', type: 'number' },
    { csvField: '販売用', dbField: 'is_for_sale', type: 'boolean' },
    { csvField: '店内使用', dbField: 'is_for_internal_use', type: 'boolean' },
    { csvField: '税率', dbField: 'tax_rate', type: 'number' },
    { csvField: '画像URL', dbField: 'image_url', type: 'string' },
    { csvField: '表示順', dbField: 'sort_order', type: 'number' },
    { csvField: '有効', dbField: 'is_active', type: 'boolean' },
  ],
  menus: [
    { csvField: 'ID', dbField: 'id', type: 'string' },
    { csvField: 'メニューコード', dbField: 'code', required: true, type: 'string' },
    { csvField: 'メニュー名', dbField: 'name', required: true, type: 'string' },
    { csvField: 'カテゴリID', dbField: 'category_id', type: 'string' },
    { csvField: '説明', dbField: 'description', type: 'string' },
    { csvField: '基本価格', dbField: 'base_price', required: true, type: 'number' },
    { csvField: 'ショート価格', dbField: 'price_short', type: 'number' },
    { csvField: 'ミディアム価格', dbField: 'price_medium', type: 'number' },
    { csvField: 'ロング価格', dbField: 'price_long', type: 'number' },
    { csvField: '所要時間（分）', dbField: 'duration_minutes', type: 'number' },
    { csvField: 'セットメニュー', dbField: 'is_set_menu', type: 'boolean' },
    { csvField: '税率', dbField: 'tax_rate', type: 'number' },
    { csvField: 'チケット適用', dbField: 'is_ticket_eligible', type: 'boolean' },
    { csvField: 'クーポン適用', dbField: 'is_coupon_eligible', type: 'boolean' },
    { csvField: '指名必須', dbField: 'is_nomination_required', type: 'boolean' },
    { csvField: '表示順', dbField: 'sort_order', type: 'number' },
    { csvField: '有効', dbField: 'is_active', type: 'boolean' },
  ],
  menu_categories: [
    { csvField: 'ID', dbField: 'id', type: 'string' },
    { csvField: 'カテゴリ名', dbField: 'name', required: true, type: 'string' },
    { csvField: '説明', dbField: 'description', type: 'string' },
    { csvField: 'アイコン', dbField: 'icon', type: 'string' },
    { csvField: '色', dbField: 'color', type: 'string' },
    { csvField: '表示順', dbField: 'sort_order', type: 'number' },
    { csvField: '有効', dbField: 'is_active', type: 'boolean' },
  ],
  staff: [
    { csvField: 'ID', dbField: 'id', type: 'string' },
    { csvField: 'スタッフコード', dbField: 'employee_code', required: true, type: 'string' },
    { csvField: '姓', dbField: 'last_name', required: true, type: 'string' },
    { csvField: '名', dbField: 'first_name', required: true, type: 'string' },
    { csvField: 'セイ', dbField: 'last_name_kana', type: 'string' },
    { csvField: 'メイ', dbField: 'first_name_kana', type: 'string' },
    { csvField: 'メール', dbField: 'email', type: 'string' },
    { csvField: '電話番号', dbField: 'phone', type: 'string' },
    { csvField: '役職', dbField: 'role', type: 'string' },
    { csvField: 'ランク', dbField: 'rank', type: 'string' },
    { csvField: '指名料', dbField: 'nomination_fee', type: 'number' },
    { csvField: '入社日', dbField: 'hire_date', type: 'date' },
    { csvField: '生年月日', dbField: 'birth_date', type: 'date' },
    { csvField: '有効', dbField: 'is_active', type: 'boolean' },
  ],
  customers: [
    { csvField: 'ID', dbField: 'id', type: 'string' },
    { csvField: '顧客コード', dbField: 'customer_code', required: true, type: 'string' },
    { csvField: '姓', dbField: 'last_name', required: true, type: 'string' },
    { csvField: '名', dbField: 'first_name', required: true, type: 'string' },
    { csvField: 'セイ', dbField: 'last_name_kana', type: 'string' },
    { csvField: 'メイ', dbField: 'first_name_kana', type: 'string' },
    { csvField: 'メール', dbField: 'email', type: 'string' },
    { csvField: '電話番号', dbField: 'phone', type: 'string' },
    { csvField: '郵便番号', dbField: 'postal_code', type: 'string' },
    { csvField: '住所', dbField: 'address', type: 'string' },
    { csvField: '生年月日', dbField: 'birth_date', type: 'date' },
    {
      csvField: '性別', dbField: 'gender', type: 'string', transform: (v: string) => {
        if (v === '男性' || v === 'male') return 'male'
        if (v === '女性' || v === 'female') return 'female'
        return v || null
      }
    },
    { csvField: '職業', dbField: 'occupation', type: 'string' },
    { csvField: 'メモ', dbField: 'memo', type: 'string' },
    { csvField: '紹介元', dbField: 'referral_source', type: 'string' },
    { csvField: '担当スタッフID', dbField: 'preferred_staff_id', type: 'string' },
    { csvField: '来店回数', dbField: 'total_visits', type: 'number' },
    { csvField: '利用合計', dbField: 'total_spend', type: 'number' },
    { csvField: 'ポイント残高', dbField: 'points_balance', type: 'number' },
    { csvField: '最終来店日', dbField: 'last_visit_at', type: 'date' },
    { csvField: 'プライバシー同意', dbField: 'privacy_consent', type: 'boolean' },
    { csvField: 'マーケティング同意', dbField: 'marketing_consent', type: 'boolean' },
    { csvField: '有効', dbField: 'is_active', type: 'boolean' },
  ],
  sales: [
    { csvField: 'ID', dbField: 'id', type: 'string' },
    { csvField: '伝票番号', dbField: 'sale_number', required: true, type: 'string' },
    { csvField: '店舗ID', dbField: 'store_id', required: true, type: 'string' },
    { csvField: '来店ID', dbField: 'visit_id', type: 'string' },
    { csvField: '顧客ID', dbField: 'customer_id', type: 'string' },
    { csvField: '売上日時', dbField: 'sale_date', required: true, type: 'date' },
    { csvField: '小計', dbField: 'subtotal', type: 'number' },
    { csvField: '割引合計', dbField: 'discount_total', type: 'number' },
    { csvField: '税合計', dbField: 'tax_total', type: 'number' },
    { csvField: '合計', dbField: 'total', required: true, type: 'number' },
    { csvField: '使用ポイント', dbField: 'points_used', type: 'number' },
    { csvField: '付与ポイント', dbField: 'points_earned', type: 'number' },
    {
      csvField: 'ステータス', dbField: 'status', type: 'string', transform: (v: string) => {
        if (v === '完了' || v === 'completed') return 'completed'
        if (v === '取消' || v === 'voided') return 'voided'
        return v || 'completed'
      }
    },
    { csvField: '備考', dbField: 'notes', type: 'string' },
    { csvField: '作成者ID', dbField: 'created_by', type: 'string' },
  ],
  sale_items: [
    { csvField: 'ID', dbField: 'id', type: 'string' },
    { csvField: '売上ID', dbField: 'sale_id', required: true, type: 'string' },
    {
      csvField: 'アイテム種別', dbField: 'item_type', required: true, type: 'string', transform: (v: string) => {
        if (v === 'メニュー' || v === 'menu') return 'menu'
        if (v === '商品' || v === 'product') return 'product'
        return v
      }
    },
    { csvField: 'アイテムID', dbField: 'item_id', type: 'string' },
    { csvField: '名前', dbField: 'name', required: true, type: 'string' },
    { csvField: '数量', dbField: 'quantity', type: 'number' },
    { csvField: '単価', dbField: 'unit_price', required: true, type: 'number' },
    { csvField: '髪の長さ', dbField: 'hair_length', type: 'string' },
    { csvField: '長さ追加料金', dbField: 'hair_length_charge', type: 'number' },
    { csvField: '割引額', dbField: 'discount_amount', type: 'number' },
    { csvField: '税率', dbField: 'tax_rate', type: 'number' },
    { csvField: '税額', dbField: 'tax_amount', type: 'number' },
    { csvField: '小計', dbField: 'subtotal', type: 'number' },
    { csvField: '指名タイプ', dbField: 'nomination_type', type: 'string' },
    { csvField: '指名料', dbField: 'nomination_fee', type: 'number' },
  ],
  reservations: [
    { csvField: 'ID', dbField: 'id', type: 'string' },
    { csvField: '店舗ID', dbField: 'store_id', required: true, type: 'string' },
    { csvField: '顧客ID', dbField: 'customer_id', type: 'string' },
    { csvField: 'スタッフID', dbField: 'staff_id', type: 'string' },
    { csvField: '開始時間', dbField: 'start_time', required: true, type: 'date' },
    { csvField: '終了時間', dbField: 'end_time', required: true, type: 'date' },
    {
      csvField: 'ステータス', dbField: 'status', type: 'string', transform: (v: string) => {
        const map: Record<string, string> = {
          '未確定': 'pending', '確定': 'confirmed', '来店中': 'checked_in',
          '完了': 'completed', 'キャンセル': 'cancelled', '無断キャンセル': 'no_show'
        }
        return map[v] || v || 'pending'
      }
    },
    { csvField: '指名タイプ', dbField: 'nomination_type', type: 'string' },
    { csvField: '顧客名', dbField: 'customer_name', type: 'string' },
    { csvField: '顧客電話', dbField: 'customer_phone', type: 'string' },
    { csvField: '顧客メール', dbField: 'customer_email', type: 'string' },
    { csvField: '備考', dbField: 'notes', type: 'string' },
    {
      csvField: '予約元', dbField: 'source', type: 'string', transform: (v: string) => {
        const map: Record<string, string> = {
          'アプリ': 'app', '電話': 'phone', '来店': 'walk_in',
          'ホットペッパー': 'hotpepper', 'その他': 'other'
        }
        return map[v] || v || 'other'
      }
    },
    { csvField: '外部ID', dbField: 'external_id', type: 'string' },
  ],
  tags: [
    { csvField: 'ID', dbField: 'id', type: 'string' },
    { csvField: 'タグ名', dbField: 'name', required: true, type: 'string' },
    { csvField: '色', dbField: 'color', type: 'string' },
    { csvField: 'アイコン', dbField: 'icon', type: 'string' },
    { csvField: '親タグID', dbField: 'parent_id', type: 'string' },
    { csvField: '表示順', dbField: 'sort_order', type: 'number' },
    { csvField: '有効', dbField: 'is_active', type: 'boolean' },
  ],
  coupons: [
    { csvField: 'ID', dbField: 'id', type: 'string' },
    { csvField: 'クーポンコード', dbField: 'code', required: true, type: 'string' },
    { csvField: 'クーポン名', dbField: 'name', required: true, type: 'string' },
    { csvField: '説明', dbField: 'description', type: 'string' },
    {
      csvField: '割引タイプ', dbField: 'discount_type', type: 'string', transform: (v: string) => {
        if (v === '割合' || v === 'percentage') return 'percentage'
        if (v === '金額' || v === 'amount') return 'amount'
        return v || 'amount'
      }
    },
    { csvField: '割引値', dbField: 'discount_value', required: true, type: 'number' },
    { csvField: '最小購入額', dbField: 'min_purchase_amount', type: 'number' },
    { csvField: '最大割引額', dbField: 'max_discount_amount', type: 'number' },
    { csvField: '有効開始日', dbField: 'valid_from', type: 'date' },
    { csvField: '有効終了日', dbField: 'valid_until', type: 'date' },
    { csvField: '最大使用回数', dbField: 'max_uses', type: 'number' },
    { csvField: '使用回数', dbField: 'used_count', type: 'number' },
    { csvField: '1回限り', dbField: 'is_single_use', type: 'boolean' },
    { csvField: '有効', dbField: 'is_active', type: 'boolean' },
  ],
  tickets: [
    { csvField: 'ID', dbField: 'id', type: 'string' },
    { csvField: '顧客ID', dbField: 'customer_id', required: true, type: 'string' },
    { csvField: 'チケット種別', dbField: 'ticket_type', required: true, type: 'string' },
    { csvField: 'チケット名', dbField: 'name', required: true, type: 'string' },
    { csvField: '総回数', dbField: 'total_uses', type: 'number' },
    { csvField: '残回数', dbField: 'remaining_uses', type: 'number' },
    { csvField: '総額', dbField: 'total_amount', type: 'number' },
    { csvField: '残額', dbField: 'remaining_amount', type: 'number' },
    { csvField: '有効開始日', dbField: 'valid_from', type: 'date' },
    { csvField: '有効終了日', dbField: 'valid_until', type: 'date' },
    {
      csvField: 'ステータス', dbField: 'status', type: 'string', transform: (v: string) => {
        if (v === '有効' || v === 'active') return 'active'
        if (v === '使用済' || v === 'used') return 'used'
        if (v === '期限切れ' || v === 'expired') return 'expired'
        return v || 'active'
      }
    },
  ],
  materials: [
    { csvField: 'ID', dbField: 'id', type: 'string' },
    { csvField: '材料コード', dbField: 'code', required: true, type: 'string' },
    { csvField: '材料名', dbField: 'name', required: true, type: 'string' },
    { csvField: 'カテゴリ', dbField: 'category', required: true, type: 'string' },
    { csvField: 'ブランド', dbField: 'brand', type: 'string' },
    { csvField: '説明', dbField: 'description', type: 'string' },
    { csvField: '単位', dbField: 'unit', type: 'string' },
    { csvField: '単価', dbField: 'cost_price', type: 'number' },
    { csvField: '在庫数', dbField: 'stock_quantity', type: 'number' },
    { csvField: '最低在庫', dbField: 'min_stock_level', type: 'number' },
    { csvField: '画像URL', dbField: 'image_url', type: 'string' },
    { csvField: '表示順', dbField: 'sort_order', type: 'number' },
    { csvField: '有効', dbField: 'is_active', type: 'boolean' },
  ],
  processes: [
    { csvField: 'ID', dbField: 'id', type: 'string' },
    { csvField: '工程コード', dbField: 'code', required: true, type: 'string' },
    { csvField: '工程名', dbField: 'name', required: true, type: 'string' },
    { csvField: '説明', dbField: 'description', type: 'string' },
    { csvField: '標準時間（分）', dbField: 'default_duration_minutes', type: 'number' },
    { csvField: '生産性ウェイト', dbField: 'productivity_weight', type: 'number' },
    { csvField: '表示順', dbField: 'sort_order', type: 'number' },
    { csvField: '有効', dbField: 'is_active', type: 'boolean' },
  ],
}

// CSVパース
function parseCSV(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvText.trim().split('\n')
  if (lines.length === 0) {
    return { headers: [], rows: [] }
  }

  let firstLine = lines[0]
  if (firstLine.charCodeAt(0) === 0xFEFF) {
    firstLine = firstLine.slice(1)
  }

  const headers = parseCSVLine(firstLine)
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    rows.push(row)
  }

  return { headers, rows }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
  }
  result.push(current.trim())

  return result
}

// 値変換
function transformValue(value: string, mapping: FieldMapping): unknown {
  if (value === '' || value === null || value === undefined) {
    return null
  }

  if (mapping.transform) {
    return mapping.transform(value)
  }

  switch (mapping.type) {
    case 'number':
      const num = Number(value.replace(/,/g, ''))
      return isNaN(num) ? null : num
    case 'boolean':
      return value === 'true' || value === '1' || value === 'はい' || value === 'TRUE' || value === 'Yes' || value === 'yes'
    case 'date':
      if (!value) return null
      const date = new Date(value)
      return isNaN(date.getTime()) ? value : date.toISOString()
    case 'json':
      try {
        return JSON.parse(value)
      } catch {
        return null
      }
    default:
      return value
  }
}

// CSVからDBレコードに変換（セキュリティチェック付き）
function csvToDbRecord(
  row: Record<string, string>,
  entityType: EntityType,
  rowIndex: number
): { record: Record<string, unknown>; errors: { row: number; field?: string; message: string }[] } {
  const mappings = FIELD_MAPPINGS[entityType]
  const record: Record<string, unknown> = {}
  const errors: { row: number; field?: string; message: string }[] = []

  for (const mapping of mappings) {
    const csvValue = row[mapping.csvField]
    if (csvValue !== undefined && csvValue !== '') {
      // セキュリティチェック
      const secError = securityCheck(csvValue, mapping.csvField, rowIndex)
      if (secError) {
        errors.push(secError)
        continue
      }

      // 文字列の長さチェック（最大10000文字）
      if (typeof csvValue === 'string' && csvValue.length > 10000) {
        errors.push({
          row: rowIndex,
          field: mapping.csvField,
          message: '文字列が長すぎます（最大10000文字）',
        })
        continue
      }

      // 値の変換
      const transformed = transformValue(csvValue, mapping)
      if (mapping.type === 'string' && typeof transformed === 'string') {
        record[mapping.dbField] = sanitizeString(transformed)
      } else {
        record[mapping.dbField] = transformed
      }
    }
  }

  return { record, errors }
}

// バリデーション
function validateRow(row: Record<string, string>, entityType: EntityType, rowIndex: number): { row: number; field?: string; message: string }[] {
  const errors: { row: number; field?: string; message: string }[] = []
  const mappings = FIELD_MAPPINGS[entityType]

  for (const mapping of mappings) {
    if (mapping.required) {
      const value = row[mapping.csvField]
      if (!value || value.trim() === '') {
        errors.push({
          row: rowIndex,
          field: mapping.csvField,
          message: `${mapping.csvField}は必須です`,
        })
      }
    }
  }

  return errors
}

// キーフィールド取得
function getKeyField(entityType: EntityType): string {
  const keyFields: Record<EntityType, string> = {
    products: 'code',
    menus: 'code',
    menu_categories: 'name',
    staff: 'employee_code',
    customers: 'customer_code',
    sales: 'sale_number',
    sale_items: 'id',
    reservations: 'id',
    tags: 'name',
    coupons: 'code',
    tickets: 'id',
    materials: 'code',
    processes: 'code',
  }
  return keyFields[entityType]
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

    const { entityType, csvData, companyId, storeId, dryRun }: ImportRequest = await req.json()

    if (!entityType || !csvData || !companyId) {
      throw new Error('entityType, csvData, and companyId are required')
    }

    if (!FIELD_MAPPINGS[entityType]) {
      throw new Error(`Unknown entity type: ${entityType}`)
    }

    const { rows } = parseCSV(csvData)

    const result: ImportResult = {
      success: 0,
      failed: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      errors: [],
    }

    const keyField = getKeyField(entityType)
    const keyDbField = FIELD_MAPPINGS[entityType].find(m => m.csvField === keyField || m.dbField === keyField)?.dbField || keyField

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowIndex = i + 2

      const action: CsvAction = (row['_action'] as CsvAction) || 'create'

      if (action !== 'delete') {
        const validationErrors = validateRow(row, entityType, rowIndex)
        if (validationErrors.length > 0) {
          result.errors.push(...validationErrors)
          result.failed++
          continue
        }
      }

      const { record, errors: conversionErrors } = csvToDbRecord(row, entityType, rowIndex)

      // セキュリティチェックやバリデーションエラーがある場合
      if (conversionErrors.length > 0) {
        result.errors.push(...conversionErrors)
        result.failed++
        continue
      }

      record.company_id = companyId

      if (storeId && ['products', 'staff', 'reservations', 'sales'].includes(entityType)) {
        record.store_id = storeId
      }

      if (dryRun) {
        result.success++
        if (action === 'create') result.created++
        else if (action === 'update') result.updated++
        else if (action === 'delete') result.deleted++
        continue
      }

      try {
        if (action === 'delete') {
          const idOrCode = record['id'] || record[keyDbField]
          if (!idOrCode) {
            result.errors.push({
              row: rowIndex,
              message: '削除にはIDまたはキーが必要です',
            })
            result.failed++
            continue
          }

          let deleteQuery
          if (record['id']) {
            deleteQuery = supabase.from(entityType).delete().eq('id', record['id'])
          } else {
            deleteQuery = supabase.from(entityType).delete()
              .eq('company_id', companyId)
              .eq(keyDbField, idOrCode)
          }

          const { error } = await deleteQuery
          if (error) throw error

          result.deleted++
          result.success++
        } else if (action === 'update' || record['id']) {
          const idOrCode = record['id'] || record[keyDbField]
          delete record['id']

          let updateQuery
          if (rows[i]['ID']) {
            updateQuery = supabase.from(entityType).update(record).eq('id', rows[i]['ID'])
          } else {
            updateQuery = supabase.from(entityType).update(record)
              .eq('company_id', companyId)
              .eq(keyDbField, idOrCode)
          }

          const { error } = await updateQuery
          if (error) throw error

          result.updated++
          result.success++
        } else {
          delete record['id']

          const existingQuery = supabase.from(entityType)
            .select('id')
            .eq('company_id', companyId)
            .eq(keyDbField, record[keyDbField])
            .single()

          const { data: existing } = await existingQuery

          if (existing) {
            const { error } = await supabase.from(entityType)
              .update(record)
              .eq('id', existing.id)

            if (error) throw error
            result.updated++
          } else {
            const { error } = await supabase.from(entityType).insert(record)
            if (error) throw error
            result.created++
          }

          result.success++
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        result.errors.push({
          row: rowIndex,
          message: errorMessage,
          data: record,
        })
        result.failed++
      }
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Import error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
