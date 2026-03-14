# Production Database Schema (PostgreSQL)

## 1. Users

All accounts live here.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(20) NOT NULL CHECK (role IN ('client','escort','admin')),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_banned BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

Indexes

```sql
CREATE INDEX idx_users_role ON users(role);
```

---

# 2. Escort Profiles

Escort specific information.

```sql
CREATE TABLE escort_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    alias_name VARCHAR(120) NOT NULL,
    age INT,
    city VARCHAR(100),
    country VARCHAR(100),

    description TEXT,
    price_per_hour INT,

    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

Indexes

```sql
CREATE INDEX idx_escort_city ON escort_profiles(city);
CREATE INDEX idx_escort_price ON escort_profiles(price_per_hour);
```

---

# 3. Escort Photos

Images stored in **MinIO / R2**.

```sql
CREATE TABLE escort_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escort_id UUID REFERENCES escort_profiles(id) ON DELETE CASCADE,

    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

# 4. Services Offered

Separate table so escorts can add many services.

```sql
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) UNIQUE NOT NULL
);
```

Example rows

```
Dinner date
Travel companion
Party companion
Massage
```

---

# 5. Escort Services Mapping

Many-to-many relationship.

```sql
CREATE TABLE escort_services (
    escort_id UUID REFERENCES escort_profiles(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id),

    PRIMARY KEY (escort_id, service_id)
);
```

---

# 6. Escort Availability

```sql
CREATE TABLE escort_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    escort_id UUID REFERENCES escort_profiles(id) ON DELETE CASCADE,

    day_of_week INT,
    start_time TIME,
    end_time TIME
);
```

---

# 7. Bookings

Core transaction table.

```sql
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    escort_id UUID REFERENCES escort_profiles(id),
    client_id UUID REFERENCES users(id),

    booking_time TIMESTAMP,
    duration_minutes INT,

    status VARCHAR(20) CHECK (
        status IN ('pending','accepted','rejected','cancelled','completed')
    ) DEFAULT 'pending',

    price INT,

    created_at TIMESTAMP DEFAULT NOW()
);
```

Indexes

```sql
CREATE INDEX idx_booking_escort ON bookings(escort_id);
CREATE INDEX idx_booking_client ON bookings(client_id);
```

---

# 8. Messages

Chat system.

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),

    message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

Index

```sql
CREATE INDEX idx_messages_booking ON messages(booking_id);
```

---

# 9. Reviews

Clients reviewing escorts.

```sql
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    escort_id UUID REFERENCES escort_profiles(id),
    client_id UUID REFERENCES users(id),

    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

# 10. Reports / Moderation

Users reporting problems.

```sql
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    reporter_id UUID REFERENCES users(id),
    escort_id UUID REFERENCES escort_profiles(id),

    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

# 11. Favorites

Clients saving escorts.

```sql
CREATE TABLE favorites (
    client_id UUID REFERENCES users(id),
    escort_id UUID REFERENCES escort_profiles(id),

    created_at TIMESTAMP DEFAULT NOW(),

    PRIMARY KEY (client_id, escort_id)
);
```

---

# 12. Payments (Future)

Even if not used initially, prepare schema.

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    booking_id UUID REFERENCES bookings(id),

    amount INT,
    currency VARCHAR(10),

    payment_provider VARCHAR(50),
    payment_status VARCHAR(20),

    created_at TIMESTAMP DEFAULT NOW()
);
```

---

# Important Production Indexes

Search performance depends on indexes.

```sql
CREATE INDEX idx_escort_search
ON escort_profiles(city, price_per_hour, is_active);

CREATE INDEX idx_photos_escort
ON escort_photos(escort_id);

CREATE INDEX idx_reviews_escort
ON reviews(escort_id);
```

---

# Object Storage Structure

Recommended structure for MinIO / R2

```
escort-images/

escort-images/
    escort_id/
        profile1.jpg
        profile2.jpg
```

Example:

```
escort-images/8d9d7d/profile.jpg
```

---

# Production Security Considerations

### Passwords

Always store using

```
bcrypt
argon2
```

Never plain text.

---

### Image Protection

Serve images through:

```
signed URLs
```

Prevents scraping.

---

### Rate Limiting

Protect:

```
login
booking requests
messages
```

Use **Redis**.

---

# Recommended Tech Stack

Backend

```
Go (Fiber / Gin)
PostgreSQL
Redis
```

Storage

```
MinIO (dev)
Cloudflare R2 (prod)
```

Frontend

```
Next.js
Tailwind
```

---

# Ideal Service Architecture

```
Frontend (Next.js)

       |

API Gateway

       |

Backend API

       |

PostgreSQL
Redis
Object Storage
```