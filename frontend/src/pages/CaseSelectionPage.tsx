import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCases } from "../hooks/useCases";

// Data is now fetched from the backend via the useCases hook

const CaseSelectionPage = () => {
  console.log('[CaseSelectionPage] Component rendering');
  
  const { data, isLoading, error } = useCases();
  const navigate = useNavigate();
  
  // State for Resume/Start New dialog
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [selectedCase, setSelectedCase] = useState<{ id: string; title: string } | null>(null);
  const [existingSessionId, setExistingSessionId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  console.log('[CaseSelectionPage] Hook state:', { 
    hasData: data !== null,
    dataLength: data?.length || 0,
    isLoading, 
    error,
    fullData: data
  });
  
  /**
   * Handle case card click
   * Checks if existing session exists for this case
   */
  const handleCaseClick = async (caseId: string, caseTitle: string) => {
    try {
      console.log(`[CaseSelection] User clicked case: ${caseId}`);
      setIsProcessing(true);
      
      // Check if existing session exists
      const response = await fetch(`/api/sessions/latest?caseId=${caseId}`);
      
      if (!response.ok) {
        throw new Error('Failed to check existing session');
      }
      
      const { latestSessionId } = await response.json();
      console.log(`[CaseSelection] Latest session check:`, { latestSessionId });
      
      if (latestSessionId) {
        // Existing session found - show Resume/Start New dialog
        console.log(`[CaseSelection] Existing session found: ${latestSessionId}`);
        setSelectedCase({ id: caseId, title: caseTitle });
        setExistingSessionId(latestSessionId);
        setShowResumeDialog(true);
        setIsProcessing(false);
      } else {
        // No existing session - start new game directly
        console.log(`[CaseSelection] No existing session - starting new game`);
        await startNewGame(caseId);
      }
    } catch (err) {
      console.error('[CaseSelection] Error checking session:', err);
      setIsProcessing(false);
      alert('Failed to check existing game session. Please try again.');
    }
  };
  
  /**
   * Start a new game session
   */
  const startNewGame = async (caseId: string) => {
    try {
      setIsProcessing(true);
      console.log(`[CaseSelection] Starting new game for case: ${caseId}`);
      
      // Create new session
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: caseId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create new session');
      }
      
      const { sessionId } = await response.json();
      console.log(`[CaseSelection] New session created: ${sessionId}`);
      
      // Navigate to game page with isNewGame flag and the new sessionId
      navigate(`/game/${caseId}`, { state: { isNewGame: true, sessionId: sessionId } });
    } catch (err) {
      console.error('[CaseSelection] Error starting new game:', err);
      setIsProcessing(false);
      alert('Failed to start new game. Please try again.');
    }
  };
  
  /**
   * Resume existing game
   */
  const handleResume = () => {
    if (!selectedCase || !existingSessionId) return;
    
    console.log(`[CaseSelection] Resuming session: ${existingSessionId}`);
    setShowResumeDialog(false);
    
    // Navigate to game page with isNewGame flag set to false (resuming)
    navigate(`/game/${selectedCase.id}`, { state: { isNewGame: false } });
  };
  
  /**
   * Delete old session and start new game
   */
  const handleStartNew = async () => {
    if (!selectedCase || !existingSessionId) return;
    
    try {
      setShowResumeDialog(false);
      setIsProcessing(true);
      
      console.log(`[CaseSelection] Deleting old session: ${existingSessionId}`);
      
      // Step 1: Delete existing session
      const deleteResponse = await fetch(`/api/sessions/${existingSessionId}`, {
        method: 'DELETE'
      });
      
      if (!deleteResponse.ok) {
        throw new Error('Failed to delete old session');
      }
      
      console.log(`[CaseSelection] Old session deleted successfully`);
      
      // Step 2: Start new game
      await startNewGame(selectedCase.id);
    } catch (err) {
      console.error('[CaseSelection] Error deleting old session:', err);
      setIsProcessing(false);
      alert('Failed to delete old session. Please try again.');
    }
  };
  
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
          <>
            {console.log('[CaseSelectionPage] Rendering: Loading state')}
            <p className="text-center font-jetbrains">Loading cases...</p>
          </>
        )}

        {error && !isLoading && (
          <>
            {console.log('[CaseSelectionPage] Rendering: Error state -', error)}
            <p className="text-center font-jetbrains text-red-500">{error}</p>
          </>
        )}

        {!isLoading && !error && (
          <>
            {console.log('[CaseSelectionPage] Rendering: Case list with', data?.length || 0, 'cases')}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(data ?? []).map((caseItem) => {
                console.log('[CaseSelectionPage] Rendering case card:', caseItem.id, caseItem.title);
                return (
                  <Card 
                    key={caseItem.id}
                    onClick={() => handleCaseClick(caseItem.id, caseItem.title)}
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
                        {caseItem.caseNumber}
                      </span>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
      
      {/* Resume / Start New Dialog */}
      <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-playfair text-2xl">
              Existing Game Found
            </AlertDialogTitle>
            <AlertDialogDescription className="font-jetbrains">
              You have an unfinished investigation for <span className="font-bold text-primary">{selectedCase?.title}</span>.
              <br /><br />
              Would you like to <span className="font-bold">resume</span> where you left off, or <span className="font-bold">start a new</span> investigation?
              <br /><br />
              <span className="text-yellow-500">⚠️ Warning:</span> Starting a new game will delete your previous progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={handleStartNew}
              className="font-jetbrains"
            >
              Start New Game
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResume}
              className="font-jetbrains"
            >
              Resume Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-8 rounded-lg border border-border flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-jetbrains text-foreground">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseSelectionPage;