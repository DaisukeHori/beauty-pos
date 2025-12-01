import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, spacing, borderRadius } from '@beauty-pos/ui';

// 適格簡易請求書（インボイス）対応レシートコンポーネント
// Qualified Simplified Invoice compliant receipt component

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: 10 | 8; // 10% 標準税率, 8% 軽減税率
  staffName?: string;
  details?: string; // 髪の長さ、指名料など
}

export interface ReceiptData {
  // 店舗情報
  store: {
    name: string;
    postalCode?: string;
    address: string;
    phone: string;
    logoUrl?: string;
    invoiceRegistrationNumber: string; // 登録番号（T + 13桁）
  };
  // 取引情報
  transaction: {
    invoiceNumber: string; // 請求書番号
    date: Date;
    customerName?: string;
    staffName?: string;
  };
  // 明細
  items: ReceiptItem[];
  // 金額情報
  totals: {
    subtotal: number; // 小計（税込）
    discount: number; // 割引
    pointsUsed: number; // ポイント利用
    total: number; // 合計
    tax10Base: number; // 10%対象（税抜）
    tax10Amount: number; // 10%消費税額
    tax8Base: number; // 8%対象（税抜）
    tax8Amount: number; // 8%消費税額
  };
  // 支払い情報
  payments: {
    method: string;
    amount: number;
  }[];
  change?: number;
  // ポイント情報
  points?: {
    earned: number;
    balance: number;
  };
  // ヘッダー・フッター
  headerMessage?: string;
  footerMessage?: string;
}

interface ReceiptProps {
  data: ReceiptData;
  paperWidth?: 80 | 58; // mm
  showBarcode?: boolean;
}

export const Receipt: React.FC<ReceiptProps> = ({
  data,
  paperWidth = 80,
  showBarcode = true,
}) => {
  const is58mm = paperWidth === 58;
  const charPerLine = is58mm ? 32 : 42;

  // 日付フォーマット
  const formatDate = (date: Date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}年${month}月${day}日 ${hours}:${minutes}`;
  };

  // 金額フォーマット
  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  // 税率マーク
  const getTaxMark = (rate: 10 | 8) => {
    return rate === 8 ? '※' : '';
  };

  // 支払方法の日本語表記
  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: '現金',
      card: 'クレジットカード',
      electronic_money: '電子マネー',
      qr_payment: 'QRコード決済',
      credit: '売掛',
    };
    return labels[method] || method;
  };

  // セパレータライン生成
  const getSeparator = (char: string = '-') => {
    return char.repeat(charPerLine);
  };

  return (
    <View style={[styles.container, is58mm && styles.container58mm]}>
      {/* ヘッダーメッセージ */}
      {data.headerMessage && (
        <Text style={styles.headerMessage}>{data.headerMessage}</Text>
      )}

      {/* 店舗ロゴ */}
      {data.store.logoUrl && (
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: data.store.logoUrl }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      )}

      {/* 店舗名 */}
      <Text style={styles.storeName}>{data.store.name}</Text>

      {/* 店舗住所・電話 */}
      {data.store.postalCode && (
        <Text style={styles.storeInfo}>〒{data.store.postalCode}</Text>
      )}
      <Text style={styles.storeInfo}>{data.store.address}</Text>
      <Text style={styles.storeInfo}>TEL: {data.store.phone}</Text>

      {/* 登録番号（適格請求書発行事業者登録番号） */}
      <Text style={styles.registrationNumber}>
        登録番号: {data.store.invoiceRegistrationNumber}
      </Text>

      <Text style={styles.separator}>{getSeparator('=')}</Text>

      {/* 領収書タイトル */}
      <Text style={styles.title}>領 収 書</Text>

      <Text style={styles.separator}>{getSeparator('=')}</Text>

      {/* 取引情報 */}
      <Text style={styles.transactionInfo}>
        {formatDate(data.transaction.date)}
      </Text>
      <Text style={styles.transactionInfo}>
        No. {data.transaction.invoiceNumber}
      </Text>
      {data.transaction.customerName && (
        <Text style={styles.transactionInfo}>
          {data.transaction.customerName} 様
        </Text>
      )}
      {data.transaction.staffName && (
        <Text style={styles.transactionInfo}>
          担当: {data.transaction.staffName}
        </Text>
      )}

      <Text style={styles.separator}>{getSeparator('-')}</Text>

      {/* 明細 */}
      {data.items.map((item, index) => (
        <View key={index} style={styles.itemRow}>
          <View style={styles.itemNameRow}>
            <Text style={styles.itemName} numberOfLines={2}>
              {item.name}{getTaxMark(item.taxRate)}
            </Text>
          </View>
          {item.details && (
            <Text style={styles.itemDetails}>  {item.details}</Text>
          )}
          {item.staffName && (
            <Text style={styles.itemStaff}>  担当: {item.staffName}</Text>
          )}
          <View style={styles.itemPriceRow}>
            <Text style={styles.itemQuantity}>
              {formatCurrency(item.unitPrice)} × {item.quantity}
            </Text>
            <Text style={styles.itemPrice}>
              {formatCurrency(item.totalPrice)}
            </Text>
          </View>
        </View>
      ))}

      <Text style={styles.separator}>{getSeparator('-')}</Text>

      {/* 小計 */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>小計</Text>
        <Text style={styles.totalValue}>{formatCurrency(data.totals.subtotal)}</Text>
      </View>

      {/* 割引 */}
      {data.totals.discount > 0 && (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>割引</Text>
          <Text style={styles.discountValue}>
            -{formatCurrency(data.totals.discount)}
          </Text>
        </View>
      )}

      {/* ポイント利用 */}
      {data.totals.pointsUsed > 0 && (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>ポイント利用</Text>
          <Text style={styles.discountValue}>
            -{formatCurrency(data.totals.pointsUsed)}
          </Text>
        </View>
      )}

      <Text style={styles.separator}>{getSeparator('=')}</Text>

      {/* 合計 */}
      <View style={styles.grandTotalRow}>
        <Text style={styles.grandTotalLabel}>合計</Text>
        <Text style={styles.grandTotalValue}>
          {formatCurrency(data.totals.total)}
        </Text>
      </View>

      <Text style={styles.separator}>{getSeparator('-')}</Text>

      {/* 支払い内訳 */}
      {data.payments.map((payment, index) => (
        <View key={index} style={styles.totalRow}>
          <Text style={styles.totalLabel}>
            {getPaymentMethodLabel(payment.method)}
          </Text>
          <Text style={styles.totalValue}>
            {formatCurrency(payment.amount)}
          </Text>
        </View>
      ))}

      {/* お釣り */}
      {data.change !== undefined && data.change > 0 && (
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>お釣り</Text>
          <Text style={styles.totalValue}>{formatCurrency(data.change)}</Text>
        </View>
      )}

      <Text style={styles.separator}>{getSeparator('=')}</Text>

      {/* 消費税内訳（適格簡易請求書の必須項目） */}
      <Text style={styles.taxTitle}>【消費税内訳】</Text>

      {data.totals.tax10Base > 0 && (
        <View style={styles.taxBreakdown}>
          <Text style={styles.taxLabel}>10%対象</Text>
          <Text style={styles.taxValue}>
            {formatCurrency(data.totals.tax10Base + data.totals.tax10Amount)}
          </Text>
        </View>
      )}
      {data.totals.tax10Base > 0 && (
        <View style={styles.taxBreakdown}>
          <Text style={styles.taxLabelIndent}>（税抜 {formatCurrency(data.totals.tax10Base)}）</Text>
          <Text style={styles.taxValueSmall}>
            内消費税 {formatCurrency(data.totals.tax10Amount)}
          </Text>
        </View>
      )}

      {data.totals.tax8Base > 0 && (
        <View style={styles.taxBreakdown}>
          <Text style={styles.taxLabel}>8%対象 ※</Text>
          <Text style={styles.taxValue}>
            {formatCurrency(data.totals.tax8Base + data.totals.tax8Amount)}
          </Text>
        </View>
      )}
      {data.totals.tax8Base > 0 && (
        <View style={styles.taxBreakdown}>
          <Text style={styles.taxLabelIndent}>（税抜 {formatCurrency(data.totals.tax8Base)}）</Text>
          <Text style={styles.taxValueSmall}>
            内消費税 {formatCurrency(data.totals.tax8Amount)}
          </Text>
        </View>
      )}

      {data.totals.tax8Base > 0 && (
        <Text style={styles.taxNote}>※ 軽減税率対象</Text>
      )}

      {/* ポイント情報 */}
      {data.points && (
        <>
          <Text style={styles.separator}>{getSeparator('-')}</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>今回獲得ポイント</Text>
            <Text style={styles.pointsValue}>+{data.points.earned}pt</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>ポイント残高</Text>
            <Text style={styles.totalValue}>{data.points.balance.toLocaleString()}pt</Text>
          </View>
        </>
      )}

      {/* バーコード（領収書番号） */}
      {showBarcode && (
        <View style={styles.barcodeContainer}>
          <Text style={styles.barcodeText}>
            ||| |||| ||| |||| ||| ||||
          </Text>
          <Text style={styles.barcodeNumber}>
            {data.transaction.invoiceNumber}
          </Text>
        </View>
      )}

      <Text style={styles.separator}>{getSeparator('-')}</Text>

      {/* フッターメッセージ */}
      {data.footerMessage && (
        <Text style={styles.footerMessage}>{data.footerMessage}</Text>
      )}

      {/* デフォルトフッター */}
      <Text style={styles.thankYou}>ご来店ありがとうございました</Text>
      <Text style={styles.footerNote}>
        またのご来店をお待ちしております
      </Text>
    </View>
  );
};

// レシートプレビュー用コンポーネント（画面表示用）
export const ReceiptPreview: React.FC<ReceiptProps & { scale?: number }> = ({
  scale = 1,
  ...props
}) => {
  return (
    <View style={[styles.previewContainer, { transform: [{ scale }] }]}>
      <Receipt {...props} />
    </View>
  );
};

// 印刷用データ生成ヘルパー
export const generateReceiptText = (data: ReceiptData, charPerLine: number = 42): string => {
  const lines: string[] = [];
  const separator = '-'.repeat(charPerLine);
  const doubleSeparator = '='.repeat(charPerLine);

  const centerText = (text: string) => {
    const padding = Math.floor((charPerLine - text.length) / 2);
    return ' '.repeat(Math.max(0, padding)) + text;
  };

  const rightAlign = (left: string, right: string) => {
    const spaces = charPerLine - left.length - right.length;
    return left + ' '.repeat(Math.max(1, spaces)) + right;
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;

  // ヘッダー
  if (data.headerMessage) {
    lines.push(centerText(data.headerMessage));
    lines.push('');
  }

  // 店舗情報
  lines.push(centerText(data.store.name));
  if (data.store.postalCode) {
    lines.push(centerText(`〒${data.store.postalCode}`));
  }
  lines.push(centerText(data.store.address));
  lines.push(centerText(`TEL: ${data.store.phone}`));
  lines.push(centerText(`登録番号: ${data.store.invoiceRegistrationNumber}`));
  lines.push(doubleSeparator);
  lines.push(centerText('領 収 書'));
  lines.push(doubleSeparator);

  // 取引情報
  lines.push(formatDate(data.transaction.date));
  lines.push(`No. ${data.transaction.invoiceNumber}`);
  if (data.transaction.customerName) {
    lines.push(`${data.transaction.customerName} 様`);
  }
  if (data.transaction.staffName) {
    lines.push(`担当: ${data.transaction.staffName}`);
  }
  lines.push(separator);

  // 明細
  data.items.forEach((item) => {
    const taxMark = item.taxRate === 8 ? '※' : '';
    lines.push(`${item.name}${taxMark}`);
    if (item.details) {
      lines.push(`  ${item.details}`);
    }
    if (item.staffName) {
      lines.push(`  担当: ${item.staffName}`);
    }
    lines.push(rightAlign(
      `  ${formatCurrency(item.unitPrice)} × ${item.quantity}`,
      formatCurrency(item.totalPrice)
    ));
  });

  lines.push(separator);

  // 小計・割引・合計
  lines.push(rightAlign('小計', formatCurrency(data.totals.subtotal)));
  if (data.totals.discount > 0) {
    lines.push(rightAlign('割引', `-${formatCurrency(data.totals.discount)}`));
  }
  if (data.totals.pointsUsed > 0) {
    lines.push(rightAlign('ポイント利用', `-${formatCurrency(data.totals.pointsUsed)}`));
  }
  lines.push(doubleSeparator);
  lines.push(rightAlign('合計', formatCurrency(data.totals.total)));
  lines.push(separator);

  // 支払い
  data.payments.forEach((payment) => {
    const labels: Record<string, string> = {
      cash: '現金',
      card: 'クレジットカード',
      electronic_money: '電子マネー',
      qr_payment: 'QRコード決済',
      credit: '売掛',
    };
    lines.push(rightAlign(labels[payment.method] || payment.method, formatCurrency(payment.amount)));
  });
  if (data.change && data.change > 0) {
    lines.push(rightAlign('お釣り', formatCurrency(data.change)));
  }
  lines.push(doubleSeparator);

  // 消費税内訳
  lines.push('【消費税内訳】');
  if (data.totals.tax10Base > 0) {
    lines.push(rightAlign('10%対象', formatCurrency(data.totals.tax10Base + data.totals.tax10Amount)));
    lines.push(rightAlign('  (税抜)', formatCurrency(data.totals.tax10Base)));
    lines.push(rightAlign('  内消費税', formatCurrency(data.totals.tax10Amount)));
  }
  if (data.totals.tax8Base > 0) {
    lines.push(rightAlign('8%対象 ※', formatCurrency(data.totals.tax8Base + data.totals.tax8Amount)));
    lines.push(rightAlign('  (税抜)', formatCurrency(data.totals.tax8Base)));
    lines.push(rightAlign('  内消費税', formatCurrency(data.totals.tax8Amount)));
    lines.push('※ 軽減税率対象');
  }

  // ポイント
  if (data.points) {
    lines.push(separator);
    lines.push(rightAlign('今回獲得ポイント', `+${data.points.earned}pt`));
    lines.push(rightAlign('ポイント残高', `${data.points.balance.toLocaleString()}pt`));
  }

  lines.push(separator);

  // フッター
  if (data.footerMessage) {
    lines.push(centerText(data.footerMessage));
  }
  lines.push(centerText('ご来店ありがとうございました'));
  lines.push(centerText('またのご来店をお待ちしております'));

  return lines.join('\n');
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    padding: spacing[4],
    width: 320, // 80mm相当
    fontFamily: 'monospace',
  },
  container58mm: {
    width: 232, // 58mm相当
  },
  previewContainer: {
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  logo: {
    width: 100,
    height: 50,
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing[1],
    color: colors.neutral[900],
  },
  storeInfo: {
    fontSize: 11,
    textAlign: 'center',
    color: colors.neutral[700],
    lineHeight: 16,
  },
  registrationNumber: {
    fontSize: 10,
    textAlign: 'center',
    color: colors.neutral[600],
    marginTop: spacing[1],
    marginBottom: spacing[2],
  },
  separator: {
    fontSize: 10,
    textAlign: 'center',
    color: colors.neutral[400],
    letterSpacing: -1,
    marginVertical: spacing[1],
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.neutral[900],
    letterSpacing: 8,
  },
  transactionInfo: {
    fontSize: 11,
    color: colors.neutral[700],
    marginBottom: spacing[0.5],
  },
  itemRow: {
    marginBottom: spacing[2],
  },
  itemNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 12,
    color: colors.neutral[900],
    flex: 1,
  },
  itemDetails: {
    fontSize: 10,
    color: colors.neutral[600],
    marginTop: spacing[0.5],
  },
  itemStaff: {
    fontSize: 10,
    color: colors.neutral[500],
    marginTop: spacing[0.5],
  },
  itemPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[0.5],
  },
  itemQuantity: {
    fontSize: 11,
    color: colors.neutral[600],
  },
  itemPrice: {
    fontSize: 12,
    color: colors.neutral[900],
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[1],
  },
  totalLabel: {
    fontSize: 12,
    color: colors.neutral[700],
  },
  totalValue: {
    fontSize: 12,
    color: colors.neutral[900],
  },
  discountValue: {
    fontSize: 12,
    color: colors.error[600],
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.neutral[900],
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[900],
  },
  taxTitle: {
    fontSize: 11,
    color: colors.neutral[700],
    marginBottom: spacing[1],
    fontWeight: '500',
  },
  taxBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[0.5],
  },
  taxLabel: {
    fontSize: 11,
    color: colors.neutral[700],
  },
  taxLabelIndent: {
    fontSize: 10,
    color: colors.neutral[500],
    paddingLeft: spacing[2],
  },
  taxValue: {
    fontSize: 11,
    color: colors.neutral[700],
  },
  taxValueSmall: {
    fontSize: 10,
    color: colors.neutral[500],
  },
  taxNote: {
    fontSize: 10,
    color: colors.neutral[500],
    marginTop: spacing[1],
  },
  pointsValue: {
    fontSize: 12,
    color: colors.success[600],
    fontWeight: '500',
  },
  barcodeContainer: {
    alignItems: 'center',
    marginVertical: spacing[3],
  },
  barcodeText: {
    fontSize: 24,
    letterSpacing: 2,
    color: colors.neutral[900],
    marginBottom: spacing[1],
  },
  barcodeNumber: {
    fontSize: 10,
    color: colors.neutral[600],
  },
  headerMessage: {
    fontSize: 11,
    textAlign: 'center',
    color: colors.neutral[700],
    marginBottom: spacing[2],
  },
  footerMessage: {
    fontSize: 11,
    textAlign: 'center',
    color: colors.neutral[600],
    marginBottom: spacing[2],
  },
  thankYou: {
    fontSize: 12,
    textAlign: 'center',
    color: colors.neutral[800],
    fontWeight: '500',
    marginTop: spacing[2],
  },
  footerNote: {
    fontSize: 10,
    textAlign: 'center',
    color: colors.neutral[500],
    marginTop: spacing[1],
  },
});

export default Receipt;
