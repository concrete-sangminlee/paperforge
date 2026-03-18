import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">PaperForge</h1>
      <p className="text-lg text-muted-foreground text-center max-w-md">
        A collaborative LaTeX editor for the modern web. Write, compile, and
        collaborate in real time.
      </p>
      <div className="flex gap-4">
        <Button size="lg">Get Started</Button>
        <Button variant="outline" size="lg">
          Learn More
        </Button>
      </div>
    </div>
  );
}
