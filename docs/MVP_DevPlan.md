# Escort Marketplace MVP Specification

## 1. Goal

Build a minimal escort / companionship marketplace where providers can create profiles and clients can browse and send booking requests.

The MVP should validate:

* Escorts will list profiles
* Clients will browse and contact
* Platform can moderate listings

---

# 2. Core MVP Features

## 2.1 Escort Profiles

Escorts can create a profile with photos and service information.

Fields:

* alias_name
* age
* city
* description
* services
* price_per_hour
* phone_or_contact
* photos
* verified

Capabilities:

* Upload photos
* Edit profile
* Set availability

---

## 2.2 Client Browsing

Clients can browse escorts using filters.

Filters:

* City
* Age
* Price range
* Services

Endpoints:

GET /escorts
GET /escorts/{id}

---

## 2.3 Booking Requests

Clients can send booking requests.

Flow:

Client -> Request
Escort -> Accept / Reject

Endpoints:

POST /booking
GET /booking/{id}

---

## 2.4 Messaging (Optional for MVP)

Simple chat between escort and client after booking request.

Table:
messages

Fields:

* booking_id
* sender_id
* text
* created_at

---

## 2.5 Admin Panel

Admin capabilities:

* Approve escorts
* Ban users
* Remove profiles
* Moderate photos

---

# 3. Data Modeling

## Users

| Field         | Type                        |
| ------------- | --------------------------- |
| id            | uuid                        |
| role          | enum(client, escort, admin) |
| email         | varchar                     |
| phone         | varchar                     |
| password_hash | varchar                     |
| created_at    | timestamp                   |

---

## Escorts

| Field          | Type      |
| -------------- | --------- |
| id             | uuid      |
| user_id        | uuid      |
| alias_name     | varchar   |
| age            | int       |
| city           | varchar   |
| description    | text      |
| price_per_hour | int       |
| verified       | boolean   |
| created_at     | timestamp |

---

## Escort Photos

| Field      | Type      |
| ---------- | --------- |
| id         | uuid      |
| escort_id  | uuid      |
| image_url  | text      |
| created_at | timestamp |

---

## Bookings

| Field        | Type                                      |
| ------------ | ----------------------------------------- |
| id           | uuid                                      |
| escort_id    | uuid                                      |
| client_id    | uuid                                      |
| booking_time | timestamp                                 |
| status       | enum(pending,accepted,rejected,completed) |
| message      | text                                      |
| created_at   | timestamp                                 |

---

## Messages

| Field      | Type      |
| ---------- | --------- |
| id         | uuid      |
| booking_id | uuid      |
| sender_id  | uuid      |
| text       | text      |
| created_at | timestamp |

---

# 4. System Architecture

Frontend

* Next.js
* TailwindCSS

Backend

* Node.js (Express or Fastify)

Database

* PostgreSQL

Cache / Realtime

* Redis

Object Storage

* MinIO (development)
* Cloudflare R2 / S3 (production)

Deployment

* VPS (Hetzner / Hostinger)

---

# 5. Folder Structure Example

Full-stack Next.js (aligned with [Verlano](https://github.com/ImBharathwaj/Verlano))

```
src/
  app/           # Routes, pages, API routes
  components/    # Reusable UI
  contexts/      # React contexts (Auth)
  lib/           # Prisma, utilities
  types/         # TypeScript types
prisma/
  schema.prisma
  seed.js
```

---

# 6. API Design

## Escorts

GET /escorts
GET /escorts/{id}
POST /escorts
PUT /escorts/{id}

## Bookings

POST /bookings
GET /bookings/{id}

## Messages

POST /messages
GET /messages/{booking_id}

---

# 7. Security Considerations

Important protections:

* Rate limit API
* Image moderation
* Admin verification of escort profiles
* Password hashing (bcrypt)
* JWT authentication

Privacy:

* Store alias names only
* Avoid storing real addresses

---

# 8. Future Features (Post MVP)

* Payments
* Escort verification system
* Video intro profiles
* Escort ranking algorithm
* Reviews and ratings

---

# 9. MVP Timeline

Week 1

* Backend API
* Database models

Week 2

* Frontend UI
* Escort profiles

Week 3

* Booking system
* Admin moderation

---

# 10. Metrics to Track

Important metrics:

* Number of escort profiles
* Profile views
* Booking requests
* Conversion rate

---

# 11. Business Model Options

Possible monetization:

1. Listing subscription
2. Featured profiles
3. Lead generation fees

---

# 12. Risks

Major risks:

* Fake profiles
* Spam
* Legal issues

Mitigation:

* Profile approval
* Reporting system

---