"use client";

import { useEffect, useState } from "react";
import { type Language } from "../lib/i18n";
import {
  FOOTER_NEWSLETTER_HIDE_EVENT,
  FOOTER_NEWSLETTER_HIDDEN_SESSION_KEY,
  NEWSLETTER_DISMISSED_SESSION_KEY,
  getFooterNewsletterStripText,
  getNewsletterText,
  isValidNewsletterEmail,
} from "../lib/newsletter";

const NEWSLETTER_SUBSCRIBE_PATH = "/api/proxy/newsletter/subscribe/";

type NewsletterSubscribeResult =
  | { ok: true }
  | { ok: false; message: string };

const getNewsletterApiMessage = (payload: unknown, fallback: string) => {
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
          (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
        );
        if (firstText) {
          return `${field}: ${firstText}`;
        }
      }

      return null;
    })
    .filter((value): value is string => Boolean(value));

  return parts[0] ?? fallback;
};

const subscribeToNewsletter = async (
  email: string,
  fallbackMessage: string,
): Promise<NewsletterSubscribeResult> => {
  try {
    const response = await fetch(NEWSLETTER_SUBSCRIBE_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ email }),
    });

    if (response.ok) {
      return { ok: true };
    }

    const payload = await response.json().catch(() => null);
    return {
      ok: false,
      message: getNewsletterApiMessage(payload, fallbackMessage),
    };
  } catch {
    return { ok: false, message: fallbackMessage };
  }
};

type FooterNewsletterStripProps = {
  language: Language;
};

type FeedbackState = {
  type: "success" | "error";
  message: string;
} | null;

type NewsletterTextWithFailure = ReturnType<typeof getNewsletterText> & {
  failed?: string;
};

export default function FooterNewsletterStrip({
  language,
}: FooterNewsletterStripProps) {
  const footerSignupText = getFooterNewsletterStripText(language);
  const newsletterText = getNewsletterText(language) as NewsletterTextWithFailure;
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const showSuccessIndicator = feedback?.type === "success";
  const [hidden, setHidden] = useState(false);
  const [collapsing, setCollapsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const sessionHidden =
      window.sessionStorage.getItem(FOOTER_NEWSLETTER_HIDDEN_SESSION_KEY) === "true";
    setHidden(sessionHidden);

    const handleHide = () => {
      setCollapsing(true);
    };

    window.addEventListener(FOOTER_NEWSLETTER_HIDE_EVENT, handleHide);
    return () => {
      window.removeEventListener(FOOTER_NEWSLETTER_HIDE_EVENT, handleHide);
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim();

    if (!isValidNewsletterEmail(normalizedEmail)) {
      setFeedback({ type: "error", message: newsletterText.invalidEmail });
      return;
    }

    if (submitting) {
      return;
    }

    setFeedback(null);
    setSubmitting(true);

    try {
      const result = await subscribeToNewsletter(
        normalizedEmail,
        newsletterText.failed ?? newsletterText.invalidEmail,
      );
      if (result.ok) {
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(NEWSLETTER_DISMISSED_SESSION_KEY, "true");
        }
        setEmail("");
        setFeedback({ type: "success", message: newsletterText.success });
        return;
      }

      setFeedback({
        type: "error",
        message: result.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (hidden) {
    return null;
  }

  return (
    <section
      onTransitionEnd={(event) => {
        if (
          collapsing &&
          event.target === event.currentTarget &&
          event.propertyName === "max-height"
        ) {
          setHidden(true);
          setCollapsing(false);
        }
      }}
      className={`mx-auto mb-3 w-full max-w-[calc(100%-48px)] overflow-hidden px-4 transition-[max-height,opacity,padding,margin] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:mb-4 sm:max-w-[calc(100%-100px)] sm:px-6 ${
        collapsing
          ? "pointer-events-none max-h-0 opacity-0 pt-0 pb-0 mt-0 mb-0"
          : "max-h-48 opacity-100 pt-0 pb-0 mt-0 mb-0"
      }`}
    >
      <div
        className={`transition-[opacity,padding,margin] duration-500 ease-out sm:border-t sm:border-black/20 ${
          collapsing ? "opacity-0 pt-0 pb-0" : "opacity-100 pt-4 sm:pt-5"
        }`}
      >
        <form
          className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1.15fr)_auto_auto_minmax(0,1fr)] sm:items-center sm:gap-x-3 sm:gap-y-3 lg:flex lg:flex-row lg:items-center lg:gap-8"
          onSubmit={handleSubmit}
          noValidate
        >
          <p className="font-display text-[11px] font-semibold leading-[1.15] text-slate-900 sm:text-[0.98rem]">
            {footerSignupText.title}
          </p>
          <span aria-hidden="true" className="h-px w-[88%] bg-black sm:hidden" />
          <div className="flex items-center gap-4 sm:contents">
            <span aria-hidden="true" className="hidden h-11 w-px bg-black/20 lg:h-16 sm:block" />
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-w-[114px] items-center justify-center rounded-[0.35rem] bg-black px-5 py-2.5 text-[11px] font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 sm:min-w-[168px] sm:px-6 sm:py-3 sm:text-sm sm:uppercase sm:tracking-[0.16em]"
            >
              {footerSignupText.button}
            </button>
            <label className="relative block min-w-0 flex-1 sm:flex-none sm:min-w-0 sm:w-auto">
              <span className="sr-only">{footerSignupText.placeholder}</span>
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (feedback) {
                    setFeedback(null);
                  }
                }}
                placeholder={footerSignupText.placeholder}
                className="w-[170px] max-w-full border-b border-black/20 bg-transparent pb-2 pr-7 text-[11px] tracking-[0.04em] text-slate-700 placeholder:text-slate-500 focus:border-black focus:outline-none sm:w-full sm:pb-3 sm:text-sm sm:tracking-[0.16em]"
              />
              {showSuccessIndicator ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[#171412]"
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="h-[15px] w-[15px] sm:h-4 sm:w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                  </svg>
                </span>
              ) : null}
            </label>
          </div>
        </form>
        {feedback ? (
          <p
            className={`mt-2 text-[11px] sm:text-sm ${
              feedback.type === "success" ? "text-[#2e7d32]" : "text-[#9f3a32]"
            }`}
          >
            {feedback.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
