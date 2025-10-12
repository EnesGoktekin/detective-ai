# DETECTIVE-AI — Frontend

AI destekli bir dedektif oyununun React + Vite tabanlı arayüzü. Oyuncu, yapay zekâ asistanıyla sohbet ederek ipuçlarını keşfeder, delilleri kilitlerden çıkarır ve sonunda suçluyu ve kilit delili seçerek suçlamada bulunur.

## Özellikler

- Sohbet tabanlı oyun deneyimi (AI asistanla konuşma)
- Kanıt kilidi açma akışı: AI yanıtlarında özel etiketle bildirilen deliller UI’da açılır
- Suçlama (Accusation) diyaloğu ve oyun sonu (win/lose) diyalogları
- Mobil-öncelikli responsive tasarım; bilgi paneli mobilde overlay olarak açılır
- Otomatik scroll, özelleştirilmiş scrollbar, shadcn-ui bileşenleri

## Teknoloji Yığını

- React 18 + TypeScript + Vite
- Tailwind CSS (+ tailwindcss-animate, forms, typography, tailwind-scrollbar)
- shadcn-ui (dialog, button, form bileşenleri vb.)
- React Router

Backend hakkında kısaca: Express tabanlı bir API, OpenAI Chat Completions (gpt-4o) ile konuşur ve AI’dan gelen yanıtlardaki `[EVIDENCE UNLOCKED: id]` etiketlerini ayıklayıp frontend’e `unlockedEvidenceIds` olarak döner.

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
