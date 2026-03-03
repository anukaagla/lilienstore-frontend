"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useBrandState } from "../../components/brand-provider";
import { useLanguage } from "../../components/language-provider";
import { RegisterPageSkeleton } from "../../components/page-skeletons";
import { byLanguage, getLocalizedText } from "../../lib/i18n";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RegisterForm = {
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
  phone_number: string;
};

const initialForm: RegisterForm = {
  email: "",
  password: "",
  password2: "",
  first_name: "",
  last_name: "",
  phone_number: "",
};

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

const buildApiUrl = (path: string) => {
  if (!API_BASE_URL) {
    return null;
  }

  try {
    return new URL(path, API_BASE_URL).toString();
  } catch {
    return null;
  }
};

export default function RegisterPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { brand, isLoading: brandLoading } = useBrandState();
  const brandName = getLocalizedText(brand?.brand_name, language, "Lilienstore");
  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [agreedToPolicies, setAgreedToPolicies] = useState(false);
  const [confirmedAdult, setConfirmedAdult] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationPassword, setVerificationPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [requestingCode, setRequestingCode] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);
  const [confirmingCode, setConfirmingCode] = useState(false);

  if (brandLoading && !brand) {
    return <RegisterPageSkeleton />;
  }

  const text = {
    passwordsDoNotMatch: byLanguage(
      { EN: "Passwords do not match.", KA: "პაროლები არ ემთხვევა." },
      language
    ),
    missingApiBaseUrl: byLanguage(
      { EN: "Missing API base URL.", KA: "API მისამართი მითითებული არ არის." },
      language
    ),
    registrationFailed: byLanguage(
      { EN: "Registration failed.", KA: "რეგისტრაცია ვერ შესრულდა." },
      language
    ),
    accountCreated: byLanguage({ EN: "Account created.", KA: "ანგარიში შეიქმნა." }, language),
    accountCreatedVerify: byLanguage(
      {
        EN: "Account created. Verify your email to activate it.",
        KA: "ანგარიში შეიქმნა. გასააქტიურებლად დაადასტურე ელ.ფოსტა.",
      },
      language
    ),
    registrationFailedRetry: byLanguage(
      {
        EN: "Registration failed. Please try again.",
        KA: "რეგისტრაცია ვერ შესრულდა. სცადე თავიდან.",
      },
      language
    ),
    goToShowroom: byLanguage({ EN: "Go to showroom", KA: "შოურუმზე გადასვლა" }, language),
    createAccount: byLanguage({ EN: "Create account", KA: "ანგარიშის შექმნა" }, language),
    name: byLanguage({ EN: "Name", KA: "სახელი" }, language),
    yourName: byLanguage({ EN: "e.g. Nino", KA: "მაგ. ნინო" }, language),
    lastName: byLanguage({ EN: "Lastname", KA: "გვარი" }, language),
    yourLastname: byLanguage({ EN: "e.g. Beridze", KA: "მაგ. ბერიძე" }, language),
    email: byLanguage({ EN: "Email", KA: "ელ.ფოსტა" }, language),
    emailPlaceholder: byLanguage(
      { EN: "e.g. nino@example.com", KA: "მაგ. nino@example.com" },
      language
    ),
    password: byLanguage({ EN: "Password", KA: "პაროლი" }, language),
    passwordPlaceholder: byLanguage(
      { EN: "Use 8+ characters", KA: "გამოიყენე 8+ სიმბოლო" },
      language
    ),
    confirmPassword: byLanguage({ EN: "Confirm password", KA: "გაიმეორე პაროლი" }, language),
    confirmPasswordPlaceholder: byLanguage(
      { EN: "Repeat your password", KA: "გაიმეორე შენი პაროლი" },
      language
    ),
    phoneOptional: byLanguage(
      { EN: "Phone number (optional)", KA: "ტელეფონის ნომერი (არასავალდებულო)" },
      language
    ),
    phonePlaceholder: byLanguage(
      { EN: "e.g. +995 555 12 34 56", KA: "მაგ. +995 555 12 34 56" },
      language
    ),
    confirmAdult: byLanguage(
      {
        EN: "I confirm that I am 18 years old or older.",
        KA: "ვადასტურებ, რომ ვარ 18 წლის ან მეტი.",
      },
      language
    ),
    acceptPolicies: byLanguage({ EN: "I accept", KA: "ვეთანხმები" }, language),
    privacyPolicy: byLanguage(
      { EN: "Privacy Policy", KA: "კონფიდენციალურობის პოლიტიკას" },
      language
    ),
    termsOfUse: byLanguage({ EN: "Terms of Use", KA: "მოხმარების წესებს" }, language),
    and: byLanguage({ EN: "and", KA: "და" }, language),
    creating: byLanguage({ EN: "Creating...", KA: "მიმდინარეობს შექმნა..." }, language),
    createAccountButton: byLanguage(
      { EN: "Create Account", KA: "ანგარიშის შექმნა" },
      language
    ),
    alreadyAccount: byLanguage(
      { EN: "Already have an account?", KA: "უკვე გაქვს ანგარიში?" },
      language
    ),
    signIn: byLanguage({ EN: "Sign In", KA: "შესვლა" }, language),
    verifyEmailTitle: byLanguage({ EN: "Verify Email", KA: "ელ.ფოსტის დადასტურება" }, language),
    verifyEmailDescription: byLanguage(
      {
        EN: "Enter the verification code sent to this email address.",
        KA: "შეიყვანე ამ ელ.ფოსტაზე გამოგზავნილი დადასტურების კოდი.",
      },
      language
    ),
    codeLabel: byLanguage({ EN: "Verification code", KA: "დადასტურების კოდი" }, language),
    codePlaceholder: byLanguage({ EN: "123456", KA: "123456" }, language),
    back: byLanguage({ EN: "Back", KA: "უკან" }, language),
    confirm: byLanguage({ EN: "Confirm", KA: "დადასტურება" }, language),
    confirming: byLanguage({ EN: "Confirming...", KA: "მიმდინარეობს დადასტურება..." }, language),
    resendCode: byLanguage({ EN: "Resend code", KA: "კოდის თავიდან გაგზავნა" }, language),
    resendingCode: byLanguage({ EN: "Resending...", KA: "თავიდან იგზავნება..." }, language),
    sendingCode: byLanguage({ EN: "Sending verification code...", KA: "იგზავნება დადასტურების კოდი..." }, language),
    codeSentFallback: byLanguage(
      {
        EN: "If an account exists with this email, a verification code has been sent.",
        KA: "თუ ეს ელ.ფოსტა ანგარიშთან არის დაკავშირებული, დადასტურების კოდი გაიგზავნა.",
      },
      language
    ),
    verificationCodeRequired: byLanguage(
      {
        EN: "Please enter the verification code.",
        KA: "გთხოვ შეიყვანე დადასტურების კოდი.",
      },
      language
    ),
    invalidOrExpiredCode: byLanguage(
      { EN: "Wrong code or expired code.", KA: "კოდი არასწორია ან ვადა გაუვიდა." },
      language
    ),
    verificationRequestFailed: byLanguage(
      {
        EN: "Failed to send verification code.",
        KA: "დადასტურების კოდის გაგზავნა ვერ მოხერხდა.",
      },
      language
    ),
    verificationConfirmFailed: byLanguage(
      {
        EN: "Failed to verify email. Please try again.",
        KA: "ელ.ფოსტის დადასტურება ვერ მოხერხდა. სცადე თავიდან.",
      },
      language
    ),
    verificationSessionExpired: byLanguage(
      {
        EN: "Verification session expired. Please register again.",
        KA: "დადასტურების სესია ამოიწურა. გთხოვ თავიდან დარეგისტრირდი.",
      },
      language
    ),
    signedInAfterVerification: byLanguage(
      { EN: "Email verified. You are now signed in.", KA: "ელ.ფოსტა დადასტურდა. შენ უკვე შესული ხარ." },
      language
    ),
    autoLoginFailedAfterVerification: byLanguage(
      {
        EN: "Email verified, but automatic sign in failed. Please sign in manually.",
        KA: "ელ.ფოსტა დადასტურდა, თუმცა ავტომატური შესვლა ვერ მოხერხდა. გთხოვ შეხვიდე ხელით.",
      },
      language
    ),
    policyAgreementRequired: byLanguage(
      {
        EN: "Please accept the Privacy Policy and Terms of Use to register.",
        KA: "რეგისტრაციისთვის დაეთანხმე კონფიდენციალურობის პოლიტიკას და მოხმარების წესებს.",
      },
      language
    ),
    adultConfirmationRequired: byLanguage(
      {
        EN: "Please confirm that you are 18 years old or older.",
        KA: "გთხოვ დაადასტურე, რომ ხარ 18 წლის ან მეტი.",
      },
      language
    ),
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const requestVerificationCode = async (email: string, isResend = false) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setVerificationError(text.verificationSessionExpired);
      return;
    }

    const requestUrl = buildApiUrl("/api/auth/email/verify/request/");
    if (!requestUrl) {
      setVerificationError(text.missingApiBaseUrl);
      return;
    }

    setVerificationError(null);
    setVerificationMessage(text.sendingCode);
    if (isResend) {
      setResendingCode(true);
    } else {
      setRequestingCode(true);
    }

    try {
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setVerificationMessage(null);
        setVerificationError(getApiMessage(data, text.verificationRequestFailed));
        return;
      }

      const detail =
        data && typeof data === "object" && typeof (data as { detail?: unknown }).detail === "string"
          ? (data as { detail: string }).detail
          : text.codeSentFallback;
      setVerificationMessage(detail);
    } catch {
      setVerificationMessage(null);
      setVerificationError(text.verificationRequestFailed);
    } finally {
      if (isResend) {
        setResendingCode(false);
      } else {
        setRequestingCode(false);
      }
    }
  };

  const handleVerificationBack = () => {
    if (confirmingCode) {
      return;
    }
    setVerificationOpen(false);
    setVerificationCode("");
    setVerificationError(null);
    setVerificationMessage(null);
    setVerificationEmail("");
    setVerificationPassword("");
  };

  const handleConfirmVerification = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setVerificationError(null);
    setVerificationMessage(null);

    const normalizedVerificationEmail = verificationEmail.trim().toLowerCase();
    if (!normalizedVerificationEmail || !verificationPassword) {
      setVerificationError(text.verificationSessionExpired);
      return;
    }

    const normalizedCode = verificationCode.trim();
    if (!normalizedCode) {
      setVerificationError(text.verificationCodeRequired);
      return;
    }

    const confirmUrl = buildApiUrl("/api/auth/email/verify/confirm/");
    if (!confirmUrl) {
      setVerificationError(text.missingApiBaseUrl);
      return;
    }

    try {
      setConfirmingCode(true);
      const response = await fetch(confirmUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedVerificationEmail,
          code: normalizedCode,
        }),
      });

      const verifyData = await response.json().catch(() => null);

      if (!response.ok) {
        setVerificationError(getApiMessage(verifyData, text.invalidOrExpiredCode));
        return;
      }

      const loginResponse = await fetch("/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedVerificationEmail,
          password: verificationPassword,
        }),
        cache: "no-store",
      });
      const loginData = await loginResponse.json().catch(() => null);

      if (!loginResponse.ok) {
        setVerificationError(getApiMessage(loginData, text.autoLoginFailedAfterVerification));
        return;
      }

      setVerificationOpen(false);
      setVerificationCode("");
      setVerificationEmail("");
      setVerificationPassword("");
      setSuccess(text.signedInAfterVerification);
      router.push("/");
    } catch {
      setVerificationError(text.verificationConfirmFailed);
    } finally {
      setConfirmingCode(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const htmlForm = event.currentTarget;
    if (!htmlForm.checkValidity()) {
      htmlForm.reportValidity();
      return;
    }

    const normalizedEmail = form.email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setError(text.registrationFailed);
      return;
    }

    const normalizedForm: RegisterForm = {
      email: normalizedEmail,
      password: form.password,
      password2: form.password2,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone_number: form.phone_number.trim(),
    };

    if (form.password !== form.password2) {
      setError(text.passwordsDoNotMatch);
      return;
    }

    if (!agreedToPolicies) {
      setError(text.policyAgreementRequired);
      return;
    }

    if (!confirmedAdult) {
      setError(text.adultConfirmationRequired);
      return;
    }

    const registerUrl = buildApiUrl("/api/auth/register/");
    if (!registerUrl) {
      setError(text.missingApiBaseUrl);
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(registerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedForm),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(getApiMessage(data, text.registrationFailed));
        return;
      }

      const registeredEmail = normalizedForm.email;
      const registeredPassword = form.password;
      setSuccess(text.accountCreatedVerify);
      setVerificationOpen(true);
      setVerificationCode("");
      setVerificationError(null);
      setVerificationMessage(null);
      setVerificationEmail(registeredEmail);
      setVerificationPassword(registeredPassword);
      setForm(initialForm);
      setAgreedToPolicies(false);
      setConfirmedAdult(false);
      void requestVerificationCode(registeredEmail);
    } catch {
      setError(text.registrationFailedRetry);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Link
        href="/"
        aria-label={text.goToShowroom}
        className="absolute left-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 text-slate-700 transition hover:border-black/30 hover:text-slate-900"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M6 10.5V20h12v-9.5" />
        </svg>
      </Link>
      <div className="grid min-h-screen lg:grid-cols-2">
        <div className="flex flex-col justify-center px-6 py-16 sm:px-12 lg:px-16">
          <div className="w-full max-w-md">
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/images/full.png"
                alt={`${brandName} logo`}
                width={111}
                height={109}
                priority
                sizes="111px"
                className="h-16 w-auto sm:h-20"
              />
            </Link>
            <p className="mt-8 text-xs uppercase tracking-[0.3em] text-slate-500">
              {text.createAccount}
            </p>
            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <label className="block text-[11px] uppercase tracking-[0.25em] text-slate-500">
                {text.name}
                <input
                  type="text"
                  placeholder={text.yourName}
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black/40"
                />
              </label>
              <label className="block text-[11px] uppercase tracking-[0.25em] text-slate-500">
                {text.lastName}
                <input
                  type="text"
                  placeholder={text.yourLastname}
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black/40"
                />
              </label>
              <label className="block text-[11px] uppercase tracking-[0.25em] text-slate-500">
                {text.email}
                <input
                  type="email"
                  name="email"
                  placeholder={text.emailPlaceholder}
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black/40"
                />
              </label>
              <label className="block text-[11px] uppercase tracking-[0.25em] text-slate-500">
                {text.password}
                <input
                  type="password"
                  name="password"
                  placeholder={text.passwordPlaceholder}
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black/40"
                />
              </label>
              <label className="block text-[11px] uppercase tracking-[0.25em] text-slate-500">
                {text.confirmPassword}
                <input
                  type="password"
                  name="password2"
                  placeholder={text.confirmPasswordPlaceholder}
                  value={form.password2}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black/40"
                />
              </label>
              <label className="block text-[11px] uppercase tracking-[0.25em] text-slate-500">
                {text.phoneOptional}
                <input
                  type="tel"
                  name="phone_number"
                  placeholder={text.phonePlaceholder}
                  value={form.phone_number}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-black/40"
                />
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-slate-50 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                <input
                  type="checkbox"
                  checked={confirmedAdult}
                  onChange={(event) => setConfirmedAdult(event.target.checked)}
                  disabled={submitting}
                  className="mt-0.5 h-4 w-4 rounded border border-black/20 accent-black"
                />
                <span className="leading-relaxed">{text.confirmAdult}</span>
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-slate-50 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                <input
                  type="checkbox"
                  checked={agreedToPolicies}
                  onChange={(event) => setAgreedToPolicies(event.target.checked)}
                  disabled={submitting}
                  className="mt-0.5 h-4 w-4 rounded border border-black/20 accent-black"
                />
                <span className="leading-relaxed">
                  {text.acceptPolicies}{" "}
                  <Link
                    href="/policies/privacy-policy"
                    className="text-slate-900 underline transition hover:text-slate-700"
                  >
                    {text.privacyPolicy}
                  </Link>{" "}
                  {text.and}{" "}
                  <Link
                    href="/policies/terms-of-service"
                    className="text-slate-900 underline transition hover:text-slate-700"
                  >
                    {text.termsOfUse}
                  </Link>
                  .
                </span>
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-black px-4 py-3 text-xs uppercase tracking-[0.3em] text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? text.creating : text.createAccountButton}
              </button>
              {error ? (
                <div className="text-[11px] uppercase tracking-[0.22em] text-red-500">
                  {error}
                </div>
              ) : null}
              {success ? (
                <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-600">
                  {success}
                </div>
              ) : null}
            </form>
            <div className="mt-6 text-[11px] uppercase tracking-[0.22em] text-slate-500">
              {text.alreadyAccount}{" "}
              <Link href="/" className="text-slate-900 underline">
                {text.signIn}
              </Link>
            </div>
          </div>
        </div>

        <div className="relative hidden min-h-screen lg:block">
          <Image
            src="/images/BBB.png"
            alt={`${brandName} registration look`}
            fill
            sizes="(min-width: 1024px) 50vw, 0px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-white/0 via-white/0 to-white/10" />
        </div>
      </div>
      {verificationOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={text.verifyEmailTitle}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-[2px]"
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_26px_80px_rgba(15,23,42,0.35)]">
            <div className="h-2 w-full bg-gradient-to-r from-slate-900 via-slate-600 to-slate-300" />
            <div className="p-6 sm:p-8">
              <button
                type="button"
                onClick={handleVerificationBack}
                className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500 transition hover:text-slate-900"
              >
                <span aria-hidden="true">←</span>
                {text.back}
              </button>

              <p className="mt-5 text-xs uppercase tracking-[0.32em] text-slate-500">
                {text.verifyEmailTitle}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                {text.verifyEmailDescription}
              </p>
              <div className="mt-4 rounded-2xl border border-black/10 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {verificationEmail}
              </div>

              <form className="mt-5 space-y-4" onSubmit={handleConfirmVerification}>
                <label className="block text-[11px] uppercase tracking-[0.25em] text-slate-500">
                  {text.codeLabel}
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder={text.codePlaceholder}
                    value={verificationCode}
                    onChange={(event) =>
                      setVerificationCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))
                    }
                    required
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm tracking-[0.3em] text-slate-900 outline-none transition focus:border-black/40"
                  />
                </label>

                <button
                  type="submit"
                  disabled={confirmingCode}
                  className="w-full rounded-2xl bg-black px-4 py-3 text-xs uppercase tracking-[0.3em] text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {confirmingCode ? text.confirming : text.confirm}
                </button>
              </form>

              <button
                type="button"
                onClick={() => void requestVerificationCode(verificationEmail, true)}
                disabled={requestingCode || resendingCode || confirmingCode}
                className="mt-3 w-full rounded-2xl border border-black/15 px-4 py-3 text-[11px] uppercase tracking-[0.28em] text-slate-700 transition hover:border-black/30 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resendingCode ? text.resendingCode : text.resendCode}
              </button>

              {verificationError ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-red-600">
                  {verificationError}
                </div>
              ) : null}
              {verificationMessage ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-emerald-700">
                  {verificationMessage}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
