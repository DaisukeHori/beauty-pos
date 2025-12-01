# Beauty POS 実装状況

## 実装状況サマリー（最終更新: 2025-12-01）

| カテゴリ | 完了 | 未完了 | 状態 |
|---------|------|--------|------|
| DBスキーマ | 20 | 0 | ✅ 完了 |
| APIサービス | 31 | 0 | ✅ 完了 |
| Zustand Store | 17 | 0 | ✅ 完了 |
| Staff App 画面 | 36 | 0 | ✅ 完了 |
| Customer App 画面 | 5 | 0 | ✅ 完了 |
| 画面↔API連携 | 41 | 0 | ✅ 完了 |
| Edge Functions | 16 | 1 | ⏳ 一部未実装 |
| 外部連携サービス | 13 | 3 | ⏳ 一部未実装 |
| 権限・セキュリティ | 6 | 0 | ✅ 完了 |
| SaaS課金 | 2 | 0 | ✅ 完了 |
| テスト | 391 | 0 | ✅ 完了 |

---

## APIサービス一覧（31サービス）

| サービス | ファイル | 説明 | 状態 |
|----------|----------|------|------|
| authService | authService.ts | 認証（ログイン/サインアップ） | ✅ |
| companyService | companyService.ts | 会社（テナント）管理 | ✅ |
| storeService | storeService.ts | 店舗管理 | ✅ |
| staffService | staffService.ts | スタッフ管理 | ✅ |
| customerService | customerService.ts | 顧客管理・カルテ | ✅ |
| menuService | menuService.ts | メニュー・工程管理 | ✅ |
| reservationService | reservationService.ts | 予約管理 | ✅ |
| visitService | visitService.ts | 来店管理 | ✅ |
| saleService | saleService.ts | 売上・会計管理 | ✅ |
| ticketService | ticketService.ts | 回数券管理 | ✅ |
| couponService | couponService.ts | クーポン管理 | ✅ |
| tagService | tagService.ts | タグ管理 | ✅ |
| aiService | aiService.ts | AI機能（シミュレーション等） | ✅ |
| productService | productService.ts | 店販商品・在庫管理 | ✅ |
| dailyReportService | dailyReportService.ts | 日報管理 | ✅ |
| hairStyleService | hairStyleService.ts | ヘアスタイルカタログ | ✅ |
| proposalService | proposalService.ts | スタイル提案 | ✅ |
| pointService | pointService.ts | ポイント管理 | ✅ |
| shiftService | shiftService.ts | シフト管理 | ✅ |
| attendanceService | shiftService.ts | 勤怠管理 | ✅ |
| notificationService | notificationService.ts | 通知管理 | ✅ |
| notificationPreferenceService | notificationService.ts | 通知設定 | ✅ |
| printService | printService.ts | レシート印刷 | ✅ |
| staffPerformanceService | staffPerformanceService.ts | スタッフ売上分析 | ✅ |
| reminderSchedulerService | reminderSchedulerService.ts | リマインダー | ✅ |
| lineService | lineService.ts | LINE通知 | ✅ |
| smsService | smsService.ts | SMS通知 | ✅ |
| emailService | emailService.ts | メール通知 | ✅ |
| cancellationService | cancellationService.ts | キャンセルポリシー | ✅ |
| memberRankService | memberRankService.ts | 会員ランク | ✅ |
| featureSettingsService | featureSettingsService.ts | 機能設定 | ✅ |
| integrationSettingsService | integrationSettingsService.ts | 外部連携設定 | ✅ |
| subscriptionService | subscriptionService.ts | SaaSサブスクリプション | ✅ |

---

## Staff App 画面一覧（36画面）

### 認証
| 画面 | ファイル | 状態 |
|------|----------|------|
| ログイン | (auth)/login.tsx | ✅ |
| パスワードリセット | (auth)/forgot-password.tsx | ✅ |

### タブ画面
| 画面 | ファイル | 状態 |
|------|----------|------|
| ホーム | (tabs)/index.tsx | ✅ |
| 来店一覧 | (tabs)/visits.tsx | ✅ |
| 予約一覧 | (tabs)/reservations.tsx | ✅ |
| 顧客一覧 | (tabs)/customers.tsx | ✅ |
| 設定 | (tabs)/settings.tsx | ✅ |

### 詳細・操作画面
| 画面 | ファイル | 状態 |
|------|----------|------|
| 顧客詳細 | customer-detail.tsx | ✅ |
| 顧客詳細（動的） | customer/[id].tsx | ✅ |
| 来店詳細 | visit/[id].tsx | ✅ |
| 予約作成 | reservation/new.tsx | ✅ |
| 予約詳細 | reservation/[id].tsx | ✅ |
| 会計 | checkout.tsx | ✅ |

### 管理画面（admin/）
| 画面 | ファイル | 状態 |
|------|----------|------|
| 店舗設定 | admin/store.tsx | ✅ |
| メニュー管理 | admin/menus.tsx | ✅ |
| 商品管理 | admin/products.tsx | ✅ |
| スタッフ管理 | admin/staff.tsx | ✅ |
| シフト・勤怠管理 | admin/shifts.tsx | ✅ |
| クーポン管理 | admin/coupons.tsx | ✅ |
| 回数券管理 | admin/tickets.tsx | ✅ |
| 在庫管理 | admin/inventory.tsx | ✅ |
| 売上レポート | admin/reports.tsx | ✅ |
| 日報 | admin/daily-report.tsx | ✅ |
| 月次レポート | admin/monthly-report.tsx | ✅ |
| スタッフ別売上 | admin/staff-sales.tsx | ✅ |
| 顧客分析 | admin/customer-analytics.tsx | ✅ |
| 売上履歴 | admin/sales-history.tsx | ✅ |
| 外部連携設定 | admin/integrations.tsx | ✅ |
| 機能設定 | admin/features.tsx | ✅ |
| 権限管理 | admin/permissions.tsx | ✅ |
| プラン・お支払い | admin/subscription.tsx | ✅ |
| 通知設定 | admin/notifications.tsx | ✅ |

---

## Customer App 画面一覧（5画面）

| 画面 | ファイル | 状態 |
|------|----------|------|
| ホーム | index.tsx | ✅ |
| ヘアスタイルシミュレーション | simulation.tsx | ✅ |
| ヘアカタログ | gallery.tsx | ✅ |
| スタイル提案 | proposal.tsx | ✅ |
| レイアウト | _layout.tsx | ✅ |

---

## SaaSサブスクリプション

### プラン定義
| プラン | 月額 | 年額 | スタッフ | 店舗 | 顧客 | 予約/月 |
|--------|------|------|----------|------|------|---------|
| フリー | ¥0 | ¥0 | 2名 | 1店舗 | 100名 | 50件 |
| スターター | ¥4,980 | ¥49,800 | 5名 | 1店舗 | 1,000名 | 500件 |
| プロフェッショナル | ¥9,980 | ¥99,800 | 20名 | 3店舗 | 無制限 | 無制限 |
| エンタープライズ | ¥29,800 | ¥298,000 | 無制限 | 無制限 | 無制限 | 無制限 |

### プラン別機能
| 機能 | フリー | スターター | プロ | エンタープライズ |
|------|--------|------------|------|------------------|
| 基本予約管理 | ✅ | ✅ | ✅ | ✅ |
| LINE/SMS通知 | ❌ | ✅ | ✅ | ✅ |
| クーポン・回数券 | ❌ | ✅ | ✅ | ✅ |
| ポイント機能 | ❌ | ✅ | ✅ | ✅ |
| AI機能 | ❌ | ❌ | ✅ | ✅ |
| 優先サポート | ❌ | ❌ | ✅ | ✅ |
| カスタムブランディング | ❌ | ❌ | ❌ | ✅ |
| API連携 | ❌ | ❌ | ❌ | ✅ |

---

## 未実装・将来対応項目

### Edge Functions
- [ ] `sync-hotpepper` - ホットペッパー予約同期

### 外部連携
- [ ] ホットペッパービューティ連携
- [ ] レシートプリンター（Bluetooth）
- [ ] キャッシュドロワー連携

### テスト（391テスト実装済み）

#### ユニットテスト - 164テスト
- [x] Zustand Store - 61テスト
  - authStore.test.ts (13テスト)
  - saleStore.test.ts (29テスト)
  - uiStore.test.ts (19テスト)
- [x] ユーティリティ - 79テスト
  - validation.test.ts (32テスト)
  - security.test.ts (47テスト)
- [x] APIサービス - 24テスト
  - customerService.test.ts (9テスト)
  - subscriptionService.test.ts (16テスト)

#### 統合テスト - 227テスト（11ファイル）

| テストファイル | テスト数 | 対象 |
|---------------|---------|------|
| allBusinessFlows.test.ts | 48 | 全14業務フローの網羅的テスト |
| bookingFlowIntegration.test.ts | 15 | 予約・来店・会計フロー |
| customerCancellationIntegration.test.ts | 21 | 顧客・キャンセルポリシー |
| reservationToSaleFlow.test.ts | 9 | 予約→来店→売上基本フロー |
| complexBusinessScenarios.test.ts | 24 | 複合会計・複数支払い |
| irregularScenarios.test.ts | 18 | キャンセル・ブラックリスト |
| coreServicesIntegration.test.ts | 18 | 認証・会社・店舗・スタッフ |
| operationsIntegration.test.ts | 21 | シフト・来店・ポイント・タグ |
| salesItemsIntegration.test.ts | 21 | 回数券・クーポン・メニュー・商品 |
| reportingIntegration.test.ts | 15 | 通知・日報・会員ランク・印刷 |
| externalServicesIntegration.test.ts | 17 | AI・LINE・SMS・メール連携 |

#### 統合テストカバレッジ詳細

**フロー1: 標準予約フロー**
- 新規予約作成（通常/指名付き）
- 予約確認
- 来店チェックイン
- 施術開始・終了
- 会計処理
- チェックアウト

**フロー2: 予約キャンセルフロー**
- 48時間以上前キャンセル（無料）
- 24-48時間前キャンセル（30%）
- 24時間以内キャンセル（50%）
- ノーショー（100%）
- キャンセル料免除

**フロー3: 予約変更フロー**
- 日時変更
- スタッフ変更
- メニュー変更

**フロー4: ウォークイン（予約なし来店）**
- 新規顧客のウォークイン
- 既存顧客のウォークイン

**フロー5: 複合会計フロー**
- メニュー+商品の複合会計
- 複数メニュー会計
- ロング料金追加
- 指名料金追加

**フロー6: 割引適用フロー**
- クーポン割引（パーセント/定額）
- ポイント利用
- ポイント全額利用（0円会計）
- 複合割引（クーポン+ポイント）
- 会員ランク割引

**フロー7: 複数支払いフロー**
- 現金+カード分割
- 3種類以上の支払い方法

**フロー8: 回数券フロー**
- 回数券購入
- 回数券使用
- 回数券完全消化

**フロー9: 売上取消フロー**
- 当日売上取消
- ポイント戻し付き取消

**フロー10: 顧客管理フロー**
- 顧客情報更新
- カルテ管理
- ブラックリスト管理

**フロー11: スタッフ管理フロー**
- シフト登録
- スタッフ配属
- 指名料設定

**フロー12: 日次業務フロー**
- 日報生成
- 日報締め処理

**フロー13: 通知フロー**
- 予約確認通知
- リマインダー通知

**フロー14: エンドツーエンドシナリオ**
- 新規顧客の完全フロー（登録→予約→来店→施術→会計→ポイント付与）
- リピーター顧客の特典フロー（会員ランクアップ→特典適用）

#### 未実装テスト
- [ ] E2Eテスト（Detox）

### デプロイ
- [ ] Production環境セットアップ
- [ ] EAS Build設定
- [ ] App Store / Google Play申請

---

## 技術スタック

### フロントエンド
- **React Native** + **Expo** (SDK 50)
- **Expo Router** - ファイルベースルーティング
- **Zustand** - 状態管理
- **React Query** - サーバー状態管理

### バックエンド
- **Supabase** - PostgreSQL + Auth + Storage + Realtime
- **Edge Functions** - Deno ランタイム
- **Row Level Security** - マルチテナント分離

### 外部サービス
- **Stripe** - SaaS課金
- **LINE Messaging API** - 通知
- **Twilio / Vonage** - SMS
- **SendGrid / Mailgun** - メール

### 共通パッケージ（Monorepo）
- `@beauty-pos/api` - APIサービス
- `@beauty-pos/core` - Store・Hooks・Utils
- `@beauty-pos/ui` - UIコンポーネント
