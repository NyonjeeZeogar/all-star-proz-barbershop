// Shared brand assets for All Stylez Pro
export const ASSETS = {
  logoColor:
    "https://media.base44.com/images/public/6a4dce60052fc4d1ad15f704/7edd6c3c8_64d15ac31fc2678bcaad33ed_svglogofull.svg",
  logoWhite:
    "https://media.base44.com/images/public/6a4dce60052fc4d1ad15f704/97b00cb46_64d15f4b1dcc28bcf486f380_svglogofull-white.svg",
  shopPhoto:
    "https://media.base44.com/images/public/6a4dce60052fc4d1ad15f704/e17c14a7e_64d26a3a55c9b92242f4bd4b_IMG_3661.jpg",
  video1:
    "https://media.base44.com/videos/public/6a4dce60052fc4d1ad15f704/c9f14830f_64d26c8f36d842228729e760_IMG_3445-transcode.mp4",
  video2:
    "https://media.base44.com/videos/public/6a4dce60052fc4d1ad15f704/792030016_64d26cc3f70082ba4f059b87_IMG_2541-transcode.mp4",
  heroVideo:
    "https://media.base44.com/videos/public/6a4dce60052fc4d1ad15f704/d57ea44ef_MyMovie.mp4",
  barberPole:
    "https://media.base44.com/images/public/6a4dce60052fc4d1ad15f704/3c42d04d4_Screenshot2026-07-08at82606PM.png",
  heroImage:
    "https://media.base44.com/images/public/6a4dce60052fc4d1ad15f704/e2fe8ce6b_ChatGPTImageJul8202608_30_16PM.png",
};

// Shop details used across the site
export const SHOP = {
  name: "New Hope Shop",
  phone: "763-537-1400",
  email: "allstylezpro@gmail.com",
  instagram: "https://instagram.com/allstylezpro",
  address: "7801 62nd Ave N, New Hope Minnesota 55428",
  services: ["Haircut", "Beard", "Dye"],
  hours: [
    { day: "Monday", time: "APPOINTMENTS ONLY" },
    { day: "Tuesday", time: "9AM - 6PM" },
    { day: "Wednesday", time: "9AM - 6PM" },
    { day: "Thursday", time: "9AM - 7PM" },
    { day: "Friday", time: "9AM - 7PM" },
    { day: "Saturday", time: "9AM - 5PM" },
    { day: "Sunday", time: "APPOINTMENTS ONLY" },
  ],
};

export const TEAM = [
  {
    slug: "diamond",
    name: "Diamond",
    role: "Barber",
    photo:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80",
    shop: "New Hope Shop",
    about:
      "Diamond brings precision and artistry to every cut. With a sharp eye for detail and a passion for modern styles, she makes sure every client leaves the chair feeling fresh and confident.",
  },
  {
    slug: "mr-terry",
    name: "Mr. Terry",
    role: "Barber",
    photo:
      "https://images.unsplash.com/photo-1500648767791-00dcc66b36d6?auto=format&fit=crop&w=800&q=80",
    shop: "New Hope Shop",
    about:
      "A staple of the New Hope community, Mr. Terry blends classic technique with contemporary flair. His clean fades and sharp line-ups keep the neighborhood looking its best.",
  },
  {
    slug: "samuel-williams",
    name: "Samuel Williams",
    role: "Master Barber",
    photo:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
    shop: "New Hope Shop",
    about:
      "As our Master Barber, Samuel leads the chair with years of experience and a deep love for the craft. From traditional cuts to bold designs, he sets the standard at All Stylez Pro.",
  },
];

// Instagram feed grid (mix of brand photo + barbershop stock)
export const FEED = [
  ASSETS.shopPhoto,
  "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1599351431202-1e758d2c1e76?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1622286342621-4bd786a2443c?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1493863641943-9b68992a8d07?auto=format&fit=crop&w=600&q=80",
];

export const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Teams", to: "/teams" },
  { label: "Locations", to: "/locations" },
  { label: "Services", to: "/services" },
  { label: "Contact", to: "/contact" },
];
