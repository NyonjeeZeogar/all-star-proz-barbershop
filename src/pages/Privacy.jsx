import React from "react";
import SectionHeading from "@/components/site/SectionHeading";
import LegalText from "@/components/site/LegalText";

const SECTIONS = [
  {
    title: "INFORMATION WE COLLECT",
    body: "We collect information that you provide directly to us, such as your name, email address, and phone number when you book an appointment or sign up for updates. We may also collect information automatically, including your IP address, browser type, and usage data.",
  },
  {
    title: "HOW WE USE YOUR INFORMATION",
    body: "We use the information we collect to provide and improve our services, communicate with you about appointments, send updates and promotions, and respond to your inquiries. We may also use your information to personalize your experience on our site.",
  },
  {
    title: "SHARING YOUR INFORMATION",
    body: "We do not sell, trade, or rent your personal information to others. We may share information with trusted third parties who assist us in operating our site and conducting our business, provided they agree to keep your information confidential.",
  },
  {
    title: "BEHAVIORAL ADVERTISING",
    body: "We may work with third-party advertising partners to display ads based on your interests. These partners may use cookies and similar technologies to collect information about your visits to our site and other websites to provide relevant advertisements.",
  },
  {
    title: "DO NOT TRACK",
    body: "Some browsers offer a \"Do Not Track\" feature. Because there is currently no industry consensus on how to interpret these signals, we do not currently respond to them, but we will update this policy if standards become established.",
  },
  {
    title: "YOUR RIGHTS",
    body: "You have the right to access, update, or delete your personal information. You may also opt out of receiving promotional communications from us by following the unsubscribe link in our emails or contacting us directly.",
  },
  {
    title: "CHANGES",
    body: "We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page. We encourage you to review this page periodically to stay informed about how we protect your information.",
  },
  {
    title: "CONTACT INFORMATION",
    body: "If you have any questions about this Privacy Policy or our data practices, please contact us at allstylezpro@gmail.com or by phone at 763-537-1400. You may also reach us at 7801 62nd Ave N, New Hope, Minnesota 55428.",
  },
];

export default function Privacy() {
  return (
    <div className="py-16 sm:py-24">
      <div className="max-w-2xl mx-auto px-5 sm:px-8">
        <SectionHeading label="LEGAL" title="Privacy Policy." className="mb-12" />
        <LegalText sections={SECTIONS} />
      </div>
    </div>
  );
}
