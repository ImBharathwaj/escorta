export type GalleryImage = {
  src: string;
  alt: string;
  caption?: string;
  tags?: string[];
};

export type Gallery = {
  slug: string;
  title: string;
  h1: string;
  description: string;
  keywords: string[];
  heroImage: string;
  images: GalleryImage[];
};

// Initial curated galleries for SEO; images/URLs are placeholders to be wired to real assets.
export const galleries: Gallery[] = [
  {
    slug: "dinner-date-companions-chennai",
    title: "Dinner date companions in Chennai | Escorta Gallery",
    h1: "Dinner date companions in Chennai",
    description:
      "Explore curated visuals representing elegant companions for dinner dates in Chennai. Use this gallery to imagine the kinds of refined, social experiences you can arrange through Escorta.",
    keywords: [
      "dinner date companion chennai",
      "companion for dinner chennai",
      "chennai dinner companion",
    ],
    heroImage: "/gallery/dinner-date-chennai-1.jpg",
    images: [
      {
        src: "/gallery/dinner-date-chennai-1.jpg",
        alt: "Elegant dinner date companion in a Chennai hotel restaurant",
        caption: "An elegant companion ready for a dinner date in Chennai.",
        tags: ["chennai", "dinner", "restaurant"],
      },
      {
        src: "/gallery/dinner-date-chennai-2.jpg",
        alt: "Companion enjoying a candlelit dinner table in Chennai",
        caption: "Candlelit dinner ambience with a refined companion.",
        tags: ["chennai", "candlelight", "dinner"],
      },
    ],
  },
  {
    slug: "travel-companions-india",
    title: "Travel companions in India | Escorta Gallery",
    h1: "Travel companions across India",
    description:
      "See inspiration for stylish, social travel companionship across major Indian cities. From weekend getaways to extended travel, Escorta helps you find the right match.",
    keywords: ["travel companion india", "companion for travel", "indian travel escort"],
    heroImage: "/gallery/travel-companion-india-1.jpg",
    images: [
      {
        src: "/gallery/travel-companion-india-1.jpg",
        alt: "Travel companion standing by a luxury car in India",
        caption: "A travel companion ready for a city escape in India.",
        tags: ["travel", "india", "city-break"],
      },
      {
        src: "/gallery/travel-companion-india-2.jpg",
        alt: "Companion enjoying a scenic rooftop view in India",
        caption: "Rooftop views and good company on your travels.",
        tags: ["travel", "rooftop", "scenic"],
      },
    ],
  },
];

