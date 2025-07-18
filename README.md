# WordPecker App

**Every word has a story.**

A personalized language-learning app that brings the magic of Duolingo-style lessons to your own curated vocabulary lists and contexts.

## 📋 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [The Idea](#the-idea)
- [How It Works](#how-it-works)
- [Demo](#demo)
- [Roadmap](#roadmap)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Database Setup](#database-setup)
  - [Configuration](#configuration)
  - [Development](#development)
- [Docker Setup (Recommended)](#docker-setup-recommended)
  - [Quick Start with Docker](#quick-start-with-docker)
  - [Docker Commands](#docker-commands)
  - [MongoDB Access](#mongodb-access)
  - [Running Only MongoDB with Docker](#running-only-mongodb-with-docker)
  - [Easy Startup Script](#easy-startup-script)
  - [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

## 🚀 Quick Start

- **🐳 Docker (Recommended):** [Quick Start with Docker](#quick-start-with-docker)
- **💻 Local Development:** [Manual Installation](#installation)
- **🗄️ MongoDB Only:** [Running Only MongoDB](#running-only-mongodb-with-docker)

---

<p align="center">
  <img src="./docs/assets/wordpecker-moscot.png" alt="WordPecker App" width="600" />
  <br/>
  <a href="https://www.youtube.com/watch?v=jS8r7J65fXY">📹 Watch on YouTube</a>
</p>

## The Idea

Learning a new language can be straightforward, but mastering it is the real challenge. While it's relatively easy to grasp the basics, developing strong communication or reading skills depends on having a solid vocabulary. To build this, you must learn words and phrases at various levels, yet exposure is key. For instance, if you've studied English but don't live in an English-speaking country, advancing your skills becomes significantly harder. You can read books, watch movies, or browse blogs, but fully immersing yourself in the language is still difficult. Real progress often requires extra effort—studying and revisiting words and phrases encountered in your daily life.

However, this process can be inconvenient. You have to pause whatever you're doing to note new words, search their meanings, record them, and then review them later. This is time-consuming and tiring. As a result, although you might improve, the learning process can feel painfully slow and inefficient.

To solve this, I had an idea for an app that merges personalized learning with the efficiency of flashcards—a blend of Duolingo-like lessons and custom study lists.

In the previous version, you'd read your book, encounter new words, create a list, manually add each word, and then practice. You'd open the app, create a new list with details like "Harry Potter Book," add the words you found, and the app would provide meanings so you could continue reading without interruption. Later you'd practice with exercises and quizzes. This worked great when you were actively reading or consuming content, but what about when you just wanted to expand your vocabulary anytime, anywhere?

But here's where it gets exciting – **we've added a new feature to discover and encounter new words**. Instead of manually hunting down vocabulary, you can now encounter words naturally with much less effort:

### 🌳 Vision Garden (My Personal Favorite!)

Imagine looking at images and describing them to discover new vocabulary. You can use LLM-generated images or real stock photos, describe what you see, and agent analyzes your description to suggest contextual vocabulary words you might not know. It's like having a personal tutor who shows you pictures and helps you expand your vocabulary naturally. The agent considers your current vocabulary and suggests words that fit your learning level and context.

<p align="center">
  <img src="./docs/assets/vision-garden.png" alt="Vision Garden" width="600" />
  <br/>
  <a href="https://www.youtube.com/watch?v=skGrxA_NYCk&list=PLAE8NedfKVQ8n9Qy0deYqgJ-HK2K7MjEj&index=2">📹 Watch on YouTube</a>
</p>

### 📚 Get New Words - Smart Vocabulary Discovery

Choose any context or topic you're interested in (like "space exploration" or "cooking techniques"), select your difficulty level, and let agent generate vocabulary words you don't already have. Then dive into interactive learning sessions where you can:

- **Know/Don't Know Interface**: Simple binary choice for each word
- **Progressive Disclosure**: Reveals definitions, examples, and visuals when you don't know the word
- **Context-Aware Generation**: Excludes words you already know, focuses on your chosen difficulty level
- **Visual Integration**: Generate images for words you're learning to create stronger memory connections
- **List Building**: Add learned words to existing lists or create new context-specific collections

No more manually searching for words – just pick a theme and difficulty, and get learning experience that adapts to your knowledge.

<p align="center">
  <img src="./docs/assets/get-new-words.png" alt="Get New Words" width="600" />
  <br/>
  <a href="#https://www.youtube.com/watch?v=S-X8BMQb8t8&list=PLAE8NedfKVQ8n9Qy0deYqgJ-HK2K7MjEj&index=8">📹 Watch on YouTube</a>
</p>

### 🗣️ Voice Chat

This is where things get really interactive. Using OpenAI's voice agents you can have actual spoken conversations with an LLM tutor about your vocabulary words. Practice pronunciation, ask questions, and get instant feedback through natural speech. It's like having a language exchange partner available 24/7 who knows exactly what words you're learning. The voice agent has access to your list and help you learn the words you already have and it can add new words to your lists by using the tool.

<p align="center">
  <img src="./docs/assets/voice-chat.png" alt="Voice Chat" width="600" />
  <br/>
  <a href="https://www.youtube.com/watch?v=UqzDbP8FxAw&list=PLAE8NedfKVQ8n9Qy0deYqgJ-HK2K7MjEj&index=1">📹 Watch on YouTube</a>
</p>

Once you've discovered words through these methods, you can:

- **Learn**: Practice with 5 different question types (multiple choice, fill-in-the-blank, matching, true/false, and sentence completion) - all configurable in your settings
- **Quiz**: Test your knowledge and track your progress with learned points
- **Voice Practice**: Have conversations about your vocabulary with the LLM voice tutor
- **Light Reading**: Generate reading passages that highlight your vocabulary words in context

<p align="center">
  <img src="./docs/assets/learn.png" alt="Learn Mode" width="600" />
  <br/>
  <a href="https://www.youtube.com/watch?v=RTJoA4PVNfw&list=PLAE8NedfKVQ8n9Qy0deYqgJ-HK2K7MjEj&index=5">📹 Watch on YouTube</a>
</p>

<p align="center">
  <img src="./docs/assets/settings-exercise_types.png" alt="Exercise Types Settings" width="600" />
  <br/>
  <a href="https://www.youtube.com/watch?v=4B7gKMu6IYE&list=PLAE8NedfKVQ8n9Qy0deYqgJ-HK2K7MjEj&index=6">📹 Watch on YouTube</a>
</p>

### 🔍 Word Detail Pages - Deep Dive Into Every Word

Each word in your vocabulary gets its own comprehensive page where you can:
- **Context Explorer**: See how the same word appears across different lists with different meanings and track your progress in each context
- **Example Generator**: Create contextual example sentences with translations and detailed usage notes
- **Visual Learning**: Generate LLM images or find stock photos that represent the word in its specific context
- **Similar Words Discovery**: Find synonyms and interchangeable words with examples and usage notes
- **Smart Collection**: Add discovered similar words to your existing lists or create new context-specific lists

<p align="center">
  <img src="./docs/assets/word-detail.png" alt="Word Detail Pages" width="600" />
  <br/>
  <a href="https://www.youtube.com/watch?v=SxwS0zjmmaA&list=PLAE8NedfKVQ8n9Qy0deYqgJ-HK2K7MjEj&index=3">📹 Watch on YouTube</a>
</p>


### 🔊 Audio Pronunciation System - Every Word Has A Voice

Pronunciation for immersive learning.

### Multi-Language

The app now supports learning **any language using any language**. Want to learn Japanese using Turkish? Or practice advanced English while getting explanations in Spanish? Just configure your native language (base) and target language in settings. The LLM even validates specific language variants like "Japanese with Hiragana" or "Brazilian Portuguese".

<p align="center">
  <img src="./docs/assets/settings-language.png" alt="Language Settings" width="600" />
  <br/>
  <a href="https://www.youtube.com/watch?v=g5_YyLBq1oU&list=PLAE8NedfKVQ8n9Qy0deYqgJ-HK2K7MjEj&index=7">📹 Watch on YouTube</a>
</p>

### Template Library

Jump-start your learning with curated vocabulary lists. Browse templates by category, difficulty, and tags, then clone them to create your own customized lists.

### 📝 Classic Word Lists - The Original Power

Of course, the original way still works! Create your own context-aware lists the traditional way:
- **Create Custom Lists**: Make lists with any name, description, and context (like "Harry Potter Book," "Business Meeting Vocabulary," etc.)
- **Add Words Instantly**: Just type a word and - it's automatically defined in your chosen context
- **Context-Aware Definitions**: Each word gets its meaning based on your list's context, so "bank" means something different in "Financial Terms" vs "Geography Vocabulary"
- **Manual Control**: Perfect for when you encounter specific words while reading, watching movies, or in conversations
- **Flexible Organization**: Organize your vocabulary exactly how you want it

This is still the most direct way to build your vocabulary when you know exactly what words you want to learn!

<p align="center">
  <img src="./docs/assets/light-reading.png" alt="Light Reading" width="600" />
  <br/>
  <a href="https://www.youtube.com/watch?v=O1c2JuAQy2E&list=PLAE8NedfKVQ8n9Qy0deYqgJ-HK2K7MjEj&index=4">📹 Watch on YouTube</a>
</p>

The key advantage is that the app keeps your learning tied to the context in which you originally saw the words. By returning to them in their original setting, you strengthen those specific neural pathways, speeding up retention and making learning significantly more effective.

**In short, it's like having a personalized Duolingo where you can create and learn from your own lists, but with the added ehancements of natural word discovery and voice interaction. It's a powerful way to immerse yourself in the language and make steady progress.**

<p align="center">
  <img src="./docs/assets/wordpecker.png" alt="WordPecker App" width="600" />
</p>

## How It Works

### 🎯 Recommended Learning Flow

Choose the approach that fits your learning style and situation:

## 🚀 **The Discovery Path** - For Explorers Who Want Effortless Learning

Perfect when you want to expand your vocabulary without the effort of hunting for words:

1. **Discover Words Naturally**: 
   - **Vision Garden**: Look at images in generated context, describe what you see, and get vocabulary suggestions based on what you missed or could express better
   - **Get New Words**: Create a session with any context you're interested in, then go through interactive know/don't know sessions with LLM-generated vocabulary that fits your learning level

2. **Build Your Collection**: 
   - Add discovered words to your existing lists or create new context-specific ones
   - Use the **Template Library** to quickly start with professionally curated lists

3. **Explore & Expand**: 
   - Click on any word to access its **Word Detail Page** for deep exploration
   - Generate example sentences, find similar words, and create visual associations
   - Add discovered similar words to expand your vocabulary further

4. **Practice & Reinforce**: 
   - Use **Voice Chat** to have real conversations about your vocabulary
   - Generate **Light Reading** passages that highlight your vocabulary words
   - Go to **Learn Mode** and practice with various question types
   - Take **Quizzes** to assess your retention and collect learned points

## 📚 **The Traditional Path** - For Focused Learners Who Know What They Want

Perfect when you encounter specific words and want to learn them immediately:

1. **Create Context-Aware Lists**: 
   - Make **Word Lists** with specific contexts (Harry Potter Book, Business Vocabulary, etc.)
   - Just type words you encounter and get instant context-aware definitions

2. **Deep Dive Into Words**: 
   - Use **Word Detail Pages** to explore each word thoroughly
   - Generate example sentences, find similar words, and create visual associations
   - Add discovered similar words to expand your lists

3. **Practice & Master**: 
   - Use **Voice Chat** to practice your specific vocabulary
   - Generate **Light Reading** that uses your collected words
   - Go to **Learn Mode** and **Quiz** to systematically master your curated vocabulary
   - Return to **Word Detail Pages** anytime to review, find more similar words, or generate fresh examples

Both paths lead to the same comprehensive learning experience—you can even combine them! The key is that WordPecker adapts to however you prefer to learn.

## Demo

[![Alt text](https://img.youtube.com/vi/jS8r7J65fXY/0.jpg)](https://www.youtube.com/watch?v=jS8r7J65fXY)


## Roadmap

### ✅ Recently Implemented

- **Multiple Question Types**: Now supporting 5 different exercise types - multiple choice, fill-in-the-blank, matching, true/false, and sentence completion (all configurable in settings)
- **Vision Garden**: LLM-powered image description for natural vocabulary discovery
- **Voice Chat**: Real-time voice conversations with LLM tutors using OpenAI's realtime API
- **Word Detail Pages**: Deep dive into individual words with context exploration, examples, and similar words
- **Audio Pronunciation System**: ElevenLabs integration with pronunciation and caching
- **Multi-Language Support**: Learn any language using any language with LLM validation
- **Template Library**: Vocabulary lists you can clone and customize
- **Classic Word Lists**: Traditional manual word entry with instant context-aware definitions
- **Light Reading**: Generated reading passages that highlight your vocabulary words
- **Progress Tracking**: Simple learned points system to track your vocabulary mastery
- **Get New Words**: LLM-generated vocabulary discovery with interactive learning sessions based on topics and difficulty levels

### 🚀 Coming Next

- **Advanced Progress Analytics**: Detailed statistics, mastery percentages, learning streaks, and daily goals
- **Enhanced Voice Features**: More natural conversation flows, pronunciation scoring, and voice-based exercises
- **Spaced Repetition**: Intelligent scheduling of word reviews based on forgetting curves
- **List Sharing**: Allow users to share their custom vocabulary lists with others
- **Mobile App**: Native iOS and Android applications for on-the-go learning
- **Browser Extension**: Add new words directly from web pages while reading
- **Offline Mode**: Download lists and practice without an internet connection
- **Gamification**: Achievements, badges, leaderboards, and learning challenges

### 🎯 Future Vision

- **LLM Tutor Personalities**: Choose different LLM tutors with unique teaching styles
- **Community Features**: Study groups, vocabulary challenges, and peer learning
- **Advanced Analytics**: Detailed insights into your learning patterns and optimization suggestions

## Getting Started

### Prerequisites

- Node.js >= 16
- npm or yarn
- MongoDB (local or cloud instance)
- An OpenAI API key
- A Pexels API key (optional - for Vision Garden stock photos)
- An ElevenLabs API key (optional - for audio pronunciation features)

### Installation

Clone the repository:
```bash
git clone https://github.com/baturyilmaz/wordpecker-app.git
cd wordpecker-app
```

Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Database Setup

Install and start MongoDB:

**Local MongoDB:**
```bash
# macOS (with Homebrew)
brew install mongodb/brew/mongodb-community
brew services start mongodb/brew/mongodb-community

# Ubuntu
sudo apt-get install mongodb
sudo systemctl start mongodb

# Windows
# Download and install from https://www.mongodb.com/try/download/community
```

**Or use MongoDB Atlas (cloud):**
1. Create a free account at https://www.mongodb.com/atlas
2. Create a new cluster
3. Get your connection string

### Configuration

Create `.env` files:

Backend `.env`:
```
PORT=3000
NODE_ENV=development
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
PEXELS_API_KEY=your_pexels_api_key_here  # Optional for Vision Garden stock photos
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here  # Optional for audio features
MONGODB_URL=mongodb://localhost:27017/wordpecker
```

Frontend `.env`:
```
VITE_API_URL=http://localhost:3000
```

**Note:** For MongoDB Atlas, use your connection string for `MONGODB_URL`:
```
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/wordpecker
```

### Development

The database will be automatically created when you first start the backend. No manual database setup is required as MongoDB is schemaless and Mongoose will handle collection creation.

Start the backend:
```bash
cd backend
npm run dev
```

Start the frontend:
```bash
cd frontend
npm run dev
```

## Docker Setup (Recommended)

For the easiest setup experience, use Docker to run the entire application with MongoDB:

### Prerequisites
- Docker and Docker Compose installed on your system

### Quick Start with Docker

1. **Clone and navigate to the project:**
```bash
git clone https://github.com/baturyilmaz/wordpecker-app.git
cd wordpecker-app
```

2. **Set up environment variables:**
```bash
# Copy the Docker environment template
cp .env.docker .env

# Edit .env and add your API keys
OPENAI_API_KEY=your_actual_openai_api_key_here
PEXELS_API_KEY=your_actual_pexels_api_key_here  # Optional for Vision Garden stock photos
ELEVENLABS_API_KEY=your_actual_elevenlabs_api_key_here  # Optional for audio features
```

3. **Start all services (MongoDB + Backend + Frontend):**
```bash
# For development with hot reload
docker-compose -f docker-compose.dev.yml up --build

# Or for production build
docker-compose up --build
```

4. **Access the application:**
   - Frontend: http://localhost:5173 (dev) or http://localhost:3000 (prod)
   - Backend API: http://localhost:3000
   - MongoDB: localhost:27017 (username: admin, password: password)

### Docker Commands

```bash
# Start services in development mode with hot reload
docker-compose -f docker-compose.dev.yml up --build

# Start services in production mode
docker-compose up --build

# Run in background
docker-compose -f docker-compose.dev.yml up -d

# Stop all services
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v

# View logs
docker-compose logs -f

# Rebuild specific service
docker-compose build backend
```

### MongoDB Access

When using Docker, MongoDB runs with these credentials:
- **Host:** localhost:27017
- **Username:** admin
- **Password:** password
- **Database:** wordpecker

You can connect to MongoDB using tools like MongoDB Compass or mongosh:
```bash
# Using mongosh
mongosh "mongodb://admin:password@localhost:27017/wordpecker?authSource=admin"
```

### Running Only MongoDB with Docker

If you prefer to run only MongoDB in Docker and the backend/frontend locally:

```bash
# Start only MongoDB
docker-compose -f docker-compose.mongo.yml up -d

# Update your backend .env file to use:
MONGODB_URL=mongodb://admin:password@localhost:27017/wordpecker?authSource=admin

# Then run backend and frontend locally
cd backend && npm run dev
cd frontend && npm run dev
```

### Easy Startup Script

For convenience, use the provided startup script:

```bash
# Make sure you have Docker and Docker Compose installed
./scripts/docker-dev.sh
```

This script will:
- Check if .env file exists and create it from template
- Validate OpenAI API key is set
- Clean up old containers and images
- Start all services in development mode
- Prompt you to add ElevenLabs API key for audio features (optional)

### Troubleshooting

**Backend won't connect to MongoDB:**
- Check that MongoDB container is healthy: `docker-compose ps`
- View logs: `docker-compose logs mongodb`
- The backend has retry logic and will attempt to connect 5 times

**Port conflicts:**
- Development setup uses ports 5173 (frontend), 3000 (backend), 27017 (mongodb)
- Production setup uses ports 3000 (frontend), 3001 (backend), 27017 (mongodb)
- Change ports in docker-compose files if needed

**Container build issues:**
- Rebuild without cache: `docker-compose build --no-cache`
- Clean everything: `docker system prune -a`

**Environment variables:**
- Make sure .env file has OPENAI_API_KEY set
- Optionally add ELEVENLABS_API_KEY for audio pronunciation features
- Check that environment variables are loaded: `docker-compose config`

## Architecture

- **Frontend**: React.js with TypeScript, Chakra UI components, Framer Motion animations
- **Backend**: Express.js with TypeScript, agent-based LLM architecture
- **Database**: MongoDB with Mongoose ODM
- **LLM**: OpenAI API (GPT-4, DALL-E, Realtime Voice API) | @openai/agents SDK
- **Audio**: ElevenLabs API for pronunciation, audio caching system
- **Images**: LLM-generated (DALL-E) and stock photos (Pexels integration)
- **Deployment**: Docker support for development and production
- **Single User**: No authentication required - localStorage-based user identification

## Contributing

Contributions are welcome!

1. Fork the repo
2. Create a feature branch
3. Commit changes
4. Push to your branch
5. Open a pull request

## License

[MIT](LICENSE)
