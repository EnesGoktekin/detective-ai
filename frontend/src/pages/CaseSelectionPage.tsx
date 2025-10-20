import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { useCases } from "@/hooks/useCases"; // Yeni hook'u import et

const CaseSelectionPage = () => {
  const { data: cases, isLoading, error } = useCases();

  // JSX içinde kullanılmayan AlertDialog ve isProcessing mantığı şimdilik devre dışı bırakıldı.

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-jetbrains mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Main Menu
        </Link>
        
        <h1 className="font-playfair font-bold text-5xl md:text-6xl text-primary mb-12 text-center">
          Case Files
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Loading Durumu */}
          {isLoading && (
            <div className="col-span-full flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="font-jetbrains text-foreground ml-3 self-center">Veriler Yükleniyor...</p>
            </div>
          )}

          {/* 2. Hata Durumu */}
          {error && (
            <div className="col-span-full flex flex-col items-center py-10 bg-red-900/20 p-5 rounded-lg border border-red-700/50">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <p className="font-jetbrains text-red-400 mt-2 text-center">
                Vaka listesi yüklenirken hata oluştu: {error}
              </p>
            </div>
          )}

          {/* 3. Başarılı Durum ve Dinamik Kartlar */}
          {!isLoading && !error && cases && cases.map((caseItem) => (
            // NOT: onClick mantığı Faz 2'de eklenecektir. Şimdilik sadece görsel.
            <Card
              key={caseItem.id}
              // onClick={() => handleCaseClick(caseItem.id, caseItem.title)} // Faz 2 için devre dışı
              className="h-full hover:shadow-noir-glow transition-all duration-300 cursor-pointer border-border/50 hover:border-primary/50"
            >
              <CardHeader>
                <CardTitle className="font-playfair text-2xl text-primary">
                  {caseItem.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="font-jetbrains text-foreground/80">
                  {caseItem.synopsis}
                </CardDescription>
              </CardContent>
              <CardFooter>
                <span className="font-jetbrains text-sm text-muted-foreground">
                  Vaka No: {caseItem.caseNumber}
                </span>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Dialoglar ve overlay'ler artık kullanılmadığı için kaldırıldı. */}
    </div>
  );
};

export default CaseSelectionPage;