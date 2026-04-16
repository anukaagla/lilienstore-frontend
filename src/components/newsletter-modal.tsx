"use client";

import Image from "next/image";
import Link from "next/link";
import type { FormEvent } from "react";
import type { NewsletterText } from "../lib/newsletter";

type NewsletterModalProps = {
  visible: boolean;
  text: NewsletterText;
  email: string;
  error: string | null;
  success: string | null;
  brandName: string;
  logoSrc: string;
  onClose: () => void;
  onEmailChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function NewsletterModal({
  visible,
  text,
  email,
  error,
  success,
  brandName,
  logoSrc,
  onClose,
  onEmailChange,
  onSubmit,
}: NewsletterModalProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120]">
      <button
        type="button"
        aria-label={text.close}
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(9,7,5,0.28)] backdrop-blur-[10px]"
      />
      <div className="absolute left-1/2 top-1/2 z-[121] w-[calc(100vw-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 px-2 sm:px-0">
        <section className="relative overflow-hidden rounded-[2rem] border border-[#9a9389] bg-[rgba(249,246,241,0.96)] shadow-[0_34px_90px_-40px_rgba(0,0,0,0.8)]">
          <button
            type="button"
            aria-label={text.close}
            onClick={onClose}
            className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-transparent text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition hover:text-white/80 sm:right-5 sm:top-5 sm:h-10 sm:w-10 sm:text-[#746a5f] sm:drop-shadow-none sm:hover:text-black"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            >
              <path d="M5 5 19 19" />
              <path d="M19 5 5 19" />
            </svg>
          </button>

          <div className="grid gap-6 p-4 sm:grid-cols-[0.95fr_1.05fr] sm:gap-8 sm:p-6 md:p-7">
            <div className="relative min-h-[280px] overflow-hidden rounded-[1.6rem] sm:min-h-[520px]">
              <Image
                src="/images/newsletter-pic.png"
                alt={text.imageAlt}
                fill
                sizes="(min-width: 640px) 34vw, 100vw"
                className="object-cover"
              />
            </div>

            <div className="flex flex-col justify-center px-2 pb-3 pt-1 text-[#4b433c] sm:min-h-[520px] sm:px-1 sm:pb-1 sm:pr-10">
              {success ? (
                <div className="flex min-h-[420px] items-center justify-center text-center sm:min-h-[520px]">
                  <p className="max-w-md font-display text-2xl leading-[1.35] text-[#4f8a53] sm:text-[2rem]">
                    {success}
                  </p>
                </div>
              ) : (
                <>
                  <p className="translate-y-[51px] font-display text-[1.55rem] leading-none tracking-[0.01em] text-[#171412] sm:translate-y-[55px] sm:text-[1.75rem]">
                    {text.title}
                  </p>
                  <div className="translate-y-14 sm:translate-y-16">
                    <h2 className="mt-10 font-display text-[1.45rem] leading-none tracking-[0.01em] text-[#7a7066] sm:text-[1.6rem]">
                      {text.heading}
                    </h2>
                    <p className="mt-6 max-w-md font-display text-sm leading-6 text-[#8a8177] sm:text-[0.96rem]">
                      {text.description}
                    </p>
                  </div>

                  <form className="relative mt-14" onSubmit={onSubmit} noValidate>
                    <label className="mt-16 block">
                      <span className="sr-only">{text.emailPlaceholder}</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => onEmailChange(event.target.value)}
                        placeholder={text.emailPlaceholder}
                        className="w-full border-b border-[#d9d0c6] bg-transparent pb-3 font-display text-lg tracking-[0.01em] text-[#4b433c] placeholder:text-[#8f867d] focus:border-[#8b8175] focus:outline-none sm:text-[1.08rem]"
                      />
                    </label>
                    <div className="mt-14 flex justify-center">
                      <button
                        type="submit"
                        className="min-w-[170px] rounded-full border border-[#8f8780] bg-white px-8 py-3 text-lg text-[#39322d] shadow-[0_8px_24px_-18px_rgba(0,0,0,0.55)] transition hover:-translate-y-0.5 sm:text-[1.08rem]"
                      >
                        {text.signUp}
                      </button>
                    </div>

                    <div className="absolute right-0 top-[200px] hidden sm:block">
                      <Image
                        src={logoSrc}
                        alt={`${brandName} logo`}
                        width={68}
                        height={68}
                        className="h-auto w-[68px] object-contain opacity-80"
                      />
                    </div>

                    {error ? <p className="mt-4 text-sm text-[#9f3a32]">{error}</p> : null}
                  </form>

                  <p className="mt-auto pt-6 text-[11px] uppercase tracking-[0.05em] text-[#8b8178]">
                    {text.privacyPrefix}{" "}
                    <Link
                      href="/policies/privacy-policy"
                      className="underline underline-offset-2"
                    >
                      {text.privacyLabel}
                    </Link>
                  </p>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
