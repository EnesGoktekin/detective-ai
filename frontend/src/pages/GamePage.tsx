import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, X, Info, HelpCircle } from "lucide-react";
import GameEndDialog from "@/components/GameEndDialog";
import AccusationDialog from "../components/AccusationDialog";
import { GameTutorial } from "@/components/GameTutorial";
import { useCaseDetail } from "../hooks/useCaseDetail";


const GamePage = () => {
  const { caseId } = useParams();
  const { data, isLoading, error } = useCaseDetail(caseId ?? "");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [gameResult, setGameResult] = useState<null | { title: string; message: string }>(null);
  const [isAccusationOpen, setIsAccusationOpen] = useState(false);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [unlockedEvidenceIds, setUnlockedEvidenceIds] = useState<string[]>([]);
  const [startTimeMs] = useState<number>(() => Date.now());
  const [showTutorial, setShowTutorial] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Check if user has seen tutorial (only on first case ever)
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("hasSeenTutorial");
    if (!hasSeenTutorial && data) {
      // Delay to ensure UI is fully rendered
      setTimeout(() => {
        setShowTutorial(true);
      }, 1000);
    }
  }, [data]);

  // Seed the chat with the case's full story once it's loaded
  useEffect(() => {
    if (data && data.fullStory) {
      setMessages([{ role: "assistant", content: data.fullStory }]);
    }
  }, [data]);

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

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = message.trim();
    if (!text) return;

    // Append the user's message and clear the input
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setMessage("");

    try {
  const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, caseId: caseId, chatHistory: messages }),
      });
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
              <Link to="/">
                <Button variant="outline" size="icon" aria-label="Back to Cases" className="mobile-exit-button">
                  <X className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          
          <ScrollArea className="flex-1 p-6">
            <div ref={chatContainerRef} className="space-y-4 h-[65vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 pr-4">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div 
                    className={`max-w-[80%] p-4 rounded-lg mb-4 ${
                      msg.role === "assistant" 
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
              <Button type="submit" size="icon">
                <Send className="h-4 w-4" />
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
                  <Link to="/">
                    <Button variant="outline" size="icon" aria-label="Back to Cases" className="mt-1 desktop-exit-button">
                      <X className="h-4 w-4" />
                    </Button>
                  </Link>
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
                  disabled={unlockedEvidenceIds.length !== (data.evidence?.length ?? 0)}
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
        evidence={data?.evidence ?? []}
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
        />
      )}

      {/* Tutorial */}
      <GameTutorial
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </div>
  );
};

export default GamePage;
