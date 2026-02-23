import PolicyPage from "../../../components/policy-page";

export default function ReturnAndRefundPolicyPage() {
  return (
    <PolicyPage
      title={{ EN: "Return & Refund Policy", KA: "დაბრუნება და ანაზღაურება" }}
      policyKey="return_and_refund_policy"
      fallbackText={{
        EN: "Return and refund policy is not available yet.",
        KA: "დაბრუნებისა და ანაზღაურების პოლიტიკა ჯერ მიუწვდომელია.",
      }}
    />
  );
}
