const PUBLIC_PATH = import.meta.env.BASE_URL;

const asset = (path) => `${PUBLIC_PATH}${path}`;

export const ASSETS = {
  logoColor: asset("assets/branding/logo-color.svg"),
  logoWhite: asset("assets/branding/logo-white.svg"),

  shopPhoto: asset("assets/images/shop-photo.jpg"),
  barberPole: asset("assets/images/barber-pole.png"),
  heroImage: asset("assets/images/hero-image.png"),

  video1: asset("assets/videos/shop-video-1.mp4"),
  video2: asset("assets/videos/shop-video-2.mp4"),
  heroVideo: asset("assets/videos/hero-video.mp4"),
};

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
    slug: "samuel-williams",
    name: "Samuel Williams",
    role: "Master Barber",
    photo: asset("assets/team/samuel-williams.jpg"),
    shop: "New Hope Shop",
    about:
      "As our Master Barber, Samuel leads the chair with years of experience and a deep love for the craft. From traditional cuts to bold designs, he sets the standard at All Stylez Pro.",
  },
];

export const FEED = [
  asset("assets/feed/feed-01.jpg"),
  asset("assets/feed/feed-02.jpg"),
  asset("assets/feed/feed-03.jpg"),
  asset("assets/feed/feed-04.jpg"),
  asset("assets/feed/feed-05.jpg"),
  asset("assets/feed/feed-06.jpg"),
];

export const LOCATIONS = [
  {
    name: "New Hope Shop",
    address: SHOP.address,
    available: true,
  },
  {
    name: "More locations coming soon",
    available: false,
  },
];

export const BARBERS = [
  {
    name: "Any barber",
    role: "",
  },
  ...TEAM.map((member) => ({
    name: member.name,
    role: member.role,
    slug: member.slug,
  })),
];

export const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Teams", to: "/teams" },
  { label: "Locations", to: "/locations" },
  { label: "Services", to: "/services" },
  { label: "Contact", to: "/contact" },
];
