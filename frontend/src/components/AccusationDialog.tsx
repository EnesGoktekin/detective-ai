import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Suspect { id: string; name: string }
interface Evidence { id: string; name: string }

interface AccusationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suspects: Suspect[];
  evidence: Evidence[];
  onAccuse: (suspectId: string, evidenceId: string) => void;
}

const AccusationDialog = ({ open, onOpenChange, suspects, evidence, onAccuse }: AccusationDialogProps) => {
  const [selectedSuspectId, setSelectedSuspectId] = useState<string>("");
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>("");

  const canAccuse = Boolean(selectedSuspectId && selectedEvidenceId);

  const handleAccuse = () => {
    if (!canAccuse) return;
    onAccuse(selectedSuspectId, selectedEvidenceId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-playfair text-2xl text-primary">Make an Accusation</DialogTitle>
          <DialogDescription className="font-jetbrains text-foreground">
            Select a suspect and a piece of evidence you believe proves their guilt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h4 className="font-playfair text-lg text-primary mb-2">Suspects</h4>
            <RadioGroup value={selectedSuspectId} onValueChange={setSelectedSuspectId}>
              {suspects.map((s) => (
                <div key={s.id} className="flex items-center space-x-2 py-1">
                  <RadioGroupItem value={s.id} id={`sus-${s.id}`} />
                  <Label htmlFor={`sus-${s.id}`} className="font-jetbrains cursor-pointer">{s.name}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <h4 className="font-playfair text-lg text-primary mb-2">Evidence</h4>
            <RadioGroup value={selectedEvidenceId} onValueChange={setSelectedEvidenceId}>
              {evidence.map((e) => (
                <div key={e.id} className="flex items-center space-x-2 py-1">
                  <RadioGroupItem value={e.id} id={`ev-${e.id}`} />
                  <Label htmlFor={`ev-${e.id}`} className="font-jetbrains cursor-pointer">{e.name}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleAccuse} disabled={!canAccuse} className="font-jetbrains font-semibold">
            Accuse
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccusationDialog;
