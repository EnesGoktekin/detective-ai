// frontend/src/types/contracts.ts

// =====================================================================
// TEMEL VERİ MODELLERİ
// =====================================================================

/**
 * Bir şüphelinin bilgilerini temsil eder.
 * KULLANIM YERİ: Oyun Ekranı (bilgi paneli), Suçluyu Seç Menüsü.
 */
export interface Suspect {
  id: string; 
  name: string; 
  shortInfo: string; // Örn: "Maktulün kıskanç eski eşi"
}

/**
 * Bir kanıt parçasını temsil eder.
 * KULLANIM YERİ: Oyun Ekranı (bilgi paneli), Suçluyu Seç Menüsü.
 */
export interface Evidence {
  id: string; 
  name: string; // Örn: "Kırık Gözlük"
  description: string;
}

// =====================================================================
// SAYFALAR İÇİN VERİ MODELLERİ
// =====================================================================

/**
 * Case Seçme Menüsü'nde gösterilecek her bir dava kartının verisi.
 * Sadece temel bilgileri içerir. Backend, bu bilgiyi istenen dilde (tr/en) gönderir.
 */
export interface CaseSummary {
  id: string; // URL için: 'the-golden-dagger'
  title: string;
  synopsis: string; 
  caseNumber: string; // Örn: "CASE-021"
}

/**
 * Tek bir davanın tüm detaylarını içeren ana yapı.
 * KULLANIM YERİ: Oyun Ekranı yüklendiğinde bir kez backend'den çekilir.
 * Backend, bu bilgiyi oyunun başında seçilen genel dile (tr/en) göre hazırlar.
 */
export interface CaseDetail extends CaseSummary {
  fullStory: string; // AI'ın ilk mesajı veya oyuncunun okuyacağı olay örgüsü.
  victim: {
    name:string;
    age: number;
    occupation: string;
  };
  location: string;
  suspects: Suspect[]; 
  evidence: Evidence[]; 

  // DOĞRU CEVAP: Bu bilgi en başta frontend'e yüklenir.
  // Suçlama mantığı tamamen frontend'de çalışacaktır.
  correctAccusation: {
    suspectId: string;
    evidenceId: string;
  }
}

// =====================================================================
// API ETKİLEŞİM MODELLERİ (Sadece AI Sohbeti İçin)
// =====================================================================

/**
 * Oyuncunun chat üzerinden AI'a gönderdiği mesajın yapısı.
 * NOT: Dil bilgisi içermez. Backend'deki AI servisinin,
 * gönderilen mesajın dilini kendisinin algılaması beklenir.
 */
export interface DialoguePayload {
  caseId: string; // Hangi dava bağlamında soru sorulduğunu belirtir.
  message: string; // Oyuncunun yazdığı ham metin.
  chatHistory: { role: 'user' | 'assistant', content: string }[]; // ÖNERİ: Sohbet geçmişini yollamak, AI'ın bağlamı daha iyi anlamasını sağlar.
}

/**
 * AI'ın oyuncunun mesajına verdiği cevabın yapısı.
 */
export interface DialogueResponse {
  responseText: string; // AI'ın cevabı.
  unlockedEvidenceIds: string[]; // Bu cevap sonucunda yeni kanıtlar açıldıysa, ID'leri bu dizide gelir.
}
