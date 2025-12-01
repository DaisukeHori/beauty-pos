# Beauty POS 完全実装ToDo

## 実装状況サマリー

| カテゴリ | 完了 | 未完了 |
|---------|------|--------|
| DBスキーマ | 20 | 0 |
| APIサービス | 26 | 0 |
| Zustand Store | 13 | 5 |
| 画面UI | 18 | 7 |
| 画面↔API連携 | 2 | 23 |
| Edge Functions | 14 | 2 |
| 外部連携 | 5 | 3 |
| テスト | 0 | 25+ |
| 権限・セキュリティ | 3 | 2 |

---

## Phase 1: 基盤整備 (必須)

### 1.1 Supabase Edge Functions 作成
- [x] `functions/generate-invoice-number/index.ts` - 請求書番号採番
- [x] `functions/calculate-sale/index.ts` - 会計計算（税率、割引、ポイント）
- [x] `functions/daily-report/index.ts` - 日次レポート生成
- [x] `functions/customer-analysis/index.ts` - 顧客分析（AI呼び出し）
- [x] `functions/send-notification/index.ts` - プッシュ通知送信
- [ ] `functions/sync-hotpepper/index.ts` - ホットペッパー予約同期
- [x] `functions/stripe-webhook/index.ts` - Stripe決済Webhook
- [x] `functions/generate-hairstyle/index.ts` - AI髪型シミュレーション
- [x] `functions/analyze-conversation/index.ts` - 会話分析
- [x] `functions/upsell-suggestion/index.ts` - AIアップセル提案
- [x] `functions/create-payment-intent/index.ts` - Stripe決済Intent作成
- [x] `functions/pinterest-styles/index.ts` - Pinterestスタイル検索
- [x] `functions/audit-log/index.ts` - 監査ログ記録
- [x] `functions/health-check/index.ts` - ヘルスチェック
- [x] `functions/reservation-reminder/index.ts` - 予約リマインダー自動送信
- [ ] `functions/export-csv/index.ts` - CSV/Excel出力

### 1.2 Supabase Realtime 設定
- [x] `visits` テーブルのRealtime有効化
- [x] `reservations` テーブルのRealtime有効化
- [x] `sales` テーブルのRealtime有効化
- [x] Realtime購読用フック作成 `packages/core/src/hooks/useRealtimeVisits.ts`
- [x] Realtime購読用フック作成 `packages/core/src/hooks/useRealtimeReservations.ts`

### 1.3 Supabase Storage バケット設定
- [x] `store-logos` バケット作成（店舗ロゴ）
- [x] `staff-avatars` バケット作成（スタッフ写真）
- [x] `customer-photos` バケット作成（顧客写真）
- [x] `hairstyle-images` バケット作成（ヘアスタイル画像）
- [x] `simulation-results` バケット作成（シミュレーション結果）
- [x] アップロード用共通フック `packages/core/src/hooks/useImageUpload.ts`

### 1.4 不足APIサービス追加
- [x] `packages/api/src/services/productService.ts` - 店販商品CRUD
- [x] `packages/api/src/services/processService.ts` - 工程マスタCRUD（menuService内に統合）
- [x] `packages/api/src/services/dailyReportService.ts` - 日報CRUD
- [x] `packages/api/src/services/shiftService.ts` - シフト・勤怠管理
- [x] `packages/api/src/services/notificationService.ts` - 通知管理
- [x] `packages/api/src/services/printService.ts` - 印刷サービス
- [x] `packages/api/src/services/staffPerformanceService.ts` - スタッフパフォーマンス・ランキング
- [x] `packages/api/src/services/reminderSchedulerService.ts` - リマインダースケジューラ
- [x] `packages/api/src/services/lineService.ts` - LINE通知連携
- [x] `packages/api/src/services/smsService.ts` - SMS通知
- [x] `packages/api/src/services/emailService.ts` - メール通知
- [x] `packages/api/src/services/cancellationService.ts` - キャンセルポリシー・ペナルティ
- [x] `packages/api/src/services/memberRankService.ts` - 会員ランク管理

### 1.5 不足Store追加
- [x] `packages/core/src/stores/checkoutStore.ts` - 会計状態管理
- [ ] `packages/core/src/stores/cartStore.ts` - カート状態管理
- [ ] `packages/core/src/stores/dailyReportStore.ts` - 日報状態
- [ ] `packages/core/src/stores/notificationStore.ts` - 通知状態
- [ ] `packages/core/src/stores/simulationStore.ts` - シミュレーション状態

### 1.6 権限・セキュリティ (追加)
- [x] `packages/core/src/hooks/usePermissions.ts` - 権限別UI制御フック
- [x] ロール定義（assistant/staff/manager/owner）
- [x] 27種類の機能権限マッピング
- [ ] 画面アクセス制御（PermissionGuard）
- [ ] API アクセス制御

---

## Phase 2: Staff App 画面実装

### 2.1 ホーム画面 (index.tsx)
- [ ] 本日売上サマリーAPI連携 `saleService.getSalesTotal()`
- [ ] 本日来店数API連携 `visitService.getToday()`
- [ ] 予約数API連携 `reservationService.getToday()`
- [ ] 待機中・施術中カウントAPI連携
- [ ] スタッフ別売上ランキング表示
- [ ] Realtimeでリアルタイム更新

### 2.2 来店一覧 (visits.tsx)
- [ ] `visitService.getActive()` 連携
- [ ] 来店登録モーダル実装
- [ ] 予約→来店変換処理
- [ ] ステータス変更 `visitService.startService()`, `checkOut()`
- [ ] 顧客詳細への遷移
- [ ] 会計画面への遷移（visitId渡し）
- [ ] Realtime更新

### 2.3 予約一覧 (reservations.tsx)
- [ ] `reservationService.getByDate()` 連携
- [ ] 新規予約作成モーダル実装
  - [ ] 顧客選択（検索・新規作成）
  - [ ] スタッフ選択
  - [ ] メニュー選択
  - [ ] 日時選択（カレンダーUI）
- [ ] 予約編集モーダル
- [ ] 予約キャンセル処理
- [ ] 来店登録処理 `visitService.checkIn()`
- [ ] Realtime更新
- [ ] カレンダービュー実装（週表示・日表示）

### 2.4 顧客一覧 (customers.tsx)
- [ ] `customerService.search()` 連携
- [ ] ページネーション実装
- [ ] 新規顧客登録モーダル
- [ ] 顧客詳細への遷移

### 2.5 顧客詳細 (customer-detail.tsx)
- [ ] `customerService.getById()` 連携
- [ ] `visitService.getByCustomer()` で来店履歴取得
- [ ] `saleService.getByCustomer()` で購買履歴取得
- [ ] 顧客情報更新 `customerService.update()`
- [ ] 髪質情報更新
- [ ] タグ管理
- [ ] AI分析結果表示（Edge Function呼び出し）
- [ ] 写真アップロード（Storage連携）

### 2.6 会計画面 (checkout.tsx)
- [ ] visitId から来店情報取得
- [ ] 顧客情報表示
- [ ] メニュー選択 `menuService.getActive()` 連携
- [ ] 商品選択 `productService.getActive()` 連携
- [ ] 担当者設定（売上用・生産性用）
- [ ] 割引適用
  - [ ] 手動割引
  - [ ] クーポン適用 `couponService.validate()`
  - [ ] 回数券適用 `ticketService.use()`
  - [ ] ポイント適用
- [ ] 支払い方法選択
- [ ] 会計確定 `saleService.create()` 呼び出し
- [ ] 来店ステータス更新 `visitService.checkOut()`
- [ ] レシート表示

### 2.7 レシート印刷
- [ ] `Receipt.tsx` コンポーネントをAPI連携
- [ ] 店舗情報取得 `storeService.getById()`
- [ ] 印刷用データ整形
- [ ] expo-print 連携（PDF生成）
- [ ] Bluetooth/WiFiプリンター連携（expo-print or カスタム）
- [ ] 領収書再発行機能

### 2.8 店舗設定 (admin/store.tsx)
- [ ] `storeService.getById()` 連携
- [ ] `storeService.update()` 連携
- [ ] ロゴアップロード（Storage連携）
- [ ] レシート設定保存
- [ ] インボイス登録番号保存

### 2.9 メニュー管理 (admin/menus.tsx)
- [ ] `menuService.getAll()` 連携
- [ ] `menuService.create()` 連携
- [ ] `menuService.update()` 連携
- [ ] `menuService.delete()` 連携（論理削除）
- [ ] カテゴリ管理
- [ ] 並び順変更（ドラッグ&ドロップ）

### 2.10 商品管理 (admin/products.tsx)
- [ ] `productService.getAll()` 連携
- [ ] `productService.create()` 連携
- [ ] `productService.update()` 連携
- [ ] `productService.delete()` 連携
- [ ] 在庫管理（入出庫記録）
- [ ] 発注アラート設定
- [ ] バーコードスキャン連携

### 2.11 スタッフ管理 (admin/staff.tsx)
- [ ] `staffService.getAll()` 連携
- [ ] `staffService.create()` 連携
- [ ] `staffService.update()` 連携
- [ ] `staffService.delete()` 連携
- [ ] 権限設定
- [ ] 勤怠連携（将来）

### 2.12 追加必要画面
- [ ] 売上レポート画面 `apps/staff/app/reports/sales.tsx`
- [ ] スタッフ別売上画面 `apps/staff/app/reports/staff-sales.tsx`
- [ ] 顧客分析画面 `apps/staff/app/reports/customer-analysis.tsx`
- [ ] 在庫管理画面 `apps/staff/app/admin/inventory.tsx`
- [x] クーポン管理画面 `apps/staff/app/admin/coupons.tsx`
- [x] 回数券管理画面 `apps/staff/app/admin/tickets.tsx`
- [ ] 日報画面 `apps/staff/app/daily-report.tsx`
- [x] 売上履歴・赤伝票画面 `apps/staff/app/admin/sales-history.tsx`

---

## Phase 3: Customer App 画面実装

### 3.1 ホーム画面 (index.tsx)
- [ ] 顧客情報取得
- [ ] 次回予約表示
- [ ] ポイント残高表示
- [ ] お知らせ表示

### 3.2 シミュレーション画面 (simulation.tsx)
- [ ] カメラ/ギャラリー選択（既存）
- [ ] スタイル選択UI改善
- [ ] Edge Function `generate-hairstyle` 呼び出し
- [ ] 結果画像保存（Storage）
- [ ] シミュレーション履歴保存

### 3.3 ギャラリー画面 (gallery.tsx)
- [ ] Pinterest API連携
- [ ] ヘアスタイル検索
- [ ] お気に入り保存
- [ ] スタイル詳細表示

### 3.4 提案画面 (proposal.tsx)
- [ ] AI提案取得（Edge Function）
- [ ] 過去のスタイル履歴
- [ ] スタイリストおすすめ表示

### 3.5 予約画面
- [ ] `apps/customer/app/reservation.tsx` 新規作成
- [ ] 空き枠取得API
- [ ] スタイリスト選択
- [ ] メニュー選択
- [ ] 日時選択
- [ ] 予約確定

### 3.6 マイページ
- [ ] `apps/customer/app/mypage.tsx` 新規作成
- [ ] 予約履歴
- [ ] 来店履歴
- [ ] ポイント履歴
- [ ] プロフィール編集

---

## Phase 4: 外部サービス連携

### 4.1 Stripe決済
- [ ] Stripe SDK セットアップ
- [ ] カード決済処理
- [ ] 決済履歴保存
- [ ] 返金処理
- [ ] SaaS課金（サブスクリプション）

### 4.2 Pinterest API
- [ ] API認証設定
- [ ] 画像検索実装
- [ ] お気に入りボード連携

### 4.3 Google AI (Gemini Nano)
- [ ] API認証設定
- [ ] 髪型シミュレーション実装
- [ ] 顧客分析実装
- [ ] アップセル提案実装

### 4.4 OpenAI Whisper
- [ ] API認証設定
- [ ] 音声録音機能
- [ ] 文字起こし実装
- [ ] カルテ自動入力

### 4.5 ホットペッパービューティ
- [ ] API連携調査（公式APIまたはスクレイピング）
- [ ] 予約同期実装
- [ ] 顧客情報同期

### 4.6 プッシュ通知
- [x] Expo Notifications セットアップ
- [ ] FCM/APNs設定
- [x] 予約リマインダー
- [ ] キャンペーン通知

### 4.7 LINE通知
- [x] LINE Messaging API サービス実装
- [x] 予約リマインダー送信
- [x] 予約確認送信
- [x] 来店お礼メッセージ
- [ ] リッチメニュー設定UI
- [ ] Webhook受信処理（Edge Function）

### 4.8 SMS/メール通知
- [x] SMS送信サービス（Twilio/Vonage対応）
- [x] メール送信サービス（SendGrid/Mailgun対応）
- [x] 予約リマインダーテンプレート
- [x] 予約確認テンプレート
- [ ] 通知設定UI

### 4.9 レシートプリンター
- [ ] Star/Epson SDK調査
- [ ] Bluetooth接続実装
- [ ] 印刷フォーマット調整

### 4.10 キャッシュドロワー
- [ ] ドロワー連携調査
- [ ] 開閉API実装
- [ ] 入出金記録

---

## Phase 5: セキュリティ・運用

### 5.1 RLS (Row Level Security) 完全実装
- [x] 全テーブルのRLSポリシー確認
- [x] マルチテナント分離テスト
- [x] スタッフ権限別アクセス制御

### 5.2 認証・認可
- [x] スタッフ権限管理（assistant/staff/manager/owner）
- [x] 権限別UI制御フック（usePermissions）
- [ ] 画面アクセス制御（PermissionGuard HOC）
- [ ] API アクセス制御（Edge Function）

### 5.3 データバックアップ
- [ ] 日次自動バックアップ（Edge Function）
- [ ] バックアップ復元機能

### 5.4 監査ログ
- [x] 重要操作のログ記録（audit-log Edge Function）
- [ ] ログ閲覧画面

### 5.5 エラーハンドリング
- [ ] グローバルエラーハンドラー
- [ ] Sentry連携（エラー監視）
- [ ] ユーザーフレンドリーなエラーメッセージ

---

## Phase 6: テスト

### 6.1 ユニットテスト
- [ ] APIサービステスト
- [ ] Store テスト
- [ ] ユーティリティテスト

### 6.2 統合テスト
- [ ] 予約→来店→会計フロー
- [ ] 返金（赤伝）フロー
- [ ] ポイント計算

### 6.3 E2Eテスト
- [ ] Detox セットアップ
- [ ] 主要フローのE2Eテスト

---

## Phase 7: デプロイ・リリース

### 7.1 Supabase
- [ ] Production環境セットアップ
- [ ] 環境変数設定
- [ ] Edge Functions デプロイ

### 7.2 EAS Build
- [ ] iOS ビルド設定
- [ ] Android ビルド設定
- [ ] OTAアップデート設定

### 7.3 App Store / Google Play
- [ ] アプリアイコン・スクリーンショット
- [ ] ストア説明文
- [ ] 審査対応

---

## 優先度別実装順序

### 🔴 最優先（デモ可能にする）
1. visits.tsx API連携
2. reservations.tsx API連携 + 予約作成モーダル
3. checkout.tsx API連携
4. customers.tsx API連携
5. customer-detail.tsx API連携

### 🟡 高優先（実運用に必要）
6. レシート印刷実装
7. 日報機能
8. 管理画面API連携（menu/product/staff/store）
9. Realtime更新
10. Stripe決済

### 🟢 中優先（差別化機能）
11. AI髪型シミュレーション
12. 顧客AI分析
13. アップセル提案
14. Pinterest連携

### 🔵 低優先（将来対応）
15. ホットペッパー連携
16. 音声文字起こし
17. キャッシュドロワー連携
18. 高度なレポート機能

---

## 見積もり工数

| Phase | 工数（人日） |
|-------|------------|
| Phase 1: 基盤整備 | 5-7日 |
| Phase 2: Staff App | 15-20日 |
| Phase 3: Customer App | 7-10日 |
| Phase 4: 外部連携 | 10-15日 |
| Phase 5: セキュリティ | 3-5日 |
| Phase 6: テスト | 5-7日 |
| Phase 7: デプロイ | 2-3日 |
| **合計** | **47-67日** |

※ 1人で実装する場合の概算。並列作業や経験により変動。
