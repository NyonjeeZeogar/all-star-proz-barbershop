import React from "react";
import SectionHeading from "@/components/site/SectionHeading";
import LegalText from "@/components/site/LegalText";

const SECTIONS = [
  {
    title: "INTRODUCTION",
    body: "Welcome to All Stylez Pro. These Terms of Use govern your use of our website and the services we provide. By accessing or using our site, you agree to be bound by these terms. If you do not agree with any part of these terms, please do not use our website.",
  },
  {
    title: "ACCEPTANCE OF TERMS",
    body: "By using this website, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use and any additional terms and conditions referenced herein. We may update these terms from time to time, and your continued use of the site constitutes acceptance of any changes.",
  },
  {
    title: "YOUR ACCOUNT",
    body: "If you create an account on our site, you are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer. You agree to accept responsibility for all activities that occur under your account or password.",
  },
  {
    title: "USER CONDUCT",
    body: "You agree not to use the site for any unlawful purpose or in any way that could damage, disable, overburden, or impair the site. You must not attempt to gain unauthorized access to any part of the site, other accounts, or computer systems connected to the site.",
  },
  {
    title: "TERMINATION",
    body: "We may terminate or suspend your access to the site immediately, without prior notice or liability, for any reason, including if you breach these Terms of Use. Upon termination, your right to use the site will cease immediately.",
  },
  {
    title: "WARRANTY DISCLAIMER",
    body: "The site and its content are provided on an \"as is\" and \"as available\" basis without warranties of any kind, either express or implied. We do not warrant that the site will be uninterrupted, secure, or error-free.",
  },
  {
    title: "LIMITATION OF LIABILITY",
    body: "To the fullest extent permitted by law, All Stylez Pro shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the site.",
  },
  {
    title: "INDEMNIFICATION",
    body: "You agree to indemnify and hold harmless All Stylez Pro and its affiliates from any claims, damages, liabilities, costs, or expenses arising from your use of the site or your violation of these terms.",
  },
  {
    title: "GOVERNING LAW",
    body: "These Terms of Use shall be governed by and construed in accordance with the laws of the State of Minnesota, without regard to its conflict of law principles.",
  },
  {
    title: "CHANGES TO TERMS",
    body: "We reserve the right to modify these terms at any time. We will alert you about any changes by posting the new terms on this page. Your continued use of the site after any changes signifies your acceptance of the revised terms.",
  },
];

export default function Terms() {
  return (
    <div className="py-16 sm:py-24">
      <div className="max-w-2xl mx-auto px-5 sm:px-8">
        <SectionHeading label="LEGAL" title="Terms of Use." className="mb-12" />
        <LegalText sections={SECTIONS} />
      </div>
    </div>
  );
}
