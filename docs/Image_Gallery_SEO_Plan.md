### Image Gallery for SEO – Development Plan

Below is a task‑oriented plan to implement an image gallery that helps Escorta rank for relevant companion discovery keywords, especially in image search.

---

## 1. Data & Content Design

- **1.1 Define gallery themes**
  - Decide 5–10 initial SEO themes (per city / scenario / intent), for example:
    - Dinner date companions in Chennai
    - Travel companions in India
    - Event companions in Bangalore
    - Luxury companions in Mumbai
    - Business dinner companions in Delhi

- **1.2 Prepare image assets**
  - Collect 6–20 non‑explicit, on‑brand images per theme.
  - Upload to existing storage (MinIO/S3) under SEO‑friendly paths, such as:
    - `gallery/dinner-date-chennai-1.jpg`
    - `gallery/travel-companion-india-1.jpg`
  - Ensure filenames contain target keywords where appropriate.

- **1.3 Write SEO copy per gallery**
  - For each gallery:
    - **Title (H1)** including the primary keyword.
    - 1–2 **intro paragraphs** describing scenario and value.
    - 2–4 **sub‑sections (H2)** with supporting text and variations of the keyword.
    - Per‑image **alt text** in natural language that includes relevant phrases, for example:
      - `Elegant dinner date companion in a Chennai hotel lounge`.

---

## 2. Gallery Data Structure

- **2.1 Create config file**
  - File: `src/lib/galleryData.ts` (initially used for prototyping; will be replaced by DB‑backed API below).
  - Types:

```ts
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

export const galleries: Gallery[] = [
  {
    slug: "dinner-date-companions-chennai",
    title: "Dinner date companions in Chennai | Escorta Gallery",
    h1: "Dinner date companions in Chennai",
    description: "Short SEO intro paragraph for this theme.",
    keywords: ["dinner date companion chennai", "companion for dinner chennai"],
    heroImage: "https://cdn.example.com/gallery/dinner-date-chennai-1.jpg",
    images: [
      {
        src: "https://cdn.example.com/gallery/dinner-date-chennai-1.jpg",
        alt: "Elegant dinner date companion in a Chennai hotel lounge",
        caption: "An elegant dinner companion in Chennai.",
      },
      // more images...
    ],
  },
  // more galleries...
];
```

- **2.2 Optional taxonomy**
  - Add optional fields such as `city`, `country`, `languageCodes` if future filtering or personalization is needed.

- **2.3 Database models (admin‑managed galleries)**
  - Extend `schema.prisma` with:

```prisma
model Gallery {
  id          String        @id @default(uuid())
  slug        String        @unique
  title       String
  h1          String
  description String        @db.Text
  keywords    String[]      @default([])
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  images      GalleryImage[]
}

model GalleryImage {
  id            String   @id @default(uuid())
  galleryId     String   @map("gallery_id")
  gallery       Gallery  @relation(fields: [galleryId], references: [id], onDelete: Cascade)
  src           String   @db.Text
  alt           String   @db.Text
  caption       String?  @db.Text
  sortOrder     Int      @default(0) @map("sort_order")
  escortPhotoId String?  @map("escort_photo_id")
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([galleryId])
}
```

  - After updating the schema, run a Prisma migration so the new tables are available to the admin API.

---

## 3. Routes & Pages

### 3.1 Gallery Index Page (`/gallery`)

- **3.1.1 Implementation**
  - File: `src/app/gallery/page.tsx`
  - Behavior:
    - Import `galleries` from `galleryData.ts`.
    - Render a grid of cards:
      - Hero image.
      - Title.
      - Short description.
      - “View gallery” button linking to `/gallery/[slug]`.
    - Include internal links back to `/companions` and `/`.

- **3.1.2 SEO metadata**
  - Static metadata:

```ts
export const metadata = {
  title: "Companion Image Gallery | Escorta",
  description:
    "Explore curated image galleries showcasing companions for dinner dates, travel, and events across major Indian cities.",
};
```

---

### 3.2 Gallery Detail Page (`/gallery/[slug]`)

- **3.2.1 Dynamic route**
  - File: `src/app/gallery/[slug]/page.tsx`
  - Steps:
    - Use `params.slug` to find the gallery in `galleries`.
    - If not found, render a simple “Gallery not found” / 404 message.
    - If found, render:
      - H1 from `gallery.h1`.
      - Intro description from `gallery.description`.
      - One or more `<section>` blocks with supporting headings and text that repeat and vary the main keyphrase.
      - An image grid using `next/image` or `<img>`:
        - Set `src` from `image.src`.
        - Set `alt` from `image.alt`.
        - Optionally show `caption` under each image.

- **3.2.2 `generateMetadata`**
  - In `[slug]/page.tsx`, implement:

```ts
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const gallery = galleries.find((g) => g.slug === params.slug);
  if (!gallery) {
    return {
      title: "Companion Gallery | Escorta",
      description: "Curated image galleries of companions on Escorta.",
    };
  }
  const baseUrl = process.env.APP_URL || "https://escorta.example.com";
  return {
    title: gallery.title,
    description: gallery.description,
    alternates: {
      canonical: `${baseUrl}/gallery/${gallery.slug}`,
    },
  };
}
```

- **3.2.3 Optional JSON‑LD structured data**
  - Inside the page component, add:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: gallery.h1,
      description: gallery.description,
      hasPart: gallery.images.map((img) => ({
        "@type": "ImageObject",
        contentUrl: img.src,
        caption: img.caption ?? img.alt,
      })),
    }),
  }}
/>
```

This helps Google understand the page as a collection of images.

---

## 4. Navigation & Internal Linking

- **4.1 Header / footer links**
  - Add a link labeled **“Image gallery”** pointing to `/gallery`:
    - In the main navigation (if suitable), or
    - In the footer section of `layout.tsx` or a footer component.

- **4.2 Home page**
  - On `src/app/page.tsx`, add a small CTA block:
    - Title: “Browse our image gallery”.
    - Paragraph explaining that users can explore scenarios & styles.
    - Button linking to `/gallery`.

- **4.3 Companions pages**
  - On `companions/page.tsx` or on an escort detail page:
    - Add a subtle text link: “Need inspiration? Visit our image gallery” → `/gallery`.

These internal links help search engines crawl and assign importance to gallery pages.

---

## 5. Sitemap & Robots

- **5.1 Sitemap**
  - If you have a sitemap (e.g. `src/app/sitemap.ts` or an API route), ensure it includes:
    - `/gallery`
    - `/gallery/[slug]` for each gallery in `galleryData.ts`.

- **5.2 robots.txt**
  - Confirm that `/gallery` and `/gallery/*` are **allowed** (no disallow rules).

---

## 6. QA & SEO Validation

- **6.1 Functional QA**
  - Verify:
    - `/gallery` loads and lists all galleries from config.
    - Each `/gallery/[slug]` page:
      - Renders correctly.
      - Falls back gracefully for unknown slugs.
    - All images load and have appropriate `alt` text.

- **6.2 SEO checks**
  - Use browser dev tools / “View Source” to confirm:
    - `<title>` and `<meta name="description">` match the config.
    - JSON‑LD (if added) is present and valid.
  - Run Lighthouse (Chrome DevTools) to check:
    - Basic SEO score (especially “Crawlable” and “Descriptive link text”).
  - After deployment:
    - Submit new URLs in Google Search Console for faster indexing.
    - Monitor impressions and clicks for gallery URLs and target keywords.

---

## 7. Implementation Order (Checklist)

1. **Content prep**
   - [ ] Choose initial gallery themes (5–10).
   - [ ] Prepare images for each theme and upload to storage.
   - [ ] Draft SEO copy (titles, descriptions, alt text).

2. **Code**
   - [x] Create `src/lib/galleryData.ts` with the gallery config (initial galleries wired with placeholder image paths).
   - [x] Implement `/gallery` index page (now DB-backed via `Gallery` model rather than static config).
   - [x] Implement `/gallery/[slug]` detail page with `generateMetadata` (DB-backed).
   - [x] Add JSON‑LD structured data for each gallery detail page.

3. **Navigation**
   - [x] Add “Image gallery” link to header (top navigation) pointing to `/gallery`.
   - [x] Add a small gallery CTA section to the home page.
   - [x] Add a cross‑link from companions pages to `/gallery`.

4. **SEO plumbing**
   - [x] Update sitemap to include `/gallery` and each gallery slug (via `src/app/sitemap.ts`).
   - [x] Confirm robots.txt allows gallery URLs (via `src/app/robots.ts`).

5. **QA**
   - [ ] Test responsive layouts and images.
   - [ ] Verify metadata and alt text.
   - [ ] Run Lighthouse SEO audit and iterate if needed.

---

## 9. Escort Consent for Gallery Use

- **9.1 Requirement**
  - Companions must be able to explicitly choose which of their profile photos can be reused in public galleries and SEO content.
  - Admin gallery tools should only surface photos that are both:
    - Approved by moderation.
    - Explicitly allowed for gallery/SEO by the companion.

- **9.2 Data model**

  - Extend `EscortPhoto` with a consent flag:

  ```prisma
  model EscortPhoto {
    id           String   @id @default(uuid())
    escortId     String   @map("escort_id")
    escort       EscortProfile @relation(fields: [escortId], references: [id], onDelete: Cascade)
    imageUrl     String   @map("image_url")
    isPrimary    Boolean  @default(false) @map("is_primary")
    isApproved   Boolean  @default(false) @map("is_approved")
    allowGallery Boolean  @default(false) @map("allow_gallery")
    createdAt    DateTime @default(now()) @map("created_at")
  }
  ```

  - After updating the schema, a Prisma migration was applied so this field is available to the API and dashboard.

- **9.3 Escort dashboard UI**

  - In `dashboard/profile` (escort role), the `Photos` section was enhanced:
    - Each photo tile shows:
      - The image (larger tile for clarity).
      - A **Primary / Set as primary** button.
      - An **Allow for gallery / Allowed for gallery** button.
      - A **Delete** button (with confirmation).
    - When the escort toggles **Allow for gallery**, the client calls:
      - `PATCH /api/escorts/{escortId}/photos/{photoId}` with body `{ "allow_gallery": boolean }`.
    - On success, the escort profile is reloaded so the UI reflects the new consent state.

- **9.4 API behaviour**

  - `PATCH /api/escorts/[id]/photos/[photoId]`
    - If the request has `Content-Type: application/json` and a body with `allow_gallery`, it updates:
      - `EscortPhoto.allowGallery = !!body.allow_gallery`.
    - If the request does **not** send JSON (legacy behaviour), it acts as:
      - “Set as primary photo”, clearing `isPrimary` on other photos for that escort and setting it on the target photo.
    - Access control:
      - Only the photo’s own escort or an admin can update these fields.

  - `GET /api/escorts/[id]/photos`
    - Used by the admin gallery editor when attaching escort photos.
    - Now filters photos by:
      - `isApproved = true`
      - `allowGallery = true`
    - This ensures admin sees only images where companions have explicitly allowed gallery/SEO usage.

---

## 8. Admin Gallery Management (Upload & Escort Images)

### 8.1 Requirements

- Admin must be able to:
  - Create and edit galleries (slug, title, H1, description, keywords).
  - Upload one or many images at a time into a gallery.
  - Attach existing escort photos into a gallery for SEO purposes.
  - Provide SEO attributes (alt text and caption) for each image (at upload time; later editing optional).
  - Browse escort profiles and see their photos when choosing images for the gallery.

### 8.2 Backend – Admin APIs

- **Auth helper**
  - All routes under `/api/admin/gallery` use a helper that reads the JWT and enforces `role === "admin"`.

- **`GET /api/admin/gallery`**
  - Returns a list of galleries for the admin overview:
    - `id`, `slug`, `title`, `h1`, `createdAt`, `updatedAt`, `imageCount`.

- **`POST /api/admin/gallery`**
  - Create a new gallery shell:
    - Body: `{ slug, title, h1, description, keywords: string[] }`.
    - Validates:
      - `slug`, `title`, `h1`, and `description` are required.
      - `slug` must be unique.

- **`GET /api/admin/gallery/[id]`**
  - Returns a single gallery and all of its images ordered by `sortOrder`.

- **`PATCH /api/admin/gallery/[id]`**
  - Updates gallery SEO fields and slug:
    - Accepts any subset of `{ slug, title, h1, description, keywords: string[] }`.
    - Only provided fields are updated.

- **`POST /api/admin/gallery/[id]/images`**
  - Adds images to a gallery (single or bulk) via `multipart/form-data`.
  - Supports two sources:
    - **New uploads**:
      - Field: `files` (one or more `File`s).
      - Validations:
        - Only `image/*` content types.
        - Max 10MB per file.
      - Storage:
        - Uploaded to MinIO under a `gallery/` prefix using shared bucket/env.
        - Stored URL (MinIO endpoint + bucket + key) is saved in `GalleryImage.src`.
      - SEO fields:
        - Optional fields like `alt_{filename}`, `caption_{filename}` are read from `FormData`.
        - Fallback `alt`: `"Companion themed gallery image"`.
    - **Existing escort photos**:
      - Field: `escortPhotoIds[]` (list of `EscortPhoto.id` values).
      - For each `EscortPhoto`:
        - Uses existing `EscortPhoto.imageUrl` as `src`.
        - Stores `escortPhotoId` on `GalleryImage`.
        - Optional `alt_escort_{photoId}` and `caption_escort_{photoId}` can override defaults.
        - Fallback `alt`: `"Companion image from escort profile"`.
  - Response:
    - `{ created: [{ id }, ...] }` for all successfully created `GalleryImage` rows.

> Note: image alt/caption editing for existing `GalleryImage` entries can be added later via a dedicated `PATCH /api/admin/gallery/[galleryId]/images/[imageId]` if needed.

### 8.3 Admin UI – Pages

#### 8.3.1 Gallery list page (`/admin/gallery`)

- File: `src/app/admin/gallery/page.tsx`
- Behavior:
  - Client component using `useAuth` for the admin JWT.
  - On mount:
    - `GET /api/admin/gallery` with `Authorization: Bearer {token}`.
  - Renders a table:
    - Columns: Title, Slug, Images, Last updated, Actions.
    - Each row has a **“Edit”** link → `/admin/gallery/[id]`.
  - Includes a **“New gallery”** inline form or button that:
    - Collects `slug`, `title`, `h1`, `description`, `keywords` (comma‑separated).
    - Calls `POST /api/admin/gallery` to create a new entry.

#### 8.3.2 Gallery editor (`/admin/gallery/[id]`)

- File: `src/app/admin/gallery/[id]/page.tsx`
- Sections:

- **SEO settings**
  - Fetch `GET /api/admin/gallery/[id]` on mount.
  - Form fields bound to `slug`, `title`, `h1`, `description`, `keywords` (comma‑separated).
  - “Save” button → `PATCH /api/admin/gallery/[id]`.

- **Current images**
  - Show existing `GalleryImage` entries (thumbnail + alt + caption).
  - Optionally allow changing `sortOrder` client‑side and persisting via a future `PATCH` endpoint.

- **Add new images (upload)**
  - `<input type="file" multiple accept="image/*" />`
  - Optional simple alt/caption text fields applied to all uploads or, in a future enhancement, per‑file.
  - On submit, send `multipart/form-data` to `POST /api/admin/gallery/[id]/images` with `files`.

- **Attach from escort photos**
  - Escort selector:
    - Uses `GET /api/admin/escorts` to provide a dropdown or search list of escorts (name + email + primary photo).
  - When an escort is selected:
    - Fetch photos via `GET /api/escorts/[id]/photos`.
    - Render a grid of that escort’s approved photos (thumbnails).
    - Each image has a checkbox or “Add to gallery” button.
  - On submit:
    - Call `POST /api/admin/gallery/[id]/images` with `escortPhotoIds[]` for the selected photos.
    - Optional text inputs for per‑photo alt/caption use the `alt_escort_{photoId}` / `caption_escort_{photoId}` conventions.

These UI pages allow an admin to build and maintain galleries without editing code: they can pick escort photos, upload new images, and set SEO fields from the admin area.

