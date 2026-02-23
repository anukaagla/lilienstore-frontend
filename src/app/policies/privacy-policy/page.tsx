import PolicyPage from "../../../components/policy-page";

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      title={{ EN: "Privacy Policy", KA: "კონფიდენციალურობის პოლიტიკა" }}
      policyKey="privacy_policy"
      fallbackText={{
        EN: "Privacy policy is not available yet.",
        KA: "კონფიდენციალურობის პოლიტიკა ჯერ მიუწვდომელია.",
      }}
    />
  );
}
