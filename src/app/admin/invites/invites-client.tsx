"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";

import TeacherUserMenu from "@/components/teacher/user-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { Input } from "@/components/ui/input";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { SectionHeader } from "@/components/ui/section-header";

const INVITES_API_PATH = "/api/admin/invites";

type InviteRecord = {
  _id: string;
  email: string;
  organizationKey: string;
  invitedBy: string;
  createdAt: string;
  acceptedAt: string | null;
};

type Notice =
  | {
      tone: "success" | "warning" | "error";
      message: string;
    }
  | null;

export default function InvitesClient() {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingCount = useMemo(
    () => invites.filter((invite) => !invite.acceptedAt).length,
    [invites]
  );
  const acceptedCount = invites.length - pendingCount;
  const teacherLabel = session?.user?.name?.trim() || session?.user?.email?.trim() || "Admin";

  async function loadInvites() {
    setIsLoading(true);
    try {
      const response = await fetch(INVITES_API_PATH, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as InviteRecord[] | { error?: string } | null;

      if (!response.ok) {
        throw new Error(
          payload && !Array.isArray(payload) && payload.error
            ? payload.error
            : "Kutsete laadimine ebaõnnestus."
        );
      }

      setInvites(Array.isArray(payload) ? payload : []);
      setNotice(null);
    } catch (error) {
      setInvites([]);
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Kutsete laadimine ebaõnnestus.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      void loadInvites();
      return;
    }

    if (status === "unauthenticated") {
      setIsLoading(false);
    }
  }, [status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setNotice({ tone: "warning", message: "Sisesta enne kutse loomist e-posti aadress." });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(INVITES_API_PATH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const payload = (await response.json().catch(() => null)) as InviteRecord | { error?: string } | null;

      if (!response.ok) {
        throw new Error(
          payload && !Array.isArray(payload) && "error" in payload && payload.error
            ? payload.error
            : "Kutse loomine ebaõnnestus."
        );
      }

      setEmail("");
      setNotice({ tone: "success", message: `Kutse aadressile ${normalizedEmail} on salvestatud.` });
      await loadInvites();
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Kutse loomine ebaõnnestus.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Admini kutsed"
        description={`Halda õpetajate sisselogimiskutseid. Aktiivne seanss: ${teacherLabel}.`}
        actions={<TeacherUserMenu />}
      />

      {notice ? <FeedbackBanner tone={notice.tone} message={notice.message} /> : null}

      {status === "unauthenticated" ? (
        <FeedbackBanner
          tone="warning"
          title="Google sisselogimine on vajalik"
          message="Admini kutsete vaade eeldab aktiivset õpetaja seanssi."
          action={
            <Button onClick={() => void signIn("google", { callbackUrl: "/admin/invites" })}>
              Logi sisse
            </Button>
          }
        />
      ) : null}

      {status !== "unauthenticated" ? (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(16rem,0.9fr)]">
            <Card variant="raised" className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Uus õpetaja
                </p>
                <h2 className="text-2xl font-semibold text-[var(--color-text)]">
                  Lisa Google kontole kutse
                </h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Kutsega seotud õpetaja saab sisse logida ainult siis, kui tema e-post on siin nimekirjas.
                </p>
              </div>

              <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="opetaja@kool.ee"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <Button type="submit" loading={isSubmitting}>
                  Loo kutse
                </Button>
              </form>
            </Card>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <MetricCard label="Ootel" value={String(pendingCount)} detail="Kutsed, mida pole veel vastu võetud." />
              <MetricCard label="Aktiveeritud" value={String(acceptedCount)} detail="Kutsed, mis on juba kontoga seotud." />
              <MetricCard label="Kokku" value={String(invites.length)} detail="Selle kooli kutsete koguarv." />
            </div>
          </div>

          <Card className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--color-text)]">Kutseajalugu</h2>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  Nimekiri on piiratud aktiivse admini organisatsiooniga.
                </p>
              </div>
              <Button variant="secondary" loading={isLoading} onClick={() => void loadInvites()}>
                Värskenda
              </Button>
            </div>

            <ResponsiveTable
              ariaLabel="Admini kutsed"
              rows={invites}
              getRowId={(invite) => invite._id}
              emptyState={
                isLoading ? (
                  <EmptyState title="Kutseid laetakse" description="Ootame serveri vastust." />
                ) : (
                  <EmptyState
                    title="Kutseid veel ei ole"
                    description="Loo esimene kutse ja see ilmub siia nimekirja."
                  />
                )
              }
              columns={[
                {
                  key: "email",
                  header: "E-post",
                  cell: (invite) => <span className="font-medium text-[var(--color-text)]">{invite.email}</span>,
                },
                {
                  key: "status",
                  header: "Staatus",
                  cell: (invite) => (
                    <Badge variant={invite.acceptedAt ? "success" : "neutral"}>
                      {invite.acceptedAt ? "Aktiveeritud" : "Ootel"}
                    </Badge>
                  ),
                },
                {
                  key: "organization",
                  header: "Organisatsioon",
                  cell: (invite) => invite.organizationKey,
                },
                {
                  key: "invitedBy",
                  header: "Kutsuja",
                  cell: (invite) => invite.invitedBy,
                },
                {
                  key: "createdAt",
                  header: "Loodud",
                  cell: (invite) => formatDateTime(invite.createdAt),
                },
                {
                  key: "acceptedAt",
                  header: "Vastu võetud",
                  cell: (invite) => formatDateTime(invite.acceptedAt),
                },
              ]}
            />
          </Card>
        </>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="flex flex-col justify-between gap-4">
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          {label}
        </p>
        <p className="text-4xl font-semibold tracking-tight text-[var(--color-text)]">{value}</p>
      </div>
      <p className="text-sm text-[var(--color-text-muted)]">{detail}</p>
    </Card>
  );
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("et-EE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
