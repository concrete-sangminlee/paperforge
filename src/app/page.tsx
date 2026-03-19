import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Code2,
  Users,
  FileText,
  GitBranch,
  History,
  Layout,
  Check,
  X,
  Flame,
} from "lucide-react";

const features = [
  {
    icon: Code2,
    title: "LaTeX Editor",
    description:
      "Full-featured CodeMirror editor with LaTeX syntax highlighting, autocomplete, and real-time error linting.",
  },
  {
    icon: Users,
    title: "Real-time Collaboration",
    description:
      "Work simultaneously with your team using CRDT-backed conflict-free editing powered by Yjs.",
  },
  {
    icon: FileText,
    title: "PDF Preview",
    description:
      "Instant side-by-side PDF rendering. See your changes compile in real time without leaving the browser.",
  },
  {
    icon: History,
    title: "Version History",
    description:
      "Every save is recorded. Browse, diff, and restore any previous version of your document with one click.",
  },
  {
    icon: GitBranch,
    title: "Git Integration",
    description:
      "Push and pull to any Git remote. Keep your LaTeX source under proper version control alongside your code.",
  },
  {
    icon: Layout,
    title: "Template Gallery",
    description:
      "Kick-start your work with curated templates for journals, theses, CVs, conference papers, and more.",
  },
];

type ComparisonValue = string | boolean;

const comparisonRows: {
  feature: string;
  paperforge: ComparisonValue;
  overleafFree: ComparisonValue;
  overleafPro: ComparisonValue;
}[] = [
  {
    feature: "LaTeX Compilation",
    paperforge: true,
    overleafFree: true,
    overleafPro: true,
  },
  {
    feature: "Real-time Collaboration",
    paperforge: true,
    overleafFree: false,
    overleafPro: true,
  },
  {
    feature: "Git Integration",
    paperforge: true,
    overleafFree: false,
    overleafPro: true,
  },
  {
    feature: "Version History",
    paperforge: "Unlimited",
    overleafFree: "24 hours",
    overleafPro: "Unlimited",
  },
  {
    feature: "Collaborators per project",
    paperforge: "Unlimited",
    overleafFree: "1",
    overleafPro: "Unlimited",
  },
  {
    feature: "Template Gallery",
    paperforge: true,
    overleafFree: true,
    overleafPro: true,
  },
  {
    feature: "Self-hostable / Open Source",
    paperforge: true,
    overleafFree: false,
    overleafPro: false,
  },
  {
    feature: "Price",
    paperforge: "Free",
    overleafFree: "Free",
    overleafPro: "$21 / mo",
  },
];

function ComparisonCell({ value }: { value: ComparisonValue }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="mx-auto h-5 w-5 text-green-600" aria-label="Yes" />
    ) : (
      <X className="mx-auto h-5 w-5 text-muted-foreground" aria-label="No" />
    );
  }
  return <span>{value}</span>;
}

export default async function HomePage() {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Flame className="h-5 w-5 text-orange-500" />
            PaperForge
          </Link>
          <nav className="flex items-center gap-2">
            {isLoggedIn ? (
              <Button render={<Link href="" />} size="sm">
                <Link href="/projects">Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                  Sign In
                </Link>
                <Link href="/register" className={buttonVariants({ size: "sm" })}>
                  Get Started Free
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden py-24 sm:py-32">
          {/* subtle gradient backdrop */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(249,115,22,0.12),transparent)]"
          />
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <Badge variant="secondary" className="mb-6 text-sm">
              Open-source LaTeX collaboration
            </Badge>
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
              Paper
              <span className="text-orange-500">Forge</span>
            </h1>
            <p className="mt-4 text-2xl font-medium text-muted-foreground sm:text-3xl">
              Write. Collaborate. Publish.
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              A modern, self-hostable collaborative LaTeX editor. Real-time
              co-authoring, instant PDF preview, and Git integration — all
              without a subscription.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              {isLoggedIn ? (
                <Link href="/projects" className={cn(buttonVariants({ size: "lg" }), "px-8 text-base")}>
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "px-8 text-base")}>
                    Get Started Free
                  </Link>
                  <Link
                    href="/login"
                    className={cn(buttonVariants({ size: "lg", variant: "outline" }), "px-8 text-base")}
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section
          id="features"
          className="border-t py-20 sm:py-28"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-14 text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything you need to write great papers
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Powerful tools built for researchers, students, and teams.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <Card
                  key={title}
                  className="transition-shadow hover:shadow-md"
                >
                  <CardHeader className="pb-3">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                      <Icon className="h-5 w-5 text-orange-500" />
                    </div>
                    <CardTitle className="text-base">{title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">
                      {description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── Comparison ── */}
        <section
          id="comparison"
          className="border-t bg-muted/30 py-20 sm:py-28"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-14 text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                How PaperForge compares
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Pro-tier features, zero cost.
              </p>
            </div>
            <div className="overflow-x-auto rounded-xl border bg-background shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%] text-sm font-semibold">
                      Feature
                    </TableHead>
                    <TableHead className="text-center text-sm font-semibold text-orange-500">
                      PaperForge
                    </TableHead>
                    <TableHead className="text-center text-sm font-semibold">
                      Overleaf Free
                    </TableHead>
                    <TableHead className="text-center text-sm font-semibold">
                      Overleaf Pro
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonRows.map((row) => (
                    <TableRow key={row.feature}>
                      <TableCell className="font-medium text-sm">
                        {row.feature}
                      </TableCell>
                      <TableCell className="text-center text-sm font-medium text-orange-600">
                        <ComparisonCell value={row.paperforge} />
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        <ComparisonCell value={row.overleafFree} />
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        <ComparisonCell value={row.overleafPro} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <section className="border-t py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to forge your next paper?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Free forever. No credit card required.
            </p>
            <div className="mt-8">
              {isLoggedIn ? (
                <Link href="/projects" className={cn(buttonVariants({ size: "lg" }), "px-10 text-base")}>
                  Open Dashboard
                </Link>
              ) : (
                <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "px-10 text-base")}>
                  Get Started Free
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t py-10 text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <Flame className="h-4 w-4 text-orange-500" />
            PaperForge
          </div>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link href="/register" className="hover:text-foreground transition-colors">
              Sign Up
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="#features" className="hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#comparison" className="hover:text-foreground transition-colors">
              Comparison
            </Link>
          </nav>
          <p className="text-xs">
            &copy; {new Date().getFullYear()} concrete-sangminlee. MIT License.
          </p>
        </div>
      </footer>
    </div>
  );
}
