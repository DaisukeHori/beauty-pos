import { getSupabaseClient } from '../client';
import type { Tables, InsertTables, UpdateTables } from '../types/database';
import {
  checkSqlInjection,
  checkXss,
  sanitizeString,
  validateEmail,
  validatePhone,
  validatePostalCode,
  validateDate,
  validateNumber,
  validateBoolean,
  validateCurrency,
  validateUuid,
} from '../utils/csvValidator';

// CSVのアクション種別
export type CsvAction = 'create' | 'update' | 'delete';

// インポート結果
export interface ImportResult {
  success: number;
  failed: number;
  errors: ImportError[];
  created: number;
  updated: number;
  deleted: number;
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: Record<string, unknown>;
}

// エクスポートタイプ
export type ExportEntityType =
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
  | 'processes';

// インポートタイプ
export type ImportEntityType = ExportEntityType;

// CSV行のベース型
export interface CsvRow {
  _action?: CsvAction; // create, update, delete
  [key: string]: unknown;
}

// フィールドマッピング定義
interface FieldMapping {
  csvField: string;       // CSVのヘッダー名（日本語）
  dbField: string;        // データベースのフィールド名
  required?: boolean;     // 必須かどうか
  type?: 'string' | 'number' | 'boolean' | 'date' | 'json';
  transform?: (value: string) => unknown;
}

// エンティティごとのフィールドマッピング
const FIELD_MAPPINGS: Record<ImportEntityType, FieldMapping[]> = {
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
    { csvField: '性別', dbField: 'gender', type: 'string', transform: (v) => {
      if (v === '男性' || v === 'male') return 'male';
      if (v === '女性' || v === 'female') return 'female';
      return v || null;
    }},
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
    { csvField: 'ステータス', dbField: 'status', type: 'string', transform: (v) => {
      if (v === '完了' || v === 'completed') return 'completed';
      if (v === '取消' || v === 'voided') return 'voided';
      return v || 'completed';
    }},
    { csvField: '備考', dbField: 'notes', type: 'string' },
    { csvField: '作成者ID', dbField: 'created_by', type: 'string' },
  ],
  sale_items: [
    { csvField: 'ID', dbField: 'id', type: 'string' },
    { csvField: '売上ID', dbField: 'sale_id', required: true, type: 'string' },
    { csvField: 'アイテム種別', dbField: 'item_type', required: true, type: 'string', transform: (v) => {
      if (v === 'メニュー' || v === 'menu') return 'menu';
      if (v === '商品' || v === 'product') return 'product';
      return v;
    }},
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
    { csvField: 'ステータス', dbField: 'status', type: 'string', transform: (v) => {
      const map: Record<string, string> = {
        '未確定': 'pending', '確定': 'confirmed', '来店中': 'checked_in',
        '完了': 'completed', 'キャンセル': 'cancelled', '無断キャンセル': 'no_show'
      };
      return map[v] || v || 'pending';
    }},
    { csvField: '指名タイプ', dbField: 'nomination_type', type: 'string' },
    { csvField: '顧客名', dbField: 'customer_name', type: 'string' },
    { csvField: '顧客電話', dbField: 'customer_phone', type: 'string' },
    { csvField: '顧客メール', dbField: 'customer_email', type: 'string' },
    { csvField: '備考', dbField: 'notes', type: 'string' },
    { csvField: '予約元', dbField: 'source', type: 'string', transform: (v) => {
      const map: Record<string, string> = {
        'アプリ': 'app', '電話': 'phone', '来店': 'walk_in',
        'ホットペッパー': 'hotpepper', 'その他': 'other'
      };
      return map[v] || v || 'other';
    }},
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
    { csvField: '割引タイプ', dbField: 'discount_type', type: 'string', transform: (v) => {
      if (v === '割合' || v === 'percentage') return 'percentage';
      if (v === '金額' || v === 'amount') return 'amount';
      return v || 'amount';
    }},
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
    { csvField: 'ステータス', dbField: 'status', type: 'string', transform: (v) => {
      if (v === '有効' || v === 'active') return 'active';
      if (v === '使用済' || v === 'used') return 'used';
      if (v === '期限切れ' || v === 'expired') return 'expired';
      return v || 'active';
    }},
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
};

// CSVパース
function parseCSV(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // BOMを除去
  let firstLine = lines[0];
  if (firstLine.charCodeAt(0) === 0xFEFF) {
    firstLine = firstLine.slice(1);
  }

  const headers = parseCSVLine(firstLine);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

// CSV行をパース（クォート対応）
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());

  return result;
}

// セキュリティチェック
function securityCheck(value: string, field: string): ImportError | null {
  if (checkSqlInjection(value)) {
    return {
      row: 0,
      field,
      message: `SQLインジェクションの可能性がある文字列が検出されました: ${field}`,
    };
  }
  if (checkXss(value)) {
    return {
      row: 0,
      field,
      message: `XSSの可能性がある文字列が検出されました: ${field}`,
    };
  }
  return null;
}

// 値の変換とバリデーション
function transformValue(
  value: string,
  mapping: FieldMapping
): { value: unknown; error: string | null } {
  if (value === '' || value === null || value === undefined) {
    return { value: null, error: null };
  }

  // カスタム変換がある場合
  if (mapping.transform) {
    try {
      const transformed = mapping.transform(value);
      return { value: transformed, error: null };
    } catch (e) {
      return { value: null, error: `変換エラー: ${mapping.csvField}` };
    }
  }

  switch (mapping.type) {
    case 'number': {
      const result = validateNumber(value, { min: -999999999, max: 999999999 });
      if (!result.isValid) {
        return { value: null, error: result.errors[0]?.message || '数値が不正です' };
      }
      return { value: result.sanitizedValue, error: null };
    }
    case 'boolean': {
      const result = validateBoolean(value);
      if (!result.isValid) {
        return { value: null, error: result.errors[0]?.message || '真偽値が不正です' };
      }
      return { value: result.sanitizedValue, error: null };
    }
    case 'date': {
      const result = validateDate(value);
      if (!result.isValid) {
        return { value: null, error: result.errors[0]?.message || '日付が不正です' };
      }
      return { value: result.sanitizedValue, error: null };
    }
    case 'json':
      try {
        return { value: JSON.parse(value), error: null };
      } catch {
        return { value: null, error: 'JSONの形式が不正です' };
      }
    default:
      // 文字列の場合はサニタイズ
      const sanitized = sanitizeString(value);
      // 最大長チェック（10000文字）
      if (sanitized.length > 10000) {
        return { value: null, error: '文字列が長すぎます（最大10000文字）' };
      }
      return { value: sanitized, error: null };
  }
}

// CSVからDBレコードに変換（バリデーション付き）
function csvToDbRecord(
  row: Record<string, string>,
  entityType: ImportEntityType,
  rowIndex: number
): { record: Record<string, unknown>; errors: ImportError[] } {
  const mappings = FIELD_MAPPINGS[entityType];
  const record: Record<string, unknown> = {};
  const errors: ImportError[] = [];

  for (const mapping of mappings) {
    const csvValue = row[mapping.csvField];
    if (csvValue !== undefined && csvValue !== '') {
      // セキュリティチェック
      const secError = securityCheck(csvValue, mapping.csvField);
      if (secError) {
        secError.row = rowIndex;
        errors.push(secError);
        continue;
      }

      // 値の変換とバリデーション
      const { value, error } = transformValue(csvValue, mapping);
      if (error) {
        errors.push({
          row: rowIndex,
          field: mapping.csvField,
          message: error,
        });
      } else {
        record[mapping.dbField] = value;
      }
    }
  }

  return { record, errors };
}

// DBレコードからCSV行に変換
function dbRecordToCsv(
  record: Record<string, unknown>,
  entityType: ExportEntityType
): Record<string, string> {
  const mappings = FIELD_MAPPINGS[entityType];
  const row: Record<string, string> = {};

  for (const mapping of mappings) {
    const dbValue = record[mapping.dbField];
    if (dbValue === null || dbValue === undefined) {
      row[mapping.csvField] = '';
    } else if (typeof dbValue === 'boolean') {
      row[mapping.csvField] = dbValue ? 'true' : 'false';
    } else if (typeof dbValue === 'object') {
      row[mapping.csvField] = JSON.stringify(dbValue);
    } else {
      row[mapping.csvField] = String(dbValue);
    }
  }

  return row;
}

// CSVに変換
function convertToCSV(data: Record<string, string>[], headers: string[]): string {
  const BOM = '\uFEFF';
  const headerRow = headers.join(',');
  const rows = data.map((row) =>
    headers.map((header) => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      const escaped = String(value).replace(/"/g, '""');
      if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
        return `"${escaped}"`;
      }
      return escaped;
    }).join(',')
  );
  return BOM + [headerRow, ...rows].join('\n');
}

// バリデーション
function validateRow(
  row: Record<string, string>,
  entityType: ImportEntityType,
  rowIndex: number
): ImportError[] {
  const errors: ImportError[] = [];
  const mappings = FIELD_MAPPINGS[entityType];

  for (const mapping of mappings) {
    if (mapping.required) {
      const value = row[mapping.csvField];
      if (!value || value.trim() === '') {
        errors.push({
          row: rowIndex,
          field: mapping.csvField,
          message: `${mapping.csvField}は必須です`,
        });
      }
    }
  }

  return errors;
}

// インポート用キーフィールドを取得
function getKeyField(entityType: ImportEntityType): string {
  const keyFields: Record<ImportEntityType, string> = {
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
  };
  return keyFields[entityType];
}

export const csvService = {
  // CSVテンプレートを生成
  getTemplate(entityType: ExportEntityType): string {
    const mappings = FIELD_MAPPINGS[entityType];
    const headers = mappings.map(m => m.csvField);

    // アクション列を先頭に追加
    return '_action,' + headers.join(',');
  },

  // エクスポート用ヘッダーを取得
  getExportHeaders(entityType: ExportEntityType): string[] {
    const mappings = FIELD_MAPPINGS[entityType];
    return mappings.map(m => m.csvField);
  },

  // フィールドマッピングを取得
  getFieldMappings(entityType: ImportEntityType): FieldMapping[] {
    return FIELD_MAPPINGS[entityType];
  },

  // エクスポート（マスターデータ）
  async exportMaster(
    entityType: ExportEntityType,
    companyId: string,
    options?: { storeId?: string; isActive?: boolean }
  ): Promise<string> {
    const supabase = getSupabaseClient();

    let query = supabase.from(entityType).select('*').eq('company_id', companyId);

    if (options?.storeId && ['products', 'staff', 'reservations', 'sales'].includes(entityType)) {
      query = query.eq('store_id', options.storeId);
    }

    if (options?.isActive !== undefined) {
      query = query.eq('is_active', options.isActive);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    const headers = this.getExportHeaders(entityType);
    const rows = (data || []).map(record => dbRecordToCsv(record, entityType));

    return convertToCSV(rows, headers);
  },

  // インポート
  async importData(
    entityType: ImportEntityType,
    csvText: string,
    companyId: string,
    options?: { storeId?: string; dryRun?: boolean }
  ): Promise<ImportResult> {
    const supabase = getSupabaseClient();
    const { headers, rows } = parseCSV(csvText);

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      created: 0,
      updated: 0,
      deleted: 0,
    };

    const keyField = getKeyField(entityType);
    const keyDbField = FIELD_MAPPINGS[entityType].find(m => m.csvField === keyField || m.dbField === keyField)?.dbField || keyField;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2; // ヘッダー行(1) + 0インデックス

      // アクションの判定
      const action: CsvAction = (row['_action'] as CsvAction) || 'create';

      // バリデーション（deleteの場合はIDのみ必要）
      if (action !== 'delete') {
        const validationErrors = validateRow(row, entityType, rowIndex);
        if (validationErrors.length > 0) {
          result.errors.push(...validationErrors);
          result.failed++;
          continue;
        }
      }

      const { record, errors: conversionErrors } = csvToDbRecord(row, entityType, rowIndex);

      // 変換エラーがある場合
      if (conversionErrors.length > 0) {
        result.errors.push(...conversionErrors);
        result.failed++;
        continue;
      }

      record.company_id = companyId;

      if (options?.storeId && ['products', 'staff', 'reservations', 'sales'].includes(entityType)) {
        record.store_id = options.storeId;
      }

      // ドライランの場合はスキップ
      if (options?.dryRun) {
        result.success++;
        if (action === 'create') result.created++;
        else if (action === 'update') result.updated++;
        else if (action === 'delete') result.deleted++;
        continue;
      }

      try {
        if (action === 'delete') {
          // 削除
          const idOrCode = record['id'] || record[keyDbField];
          if (!idOrCode) {
            result.errors.push({
              row: rowIndex,
              message: '削除にはIDまたはキーが必要です',
            });
            result.failed++;
            continue;
          }

          // IDで削除を試みる
          let deleteQuery;
          if (record['id']) {
            deleteQuery = supabase.from(entityType).delete().eq('id', record['id']);
          } else {
            deleteQuery = supabase.from(entityType).delete()
              .eq('company_id', companyId)
              .eq(keyDbField, idOrCode);
          }

          const { error } = await deleteQuery;
          if (error) throw error;

          result.deleted++;
          result.success++;
        } else if (action === 'update' || record['id']) {
          // 更新（IDがある場合）
          const idOrCode = record['id'] || record[keyDbField];
          delete record['id']; // idは更新しない

          let updateQuery;
          if (rows[i]['ID']) {
            updateQuery = supabase.from(entityType).update(record).eq('id', rows[i]['ID']);
          } else {
            // キーフィールドで検索して更新
            updateQuery = supabase.from(entityType).update(record)
              .eq('company_id', companyId)
              .eq(keyDbField, idOrCode);
          }

          const { error } = await updateQuery;
          if (error) throw error;

          result.updated++;
          result.success++;
        } else {
          // 新規作成
          delete record['id'];

          // 既存チェック（キーが重複していないか）
          const existingQuery = supabase.from(entityType)
            .select('id')
            .eq('company_id', companyId)
            .eq(keyDbField, record[keyDbField])
            .single();

          const { data: existing } = await existingQuery;

          if (existing) {
            // 既存がある場合は更新
            const { error } = await supabase.from(entityType)
              .update(record)
              .eq('id', existing.id);

            if (error) throw error;
            result.updated++;
          } else {
            // 新規作成
            const { error } = await supabase.from(entityType).insert(record);
            if (error) throw error;
            result.created++;
          }

          result.success++;
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({
          row: rowIndex,
          message: errorMessage,
          data: record,
        });
        result.failed++;
      }
    }

    return result;
  },

  // 売上データのインポート（トランザクション対応）
  async importSalesWithItems(
    salesCsv: string,
    itemsCsv: string,
    companyId: string,
    storeId: string
  ): Promise<ImportResult> {
    const supabase = getSupabaseClient();
    const salesData = parseCSV(salesCsv);
    const itemsData = parseCSV(itemsCsv);

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      created: 0,
      updated: 0,
      deleted: 0,
    };

    // 売上データを処理
    for (let i = 0; i < salesData.rows.length; i++) {
      const saleRow = salesData.rows[i];
      const rowIndex = i + 2;
      const action = (saleRow['_action'] as CsvAction) || 'create';

      try {
        const saleRecord = csvToDbRecord(saleRow, 'sales');
        saleRecord.company_id = companyId;
        saleRecord.store_id = storeId;

        if (action === 'delete') {
          // 売上と関連アイテムを削除
          if (saleRecord['id']) {
            await supabase.from('sale_items').delete().eq('sale_id', saleRecord['id']);
            await supabase.from('sales').delete().eq('id', saleRecord['id']);
          }
          result.deleted++;
          result.success++;
          continue;
        }

        // 売上を作成または更新
        let saleId: string;

        if (saleRecord['id'] || action === 'update') {
          // 更新
          const id = saleRecord['id'] as string;
          delete saleRecord['id'];
          const { error } = await supabase.from('sales').update(saleRecord).eq('id', id);
          if (error) throw error;
          saleId = id;
          result.updated++;
        } else {
          // 新規作成
          delete saleRecord['id'];
          const { data, error } = await supabase.from('sales').insert(saleRecord).select('id').single();
          if (error) throw error;
          saleId = data.id;
          result.created++;
        }

        // 関連する売上明細を処理
        const relatedItems = itemsData.rows.filter(item =>
          item['売上ID'] === saleRow['ID'] || item['売上ID'] === saleRecord['sale_number']
        );

        for (const itemRow of relatedItems) {
          const itemRecord = csvToDbRecord(itemRow, 'sale_items');
          itemRecord.sale_id = saleId;

          if (itemRow['ID'] || (itemRow['_action'] as CsvAction) === 'update') {
            const itemId = itemRow['ID'];
            delete itemRecord['id'];
            await supabase.from('sale_items').update(itemRecord).eq('id', itemId);
          } else {
            delete itemRecord['id'];
            await supabase.from('sale_items').insert(itemRecord);
          }
        }

        result.success++;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push({
          row: rowIndex,
          message: errorMessage,
          data: saleRow,
        });
        result.failed++;
      }
    }

    return result;
  },

  // CSVパースをエクスポート
  parseCSV,

  // CSVに変換をエクスポート
  convertToCSV,
};

export default csvService;
