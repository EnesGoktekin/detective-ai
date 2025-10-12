import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useCases } from "../hooks/useCases";

// Data is now fetched from the backend via the useCases hook

const CaseSelectionPage = () => {
  const { data, isLoading, error } = useCases();
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

        {isLoading && (
          <p className="text-center font-jetbrains">Loading cases...</p>
        )}

        {error && !isLoading && (
          <p className="text-center font-jetbrains text-red-500">{error}</p>
        )}

        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(data ?? []).map((caseItem) => (
              <Link key={caseItem.id} to={`/game/${caseItem.id}`}>
                <Card className="h-full hover:shadow-noir-glow transition-all duration-300 cursor-pointer border-border/50 hover:border-primary/50">
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
                      {caseItem.caseNumber}
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CaseSelectionPage;
