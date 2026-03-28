import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
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
  Star,
  Github,
  Twitter,
  Linkedin,
  Mail,
  ArrowRight,
  Zap,
  Shield,
  BookOpen,
  ChevronRight,
  Quote,
  Building2,
  Clock,
  Heart,
} from "lucide-react";

/* ───────────────────── static data ───────────────────── */

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

const stats = [
  { value: "10,000+", label: "Papers Written", icon: FileText },
  { value: "500+", label: "Institutions", icon: Building2 },
  { value: "99.9%", label: "Uptime", icon: Clock },
  { value: "100%", label: "Open Source", icon: Heart },
];

const steps = [
  {
    step: "01",
    title: "Create a Project",
    description:
      "Start from scratch or pick from our curated template gallery. Your workspace is ready in seconds.",
    icon: BookOpen,
  },
  {
    step: "02",
    title: "Write & Collaborate",
    description:
      "Invite your co-authors and write together in real time with conflict-free CRDT editing.",
    icon: Users,
  },
  {
    step: "03",
    title: "Compile & Publish",
    description:
      "One-click PDF compilation, DOCX export, and Git push. From draft to submission, seamlessly.",
    icon: Zap,
  },
];

const testimonials = [
  {
    quote:
      "PaperForge replaced our entire Overleaf workflow. The real-time collaboration is flawless, and the Git integration means our source always lives alongside our code.",
    name: "Dr. Sarah Chen",
    role: "Associate Professor, Computer Science",
    institution: "MIT",
    stars: 5,
  },
  {
    quote:
      "As a PhD student, I can't afford Overleaf Pro. PaperForge gives me every feature I need -- unlimited collaborators, full version history -- completely free.",
    name: "James Rodriguez",
    role: "PhD Candidate, Physics",
    institution: "Stanford University",
    stars: 5,
  },
  {
    quote:
      "We deployed PaperForge on our department server and it's been rock solid. 40+ researchers use it daily. The self-hosting option is a game-changer for data-sensitive work.",
    name: "Prof. Anika Patel",
    role: "Department Chair, Biomedical Engineering",
    institution: "ETH Zurich",
    stars: 5,
  },
];

const trustInstitutions = [
  "MIT",
  "Stanford",
  "Oxford",
  "ETH Zurich",
  "Cambridge",
  "Caltech",
  "Berkeley",
  "Harvard",
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

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Comparison", href: "#comparison" },
    { label: "Templates", href: "#" },
    { label: "Changelog", href: "#" },
  ],
  Resources: [
    { label: "Documentation", href: "#" },
    { label: "LaTeX Guide", href: "#" },
    { label: "API Reference", href: "#" },
    { label: "Blog", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Contact", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Open Source", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
    { label: "MIT License", href: "#" },
  ],
};

/* ───────────────────── helpers ───────────────────── */

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

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star
          key={i}
          className="h-4 w-4 fill-orange-400 text-orange-400"
        />
      ))}
    </div>
  );
}

/* ───────────────────── page ───────────────────── */

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let isLoggedIn = false;
  try {
    const { auth } = await import('@/lib/auth');
    const session = await auth();
    isLoggedIn = Boolean(session?.user);
  } catch {
    // Auth/DB unavailable — render as logged out
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* ── Nav ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg"
          >
            <Flame className="h-5 w-5 text-orange-500" />
            PaperForge
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <Link
              href="#features"
              className="transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="transition-colors hover:text-foreground"
            >
              How It Works
            </Link>
            <Link
              href="#comparison"
              className="transition-colors hover:text-foreground"
            >
              Comparison
            </Link>
            <Link
              href="#testimonials"
              className="transition-colors hover:text-foreground"
            >
              Testimonials
            </Link>
          </nav>

          <nav className="flex items-center gap-2">
            {isLoggedIn ? (
              <Link
                href="/projects"
                className={buttonVariants({ size: "sm" })}
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className={buttonVariants({
                    variant: "ghost",
                    size: "sm",
                  })}
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className={buttonVariants({ size: "sm" })}
                >
                  Get Started Free
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ────────────────────────────────────────── */}
        <section className="landing-hero relative overflow-hidden py-28 sm:py-36 lg:py-44">
          {/* animated gradient background */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 landing-gradient-bg"
          />

          {/* dot pattern overlay */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 landing-dot-pattern opacity-[0.4]"
          />

          {/* decorative blurred circles */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -left-32 h-[30rem] w-[30rem] rounded-full bg-amber-500/8 blur-3xl"
          />

          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <Badge
              variant="secondary"
              className="mb-8 px-4 py-1.5 text-sm font-medium landing-badge-glow"
            >
              <Shield className="mr-1.5 h-3.5 w-3.5" />
              Open-source &middot; Self-hostable &middot; Free forever
            </Badge>

            <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl xl:text-8xl">
              Paper
              <span className="landing-gradient-text">Forge</span>
            </h1>

            {/* CSS-only "typing" tagline */}
            <p className="mt-6 text-2xl font-semibold text-muted-foreground sm:text-3xl lg:text-4xl">
              <span className="landing-typewriter inline-block overflow-hidden whitespace-nowrap border-r-2 border-orange-500">
                Write. Collaborate. Publish.
              </span>
            </p>

            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              A modern, self-hostable collaborative LaTeX editor. Real-time
              co-authoring, instant PDF preview, and Git integration &mdash; all
              without a subscription.
            </p>

            <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              {isLoggedIn ? (
                <Link
                  href="/projects"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "px-8 text-base shadow-lg shadow-orange-500/20 landing-cta-btn"
                  )}
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "px-8 text-base shadow-lg shadow-orange-500/20 landing-cta-btn"
                    )}
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <Link
                    href="/login"
                    className={cn(
                      buttonVariants({ size: "lg", variant: "outline" }),
                      "px-8 text-base"
                    )}
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>

            {/* Trust indicators */}
            <div className="mt-16 flex flex-col items-center gap-4">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/70">
                Trusted by researchers at 50+ institutions
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
                {trustInstitutions.map((name) => (
                  <span
                    key={name}
                    className="text-sm font-semibold text-muted-foreground/50 transition-colors hover:text-muted-foreground/80"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats ───────────────────────────────────────── */}
        <section className="relative border-t border-b bg-muted/20 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
              {stats.map(({ value, label, icon: Icon }) => (
                <div key={label} className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10">
                    <Icon className="h-6 w-6 text-orange-500" />
                  </div>
                  <p className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                    {value}
                  </p>
                  <p className="mt-1 text-sm font-medium text-muted-foreground sm:text-base">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ───────────────────────────────────── */}
        <section id="features" className="relative py-24 sm:py-32">
          {/* subtle decorative circle */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 right-0 -z-10 h-72 w-72 translate-x-1/3 -translate-y-1/3 rounded-full bg-orange-500/5 blur-3xl"
          />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-16 text-center">
              <Badge variant="secondary" className="mb-4 text-xs font-medium uppercase tracking-widest">
                Features
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Everything you need to write
                <br />
                <span className="landing-gradient-text">great papers</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                Powerful tools built for researchers, students, and teams.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <Card
                  key={title}
                  className="group relative overflow-hidden border transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/5 hover:-translate-y-1 hover:border-orange-500/30 landing-feature-card"
                >
                  {/* gradient border glow on hover */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100 landing-card-glow"
                  />
                  <CardHeader className="relative pb-3">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 transition-colors duration-300 group-hover:bg-orange-500/20">
                      <Icon className="h-6 w-6 text-orange-500" />
                    </div>
                    <CardTitle className="text-lg font-semibold">
                      {title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <CardDescription className="text-sm leading-relaxed">
                      {description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ───────────────────────────────── */}
        <section
          id="how-it-works"
          className="relative border-t bg-muted/20 py-24 sm:py-32"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-16 text-center">
              <Badge variant="secondary" className="mb-4 text-xs font-medium uppercase tracking-widest">
                How It Works
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                From blank page to
                <br />
                <span className="landing-gradient-text">published paper</span>
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                Three simple steps to streamline your academic workflow.
              </p>
            </div>

            <div className="relative grid gap-8 lg:grid-cols-3 lg:gap-12">
              {/* connecting line behind cards (desktop) */}
              <div
                aria-hidden
                className="pointer-events-none absolute top-24 left-[16.67%] right-[16.67%] hidden h-0.5 bg-gradient-to-r from-orange-500/20 via-orange-500/40 to-orange-500/20 lg:block"
              />

              {steps.map(({ step, title, description, icon: Icon }, idx) => (
                <div key={step} className="relative text-center">
                  {/* step number circle */}
                  <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-orange-500/10" />
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-background border-2 border-orange-500/30 shadow-lg shadow-orange-500/10">
                      <Icon className="h-6 w-6 text-orange-500" />
                    </div>
                  </div>

                  {/* arrow indicator between steps (mobile) */}
                  {idx < steps.length - 1 && (
                    <div
                      aria-hidden
                      className="mx-auto my-2 flex h-8 w-8 items-center justify-center text-orange-500/40 lg:hidden"
                    >
                      <ChevronRight className="h-5 w-5 rotate-90" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-orange-500">
                      Step {step}
                    </span>
                    <h3 className="text-xl font-bold">{title}</h3>
                    <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Comparison ──────────────────────────────────── */}
        <section id="comparison" className="relative py-24 sm:py-32">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-16 text-center">
              <Badge variant="secondary" className="mb-4 text-xs font-medium uppercase tracking-widest">
                Comparison
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                How PaperForge
                <br />
                <span className="landing-gradient-text">compares</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
                Pro-tier features, zero cost. See how we stack up.
              </p>
            </div>
            <div className="overflow-x-auto rounded-2xl border bg-background shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2">
                    <TableHead className="w-[40%] text-sm font-semibold">
                      Feature
                    </TableHead>
                    <TableHead className="text-center text-sm font-bold text-orange-500">
                      <div className="flex flex-col items-center gap-1">
                        <Flame className="h-4 w-4" />
                        PaperForge
                      </div>
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

        {/* ── Testimonials ────────────────────────────────── */}
        <section
          id="testimonials"
          className="relative border-t bg-muted/20 py-24 sm:py-32"
        >
          {/* decorative element */}
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 -z-10 h-80 w-80 -translate-x-1/2 translate-y-1/4 rounded-full bg-orange-500/5 blur-3xl"
          />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-16 text-center">
              <Badge variant="secondary" className="mb-4 text-xs font-medium uppercase tracking-widest">
                Testimonials
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Loved by
                <span className="landing-gradient-text"> researchers</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
                See what academics and teams are saying about PaperForge.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {testimonials.map(
                ({ quote, name, role, institution, stars }) => (
                  <Card
                    key={name}
                    className="relative overflow-hidden border transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
                  >
                    <CardHeader className="pb-4">
                      <Quote className="mb-2 h-8 w-8 text-orange-500/20" />
                      <StarRating count={stars} />
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <p className="text-sm leading-relaxed text-muted-foreground italic">
                        &ldquo;{quote}&rdquo;
                      </p>
                      <div className="border-t pt-4">
                        <p className="text-sm font-semibold">{name}</p>
                        <p className="text-xs text-muted-foreground">
                          {role}
                        </p>
                        <p className="text-xs font-medium text-orange-500">
                          {institution}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              )}
            </div>
          </div>
        </section>

        {/* ── CTA Banner ──────────────────────────────────── */}
        <section className="relative overflow-hidden py-24 sm:py-32">
          {/* animated gradient background (mirrored from hero) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 landing-gradient-bg"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 landing-dot-pattern opacity-30"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/10 blur-3xl"
          />

          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Ready to forge your
              <br />
              <span className="landing-gradient-text">next paper?</span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Free forever. No credit card required. Start writing in under a
              minute.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              {isLoggedIn ? (
                <Link
                  href="/projects"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "px-10 text-base shadow-lg shadow-orange-500/20 landing-cta-btn"
                  )}
                >
                  Open Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className={cn(
                      buttonVariants({ size: "lg" }),
                      "px-10 text-base shadow-lg shadow-orange-500/20 landing-cta-btn"
                    )}
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <Link
                    href="https://github.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ size: "lg", variant: "outline" }),
                      "px-10 text-base"
                    )}
                  >
                    <Github className="mr-2 h-4 w-4" />
                    Star on GitHub
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="border-t bg-muted/30 pt-16 pb-8 text-sm text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* top grid */}
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
            {/* brand column */}
            <div className="lg:col-span-2">
              <Link
                href="/"
                className="mb-4 flex items-center gap-2 font-bold text-lg text-foreground"
              >
                <Flame className="h-5 w-5 text-orange-500" />
                PaperForge
              </Link>
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                A modern, open-source collaborative LaTeX editor built for
                researchers who care about their workflow.
              </p>
              {/* social icons */}
              <div className="mt-6 flex gap-3">
                <Link
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:border-orange-500/30 hover:text-foreground"
                >
                  <Github className="h-4 w-4" />
                </Link>
                <Link
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:border-orange-500/30 hover:text-foreground"
                >
                  <Twitter className="h-4 w-4" />
                </Link>
                <Link
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:border-orange-500/30 hover:text-foreground"
                >
                  <Linkedin className="h-4 w-4" />
                </Link>
                <Link
                  href="mailto:hello@paperforge.dev"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors hover:border-orange-500/30 hover:text-foreground"
                >
                  <Mail className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* link columns */}
            {Object.entries(footerLinks).map(([heading, links]) => (
              <div key={heading}>
                <h4 className="mb-4 text-sm font-semibold text-foreground">
                  {heading}
                </h4>
                <ul className="space-y-2.5">
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* bottom bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} concrete-sangminlee. MIT
              License.
            </p>
            <p className="text-xs text-muted-foreground">
              Built with Next.js, TailwindCSS &amp; LaTeX
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
