import PolicyPage from "../../../components/policy-page";

export default function ShippingAndDeliveryPolicyPage() {
  return (
    <PolicyPage
      title={{ EN: "Shipping & Delivery Policy", KA: "მიწოდების პოლიტიკა" }}
      policyKey="shipping_and_delivery_policy"
      fallbackText={{
        EN: "Shipping and delivery policy is not available yet.",
        KA: "მიწოდების პოლიტიკა ჯერ მიუწვდომელია.",
      }}
    />
  );
}
