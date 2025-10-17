# DETECTIVE-AI — Frontend# DETECTIVE-AI — Frontend



AI destekli bir dedektif oyununun React + Vite tabanlı arayüzü. Oyuncu, yapay zekâ asistanıyla sohbet ederek ipuçlarını keşfeder, delilleri kilitlerden çıkarır ve sonunda suçluyu ve kilit delili seçerek suçlamada bulunur.AI destekli bir dedektif oyununun React + Vite tabanlı arayüzü. Oyuncu, yapay zekâ asistanıyla sohbet ederek ipuçlarını keşfeder, delilleri kilitlerden çıkarır ve sonunda suçluyu ve kilit delili seçerek suçlamada bulunur.



## Özellikler## Özellikler



- Sohbet tabanlı oyun deneyimi (AI asistanla konuşma)- Sohbet tabanlı oyun deneyimi (AI asistanla konuşma)

- Kanıt kilidi açma akışı: AI yanıtlarında özel etiketle bildirilen deliller UI'da açılır- Kanıt kilidi açma akışı: AI yanıtlarında özel etiketle bildirilen deliller UI’da açılır

- Suçlama (Accusation) diyaloğu ve oyun sonu (win/lose) diyalogları- Suçlama (Accusation) diyaloğu ve oyun sonu (win/lose) diyalogları

- Mobil-öncelikli responsive tasarım; bilgi paneli mobilde overlay olarak açılır- Mobil-öncelikli responsive tasarım; bilgi paneli mobilde overlay olarak açılır

- Otomatik scroll, özelleştirilmiş scrollbar, shadcn-ui bileşenleri- Otomatik scroll, özelleştirilmiş scrollbar, shadcn-ui bileşenleri



## Teknoloji Yığını## Teknoloji Yığını



- React 18 + TypeScript + Vite- React 18 + TypeScript + Vite

- Tailwind CSS (+ tailwindcss-animate, forms, typography, tailwind-scrollbar)- Tailwind CSS (+ tailwindcss-animate, forms, typography, tailwind-scrollbar)

- shadcn-ui (dialog, button, form bileşenleri vb.)- shadcn-ui (dialog, button, form bileşenleri vb.)

- React Router- React Router



Backend hakkında kısaca: Express tabanlı bir API, Supabase PostgreSQL'den vaka verilerini çeker ve Google Gemini API (gemini-2.5-pro) ile konuşur. AI'dan gelen yanıtlardaki `[EVIDENCE UNLOCKED: id]` etiketlerini ayıklayıp frontend'e `unlockedEvidenceIds` olarak döner.# DETECTIVE-AI — Frontend



## Proje Yapısı (frontend)AI destekli bir dedektif oyununun React + Vite tabanlı arayüzü. Oyuncu, yapay zekâ asistanıyla sohbet ederek ipuçlarını keşfeder, delilleri kilitlerden çıkarır ve sonunda suçluyu ve kilit delili seçerek suçlamada bulunur.



```## Özellikler

frontend/

	public/- Sohbet tabanlı oyun deneyimi (AI asistanla konuşma)

		robots.txt- Kanıt kilidi açma akışı: AI yanıtlarında özel etiketle bildirilen deliller UI'da açılır

	src/- Suçlama (Accusation) diyaloğu ve oyun sonu (win/lose) diyalogları

		pages/ (Home, Cases, Game)- Mobil-öncelikli responsive tasarım; bilgi paneli mobilde overlay olarak açılır

		components/ (AccusationDialog, GameEndDialog, ui/*)- Otomatik scroll, özelleştirilmiş scrollbar, shadcn-ui bileşenleri

		hooks/ (useCases, useCaseDetail, use-toast)

		lib/utils.ts## Teknoloji Yığını

```

- React 18 + TypeScript + Vite

## Çalıştırma- Tailwind CSS (+ tailwindcss-animate, forms, typography, tailwind-scrollbar)

- shadcn-ui (dialog, button, form bileşenleri vb.)

Önkoşullar: Node.js LTS, npm.- React Router



```powershellBackend hakkında kısaca: Express tabanlı bir API, Supabase PostgreSQL'den vaka verilerini çeker ve Google Gemini API (gemini-2.5-flash) ile konuşur. AI'dan gelen yanıtlardaki `[EVIDENCE UNLOCKED: id]` etiketlerini ayıklayıp frontend'e `unlockedEvidenceIds` olarak döner.

# Bağımlılıkları yükle

npm install## Proje Yapısı (frontend)



# Geliştirme sunucusu (http://localhost:8080)```

npm run devfrontend/

	public/

# Prod build		robots.txt

npm run build	src/

		pages/ (Home, Cases, Game)

# Build önizleme		components/ (AccusationDialog, GameEndDialog, ui/*)

npm run preview		hooks/ (useCases, useCaseDetail, use-toast)

```		lib/utils.ts

```

Backend'in `http://localhost:3004` üzerinde çalıştığından emin olun. Oyun verileri ve AI sohbet uç noktaları backend'den gelir. Backend için gerekli environment variables:

- `GEMINI_API_KEY` - Google Gemini API key## Çalıştırma

- `SUPABASE_URL` - Supabase project URL

- `SUPABASE_ANON_KEY` - Supabase anon keyÖnkoşullar: Node.js LTS, npm.



## Önemli Akışlar```powershell

# Bağımlılıkları yükle

- Mesaj gönderme: GamePage, kullanıcı mesajını ve sohbet geçmişini `/api/chat`'e gönderir.npm install

- Delil açma: Backend yanıtındaki tag'ler regex ile toplanır, frontend'de `unlockedEvidenceIds` state'i birleştirilir ve kanıt listesi görünür olur.

- Suçlama: Tüm kanıtlar açılmadan "Make Accusation" aktif olmaz; doğru/yanlış kombinasyonlarına göre sonuç diyaloğu gösterilir.# Geliştirme sunucusu (http://localhost:8080)

npm run dev

## API Endpoints

# Prod build

Frontend şu API endpoint'lerini kullanır:npm run build

- `GET /api/cases` - Vaka listesi (Supabase'den)

- `GET /api/cases/:caseId` - Vaka detayları (Supabase JOIN)# Build önizleme

- `POST /api/chat` - AI sohbet (Gemini API)npm run preview

```

## Vercel Deployment

Backend'in `http://localhost:3004` üzerinde çalıştığından emin olun. Oyun verileri ve AI sohbet uç noktaları backend'den gelir. Backend için gerekli environment variables:

Proje Vercel'de production'da çalışır. Frontend build'i `frontend/dist` klasörüne oluşturulur ve Vercel tarafından statik olarak serve edilir. API route'ları `/api/*` pattern'i ile serverless function'a yönlendirilir.- `GEMINI_API_KEY` - Google Gemini API key

- `SUPABASE_URL` - Supabase project URL

## Sorun Giderme- `SUPABASE_ANON_KEY` - Supabase anon key



- "AI'dan yanıt gelmiyor": Backend konsolunda hata çıktılarına bakın; `GEMINI_API_KEY` tanımlı olmalı.## Önemli Akışlar

- "Case listesi yüklenmiyor": `SUPABASE_URL` ve `SUPABASE_ANON_KEY` environment variables'ın doğru olduğundan emin olun.

- Scrollbar teması görünmüyorsa: Tailwind pluginlerinin yüklü ve `tailwind.config.ts` içine eklendiğini doğrulayın.- Mesaj gönderme: GamePage, kullanıcı mesajını ve sohbet geçmişini `/api/chat`'e gönderir.

- Delil açma: Backend yanıtındaki tag'ler regex ile toplanır, frontend'de `unlockedEvidenceIds` state'i birleştirilir ve kanıt listesi görünür olur.

## Lisans- Suçlama: Tüm kanıtlar açılmadan "Make Accusation" aktif olmaz; doğru/yanlış kombinasyonlarına göre sonuç diyaloğu gösterilir.



Eğitim ve demoya yönelik bir örnek projedir. Kendi projenize entegre ederken lisans gereksinimlerinizi belirleyin.## API Endpoints


Frontend şu API endpoint'lerini kullanır:
- `GET /api/cases` - Vaka listesi (Supabase'den)
- `GET /api/cases/:caseId` - Vaka detayları (Supabase JOIN)
- `POST /api/chat` - AI sohbet (Gemini API)

## Vercel Deployment

Proje Vercel'de production'da çalışır. Frontend build'i `frontend/dist` klasörüne oluşturulur ve Vercel tarafından statik olarak serve edilir. API route'ları `/api/*` pattern'i ile serverless function'a yönlendirilir.

## Sorun Giderme

- "AI'dan yanıt gelmiyor": Backend konsolunda hata çıktılarına bakın; `GEMINI_API_KEY` tanımlı olmalı.
- "Case listesi yüklenmiyor": `SUPABASE_URL` ve `SUPABASE_ANON_KEY` environment variables'ın doğru olduğundan emin olun.
- Scrollbar teması görünmüyorsa: Tailwind pluginlerinin yüklü ve `tailwind.config.ts` içine eklendiğini doğrulayın.

## Lisans

Bu depo oyun/demonstrasyon amaçlıdır. Kendi projenize entegre ederken lisans gereksinimlerinizi belirleyin.

## Proje Yapısı (frontend)

```
frontend/
	public/
		robots.txt
	src/
		pages/ (Home, Cases, Game)
		components/ (AccusationDialog, GameEndDialog, ui/*)
		hooks/ (useCases, useCaseDetail, use-toast)
		lib/utils.ts
```

## Çalıştırma

Önkoşullar: Node.js LTS, npm.

```powershell
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusu (http://localhost:8080)
npm run dev

# Prod build
npm run build

# Build önizleme
npm run preview
```

Backend’in `http://localhost:3004` üzerinde çalıştığından emin olun. Oyun verileri ve AI sohbet uç noktaları backend’den gelir.

## Önemli Akışlar

- Mesaj gönderme: GamePage, kullanıcı mesajını ve sohbet geçmişini `/api/chat`’e gönderir.
- Delil açma: Backend yanıtındaki tag’ler regex ile toplanır, frontend’de `unlockedEvidenceIds` state’i birleştirilir ve kanıt listesi görünür olur.
- Suçlama: Tüm kanıtlar açılmadan “Make Accusation” aktif olmaz; doğru/yanlış kombinasyonlarına göre sonuç diyaloğu gösterilir.

## Sorun Giderme

- “AI’dan yanıt gelmiyor”: Backend konsolunda hata çıktılarına bakın; `OPENAI_API_KEY` tanımlı olmalı.
- Scrollbar teması görünmüyorsa: Tailwind pluginlerinin yüklü ve `tailwind.config.ts` içine eklendiğini doğrulayın.

## Lisans

Bu depo oyun/demonstrasyon amaçlıdır. Kendi projenize entegre ederken lisans gereksinimlerinizi belirleyin.
