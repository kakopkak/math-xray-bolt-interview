"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";

import { AuthSessionProvider } from "@/components/auth/session-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FeedbackBanner } from "@/components/ui/feedback-banner";

export default function LoginPage() {
  return (
    <AuthSessionProvider>
      <LoginPageContent />
    </AuthSessionProvider>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/teacher");
    }
  }, [router, status]);

  const teacherLabel = session?.user?.name?.trim() || session?.user?.email?.trim() || "õpetaja";
  const teacherEmail = session?.user?.email?.trim();

  const handleGoogleSignIn = () => {
    setIsSigningIn(true);
    void signIn("google", { callbackUrl: "/teacher" });
  };

  return (
    <div className="relative isolate overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(5,150,105,0.14),transparent_28%)]" />
      <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="flex flex-col justify-between gap-10 px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
          <div className="space-y-6">
            <span className="inline-flex w-fit rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
              Õpetaja töölaud
            </span>
            <div className="space-y-4">
              <h1
                className="max-w-xl text-4xl font-semibold tracking-tight text-[var(--color-text)] sm:text-5xl"
                style={{ fontFamily: "var(--font-playfair-display)" }}
              >
                Logi sisse Google&apos;iga ja ava oma klassi analüütika.
              </h1>
              <p className="max-w-2xl text-base text-[var(--color-text-muted)] sm:text-lg">
                Matemaatika Röntgen koondab ülesanded, klastrib väärarusaamu ja aitab
                valida järgmise sihitud sekkumise ilma lisavaadeteta.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <FeatureTile
              eyebrow="Rütm"
              title="Kiire sisselogimine"
              description="Üks Google konto avab õpetaja tööruumi ja admini kutsete vaate."
            />
            <FeatureTile
              eyebrow="Nägemine"
              title="Selged mustrid"
              description="Klasterdatud vead ja tulemused jäävad samasse õpetaja voogu."
            />
            <FeatureTile
              eyebrow="Juhtimine"
              title="Turvaline väljapääs"
              description="Seanss on nähtav ning väljalogimine on alati ühe nupu kaugusel."
            />
          </div>
        </section>

        <Card
          variant="raised"
          className="flex min-h-full flex-col justify-center gap-6 rounded-none border-x-0 border-y-0 p-6 sm:p-8 lg:border-l lg:border-r-0"
        >
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
              Sisselogimine
            </p>
            <h2 className="text-2xl font-semibold text-[var(--color-text)]">
              Jätka oma õpetaja kontoga
            </h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              Kasutame Google sisselogimist, et seostada õpetaja identiteet ja õigused sinu
              olemasoleva Auth.js seansiga.
            </p>
          </div>

          {status === "authenticated" ? (
            <FeedbackBanner
              tone="success"
              title="Seanss on aktiivne"
              message={
                teacherEmail
                  ? `${teacherLabel} (${teacherEmail}) suunatakse õpetaja vaatesse.`
                  : `${teacherLabel} suunatakse õpetaja vaatesse.`
              }
            />
          ) : null}

          <div className="space-y-3">
            <Button
              className="h-12 w-full justify-center text-base"
              loading={isSigningIn}
              disabled={status === "loading"}
              onClick={handleGoogleSignIn}
            >
              <GoogleMark />
              Jätka Google&apos;iga
            </Button>
            <p className="text-center text-sm text-[var(--color-text-muted)]">
              Jätkates nõustud sellega, et sisselogimise järel kasutatakse sinu õpetaja seanssi
              töölaudade ja kutsete haldamiseks.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-sm font-medium text-[var(--color-text)]">Milleks see vaade?</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-muted)]">
              <li>Google OAuth käivitub läbi `signIn(&quot;google&quot;)`.</li>
              <li>Õpetaja seanss loetakse kliendist `useSession()` kaudu.</li>
              <li>Kui seanss juba eksisteerib, suuname kasutaja edasi teele `/teacher`.</li>
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--color-text-muted)]">
            <Link href="/" className="font-medium text-[var(--color-text)] underline-offset-4 hover:underline">
              Tagasi avalehele
            </Link>
            <Link
              href="/admin/invites"
              className="font-medium text-[var(--color-brand)] underline-offset-4 hover:underline"
            >
              Ava admini kutsete vaade
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function FeatureTile({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
        {eyebrow}
      </p>
      <p className="mt-3 text-lg font-semibold text-[var(--color-text)]">{title}</p>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">{description}</p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path
        d="M21.82 12.23c0-.68-.06-1.18-.19-1.71H12v3.22h5.65c-.11.8-.72 2.01-2.08 2.82l-.02.11 3.02 2.3.21.02c1.92-1.74 3.02-4.3 3.02-7.54Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.76 0 5.08-.89 6.78-2.41l-3.23-2.43c-.86.59-2.01 1.01-3.55 1.01-2.71 0-5.01-1.74-5.82-4.14l-.11.01-3.15 2.39-.04.1A10.24 10.24 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.18 14.03A6.18 6.18 0 0 1 5.86 12c0-.71.12-1.39.31-2.03l-.01-.14-3.19-2.43-.1.04A9.9 9.9 0 0 0 2 12c0 1.59.39 3.09 1.07 4.44l3.11-2.41Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.83c1.94 0 3.24.82 3.98 1.51l2.91-2.79C17.07 2.96 14.76 2 12 2a10.24 10.24 0 0 0-9.13 5.56l3.3 2.53C6.98 7.59 9.29 5.83 12 5.83Z"
        fill="#EA4335"
      />
    </svg>
  );
}
