# AI Media API Reference

Base URL: `https://your-domain.com`

All endpoints return JSON. Errors follow `{ "error": "message" }`.

---

## Authentication

Two auth methods are used depending on the endpoint:

| Method | Header | Used for |
|---|---|---|
| Bearer token | `Authorization: Bearer <API_SECRET_KEY>` | Admin write endpoints |
| None | — | All read endpoints |

The `API_SECRET_KEY` is set in `.env.local`.

---

## Endpoints

### `GET /api/feed`

Paginated feed of AI-tagged media. Sorted by `created_at` descending.

**Query params**

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | number | 20 | Items per page (max 100) |
| `cursor` | string | — | Opaque cursor from previous response |
| `type` | `image` \| `video` | — | Filter by media type |
| `tags` | string | — | Comma-separated tag values; ALL must match |

**Example**
```
GET /api/feed?limit=20&type=image&tags=blonde,beach
```

**Response**
```json
{
  "data": [
    {
      "id": "abc123",
      "media_type": "image",
      "thumbnail_url": "https://...",
      "media_url": "https://...",
      "title": null,
      "created_at": "2026-02-18T12:00:00Z",
      "media_tags": [
        { "tag_category": "hair", "tag_value": "blonde" },
        { "tag_category": "setting", "tag_value": "beach" }
      ]
    }
  ],
  "nextCursor": "MjAyNi0wMi0xOFQxMjowMDowMFo"
}
```

Pass `nextCursor` as `?cursor=` in the next request. `null` means no more pages.

---

### `GET /api/media/:id`

Single media item with tags grouped by category.

**Example**
```
GET /api/media/abc123
```

**Response**
```json
{
  "id": "abc123",
  "media_type": "image",
  "thumbnail_url": "https://...",
  "media_url": "https://...",
  "title": null,
  "created_at": "2026-02-18T12:00:00Z",
  "tags": {
    "hair": ["blonde"],
    "body": ["curvy"],
    "setting": ["beach"],
    "clothing": ["bikini"]
  }
}
```

Returns `404` if the ID does not exist.

---

### `GET /api/similar/:id`

Items most similar to the given item using cosine distance on 512-dim CLIP embeddings.

**Query params**

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | number | 10 | Number of results (max 50) |

**Example**
```
GET /api/similar/abc123?limit=6
```

**Response**
```json
{
  "data": [
    {
      "id": "xyz789",
      "media_type": "image",
      "thumbnail_url": "https://...",
      "media_url": "https://...",
      "title": null,
      "created_at": "2026-02-17T09:00:00Z",
      "similarity": 0.94
    }
  ]
}
```

`similarity` is a float from 0–1 (1 = identical). Returns `404` if the ID doesn't exist, empty `data[]` if no embedding is stored for it.

---

### `GET /api/search`

Search media by tag values. All specified tags must be present (AND logic). Cursor-paginated.

**Query params**

| Param | Type | Required | Description |
|---|---|---|---|
| `tags` | string | Yes | Comma-separated tag values |
| `limit` | number | No | Items per page (default 20, max 100) |
| `cursor` | string | No | Pagination cursor |
| `type` | `image` \| `video` | No | Filter by media type |

**Example**
```
GET /api/search?tags=brunette,tattoo&type=video
```

**Response**
```json
{
  "data": [ ... ],
  "nextCursor": "MjAyNi0wMi0xN...",
  "totalMatches": 14
}
```

`totalMatches` is the total number of items matching the tag filter (not just the current page).

---

### `GET /api/tag-categories`

All AI tag categories with their distinct values and occurrence counts. Use this to build filter UI.

**Example**
```
GET /api/tag-categories
```

**Response**
```json
{
  "categories": [
    {
      "name": "hair",
      "values": [
        { "value": "blonde", "count": 45 },
        { "value": "brunette", "count": 38 },
        { "value": "red", "count": 12 }
      ]
    },
    {
      "name": "body",
      "values": [
        { "value": "slim", "count": 60 },
        { "value": "curvy", "count": 41 }
      ]
    }
  ]
}
```

Values are sorted by count descending within each category.

Known categories: `hair`, `ethnicity`, `style`, `body`, `setting`, `clothing`, `pose`, `expression`, `scene`, `content`, `age_style`.

---

### `POST /api/media`

Create one item or bulk-import many. Requires bearer token.

Accepts either a **single JSON object** or a **JSON array**.

#### Single item

```
POST /api/media
Authorization: Bearer <API_SECRET_KEY>
Content-Type: application/json

{
  "media_type": "image",
  "media_url": "https://imagedelivery.net/...",
  "thumbnail_url": "https://imagedelivery.net/.../thumbnail",
  "title": "Optional title",
  "ai_tags": {
    "hair": ["blonde"],
    "body": ["slim"],
    "setting": ["beach"]
  },
  "clip_embedding": [0.12, -0.34, 0.09, ...]
}
```

**Fields**

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | string | No | Auto-generated with nanoid if omitted |
| `media_type` | `image` \| `video` | Yes | |
| `media_url` | string | Yes | Full URL to the media file |
| `thumbnail_url` | string | No | |
| `title` | string | No | |
| `created_at` | ISO string | No | Defaults to `now()` |
| `ai_tags` | object | No | `{ category: string[] }` map |
| `clip_embedding` | number[] | No | Exactly 512 floats |

**Response** `201`
```json
{
  "data": {
    "id": "V3k9xAbCdEf",
    "media_type": "image",
    "thumbnail_url": "https://...",
    "media_url": "https://...",
    "title": null,
    "created_at": "2026-02-18T12:00:00Z",
    "tags": {
      "hair": ["blonde"],
      "body": ["slim"],
      "setting": ["beach"]
    }
  }
}
```

#### Bulk import

```
POST /api/media
Authorization: Bearer <API_SECRET_KEY>
Content-Type: application/json

[
  { "id": "sqlite-id-1", "media_type": "image", "media_url": "...", "ai_tags": { ... }, "clip_embedding": [...] },
  { "id": "sqlite-id-2", "media_type": "video", "media_url": "...", "ai_tags": { ... }, "clip_embedding": [...] }
]
```

**Response** `200`
```json
{
  "inserted": 2,
  "errors": []
}
```

Existing records (matched by `id`) are upserted. Items are processed in batches of 50.

---

## Importing from SQLite

```python
import json, struct, requests, sqlite3

conn = sqlite3.connect("your.db")
rows = conn.execute("SELECT id, media_type, thumbnail_url, image_url, ai_tags, clip_embedding FROM media").fetchall()

items = []
for id, media_type, thumbnail_url, image_url, ai_tags, clip_blob in rows:
    embedding = list(struct.unpack(f"{len(clip_blob) // 4}f", clip_blob))
    items.append({
        "id": id,
        "media_type": media_type,
        "thumbnail_url": thumbnail_url,
        "media_url": image_url,
        "ai_tags": json.loads(ai_tags) if ai_tags else None,
        "clip_embedding": embedding,
    })

r = requests.post(
    "https://your-domain.com/api/media",
    json=items,
    headers={"Authorization": "Bearer YOUR_API_SECRET_KEY"},
)
print(r.json())  # { "inserted": 220, "errors": [] }
```

---

## Database schema

```
media
  id            TEXT PRIMARY KEY
  media_type    TEXT  ('image' | 'video')
  thumbnail_url TEXT
  media_url     TEXT  NOT NULL
  title         TEXT
  created_at    TIMESTAMPTZ

media_tags
  id            UUID PRIMARY KEY
  media_id      TEXT → media.id
  tag_category  TEXT
  tag_value     TEXT
  UNIQUE (media_id, tag_category, tag_value)

media_embeddings
  media_id      TEXT PRIMARY KEY → media.id
  embedding     vector(512)       -- HNSW index (cosine)
```

SQL functions (called via `supabase.rpc()`):

| Function | Description |
|---|---|
| `filter_media_by_tags(tag_values[])` | AND-filter: returns IDs having all tag values |
| `find_similar_media(query_media_id, match_limit)` | Cosine ANN search |
| `get_tag_counts()` | `(category, value, count)` rows for all tags |

---

## Running migrations

```bash
# Local dev
npx supabase migration up

# Production
npx supabase db push
```
