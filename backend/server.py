import os
import uuid
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from passlib.context import CryptContext
from jose import jwt, JWTError
from dotenv import load_dotenv

from openai import AsyncOpenAI


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------- Config ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRES_MINUTES = int(os.environ.get("JWT_EXPIRES_MINUTES", "43200"))
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "[email protected]").lower()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Stash2026!")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
LLM_MODEL = os.environ.get("LLM_MODEL", "gpt-5.1")

# Instantiated lazily so the service still boots without a key configured;
# enrichment then degrades to the heuristic fallback instead of failing.
_openai = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("stash")

# ---------- DB ----------
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
users_col = db["users"]
stashes_col = db["stashes"]

# ---------- Security ----------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_password(p: str) -> str:
    return pwd_context.hash(p)


def verify_password(p: str, h: str) -> bool:
    try:
        return pwd_context.verify(p, h)
    except Exception:
        return False


def create_access_token(sub: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRES_MINUTES)
    return jwt.encode({"sub": sub, "exp": exp}, JWT_SECRET, algorithm=JWT_ALGORITHM)


# ---------- Models ----------
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    is_admin: bool = False


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class StashCreate(BaseModel):
    type: str  # link | screenshot | text | voice
    raw_text: Optional[str] = None  # link url, text note, voice transcript
    image_base64: Optional[str] = None  # for screenshot
    note: Optional[str] = None  # user-added note
    lat: Optional[float] = None
    lng: Optional[float] = None


class StashUpdate(BaseModel):
    note: Optional[str] = None
    title: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None


class StashOut(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    summary: str
    category: str
    tags: List[str] = []
    metadata: dict = {}
    raw_text: Optional[str] = None
    image_base64: Optional[str] = None
    note: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    created_at: str
    last_resurfaced: Optional[str] = None


# ---------- Auth dependency ----------
async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise JWTError()
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await users_col.find_one({"email": email}, {"_id": 0, "hashed_password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------- AI enrichment ----------
CATEGORIES = ["movie", "music", "place", "book", "article", "idea", "person", "video", "other"]

ENRICH_SYSTEM = (
    "You are Stash's content enricher. The user saves ephemeral content "
    "(screenshots, links, notes). Extract structure as compact JSON. "
    "Categories must be one of: movie, music, place, book, article, idea, person, video, other. "
    "Output ONLY a JSON object with keys: title (short, max 60 chars), "
    "summary (1-2 sentences, max 220 chars), category (one of allowed), "
    "tags (array of 2-5 short lowercase strings), "
    "metadata (object with relevant fields like venue, location, artist, author, year, url). "
    "No code fences. No extra prose."
)


async def enrich_content(text: Optional[str], image_b64: Optional[str]) -> dict:
    import json
    if not _openai:
        return _fallback_enrich(text)
    try:
        prompt = "Enrich this saved content. Return JSON only."
        if text:
            prompt += f"\n\nText/Link: {text[:2000]}"
        if image_b64:
            prompt += "\n\nAnalyze the attached screenshot too — extract any venue, title, artist, app source, or context visible."

        # Vision payloads travel as an inline data URL alongside the text part.
        content: list[dict] = [{"type": "text", "text": prompt}]
        if image_b64:
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"},
            })

        completion = await _openai.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": ENRICH_SYSTEM},
                {"role": "user", "content": content},
            ],
            response_format={"type": "json_object"},
        )
        raw = (completion.choices[0].message.content or "").strip()
        if raw.startswith("```"):
            raw = raw.strip("`")
            if raw.lower().startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        cat = (data.get("category") or "other").lower()
        if cat not in CATEGORIES:
            cat = "other"
        return {
            "title": str(data.get("title") or "Untitled stash")[:80],
            "summary": str(data.get("summary") or "")[:300],
            "category": cat,
            "tags": [str(t).lower()[:24] for t in (data.get("tags") or [])][:6],
            "metadata": data.get("metadata") or {},
        }
    except Exception as e:
        logger.warning(f"AI enrichment failed: {e}")
        return _fallback_enrich(text)


def _fallback_enrich(text: Optional[str]) -> dict:
    title = "Untitled stash"
    if text:
        title = text.strip().split("\n")[0][:60] or title
    return {
        "title": title,
        "summary": (text or "")[:200],
        "category": "other",
        "tags": [],
        "metadata": {},
    }


# ---------- App / Router ----------
app = FastAPI(title="Stash API")
api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"app": "Stash", "ok": True}


# Auth
@api.post("/auth/register", response_model=Token)
async def register(payload: UserCreate):
    email = payload.email.lower()
    existing = await users_col.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    uid = str(uuid.uuid4())
    doc = {
        "id": uid,
        "email": email,
        "hashed_password": hash_password(payload.password),
        "is_admin": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await users_col.insert_one(doc)
    token = create_access_token(email)
    return Token(
        access_token=token,
        user=UserPublic(id=uid, email=email, is_admin=False),
    )


@api.post("/auth/login", response_model=Token)
async def login(payload: UserCreate):
    email = payload.email.lower()
    user = await users_col.find_one({"email": email})
    if not user or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_access_token(email)
    return Token(
        access_token=token,
        user=UserPublic(id=user["id"], email=email, is_admin=user.get("is_admin", False)),
    )


@api.get("/auth/me", response_model=UserPublic)
async def me(user=Depends(get_current_user)):
    return UserPublic(id=user["id"], email=user["email"], is_admin=user.get("is_admin", False))


# Stashes
def _doc_to_stash(d: dict) -> StashOut:
    return StashOut(
        id=d["id"],
        user_id=d["user_id"],
        type=d["type"],
        title=d.get("title", "Untitled"),
        summary=d.get("summary", ""),
        category=d.get("category", "other"),
        tags=d.get("tags", []),
        metadata=d.get("metadata", {}),
        raw_text=d.get("raw_text"),
        image_base64=d.get("image_base64"),
        note=d.get("note"),
        lat=d.get("lat"),
        lng=d.get("lng"),
        created_at=d.get("created_at"),
        last_resurfaced=d.get("last_resurfaced"),
    )


@api.post("/stashes", response_model=StashOut)
async def create_stash(payload: StashCreate, user=Depends(get_current_user)):
    enriched = await enrich_content(payload.raw_text, payload.image_base64)
    sid = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": sid,
        "user_id": user["id"],
        "type": payload.type,
        "raw_text": payload.raw_text,
        "image_base64": payload.image_base64,
        "note": payload.note,
        "lat": payload.lat,
        "lng": payload.lng,
        "created_at": now,
        "last_resurfaced": None,
        **enriched,
    }
    await stashes_col.insert_one(doc)
    return _doc_to_stash(doc)


@api.get("/stashes", response_model=List[StashOut])
async def list_stashes(
    category: Optional[str] = None,
    limit: int = 100,
    user=Depends(get_current_user),
):
    q = {"user_id": user["id"]}
    if category and category != "all":
        q["category"] = category
    cursor = stashes_col.find(q, {"_id": 0}).sort("created_at", -1).limit(limit)
    items = await cursor.to_list(limit)
    return [_doc_to_stash(x) for x in items]


@api.get("/stashes/search", response_model=List[StashOut])
async def search_stashes(q: str, user=Depends(get_current_user)):
    if not q.strip():
        return []
    regex = {"$regex": q.strip(), "$options": "i"}
    query = {
        "user_id": user["id"],
        "$or": [
            {"title": regex},
            {"summary": regex},
            {"raw_text": regex},
            {"note": regex},
            {"tags": regex},
            {"category": regex},
        ],
    }
    cursor = stashes_col.find(query, {"_id": 0}).sort("created_at", -1).limit(100)
    items = await cursor.to_list(100)
    return [_doc_to_stash(x) for x in items]


@api.get("/stashes/rediscover", response_model=List[StashOut])
async def rediscover(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    user=Depends(get_current_user),
):
    """Smart resurface: mix of (1) nearby places if location provided,
    (2) time-relevant categories (cafe/food in morning, music in evening),
    (3) oldest non-resurfaced saves to bring back forgotten gems."""
    items: dict[str, dict] = {}
    now = datetime.now(timezone.utc)
    hour = now.hour

    # Time-of-day relevant categories
    if 5 <= hour < 11:
        priority_cats = ["place", "article", "book"]
    elif 11 <= hour < 17:
        priority_cats = ["place", "article", "idea"]
    elif 17 <= hour < 22:
        priority_cats = ["music", "movie", "place"]
    else:
        priority_cats = ["movie", "music", "book", "idea"]

    cursor = stashes_col.find(
        {"user_id": user["id"], "category": {"$in": priority_cats}},
        {"_id": 0},
    ).sort("created_at", 1).limit(6)
    async for x in cursor:
        items[x["id"]] = x

    # Location-based: stashes with coords near the user
    if lat is not None and lng is not None:
        loc_cursor = stashes_col.find(
            {
                "user_id": user["id"],
                "lat": {"$gte": lat - 0.15, "$lte": lat + 0.15},
                "lng": {"$gte": lng - 0.15, "$lte": lng + 0.15},
            },
            {"_id": 0},
        ).limit(6)
        async for x in loc_cursor:
            items[x["id"]] = x

    # Forgotten gems
    old_cursor = stashes_col.find(
        {"user_id": user["id"], "last_resurfaced": None},
        {"_id": 0},
    ).sort("created_at", 1).limit(6)
    async for x in old_cursor:
        items[x["id"]] = x

    result = list(items.values())[:12]
    # mark as resurfaced
    ids = [x["id"] for x in result]
    if ids:
        await stashes_col.update_many(
            {"id": {"$in": ids}},
            {"$set": {"last_resurfaced": now.isoformat()}},
        )
    return [_doc_to_stash(x) for x in result]


@api.get("/stashes/{stash_id}", response_model=StashOut)
async def get_stash(stash_id: str, user=Depends(get_current_user)):
    doc = await stashes_col.find_one({"id": stash_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Stash not found")
    return _doc_to_stash(doc)


@api.patch("/stashes/{stash_id}", response_model=StashOut)
async def update_stash(stash_id: str, payload: StashUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        doc = await stashes_col.find_one({"id": stash_id, "user_id": user["id"]}, {"_id": 0})
        if not doc:
            raise HTTPException(404, "Stash not found")
        return _doc_to_stash(doc)
    result = await stashes_col.find_one_and_update(
        {"id": stash_id, "user_id": user["id"]},
        {"$set": updates},
        return_document=True,
        projection={"_id": 0},
    )
    if not result:
        raise HTTPException(404, "Stash not found")
    return _doc_to_stash(result)


@api.delete("/stashes/{stash_id}")
async def delete_stash(stash_id: str, user=Depends(get_current_user)):
    res = await stashes_col.delete_one({"id": stash_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Stash not found")
    return {"ok": True}


@api.get("/stats")
async def stats(user=Depends(get_current_user)):
    total = await stashes_col.count_documents({"user_id": user["id"]})
    by_cat: dict = {}
    pipeline = [
        {"$match": {"user_id": user["id"]}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
    ]
    async for row in stashes_col.aggregate(pipeline):
        by_cat[row["_id"] or "other"] = row["count"]
    return {"total": total, "by_category": by_cat}


# Mount router
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    # Ensure email is unique
    try:
        await users_col.create_index("email", unique=True)
        await stashes_col.create_index([("user_id", 1), ("created_at", -1)])
    except Exception as e:
        logger.warning(f"Index init: {e}")

    # Seed admin
    existing = await users_col.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await users_col.insert_one({
            "id": str(uuid.uuid4()),
            "email": ADMIN_EMAIL,
            "hashed_password": hash_password(ADMIN_PASSWORD),
            "is_admin": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin {ADMIN_EMAIL}")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
