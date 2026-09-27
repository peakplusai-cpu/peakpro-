# PeakPro+

獨立的金融情報 SaaS。不依賴 PeakPlus.AI 的 Git、Vercel、Supabase 或 Creem 商品。

本機：`http://localhost:3000`  
登入：`/login`　終端：`/app`　訂閱：`/subscribe`

---

## 1. GitHub

1. 在 `peakplusai-cpu` 底下建立倉庫 **peakpro**（建議 Private）。
2. **不要**勾 Add README（避免和本專案衝突）。
3. 這個資料夾推上去：

```bash
cd /Users/jacklee/Projects/peakpro
git remote add origin https://github.com/peakplusai-cpu/peakpro.git
git push -u origin main
```

---

## 2. 新的 Supabase 專案

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**（不要用 PeakPlus 那個）。
2. Project Settings → API，複製：
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role → `SUPABASE_SERVICE_ROLE_KEY`
3. SQL Editor 貼上並 Run：`supabase/migrations/001_peakpro.sql`
4. Authentication → URL Configuration
   - Site URL：之後的正式網域（或先 `http://localhost:3000`）
   - Redirect URLs：
     - `http://localhost:3000/auth/callback`
     - `https://你的網域/auth/callback`
5. Authentication → Providers → Email 打開。

---

## 3. 新的 Creem 商品與 webhook

1. Creem Dashboard 建 **新的** 30 日循環商品（不要用教練 Pro 的 `prod_`）。
2. Developers → API Keys → 可新建一把只給 PeakPro+ 用的 key。
3. Developers → Webhooks → **新的 endpoint**（不要指向 peakplusai.com）：

```text
https://你的-peakpro-網域/api/webhooks/creem
```

4. 環境變數：

```text
CREEM_API_KEY=
CREEM_WEBHOOK_SECRET=
CREEM_PRODUCT_ID=prod_...
CREEM_TEST_MODE=true
```

測完再把 `CREEM_TEST_MODE` 改 `false`，並換成 Live 商品 ID。

---

## 4. 新的 Vercel 專案

1. [vercel.com](https://vercel.com) → **Add New → Project**
2. Import **`peakplusai-cpu/peakpro`**（不是 peakplus-ai）
3. Framework：Next.js。Root Directory 維持 `.`
4. Environment Variables 貼上 `.env.example` 那些（用新 Supabase / 新 Creem）
5. Deploy
6. Settings → Domains 綁你的網域，並把 `NEXT_PUBLIC_APP_URL` / `SITE_URL` 改成該網域後 Redeploy
7. 回到 Supabase / Creem，把 Site URL、Redirect、Webhook 改成這個網域

---

## 5. 每 3 小時爬蟲

先手動開一次：

```text
https://你的網域/api/cron/fetch-market-data?cron_secret=你的CRON_SECRET
```

Vercel Hobby 請用 [cron-job.org](https://cron-job.org) 每 3 小時打同一條 URL。  
Vercel Pro 會吃 `vercel.json` 的 `0 */3 * * *`。

---

## 本機

```bash
cp .env.example .env.local
# 填入新 Supabase / Creem
npm install
npm run dev
```

開 http://localhost:3000
