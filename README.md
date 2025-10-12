# Detective AI

AI destekli bir dedektif oyunu. Oyuncu, yapay zekâ asistanıyla sohbet ederek ipuçlarını keşfeder, delilleri (evidence) kilitlerden çıkarır ve doğru suçlu ile ana kanıtı seçerek suçlamada bulunur.

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
