import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const HomePage = () => {
  return (
    <div className="relative min-h-screen">
      {/* Background image layer - place your image at public/detective-home.jpg */}
  <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/detective.png')" }} />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <div className="text-center space-y-8 px-4">
          <div className="space-y-4">
            <h1 className="font-playfair font-black text-7xl md:text-8xl text-primary tracking-tight">
              AI DETECTIVE
            </h1>
            <p className="font-jetbrains text-foreground text-lg md:text-xl tracking-wide">
              "Every contact leaves a trace."
            </p>
          </div>

          <div className="pt-8">
            <Link to="/cases">
              <Button
                size="lg"
                className="font-jetbrains font-semibold tracking-wider px-12 py-6 text-lg shadow-noir-glow hover:shadow-noir transition-all duration-300"
              >
                Select Case
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
