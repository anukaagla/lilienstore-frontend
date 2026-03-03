"use client";

import { useState, type FormEvent } from "react";
import { byLanguage, getLocalizedText } from "../lib/i18n";
import Footer from "./footer";
import SiteHeader from "./site-header";
import { useBrandState } from "./brand-provider";
import { useLanguage } from "./language-provider";
import { ContactPageSkeleton } from "./page-skeletons";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sanitizeInput = (value: string, maxLength: number) =>
  value.replace(/\s+/g, " ").trim().slice(0, maxLength);

export default function ContactUs() {
  const { language } = useLanguage();
  const { brand, isLoading: brandLoading } = useBrandState();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const brandName = getLocalizedText(brand?.brand_name, language, "Lilienstore");

  const toSocialUrl = (value: string, platform: "instagram" | "facebook" | "tiktok") => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const cleaned = trimmed.replace(/^@/, "");
    if (platform === "instagram") return `https://www.instagram.com/${cleaned}`;
    if (platform === "facebook") return `https://www.facebook.com/${cleaned}`;
    return `https://www.tiktok.com/@${cleaned}`;
  };

  const addressText = getLocalizedText(
    brand?.address,
    language,
    byLanguage(
      {
        EN: "29 Irakli Abashidze Street, Tbilisi, Georgia",
        KA: "ირაკლი აბაშიძის ქუჩა 29, თბილისი, საქართველო",
      },
      language
    )
  );

  const workingHoursText = getLocalizedText(
    brand?.working_hours,
    language,
    byLanguage({ EN: "12:00-20:00", KA: "12:00-20:00" }, language)
  );

  const phoneValue = brand?.phone_number?.trim() || "";
  const emailValue = brand?.email?.trim() || "lilienspprt@gmail.com";
  const instagramValue = toSocialUrl(
    brand?.instagram_url?.trim() || "lilienstore_",
    "instagram"
  );
  const facebookValue = toSocialUrl(brand?.facebook_url?.trim() || "", "facebook");
  const tiktokValue = toSocialUrl(brand?.tiktok_url?.trim() || "", "tiktok");

  const text = {
    intro: byLanguage(
      {
        EN: "If you have any issues with your order or simply have a question about our products or services, feel free to contact us - we'll be happy to help.",
        KA: "თუ შეკვეთასთან დაკავშირებული პრობლემა გაქვთ ან ჩვენს პროდუქტებსა თუ სერვისებზე კითხვა გაქვთ, დაგვიკავშირდით - სიამოვნებით დაგეხმარებით.",
      },
      language
    ),
    heading: byLanguage(
      {
        EN: `Contact ${brandName} Store`,
        KA: `${brandName} მაღაზიასთან დაკავშირება`,
      },
      language
    ),
    yourName: byLanguage({ EN: "Your name", KA: "თქვენი სახელი" }, language),
    namePlaceholder: byLanguage({ EN: "e.g. Nino", KA: "მაგ. ნინო" }, language),
    yourMail: byLanguage({ EN: "Your mail", KA: "თქვენი ელ.ფოსტა" }, language),
    emailPlaceholder: byLanguage(
      { EN: "e.g. nino@example.com", KA: "მაგ. nino@example.com" },
      language
    ),
    howCanHelp: byLanguage(
      { EN: "How can we help?", KA: "როგორ შეგვიძლია დაგეხმაროთ?" },
      language
    ),
    messagePlaceholder: byLanguage(
      {
        EN: "e.g. I need help with order #1024",
        KA: "მაგ. დახმარება მჭირდება შეკვეთაზე #1024",
      },
      language
    ),
    hours: byLanguage({ EN: "Working hours", KA: "სამუშაო საათები" }, language),
    phone: byLanguage({ EN: "Phone", KA: "ტელეფონი" }, language),
    email: byLanguage({ EN: "Email", KA: "ელ.ფოსტა" }, language),
    instagram: byLanguage({ EN: "Instagram", KA: "ინსტაგრამი" }, language),
    facebook: byLanguage({ EN: "Facebook", KA: "ფეისბუქი" }, language),
    tiktok: byLanguage({ EN: "TikTok", KA: "ტიკტოკი" }, language),
    submit: byLanguage({ EN: "Submit", KA: "გაგზავნა" }, language),
    sending: byLanguage({ EN: "Sending...", KA: "იგზავნება..." }, language),
    submitSuccess: byLanguage(
      { EN: "Message sent successfully.", KA: "შეტყობინება წარმატებით გაიგზავნა." },
      language
    ),
    submitFailed: byLanguage(
      { EN: "Failed to send message.", KA: "შეტყობინების გაგზავნა ვერ მოხერხდა." },
      language
    ),
    invalidEmail: byLanguage(
      { EN: "Please provide a valid email.", KA: "გთხოვ მიუთითე ვალიდური ელ.ფოსტა." },
      language
    ),
    invalidInput: byLanguage(
      { EN: "Please review your input fields.", KA: "გთხოვ გადაამოწმე შეყვანილი მონაცემები." },
      language
    ),
    missingApiBaseUrl: byLanguage(
      { EN: "Missing API base URL.", KA: "API-ის საბაზისო URL ვერ მოიძებნა." },
      language
    ),
  };

  if (brandLoading && !brand) {
    return <ContactPageSkeleton />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    const formElement = event.currentTarget;
    if (!formElement.checkValidity()) {
      formElement.reportValidity();
      return;
    }

    const payload = {
      name: sanitizeInput(name, 120),
      email: sanitizeInput(email, 254).toLowerCase(),
      message: sanitizeInput(message, 2000),
    };

    if (!payload.name || !payload.email || !payload.message) {
      setSubmitError(text.invalidInput);
      return;
    }

    if (!EMAIL_PATTERN.test(payload.email)) {
      setSubmitError(text.invalidEmail);
      return;
    }

    if (!API_BASE_URL) {
      setSubmitError(text.missingApiBaseUrl);
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/api/contact/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setSubmitError(text.submitFailed);
        return;
      }

      setSubmitSuccess(text.submitSuccess);
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      setSubmitError(text.submitFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white text-slate-900">
      <SiteHeader showFullLogo />
      <main className="mx-auto flex-1 w-full max-w-6xl px-5 pb-24 pt-28">
        <div className="h-px w-full bg-black" />
        <section className="mt-16 grid gap-16 md:grid-cols-2 md:items-start">
          <div className="space-y-10">
            <p className="max-w-md text-center text-sm font-semibold uppercase leading-relaxed tracking-[0.12em] text-slate-700 md:text-left">
              {text.intro}
            </p>
            <div className="space-y-4 text-sm text-slate-500">
              <div className="flex items-start gap-3">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="mt-0.5 h-4 w-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 3" />
                </svg>
                <span>
                  {text.hours}: {workingHoursText}
                </span>
              </div>

              {phoneValue ? (
                <a
                  href={`tel:${phoneValue}`}
                  className="flex items-start gap-3 transition hover:text-slate-700"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="mt-0.5 h-4 w-4 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6.5 4.5h3l1.2 3-1.8 1.8a15 15 0 0 0 5.8 5.8l1.8-1.8 3 1.2v3c0 1-1 2-2.2 2C10.4 19.5 4.5 13.6 4.5 6.7c0-1.2 1-2.2 2-2.2Z" />
                  </svg>
                  <span>
                    {text.phone}: {phoneValue}
                  </span>
                </a>
              ) : null}

              <div className="flex items-start gap-3">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="mt-0.5 h-4 w-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                <span>{addressText}</span>
              </div>

              <div className="flex items-start gap-3">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="mt-0.5 h-4 w-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
                  <path d="m22 8-10 6L2 8" />
                </svg>
                <a href={`mailto:${emailValue}`} className="transition hover:text-slate-700">
                  {text.email}: {emailValue}
                </a>
              </div>

              <a
                href={instagramValue}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 transition hover:text-slate-700"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="mt-0.5 h-4 w-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <rect x="4" y="4" width="16" height="16" rx="4" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" />
                </svg>
                <span>{text.instagram}</span>
              </a>

              {facebookValue ? (
                <a
                  href={facebookValue}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 transition hover:text-slate-700"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="mt-0.5 h-4 w-4 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 9h3V5h-3a4 4 0 0 0-4 4v3H7v4h3v4h4v-4h3l1-4h-4V9a1 1 0 0 1 1-1Z" />
                  </svg>
                  <span>{text.facebook}</span>
                </a>
              ) : null}

              {tiktokValue ? (
                <a
                  href={tiktokValue}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 transition hover:text-slate-700"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="mt-0.5 h-4 w-4 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 5v8.5a3.5 3.5 0 1 1-3.5-3.5" />
                    <path d="M14 5c.6 1.8 2 3 4 3" />
                  </svg>
                  <span>{text.tiktok}</span>
                </a>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-center gap-8 md:items-start">
            <h2 className="text-center text-2xl font-bold uppercase tracking-[0.22em] text-[#A79974] md:text-left">
              {text.heading}
            </h2>
            <form className="w-full max-w-sm space-y-8" onSubmit={handleSubmit}>
              <label className="block">
                <span className="sr-only">{text.yourName}</span>
                <input
                  type="text"
                  required
                  placeholder={text.namePlaceholder}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-3 w-full border-b border-[#A79974] bg-transparent pb-1 text-sm text-slate-700 placeholder:text-[11px] placeholder:uppercase placeholder:tracking-[0.28em] placeholder:text-slate-400 focus:border-[#A79974] focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="sr-only">{text.yourMail}</span>
                <input
                  type="email"
                  required
                  placeholder={text.emailPlaceholder}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-3 w-full border-b border-[#A79974] bg-transparent pb-1 text-sm text-slate-700 placeholder:text-[11px] placeholder:uppercase placeholder:tracking-[0.28em] placeholder:text-slate-400 focus:border-[#A79974] focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="sr-only">{text.howCanHelp}</span>
                <textarea
                  required
                  rows={1}
                  placeholder={text.messagePlaceholder}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="mt-3 w-full resize-none border-b border-[#A79974] bg-transparent pb-1 text-sm text-slate-700 placeholder:text-[11px] placeholder:uppercase placeholder:tracking-[0.28em] placeholder:text-slate-400 focus:border-[#A79974] focus:outline-none"
                />
              </label>

              {submitError ? (
                <p className="text-center text-[11px] uppercase tracking-[0.16em] text-red-500">
                  {submitError}
                </p>
              ) : null}
              {submitSuccess ? (
                <p className="text-center text-[11px] uppercase tracking-[0.16em] text-green-700">
                  {submitSuccess}
                </p>
              ) : null}

              <div className="flex w-full justify-center">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-3 bg-black px-10 py-3 text-xs uppercase tracking-[0.3em] text-white shadow-[0_12px_20px_-12px_rgba(0,0,0,0.7)] transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {submitting ? text.sending : text.submit}
                  <span aria-hidden="true" className="text-base">
                    &rarr;
                  </span>
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>
      <Footer variant="light" />
    </div>
  );
}
