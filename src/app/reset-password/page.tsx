"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import { useBrandState } from "../../components/brand-provider";
import Footer from "../../components/footer";
import { useLanguage } from "../../components/language-provider";
import SiteHeader from "../../components/site-header";
import { clearLegacyAuthStorage } from "../../lib/auth";
import { byLanguage, getLocalizedText } from "../../lib/i18n";

const getApiMessage = (payload: unknown, fallback: string) => {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  const parts = Object.entries(payload as Record<string, unknown>)
    .map(([field, value]) => {
      if (typeof value === "string" && value.trim()) {
        return `${field}: ${value}`;
      }

      if (Array.isArray(value)) {
        const firstText = value.find(
          (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
        );
        if (firstText) {
          return `${field}: ${firstText}`;
        }
      }

      return null;
    })
    .filter((value): value is string => Boolean(value));

  if (parts.length > 0) {
    return parts.join(" | ");
  }

  return fallback;
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const { brand } = useBrandState();
  const brandName = getLocalizedText(brand?.brand_name, language, "Lilien");
  const brandLogoSrc = brand?.logo_url?.trim() || brand?.logo?.trim() || "/images/full.png";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = useMemo(
    () => (searchParams.get("email") ?? "").trim().toLowerCase(),
    [searchParams]
  );
  const token = useMemo(() => (searchParams.get("token") ?? "").trim(), [searchParams]);
  const hasResetPayload = Boolean(email && token);
  const submitDisabled = !newPassword.trim() || !confirmPassword.trim() || submitting;

  const text = {
    resetPassword: byLanguage(
      { EN: "Reset password", KA: "პაროლის აღდგენა" },
      language
    ),
    newPassword: byLanguage({ EN: "New password", KA: "ახალი პაროლი" }, language),
    confirmPassword: byLanguage(
      { EN: "Confirm new password", KA: "გაიმეორე ახალი პაროლი" },
      language
    ),
    newPasswordPlaceholder: byLanguage(
      { EN: "Enter new password", KA: "შეიყვანე ახალი პაროლი" },
      language
    ),
    confirmPasswordPlaceholder: byLanguage(
      { EN: "Repeat new password", KA: "გაიმეორე ახალი პაროლი" },
      language
    ),
    changePassword: byLanguage({ EN: "Change password", KA: "პაროლის შეცვლა" }, language),
    changingPassword: byLanguage(
      { EN: "Changing...", KA: "იცვლება..." },
      language
    ),
    passwordsDoNotMatch: byLanguage(
      { EN: "Passwords do not match.", KA: "პაროლები არ ემთხვევა." },
      language
    ),
    invalidResetLink: byLanguage(
      {
        EN: "Reset link is invalid or incomplete.",
        KA: "აღდგენის ბმული არასწორია ან არასრულია.",
      },
      language
    ),
    resetFailed: byLanguage(
      { EN: "Failed to reset password.", KA: "პაროლის შეცვლა ვერ მოხერხდა." },
      language
    ),
    resetFailedRetry: byLanguage(
      {
        EN: "Failed to reset password. Please try again.",
        KA: "პაროლის შეცვლა ვერ მოხერხდა. სცადე თავიდან.",
      },
      language
    ),
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasResetPayload) {
      setError(text.invalidResetLink);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(text.passwordsDoNotMatch);
      return;
    }

    setError(null);

    try {
      setSubmitting(true);
      const response = await fetch("/api/auth/password/reset/confirm/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          token,
          new_password: newPassword,
          new_password2: confirmPassword,
        }),
        cache: "no-store",
      });

      const payload = await response.json().catch(() => null);
      if (response.status !== 200) {
        setError(getApiMessage(payload, text.resetFailed));
        return;
      }

      try {
        await fetch("/api/auth/logout/", {
          method: "POST",
          cache: "no-store",
        });
      } catch {
        // Best effort logout before redirect.
      }

      clearLegacyAuthStorage();
      router.replace("/");
    } catch {
      setError(text.resetFailedRetry);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-slate-900">
      <SiteHeader showFullLogo />
      <main className="mx-auto flex min-h-[100vh] w-full max-w-4xl items-center justify-center px-4 pt-24 sm:px-6 md:pt-0">
        <section className="w-full max-w-md rounded-3xl border border-black/10 bg-white/95 p-6 shadow-[0_32px_60px_-40px_rgba(0,0,0,0.6)] backdrop-blur sm:p-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <Image
              src={brandLogoSrc}
              alt={`${brandName} logo`}
              width={320}
              height={128}
              sizes="320px"
              className="h-20 w-auto"
            />
            <h1 className="text-sm uppercase tracking-[0.3em] text-slate-500">{text.resetPassword}</h1>
          </div>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-[11px] uppercase tracking-[0.25em] text-slate-500">
              {text.newPassword}
              <input
                type="password"
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                placeholder={text.newPasswordPlaceholder}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black/40"
              />
            </label>
            <label className="block text-[11px] uppercase tracking-[0.25em] text-slate-500">
              {text.confirmPassword}
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                placeholder={text.confirmPasswordPlaceholder}
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black/40"
              />
            </label>
            <button
              type="submit"
              disabled={submitDisabled}
              className="w-full rounded-2xl bg-black px-4 py-3 text-xs uppercase tracking-[0.3em] text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? text.changingPassword : text.changePassword}
            </button>
            {!hasResetPayload ? (
              <div className="text-[11px] uppercase tracking-[0.22em] text-red-500">
                {text.invalidResetLink}
              </div>
            ) : null}
            {error ? (
              <div className="text-[11px] uppercase tracking-[0.22em] text-red-500">{error}</div>
            ) : null}
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
}
