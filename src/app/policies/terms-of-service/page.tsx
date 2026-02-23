import PolicyPage from "../../../components/policy-page";

export default function TermsOfServicePage() {
  return (
    <PolicyPage
      title={{ EN: "Terms & Conditions", KA: "წესები და პირობები" }}
      policyKey="terms_of_service"
      fallbackText={{
        EN: "Terms and conditions are not available yet.",
        KA: "წესები და პირობები ჯერ მიუწვდომელია.",
      }}
    />
  );
}
