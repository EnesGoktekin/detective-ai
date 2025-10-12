import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface GameEndDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: { title: string; message: string };
  messagesCount: number;
  timePlayedMs: number;
}

const GameEndDialog = ({ open, onOpenChange, result, messagesCount, timePlayedMs }: GameEndDialogProps) => {
  const navigate = useNavigate();

  const handleReturnHome = () => {
    onOpenChange(false);
    navigate("/");
  };

  const handlePlayAnother = () => {
    onOpenChange(false);
    navigate("/cases");
  };

  const minutes = Math.floor(timePlayedMs / 60000);
  const seconds = Math.floor((timePlayedMs % 60000) / 1000);
  const timeLabel = `${minutes}m ${seconds}s`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-playfair text-3xl text-primary text-center">
            {result.title}
          </DialogTitle>
          <DialogDescription className="font-jetbrains text-center pt-4 text-foreground">
            {result.message}
          </DialogDescription>
        </DialogHeader>
        <div className="pt-4">
          <div className="font-jetbrains text-sm text-muted-foreground text-center">
            <div>Messages exchanged: <span className="text-foreground font-semibold">{messagesCount}</span></div>
            <div>Time played: <span className="text-foreground font-semibold">{timeLabel}</span></div>
          </div>
        </div>

        <div className="flex justify-center gap-3 pt-6">
          <Button onClick={handleReturnHome} className="font-jetbrains font-semibold px-4">
            Return to Main Menu
          </Button>
          <Button onClick={handlePlayAnother} variant="secondary" className="font-jetbrains font-semibold px-4">
            Play Another Case
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GameEndDialog;
