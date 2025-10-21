import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Send, X, Info, HelpCircle } from "lucide-react";
import GameEndDialog from "@/components/GameEndDialog";
import AccusationDialog from "../components/AccusationDialog";
import { GameTutorial } from "@/components/GameTutorial";
import { useCaseDetail } from "../hooks/useCaseDetail";


const GamePage = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data, isLoading, error } = useCaseDetail(caseId ?? "");
  
  // Check if this is a new game (from navigation state)
  // Default to true for direct URL access
  const isNewGame = location.state?.isNewGame ?? true;
  
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [gameResult, setGameResult] = useState<null | { title: string; message: string }>(null);
  const [isAccusationOpen, setIsAccusationOpen] = useState(false);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [unlockedEvidenceIds, setUnlockedEvidenceIds] = useState<string[]>([]);
  const [startTimeMs] = useState<number>(() => Date.now());
  const [showTutorial, setShowTutorial] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // NEW: Session ID for stateful gameplay
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const sessionAttempted = useRef(false); // Prevent infinite loop
  
  // Exit confirmation dialog state
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  // Rate limiting: Cooldown timer (in seconds)
  const [cooldownTime, setCooldownTime] = useState(0);
  
  // Input validation error modal
  const [modalErrorMessage, setModalErrorMessage] = useState<string | null>(null);

  // DEBUG: Log case data structure
  useEffect(() => {
    if (data) {
      console.log('[GamePage-DEBUG] Case data loaded:', data);
      console.log('[GamePage-DEBUG] Evidence array:', data.evidence);
      console.log('[GamePage-DEBUG] Evidence count:', data.evidence?.length ?? 0);
      console.log('[GamePage-DEBUG] Suspects count:', data.suspects?.length ?? 0);
    }
  }, [data]);

  // DEBUG: Log unlocked evidence updates
  useEffect(() => {
    console.log('[GamePage-DEBUG] Unlocked evidence IDs updated:', unlockedEvidenceIds);
    console.log('[GamePage-DEBUG] Unlocked count:', unlockedEvidenceIds.length);
  }, [unlockedEvidenceIds]);

  // Rate limiting: Countdown timer
  useEffect(() => {
    if (cooldownTime <= 0) return;

    const timer = setInterval(() => {
      setCooldownTime((prev) => {
        if (prev <= 1) {
          console.log('[RATE-LIMIT] Cooldown finished');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownTime]);

  // Show tutorial only for new games (not resumed sessions)
  // Also check localStorage to avoid showing on every new game if user has seen it before
  useEffect(() => {
    // Only show tutorial if this is a new game AND user hasn't seen it before
    if (isNewGame && data) {
      const hasSeenTutorial = localStorage.getItem("hasSeenTutorial");
      if (!hasSeenTutorial) {
        // Delay to ensure UI is fully rendered
        setTimeout(() => {
          setShowTutorial(true);
        }, 1000);
      }
    }
  }, [isNewGame, data]);

  // NEW: Create or retrieve game session when case loads
  useEffect(() => {
    // Prevent infinite loop: only attempt once
    if (!data || !caseId || sessionId || isSessionLoading || sessionAttempted.current) return;

    const createSession = async () => {
      sessionAttempted.current = true; // Mark as attempted
      setIsSessionLoading(true);
      
      try {
        console.log('[SESSION] Creating/retrieving session for case:', caseId);
        
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseId })
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('[SESSION] Server error:', errorText);
          throw new Error(`Session creation failed: ${res.status}`);
        }
        
        const { sessionId: newSessionId, gameState, isNew } = await res.json();
        setSessionId(newSessionId);
        console.log(`[SESSION] ${isNew ? 'Created' : 'Retrieved'} session:`, newSessionId);
        
        // NEW: If session has chatHistory, initialize messages with it
        if (gameState && Array.isArray(gameState.chat_history) && gameState.chat_history.length > 0) {
          console.log(`[SESSION] Loading ${gameState.chat_history.length} message(s) from chat history`);
          setMessages(gameState.chat_history);
        } else if (isNew) {
          // If it's a new game with no history, send the initial message
          console.log('[SESSION] New game, sending initial message to AI.');
          const initialMessageResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: newSessionId, message: 'start_game', caseId: caseId })
          });

          if (!initialMessageResponse.ok) {
            throw new Error('Failed to get initial message from AI');
          }

          const payload = await initialMessageResponse.json();
          if (payload && payload.response && typeof payload.response.content === 'string') {
            const initialAiMessage = payload.response;
            setMessages([initialAiMessage]);
          } else {
            console.error("Invalid initial AI response payload:", payload);
            throw new Error("Received an invalid initial message from the server.");
          }
        }
      } catch (err: any) {
        console.error('[SESSION] Failed to create session:', err);
        // Store error separately - DON'T add to messages (causes infinite loop!)
        setSessionError(err.message || 'Failed to initialize game session');
      } finally {
        setIsSessionLoading(false);
      }
    };

    createSession();
  }, [data, caseId, sessionId, isSessionLoading]);

  // DEPRECATED: Old fullStory logic replaced by dynamic chatHistory from game_sessions
  // Messages are now initialized from session's chatHistory (see session creation useEffect above)
  // This useEffect is kept as fallback but should not trigger in normal flow
  useEffect(() => {
    if (data && data.fullStory && messages.length === 0 && !isSessionLoading) {
      console.warn("[FALLBACK] Using deprecated fullStory as no chatHistory loaded");
      setMessages([{ role: "assistant", content: data.fullStory }]);
    }
  }, [data, messages.length, isSessionLoading]);

  // Auto-scroll to the newest message whenever messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle accusation with 4 outcomes and set game result
  const handleAccusation = async (selectedSuspectId: string, selectedEvidenceId: string) => {
    const correct = data?.correctAccusation;
    if (!correct) {
      setGameResult({ title: "Unable to Judge", message: "Case answer data is missing." });
      setIsAccusationOpen(false);
      return;
    }

    const suspectMatches = selectedSuspectId === correct.suspectId;
    const evidenceMatches = selectedEvidenceId === correct.evidenceId;

    if (suspectMatches && evidenceMatches) {
      setGameResult({ title: "Case Closed!", message: "You correctly identified the culprit and the key evidence." });
    } else if (suspectMatches && !evidenceMatches) {
      setGameResult({ title: "You Lost!", message: "The suspect was correct, but that was the wrong piece of evidence." });
    } else if (!suspectMatches && evidenceMatches) {
      setGameResult({ title: "You Lost!", message: "The evidence was relevant, but you accused the wrong suspect." });
    } else {
      setGameResult({ title: "You Lost!", message: "Both the suspect and the evidence were incorrect." });
    }

    setIsAccusationOpen(false);
  };

  /**
   * Handle exit button click
   * Shows confirmation dialog before deleting session
   */
  const handleExitClick = () => {
    console.log('[GamePage] Exit button clicked - showing confirmation dialog');
    setShowExitDialog(true);
  };
  
  /**
   * Confirm exit and delete session
   */
  const handleConfirmExit = async () => {
    try {
      setShowExitDialog(false);
      setIsExiting(true);
      
      console.log('[GamePage] User confirmed exit - deleting session:', sessionId);
      
      if (sessionId) {
        // Delete current game session
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete session');
        }
        
        console.log('[GamePage] Session deleted successfully');
      } else {
        console.warn('[GamePage] No sessionId available to delete');
      }
      
      // Navigate back to main menu
      navigate('/');
      
    } catch (err) {
      console.error('[GamePage] Error deleting session:', err);
      setIsExiting(false);
      alert('Failed to delete game session. Returning to main menu anyway.');
      navigate('/');
    }
  };

  /**
   * Exit without deleting session (save progress)
   * Allows user to resume the game later
   */
  const handleExitAndSave = () => {
    console.log('[GamePage] User chose to exit and save progress');
    setShowExitDialog(false);
    navigate('/');
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = message.trim();
    if (!text) return;

    // Rate limiting check: Prevent sending if cooldown is active
    if (cooldownTime > 0) {
      console.log('[RATE-LIMIT] Message blocked - cooldown active:', cooldownTime);
      return;
    }

    // NEW: Ensure session exists before sending message
    if (!sessionId) {
      console.error('[CHAT] No session ID available - session may still be loading');
      setMessages(prev => [...prev, {
        role: 'system',
        content: '⚠️ Game session not ready. Please wait a moment and try again.'
      }]);
      return;
    }

    // Set cooldown timer (5 seconds) before sending
    setCooldownTime(5);
    console.log('[RATE-LIMIT] Cooldown started: 5 seconds');

    // Append the user's message and clear the input
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setMessage("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: text, 
          caseId: caseId, 
          chatHistory: messages,
          sessionId  // NEW: Required by stateful backend
        }),
      });
      
      // Handle input validation error (400)
      if (res.status === 400) {
        const errorData = await res.json().catch(() => ({ error: 'Invalid input' }));
        console.error('[INPUT-VALIDATION] Backend validation error:', errorData.error);
        setModalErrorMessage(errorData.error || 'Invalid input. Please check your message.');
        return;
      }
      
      // Handle rate limit error (429)
      if (res.status === 429) {
        const errorData = await res.json().catch(() => ({ error: 'Rate limit exceeded' }));
        console.error('[RATE-LIMIT] Backend rate limit hit:', errorData.error);
        setMessages(prev => [...prev, { 
          role: "system", 
          content: `⚠️ ${errorData.error || 'Please wait before sending another message.'}` 
        }]);
        return; // Don't reset cooldown - let it run out
      }
      
      const payload = await res.json().catch(() => ({ responseText: "" }));
      console.log('[FRONTEND-DEBUG] Full payload received from backend:', payload);
      console.log('[FRONTEND-DEBUG] Payload received from backend:', payload);
      // Merge any newly unlocked evidence IDs
      if (payload && Array.isArray(payload.unlockedEvidenceIds) && payload.unlockedEvidenceIds.length > 0) {
        console.log('[FRONTEND-DEBUG] Current unlocked IDs BEFORE update:', unlockedEvidenceIds);
        console.log('[FRONTEND-DEBUG] New IDs received from backend:', payload.unlockedEvidenceIds);
        setUnlockedEvidenceIds(prevIds => {
          const merged = Array.from(new Set([...prevIds, ...payload.unlockedEvidenceIds]));
          console.log("[FRONTEND-DEBUG] New unlockedEvidenceIds state:", merged);
          return merged;
        });
        console.log('[FRONTEND-DEBUG] Attempting to update unlocked evidence with:', payload.unlockedEvidenceIds);
      }
      const reply = (payload && typeof payload.responseText === "string") ? payload.responseText : "(no response)";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "Error: Could not reach chat service." }]);
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Removed global fixed exit on desktop; moved into chat header actions */}

      {/* Two Column Layout - responsive */}
      <div className="flex flex-col md:flex-row gap-6 p-6 min-h-screen">
        {/* Left Column - Chat Panel (65%) */}
        <div className="w-full md:w-[65%] flex flex-col bg-card rounded-lg border border-border shadow-noir">
          <div className="sticky top-0 z-10 -mx-6 px-6 py-4 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-b border-border flex items-center justify-between">
            <h2 className="font-playfair text-2xl text-primary md:hidden">Investigation Chat</h2>
            {/* Mobile header actions: How to Play + Info + Close */}
            <div className="flex items-center gap-2 md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTutorial(true)}
                className="text-xs"
              >
                <HelpCircle className="h-4 w-4 mr-1" />
                How to Play
              </Button>
              <Button variant="outline" size="icon" onClick={() => setIsInfoPanelOpen(true)} aria-label="Open Case Info">
                <Info className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleExitClick} 
                aria-label="Exit Game" 
                className="mobile-exit-button"
                disabled={isExiting}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <ScrollArea className="flex-1 p-6">
            <div ref={chatContainerRef} className="space-y-4 h-[65vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 pr-4">
              {/* Show session error if exists */}
              {sessionError && (
                <div className="flex justify-center mb-4">
                  <div className="max-w-[80%] p-4 rounded-lg bg-red-900/40 border border-red-700">
                    <p className="font-jetbrains text-sm text-red-200">
                      ⚠️ {sessionError}
                    </p>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="mt-2 text-xs underline text-red-300 hover:text-red-100"
                    >
                      Click here to refresh
                    </button>
                  </div>
                </div>
              )}
              
              {/* Show loading state */}
              {isSessionLoading && messages.length === 0 && (
                <div className="flex justify-center">
                  <div className="max-w-[80%] p-4 rounded-lg bg-slate-800">
                    <p className="font-jetbrains text-sm text-gray-400">
                      Initializing investigation...
                    </p>
                  </div>
                </div>
              )}
              
              {/* Chat messages */}
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div 
                    className={`max-w-[80%] p-4 rounded-lg mb-4 ${
                      msg.role === "assistant" || msg.role === "model"
                        ? "bg-slate-800 text-foreground" 
                        : "bg-amber-900/60 text-foreground"
                    }`}
                  >
                    <p className="font-jetbrains text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="p-6 border-t border-border">
            <form className="flex gap-2" onSubmit={handleSendMessage}>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your question..."
                className="font-jetbrains"
              />
              <Button 
                type="submit" 
                size={cooldownTime > 0 ? "default" : "icon"}
                disabled={!message.trim() || cooldownTime > 0}
              >
                {cooldownTime > 0 ? (
                  `Wait (${cooldownTime}s)`
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Right Column - Case Info Panel (35%) */}
        <div
          className={`case-info-panel w-full md:w-[35%] ${isInfoPanelOpen ? "absolute inset-0 h-full bg-slate-950 z-20" : "hidden"} md:block bg-slate-900 rounded-lg p-6 pt-4 md:pt-6 flex flex-col gap-6 shadow-noir`}
        >
          {/* Mobile sticky header to avoid overlapping content */}
          <div className="md:hidden sticky top-0 z-10 -mx-6 rounded-t-lg bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80 border-b border-border px-4 py-3 flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsInfoPanelOpen(false)}
              className="shrink-0"
              aria-label="Back to Chat"
            >
              <span className="text-lg leading-none">{"<"}</span>
            </Button>
            <span className="font-jetbrains text-sm text-muted-foreground">Back to Chat</span>
          </div>
          <div className="md:hidden h-2" />
          {isLoading && (
            <p className="font-jetbrains">Loading case details...</p>
          )}

          {error && !isLoading && (
            <p className="font-jetbrains text-red-500">{error}</p>
          )}

          {!isLoading && !error && data && (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-playfair text-2xl text-primary mb-2">
                    {data.title}
                  </h2>
                  <p className="font-jetbrains text-sm text-muted-foreground">
                    Active Investigation
                  </p>
                </div>
                {/* Desktop: How to Play + Exit buttons */}
                <div className="hidden md:flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTutorial(true)}
                    className="text-xs"
                  >
                    <HelpCircle className="h-4 w-4 mr-1" />
                    How to Play
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleExitClick} 
                    aria-label="Exit Game" 
                    className="mt-1 desktop-exit-button"
                    disabled={isExiting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-playfair text-xl text-primary mb-4">SUSPECTS</h3>
                {data.suspects && data.suspects.length > 0 ? (
                  <ul className="space-y-2">
                    {data.suspects.map((s) => (
                      <li key={s.id} className="font-jetbrains text-sm text-foreground p-3 bg-slate-800 rounded">
                        <div className="font-semibold">{s.name}</div>
                        <div className="text-muted-foreground text-xs">{s.shortInfo}</div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-jetbrains text-sm text-muted-foreground italic">No suspects listed.</p>
                )}
              </div>

              <div>
                <h3 className="font-playfair text-xl text-primary mb-4">EVIDENCE</h3>
                {(() => {
                  const displayedEvidence = (data?.evidence ?? []).filter(e => unlockedEvidenceIds.includes(e.id));
                  if (displayedEvidence.length === 0) {
                    return (
                      <p className="font-jetbrains text-sm text-muted-foreground italic">
                        No evidence found yet.
                      </p>
                    );
                  }
                  return (
                    <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
                      <ul className="space-y-2">
                        {displayedEvidence.map((e) => (
                          <li key={e.id} className="font-jetbrains text-sm text-foreground p-3 bg-slate-800 rounded">
                            {e.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
              </div>

              <div className="mt-auto pt-4">
                <Button 
                  onClick={() => setIsAccusationOpen(true)}
                  className="w-full font-jetbrains font-semibold"
                  variant="destructive"
                  disabled={unlockedEvidenceIds.length !== (data?.evidence?.length ?? 0)}
                  title={
                    unlockedEvidenceIds.length !== (data?.evidence?.length ?? 0)
                      ? `Unlock all evidence first (${unlockedEvidenceIds.length}/${data?.evidence?.length ?? 0})`
                      : 'Make your accusation'
                  }
                >
                  Make Accusation
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <AccusationDialog
        open={isAccusationOpen}
        onOpenChange={setIsAccusationOpen}
        suspects={data?.suspects ?? []}
        evidence={(data?.evidence ?? []).filter(e => unlockedEvidenceIds.includes(e.id))}
        onAccuse={handleAccusation}
      />

      {gameResult && (
        <GameEndDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setGameResult(null);
          }}
          result={gameResult}
          messagesCount={messages.length}
          timePlayedMs={Date.now() - startTimeMs}
          sessionId={sessionId}
        />
      )}

      {/* Tutorial */}
      <GameTutorial
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Game?</AlertDialogTitle>
            <AlertDialogDescription>
              You can exit and save your progress to resume later, or permanently delete this game session.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isExiting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleExitAndSave}
              disabled={isExiting}
            >
              Exit & Save
            </AlertDialogAction>
            <AlertDialogAction 
              onClick={handleConfirmExit}
              disabled={isExiting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isExiting ? 'Deleting...' : 'Exit & Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Input Validation Error Modal */}
      <AlertDialog open={modalErrorMessage !== null} onOpenChange={(open) => !open && setModalErrorMessage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invalid Input</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {modalErrorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setModalErrorMessage(null)}>
              Got It
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GamePage;
