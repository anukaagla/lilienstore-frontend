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

export const getNewsletterText = (): NewsletterText => ({
  title: "SIGN UP ON NEWSLETTER",
  heading: "DISCOVER LILIEN FIRST",
  description: "Be the first to discover new collections, curated pieces, and showroom updates.",
  emailPlaceholder: "ENTER YOUR EMAIL",
  signUp: "SIGN UP",
  privacyPrefix: "BY SIGNING UP YOU AGREE TO OUR",
  privacyLabel: "PRIVACY POLICY",
  invalidEmail: "Please enter a valid email address.",
  success: "Thank you for subscribing!",
  close: "Close newsletter",
  imageAlt: "Newsletter preview",
});

export const getFooterNewsletterStripText = (): FooterNewsletterStripText => ({
  title: "Sign Up To Our Newsletter",
  button: "Subscribe",
  placeholder: "ENTER YOUR EMAIL",
});

export const isValidNewsletterEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
