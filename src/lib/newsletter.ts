import { byLanguage, type Language } from "./i18n";

export const NEWSLETTER_DISMISSED_SESSION_KEY = "lilien-newsletter-dismissed";
export const FOOTER_NEWSLETTER_HIDDEN_SESSION_KEY = "lilien-footer-newsletter-hidden";
export const FOOTER_NEWSLETTER_HIDE_EVENT = "lilien-footer-newsletter-hide";

export type NewsletterText = {
  title: string;
  heading: string;
  description: string;
  emailPlaceholder: string;
  signUp: string;
  privacyPrefix: string;
  privacyLabel: string;
  invalidEmail: string;
  success: string;
  successDescription?: string;
  close: string;
  imageAlt: string;
};

export type FooterNewsletterStripText = {
  title: string;
  button: string;
  placeholder: string;
};

export const getNewsletterText = (language: Language): NewsletterText => ({
  title: byLanguage(
    { EN: "SIGN UP ON NEWSLETTER", KA: "გამოიწერე ნიუსლეთერი" },
    language
  ),
  heading: byLanguage(
    { EN: "DISCOVER LILIEN FIRST", KA: "აღმოაჩინე LILIEN პირველი" },
    language
  ),
  description: byLanguage(
    {
      EN: "Be the first to discover new collections, curated pieces, and showroom updates.",
      KA: "პირველმა გაიგე ახალი კოლექციების, შერჩეული ნივთებისა და showroom-ის სიახლეების შესახებ.",
    },
    language
  ),
  emailPlaceholder: byLanguage(
    { EN: "ENTER YOUR EMAIL", KA: "შეიყვანე შენი ელფოსტა." },
    language
  ),
  signUp: byLanguage({ EN: "SIGN UP", KA: "გამოწერა" }, language),
  privacyPrefix: byLanguage(
    { EN: "BY SIGNING UP YOU AGREE TO OUR", KA: "რეგისტრაციით ეთანხმები ჩვენს" },
    language
  ),
  privacyLabel: byLanguage(
    { EN: "PRIVACY POLICY", KA: "კონფიდენციალურობის პოლიტიკას" },
    language
  ),
  invalidEmail: byLanguage(
    {
      EN: "Please enter a valid email address.",
      KA: "გთხოვ, სწორად შეიყვანე ელფოსტა.",
    },
    language
  ),
  success: byLanguage(
    {
      EN: "Thank you for subscribing!",
      KA: "თქვენ წარმატებით გამოიწერეთ ნიუსლეთერი, დაელოდეთ სიახლეებს.",
    },
    language
  ),
  close: byLanguage({ EN: "Close newsletter", KA: "ნიუსლეთერის დახურვა" }, language),
  imageAlt: byLanguage({ EN: "Newsletter preview", KA: "ნიუსლეთერის ფოტო" }, language),
});

export const getFooterNewsletterStripText = (
  language: Language
): FooterNewsletterStripText => ({
  title: byLanguage(
    { EN: "Sign Up To Our Newsletter", KA: "გამოიწერე ჩვენი ნიუსლეთერი" },
    language
  ),
  button: byLanguage({ EN: "Subscribe", KA: "გამოწერა" }, language),
  placeholder: byLanguage(
    { EN: "ENTER YOUR EMAIL", KA: "შეიყვანე შენი ელფოსტა" },
    language
  ),
});

export const isValidNewsletterEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
