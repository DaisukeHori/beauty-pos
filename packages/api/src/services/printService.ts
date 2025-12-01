import { getSupabaseClient } from '../client';

export interface ReceiptData {
  saleId: string;
  saleNumber: string;
  saleDate: string;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  invoiceRegistrationNumber?: string;
  customerName?: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    taxRate: number;
    staffName?: string;
    nominationFee?: number;
  }[];
  subtotal: number;
  discountTotal: number;
  discounts: {
    name: string;
    amount: number;
  }[];
  tax10Amount: number;
  tax8Amount: number;
  total: number;
  payments: {
    method: string;
    amount: number;
  }[];
  paidAmount: number;
  change: number;
  pointsUsed: number;
  pointsEarned: number;
  pointsBalance?: number;
  staffName?: string;
  receiptMessage?: string;
  logoUrl?: string;
}

export interface PrintJob {
  id: string;
  company_id: string;
  store_id: string;
  printer_id: string | null;
  job_type: 'receipt' | 'kitchen' | 'label' | 'report';
  status: 'pending' | 'printing' | 'completed' | 'failed';
  data: Record<string, unknown>;
  copies: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Printer {
  id: string;
  company_id: string;
  store_id: string;
  name: string;
  type: 'thermal' | 'inkjet' | 'laser';
  connection_type: 'usb' | 'network' | 'bluetooth';
  ip_address: string | null;
  port: number | null;
  paper_width: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: '現金',
  card: 'クレジットカード',
  electronic_money: '電子マネー',
  qr_payment: 'QR決済',
  credit: '売掛',
};

export const printService = {
  // Generate receipt HTML (for printing or preview)
  generateReceiptHtml(data: ReceiptData): string {
    const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`;
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const itemsHtml = data.items.map(item => `
      <tr>
        <td class="item-name">${item.name}${item.staffName ? `<br><small>担当: ${item.staffName}</small>` : ''}</td>
        <td class="item-qty">${item.quantity}</td>
        <td class="item-price">${formatCurrency(item.subtotal)}</td>
      </tr>
      ${item.nominationFee ? `
      <tr>
        <td class="item-name" style="padding-left: 10px;">指名料</td>
        <td class="item-qty">1</td>
        <td class="item-price">${formatCurrency(item.nominationFee)}</td>
      </tr>
      ` : ''}
    `).join('');

    const discountsHtml = data.discounts.length > 0
      ? data.discounts.map(d => `
        <tr class="discount-row">
          <td colspan="2">${d.name}</td>
          <td>-${formatCurrency(d.amount)}</td>
        </tr>
      `).join('')
      : '';

    const paymentsHtml = data.payments.map(p => `
      <tr>
        <td colspan="2">${PAYMENT_METHOD_LABELS[p.method] || p.method}</td>
        <td>${formatCurrency(p.amount)}</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Hiragino Kaku Gothic ProN', 'メイリオ', sans-serif;
      font-size: 12px;
      width: 80mm;
      padding: 5mm;
      background: white;
    }
    .receipt {
      max-width: 100%;
    }
    .header {
      text-align: center;
      margin-bottom: 10px;
      border-bottom: 1px dashed #000;
      padding-bottom: 10px;
    }
    .logo {
      max-width: 50mm;
      max-height: 20mm;
      margin-bottom: 5px;
    }
    .store-name {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .store-info {
      font-size: 10px;
      color: #333;
    }
    .invoice-number {
      font-size: 10px;
      margin-top: 5px;
    }
    .sale-info {
      margin: 10px 0;
      border-bottom: 1px dashed #000;
      padding-bottom: 10px;
    }
    .sale-info table {
      width: 100%;
      font-size: 11px;
    }
    .sale-info td {
      padding: 2px 0;
    }
    .items table {
      width: 100%;
      border-collapse: collapse;
    }
    .items th {
      text-align: left;
      border-bottom: 1px solid #000;
      padding: 5px 0;
      font-size: 11px;
    }
    .items td {
      padding: 3px 0;
      vertical-align: top;
    }
    .item-name {
      width: 55%;
    }
    .item-qty {
      width: 15%;
      text-align: center;
    }
    .item-price {
      width: 30%;
      text-align: right;
    }
    .discount-row td {
      color: #c00;
    }
    .totals {
      margin-top: 10px;
      border-top: 1px dashed #000;
      padding-top: 10px;
    }
    .totals table {
      width: 100%;
    }
    .totals td {
      padding: 3px 0;
    }
    .totals td:last-child {
      text-align: right;
    }
    .total-row {
      font-size: 16px;
      font-weight: bold;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
    }
    .total-row td {
      padding: 5px 0;
    }
    .payments {
      margin-top: 10px;
      border-top: 1px dashed #000;
      padding-top: 10px;
    }
    .payments table {
      width: 100%;
    }
    .payments td {
      padding: 2px 0;
    }
    .payments td:last-child {
      text-align: right;
    }
    .change-row {
      font-weight: bold;
      font-size: 14px;
    }
    .points {
      margin-top: 10px;
      border-top: 1px dashed #000;
      padding-top: 10px;
      font-size: 11px;
    }
    .points table {
      width: 100%;
    }
    .points td:last-child {
      text-align: right;
    }
    .footer {
      margin-top: 15px;
      text-align: center;
      font-size: 11px;
      border-top: 1px dashed #000;
      padding-top: 10px;
    }
    .receipt-message {
      margin-top: 10px;
      padding: 10px;
      background: #f5f5f5;
      text-align: center;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      ${data.logoUrl ? `<img src="${data.logoUrl}" class="logo" alt="Logo">` : ''}
      <div class="store-name">${data.storeName}</div>
      ${data.storeAddress ? `<div class="store-info">${data.storeAddress}</div>` : ''}
      ${data.storePhone ? `<div class="store-info">TEL: ${data.storePhone}</div>` : ''}
      ${data.invoiceRegistrationNumber ? `<div class="invoice-number">登録番号: ${data.invoiceRegistrationNumber}</div>` : ''}
    </div>

    <div class="sale-info">
      <table>
        <tr>
          <td>伝票番号:</td>
          <td>${data.saleNumber}</td>
        </tr>
        <tr>
          <td>日時:</td>
          <td>${formatDate(data.saleDate)}</td>
        </tr>
        ${data.customerName ? `
        <tr>
          <td>お客様:</td>
          <td>${data.customerName} 様</td>
        </tr>
        ` : ''}
        ${data.staffName ? `
        <tr>
          <td>担当:</td>
          <td>${data.staffName}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div class="items">
      <table>
        <thead>
          <tr>
            <th>品名</th>
            <th style="text-align: center;">数量</th>
            <th style="text-align: right;">金額</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
          ${discountsHtml}
        </tbody>
      </table>
    </div>

    <div class="totals">
      <table>
        <tr>
          <td>小計</td>
          <td>${formatCurrency(data.subtotal)}</td>
        </tr>
        ${data.discountTotal > 0 ? `
        <tr>
          <td>割引合計</td>
          <td>-${formatCurrency(data.discountTotal)}</td>
        </tr>
        ` : ''}
        <tr>
          <td>内消費税(10%対象)</td>
          <td>${formatCurrency(data.tax10Amount)}</td>
        </tr>
        ${data.tax8Amount > 0 ? `
        <tr>
          <td>内消費税(8%対象)</td>
          <td>${formatCurrency(data.tax8Amount)}</td>
        </tr>
        ` : ''}
        <tr class="total-row">
          <td>合計</td>
          <td>${formatCurrency(data.total)}</td>
        </tr>
      </table>
    </div>

    <div class="payments">
      <table>
        ${paymentsHtml}
        <tr>
          <td colspan="2">お預かり</td>
          <td>${formatCurrency(data.paidAmount)}</td>
        </tr>
        ${data.change > 0 ? `
        <tr class="change-row">
          <td colspan="2">お釣り</td>
          <td>${formatCurrency(data.change)}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    ${(data.pointsUsed > 0 || data.pointsEarned > 0 || data.pointsBalance !== undefined) ? `
    <div class="points">
      <table>
        ${data.pointsUsed > 0 ? `
        <tr>
          <td>使用ポイント</td>
          <td>-${data.pointsUsed.toLocaleString()} pt</td>
        </tr>
        ` : ''}
        ${data.pointsEarned > 0 ? `
        <tr>
          <td>今回獲得ポイント</td>
          <td>+${data.pointsEarned.toLocaleString()} pt</td>
        </tr>
        ` : ''}
        ${data.pointsBalance !== undefined ? `
        <tr>
          <td>ポイント残高</td>
          <td>${data.pointsBalance.toLocaleString()} pt</td>
        </tr>
        ` : ''}
      </table>
    </div>
    ` : ''}

    ${data.receiptMessage ? `
    <div class="receipt-message">
      ${data.receiptMessage}
    </div>
    ` : ''}

    <div class="footer">
      <p>ありがとうございました</p>
      <p>またのご来店をお待ちしております</p>
    </div>
  </div>
</body>
</html>
    `;
  },

  // Create print job
  async createPrintJob(
    companyId: string,
    storeId: string,
    jobType: 'receipt' | 'kitchen' | 'label' | 'report',
    data: Record<string, unknown>,
    printerId?: string,
    copies: number = 1
  ): Promise<PrintJob> {
    const supabase = getSupabaseClient();

    const { data: job, error } = await supabase
      .from('print_jobs')
      .insert({
        company_id: companyId,
        store_id: storeId,
        printer_id: printerId || null,
        job_type: jobType,
        status: 'pending',
        data,
        copies,
      })
      .select()
      .single();

    if (error) throw error;
    return job as PrintJob;
  },

  // Get pending print jobs
  async getPendingJobs(storeId: string): Promise<PrintJob[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('store_id', storeId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as PrintJob[];
  },

  // Update print job status
  async updateJobStatus(
    jobId: string,
    status: 'printing' | 'completed' | 'failed',
    errorMessage?: string
  ): Promise<PrintJob> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('print_jobs')
      .update({
        status,
        error_message: errorMessage || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .select()
      .single();

    if (error) throw error;
    return data as PrintJob;
  },

  // Get printers for store
  async getPrinters(storeId: string): Promise<Printer[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('printers')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('is_default', { ascending: false });

    if (error) throw error;
    return data as Printer[];
  },

  // Get default printer
  async getDefaultPrinter(storeId: string): Promise<Printer | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('printers')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as Printer | null;
  },

  // Print receipt via Edge Function (for network printers)
  async printReceipt(saleId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase.functions.invoke('print-receipt', {
        body: { saleId },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, ...data };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
  },

  // Generate PDF receipt (for email or download)
  async generateReceiptPdf(saleId: string): Promise<Blob | null> {
    const supabase = getSupabaseClient();

    try {
      const { data, error } = await supabase.functions.invoke('generate-receipt-pdf', {
        body: { saleId },
      });

      if (error) throw error;

      // Convert base64 to blob
      if (data?.pdf) {
        const byteCharacters = atob(data.pdf);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: 'application/pdf' });
      }

      return null;
    } catch (e) {
      console.error('Failed to generate PDF:', e);
      return null;
    }
  },

  // Build receipt data from sale
  async buildReceiptData(saleId: string): Promise<ReceiptData | null> {
    const supabase = getSupabaseClient();

    // Fetch sale with all related data
    const { data: sale, error } = await supabase
      .from('sales')
      .select(`
        *,
        store:stores (
          name,
          address,
          phone,
          settings
        ),
        company:companies (
          invoice_registration_number
        ),
        customer:customers (
          first_name,
          last_name,
          points_balance
        ),
        staff:staff (
          first_name,
          last_name
        ),
        items:sale_items (
          *,
          staff:staff (
            first_name,
            last_name
          )
        ),
        payments:sale_payments (*),
        discounts:sale_discounts (*)
      `)
      .eq('id', saleId)
      .single();

    if (error || !sale) return null;

    // Build receipt data
    const receiptData: ReceiptData = {
      saleId: sale.id,
      saleNumber: sale.sale_number,
      saleDate: sale.sale_date,
      storeName: sale.store?.name || '',
      storeAddress: sale.store?.address,
      storePhone: sale.store?.phone,
      invoiceRegistrationNumber: sale.company?.invoice_registration_number,
      customerName: sale.customer
        ? `${sale.customer.last_name} ${sale.customer.first_name}`
        : undefined,
      items: sale.items?.map((item: Record<string, unknown>) => ({
        name: item.name as string,
        quantity: item.quantity as number,
        unitPrice: item.unit_price as number,
        subtotal: item.subtotal as number,
        taxRate: item.tax_rate as number,
        staffName: item.staff
          ? `${(item.staff as Record<string, string>).last_name} ${(item.staff as Record<string, string>).first_name}`
          : undefined,
        nominationFee: item.nomination_fee as number,
      })) || [],
      subtotal: sale.subtotal,
      discountTotal: sale.discount_total,
      discounts: sale.discounts?.map((d: Record<string, unknown>) => ({
        name: d.name as string,
        amount: d.amount as number,
      })) || [],
      tax10Amount: Math.floor(sale.subtotal * 10 / 110),
      tax8Amount: 0,
      total: sale.total,
      payments: sale.payments?.map((p: Record<string, unknown>) => ({
        method: p.payment_method as string,
        amount: p.amount as number,
      })) || [],
      paidAmount: sale.payments?.reduce(
        (sum: number, p: Record<string, number>) => sum + p.amount,
        0
      ) || 0,
      change: Math.max(
        0,
        (sale.payments?.reduce(
          (sum: number, p: Record<string, number>) => sum + p.amount,
          0
        ) || 0) - sale.total
      ),
      pointsUsed: sale.points_used || 0,
      pointsEarned: sale.points_earned || 0,
      pointsBalance: sale.customer?.points_balance,
      staffName: sale.staff
        ? `${sale.staff.last_name} ${sale.staff.first_name}`
        : undefined,
      receiptMessage: sale.store?.settings?.receipt_footer,
      logoUrl: sale.store?.settings?.receipt_logo_url,
    };

    return receiptData;
  },
};
