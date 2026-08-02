<div align="center">

# 🧠 Stash

### **A second brain for the things you meant to remember.**

![python](https://img.shields.io/badge/python-3.11%2B-3776AB?logo=python&logoColor=white)
![fastapi](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![react native](https://img.shields.io/badge/React%20Native-61DAFB?logo=react&logoColor=black)
![mongodb](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)
![llm](https://img.shields.io/badge/LLM-GPT--5.1%20vision-10a37f?logo=openai&logoColor=white)
![license](https://img.shields.io/badge/license-MIT-blueviolet)

*Everyone already has a place where recommendations go to die. It is called the
notes app, and it contains the words "that cafe" with no further context.*

</div>

---

**Stash** is a "second brain" designed for capturing and rediscovering ephemeral content. Whether it's a movie recommendation, a music track, a hidden cafe, a book title, or a random Wikipedia rabbit hole, Stash helps you save it in seconds and find it when it matters.

Unlike traditional "save-it-and-forget-it" tools, Stash uses AI to enrich your captures and a smart rediscovery engine to resurface them based on your context.

---

## 🌟 Vision

Capture anything from the **share/screenshot layer** to bypass platform API restrictions. Stash actively enriches, categorizes, and resurfaces your content so you never lose a recommendation again.

### The "Moat":
- **AI Enrichment**: Automatically generates titles, summaries, categories, and tags.
- **Vision AI**: Extracts venue names, artists, and context directly from screenshots.
- **Contextual Resurfacing**: A "Rediscover" feed that prioritizes items based on the time of day, your current location, or "forgotten gems" from your past saves.

---

## ✨ Features

- **Multi-Modal Capture**: Save content via screenshots, camera, links, or text notes.
- **AI-Powered Organization**: Auto-categorization into types like `movie`, `music`, `place`, `book`, `article`, `idea`, `video`, and more.
- **Smart Rediscovery**: A dedicated tab that surfaces relevant content (e.g., cafes in the morning, music in the evening, or nearby saved spots).
- **Powerful Search**: Search across titles, summaries, tags, and even the raw text extracted from your captures.
- **Analytics Dashboard**: Track your "second brain" growth with per-category breakdowns.
- **Secure Auth**: JWT-based authentication for private, secure storage.

---

## 🛠️ Tech Stack

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Motor](https://motor.readthedocs.io/) (Async driver)
- **AI Integration**: official `openai` SDK for LLM and Vision tasks (GPT-5.1, vision-capable)
- **Security**: JWT (python-jose) and Bcrypt (passlib)

### Frontend
- **Framework**: [Expo](https://expo.dev/) / React Native (TypeScript)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/)
- **Icons**: Lucide React Native
- **Storage**: Expo Secure Store for sensitive tokens

---

## 📂 Project Structure

```text
.
├── backend/                # FastAPI Server
│   ├── server.py           # Main API implementation
│   ├── requirements.txt    # Python dependencies
│   └── tests/              # Backend integration tests
├── frontend/               # React Native / Expo App
│   ├── app/                # Expo Router screens
│   ├── src/                # Shared components, hooks, and logic
│   └── package.json        # Frontend dependencies
├── memory/                 # Project documentation (PRD, Design Guidelines)
└── tests/                  # Root-level testing coordination
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js & pnpm/yarn
- MongoDB instance

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file with the following variables:
   ```env
   MONGO_URL=your_mongodb_url
   DB_NAME=stash
   JWT_SECRET=your_secret_key
   OPENAI_API_KEY=your_openai_api_key
   ```
4. Start the server:
   ```bash
   python server.py
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   pnpm install # or yarn install
   ```
3. Create a `.env` file:
   ```env
   EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
   ```
4. Start the Expo development server:
   ```bash
   npx expo start
   ```

---

## 🧪 Testing

The repository includes a comprehensive backend test suite. To run the tests:

```bash
cd backend
pytest tests/backend_test.py
```

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details (if applicable).