# Detective AI# Detective AI



AI destekli bir dedektif oyunu. Oyuncu, yapay zekâ asistanıyla sohbet ederek ipuçlarını keşfeder, delilleri (evidence) kilitlerden çıkarır ve doğru suçlu ile ana kanıtı seçerek suçlamada bulunur.AI destekli bir dedektif oyunu. Oyuncu, yapay zekâ asistanıyla sohbet ederek ipuçlarını keşfeder, delilleri (evidence) kilitlerden çıkarır ve doğru suçlu ile ana kanıtı seçerek suçlamada bulunur.



Bu repo iki parçadan oluşur:Bu repo iki parçadan oluşur:

- `backend/`: Express tabanlı API. Vaka verilerini Supabase PostgreSQL'den çeker ve Google Gemini API ile konuşur.- `backend/`: Express tabanlı API. Vaka verilerini Supabase PostgreSQL'den çeker ve Google Gemini API ile konuşur.

- `frontend/`: React + Vite arayüzü. Sohbet, kanıt açma akışı ve oyun ekranları burada.- `frontend/`: React + Vite arayüzü. Sohbet, kanıt açma akışı ve oyun ekranları burada.



## Özellikler## Özellikler

- Sohbet tabanlı oyun deneyimi (AI asistan)- Sohbet tabanlı oyun deneyimi (AI asistan)

- AI yanıtlarında geçen delilleri otomatik tespit ve "kilit açma"- AI yanıtlarında geçen delilleri otomatik tespit ve "kilit açma"

- Suçlama (Accusation) ve oyun sonu akışları- Suçlama (Accusation) ve oyun sonu akışları

- Mobil uyumlu arayüz, shadcn-ui bileşenleri- Mobil uyumlu arayüz, shadcn-ui bileşenleri

- Supabase PostgreSQL database ile ölçeklenebilir veri yönetimi- Supabase PostgreSQL database ile ölçeklenebilir veri yönetimi

- Google Gemini 2.5 Pro API ile güçlü ve hızlı AI yanıtları- Google Gemini 2.5 Pro API ile güçlü ve hızlı AI yanıtları

- Anti-spoiler protection ve evidence leak validation- Anti-spoiler protection ve evidence leak validation



## Proje Yapısı## Proje Yapısı

``````

backend/backend/

  package.json  package.json

  server.js           # Express sunucusu + Supabase client  server.js           # Express sunucusu + Supabase client

frontend/frontend/

  package.json  package.json

  src/                # Sayfalar, bileşenler, hooklar  src/                # Sayfalar, bileşenler, hooklar

  vite.config.ts      # Dev sunucusu (PORT=8080)  vite.config.ts      # Dev sunucusu (PORT=8080)

api/api/

  [...path].mjs       # Vercel serverless function wrapper  [...path].mjs       # Vercel serverless function wrapper

vercel.json           # Vercel deployment configurationvercel.json           # Vercel deployment configuration

``````



## Teknoloji Stack## Teknoloji Stack

- **Backend**: Node.js 20.x, Express, Supabase PostgreSQL- **Backend**: Node.js 20.x, Express, Supabase PostgreSQL

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, shadcn-ui- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, shadcn-ui

- **AI**: Google Gemini 2.5 Pro API- **AI**: Google Gemini 2.5 Pro API

- **Database**: Supabase (PostgreSQL with Row Level Security)- **Database**: Supabase (PostgreSQL with Row Level Security)

- **Deployment**: Vercel (serverless functions)- **Deployment**: Vercel (serverless functions)



## Gereksinimler## Gereksinimler

- Node.js 18+ (LTS önerilir)- Node.js 18+ (LTS önerilir)

- NPM- NPM

- Google Gemini API anahtarı (`GEMINI_API_KEY`)- Google Gemini API anahtarı (`GEMINI_API_KEY`)

- Supabase project (URL ve Anon Key)- Supabase project (URL ve Anon Key)



## Environment Variables## Environment Variables

Aşağıdaki environment variable'lar gereklidir:Aşağıdaki environment variable'lar gereklidir:



```bash```bash

# Gemini AI# Gemini AI

GEMINI_API_KEY=your_gemini_api_keyGEMINI_API_KEY=your_gemini_api_key

GEMINI_MODEL=gemini-2.5-pro  # Opsiyonel, varsayılan: gemini-2.5-proGEMINI_MODEL=gemini-2.5-pro  # Opsiyonel, varsayılan: gemini-2.5-pro



# Supabase# Supabase

SUPABASE_URL=https://your-project.supabase.coSUPABASE_URL=https://your-project.supabase.co

SUPABASE_ANON_KEY=your_supabase_anon_keySUPABASE_ANON_KEY=your_supabase_anon_key

``````



## Kurulum## Kurulum

Backend ve frontend bağımlılıkları ayrı ayrı yüklenir.Backend ve frontend bağımlılıkları ayrı ayrı yüklenir.



```powershell```powershell

# Backend bağımlılıkları# Backend bağımlılıkları

cd backendcd backend

npm installnpm install



# Frontend bağımlılıkları# Frontend bağımlılıkları

cd ..\frontendcd ..\frontend

npm installnpm install

``````



## Çalıştırma (Local Development)## Çalıştırma (Local Development)

Önce backend'i, sonra frontend'i başlatın.Önce backend'i, sonra frontend'i başlatın.



```powershell```powershell

# 1) Backend (http://localhost:3004)# 1) Backend (http://localhost:3004)

cd backendcd backend

$env:GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"$env:GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"

$env:SUPABASE_URL = "https://your-project.supabase.co"$env:SUPABASE_URL = "https://your-project.supabase.co"

$env:SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY"$env:SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY"

npm startnpm start



# 2) Frontend (http://localhost:8080)# 2) Frontend (http://localhost:8080)

# Yeni bir terminalde# Yeni bir terminalde

cd ..\frontendcd ..\frontend

npm run devnpm run dev

``````



Notlar:Notlar:

- `GEMINI_API_KEY`, `SUPABASE_URL` ve `SUPABASE_ANON_KEY` zorunludur. Yoksa uygulama başlamaz.- `GEMINI_API_KEY`, `SUPABASE_URL` ve `SUPABASE_ANON_KEY` zorunludur. Yoksa uygulama başlamaz.

- `.env` dosyası kullanmak isterseniz `backend/` içinde `.env` oluşturabilirsiniz.- `.env` dosyası kullanmak isterseniz `backend/` içinde `.env` oluşturabilirsiniz.



## Vercel Deployment## Vercel Deployment

Proje Vercel'de otomatik deploy edilir:Proje Vercel'de otomatik deploy edilir:



1. GitHub repository'yi Vercel'e bağlayın1. GitHub repository'yi Vercel'e bağlayın

2. Environment Variables ekleyin:2. Environment Variables ekleyin:

   - `GEMINI_API_KEY`   - `GEMINI_API_KEY`

   - `GEMINI_MODEL` (opsiyonel)   - `GEMINI_MODEL` (opsiyonel)

   - `SUPABASE_URL`   - `SUPABASE_URL`

   - `SUPABASE_ANON_KEY`   - `SUPABASE_ANON_KEY`

3. Deploy!3. Deploy!



Vercel configuration `vercel.json` dosyasında tanımlıdır.Vercel configuration `vercel.json` dosyasında tanımlıdır.



## Database Schema (Supabase)## Database Schema (Supabase)

```sql```sql

-- Cases table-- Cases table

CREATE TABLE cases (CREATE TABLE cases (

  id TEXT PRIMARY KEY,  id TEXT PRIMARY KEY,

  title TEXT NOT NULL,  title TEXT NOT NULL,

  synopsis TEXT,  synopsis TEXT,

  case_number TEXT,  case_number TEXT,

  created_at TIMESTAMP DEFAULT NOW()  created_at TIMESTAMP DEFAULT NOW()

););



-- Case details table (with JSONB columns)-- Case details table (with JSONB columns)

CREATE TABLE case_details (CREATE TABLE case_details (

  id TEXT PRIMARY KEY REFERENCES cases(id),  id TEXT PRIMARY KEY REFERENCES cases(id),

  full_story TEXT,  full_story TEXT,

  victim JSONB,  victim JSONB,

  location TEXT,  location TEXT,

  suspects JSONB,  suspects JSONB,

  evidence JSONB,  evidence JSONB,

  correct_accusation JSONB,  correct_accusation JSONB,

  created_at TIMESTAMP DEFAULT NOW()  created_at TIMESTAMP DEFAULT NOW()

););

``````



## API Uç Noktaları (Backend)## API Uç Noktaları (Backend)

- `GET /` — Sağlık kontrolü `{ status: 'ok' }`- `GET /` — Sağlık kontrolü `{ status: 'ok' }`

- `GET /api/health` — Environment check- `GET /api/health` — Environment check

- `GET /api/cases` — Vaka listesini döner (Supabase'den)- `GET /api/cases` — Vaka listesini döner (Supabase'den)

- `GET /api/cases/:caseId` — Belirli vaka detayını döner (Supabase JOIN)- `GET /api/cases/:caseId` — Belirli vaka detayını döner (Supabase JOIN)

- `POST /api/chat` — Gövde: `{ caseId, message, chatHistory? }`  - `POST /api/chat` — Gövde: `{ caseId, message, chatHistory? }`  

  Gemini yanıtındaki `[EVIDENCE UNLOCKED: evidence-id]` etiketlerini tespit eder,   Gemini yanıtındaki `[EVIDENCE UNLOCKED: evidence-id]` etiketlerini tespit eder, 

  temizlenmiş metin ile `unlockedEvidenceIds` dizisini döner:    temizlenmiş metin ile `unlockedEvidenceIds` dizisini döner:  

  `{ responseText, unlockedEvidenceIds: string[] }`  `{ responseText, unlockedEvidenceIds: string[] }`

- `GET /api/models` — Mevcut Gemini modellerini listeler- `GET /api/models` — Mevcut Gemini modellerini listeler



## Geliştirme## Geliştirme

- Frontend dev sunucusu: http://localhost:8080- Frontend dev sunucusu: http://localhost:8080

- Backend API: http://localhost:3004- Backend API: http://localhost:3004

- Vaka verilerini Supabase dashboard'dan SQL Editor ile yönetebilirsiniz.- Vaka verilerini Supabase dashboard'dan SQL Editor ile yönetebilirsiniz.



## Sorun Giderme## Sorun Giderme

- "AI'dan yanıt gelmiyor": `GEMINI_API_KEY` tanımlı mı kontrol edin; backend konsol hatalarını inceleyin.- "AI'dan yanıt gelmiyor": `GEMINI_API_KEY` tanımlı mı kontrol edin; backend konsol hatalarını inceleyin.

- "Database bağlantı hatası": `SUPABASE_URL` ve `SUPABASE_ANON_KEY` doğru mu kontrol edin.- "Database bağlantı hatası": `SUPABASE_URL` ve `SUPABASE_ANON_KEY` doğru mu kontrol edin.

- Portlar çakışıyor: `frontend/vite.config.ts` ve `backend/server.js` içindeki portları değiştirin.- Portlar çakışıyor: `frontend/vite.config.ts` ve `backend/server.js` içindeki portları değiştirin.

- CORS hatası: Backend CORS açık (`cors` middleware), yine de tarayıcı konsolunu kontrol edin.- CORS hatası: Backend CORS açık (`cors` middleware), yine de tarayıcı konsolunu kontrol edin.



## Lisans## Lisans

Eğitim ve demoya yönelik bir örnek projedir. Kendi projenize entegre ederken lisans gereksinimlerinizi belirleyin.Eğitim ve demoya yönelik bir örnek projedir. Kendi projenize entegre ederken lisans gereksinimlerinizi belirleyin.


Bu repo iki parçadan oluşur:
- `backend/`: Express tabanlı API. Vaka verilerini döner ve OpenAI Chat Completions ile konuşur.
- `frontend/`: React + Vite arayüzü. Sohbet, kanıt açma akışı ve oyun ekranları burada.

## Özellikler
- Sohbet tabanlı oyun deneyimi (AI asistan)
- AI yanıtlarında geçen delilleri otomatik tespit ve “kilit açma”
- Suçlama (Accusation) ve oyun sonu akışları
- Mobil uyumlu arayüz, shadcn-ui bileşenleri

## Proje Yapısı
```
backend/
  package.json
  server.js           # Express sunucusu (PORT=3004)
  data/               # Vaka listesi ve vaka detay JSON dosyaları
frontend/
  package.json
  src/                # Sayfalar, bileşenler, hooklar
  vite.config.ts      # Dev sunucusu (PORT=8080)
```

## Gereksinimler
- Node.js 18+ (LTS önerilir)
- NPM
- OpenAI API anahtarı (backend için)

## Kurulum
Backend ve frontend bağımlılıkları ayrı ayrı yüklenir.

```powershell
# Backend bağımlılıkları
cd backend
npm install

# Frontend bağımlılıkları
cd ..\frontend
npm install
```

## Çalıştırma
Önce backend’i, sonra frontend’i başlatın.

```powershell
# 1) Backend (http://localhost:3004)
cd backend
$env:OPENAI_API_KEY = "YOUR_OPENAI_API_KEY"  # Windows PowerShell için geçici ortam değişkeni
npm start

# 2) Frontend (http://localhost:8080)
# Yeni bir terminalde
cd ..\frontend
npm run dev
```

Notlar:
- `OPENAI_API_KEY` zorunludur. Yoksa `/api/chat` hata döner.
- `.env` dosyası kullanmak isterseniz `backend/` içinde `.env` oluşturup çalıştırmadan önce PowerShell yerine bir process manager veya `cross-env` gibi çözümler kullanabilirsiniz. Bu repo varsayılan olarak doğrudan ortam değişkenini okur.

## API Uç Noktaları (Backend)
- `GET /` — Sağlık kontrolü `{ status: 'ok' }`
- `GET /api/cases` — Vaka listesini döner (`backend/data/cases.json`)
- `GET /api/cases/:caseId` — Belirli vaka detayını döner (`backend/data/{caseId}.json`)
- `POST /api/chat` — Gövde: `{ caseId, message, chatHistory? }`  
  OpenAI yanıtındaki `[EVIDENCE UNLOCKED: evidence-id]` etiketlerini tespit eder, 
  temizlenmiş metin ile `unlockedEvidenceIds` dizisini döner:  
  `{ responseText, unlockedEvidenceIds: string[] }`

## Geliştirme
- Frontend dev sunucusu: http://localhost:8080
- Backend API: http://localhost:3004
- Vaka verilerini `backend/data/` klasöründen düzenleyebilirsiniz.

## Sorun Giderme
- “AI’dan yanıt gelmiyor”: `OPENAI_API_KEY` tanımlı mı kontrol edin; backend konsol hatalarını inceleyin.
- Portlar çakışıyor: `frontend/vite.config.ts` ve `backend/server.js` içindeki portları değiştirin.
- CORS hatası: Backend CORS açık (`cors` middleware), yine de tarayıcı konsolunu kontrol edin.

## Lisans
Eğitim ve demoya yönelik bir örnek projedir. Kendi projenize entegre ederken lisans gereksinimlerinizi belirleyin.
