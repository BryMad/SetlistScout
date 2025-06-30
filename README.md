# SetlistScout

**Never be surprised at a concert again.** SetlistScout helps you discover what songs your favorite artists are actually playing on their current tour and generates Spotify playlists based on real setlist data.

Try it live at **[setlistscout.onrender.com](https://setlistscout.onrender.com)**

## What It Does

With concert tickets costing hundreds of dollars, wouldn't you want to know what you're paying for? SetlistScout analyzes recent tour data from setlist.fm to show you:

- **Songs most likely to be played** at your upcoming show
- **Probability percentages** for each song based on tour frequency
- **Spotify playlist generation** with songs ranked by likelihood
- **Tour-specific insights** so you know what to expect (and when to grab that bathroom break)

Perfect for festival prep, discovering deep cuts you should know, or just making sure your favorite song will actually be performed.

## Tech Stack

**Frontend:** React 18, Chakra UI, Vite, React Router  
**Backend:** Node.js, Express, Redis, Winston logging  
**APIs:** Setlist.fm, Spotify Web API, Deezer, MusicBrainz  
**Features:** Real-time progress updates via Server-Sent Events, session management, rate limiting

## Quick Start

### Prerequisites

- Node.js and npm
- Redis server
- Spotify Developer Account (for playlist features)

### Installation

1. **Clone the repository**

   ```bash
   git clone [your-repo-url]
   cd SetlistScout
   ```

2. **Install dependencies**

   ```bash
   npm run build
   ```

3. **Environment Setup**

   Create `.env` files in both `/frontend` and `/backend` directories:

   **Backend `.env`:**

   ```
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   REDIS_URL=redis://localhost:6379
   SESSION_SECRET=your_session_secret
   NODE_ENV=development
   ```

4. **Start the application**

   ```bash
   npm start
   ```

   The app will be available at `http://localhost:3000`

## How to Use

1. **Search for an artist in the search bar**
2. **Select an artist from the dropdown menu** 
3. **Wait for analysis** - the app will get the artist's most recent tour information from setlist.fm
4. **View results** ranked from most-played to least-played songs
5. **Generate Spotify playlist** (optional) to study up before the show

## Features

- **Smart tour detection** - automatically identifies and analyzes complete tour data
- **Multi-source matching** - cross-references Spotify, Deezer, and MusicBrainz for accurate song data
- **Real-time progress tracking** - watch as your data loads with live updates
- **Probability scoring** - see exactly how likely each song is to be played
- **Playlist export** - save directly to your Spotify account

## Development

The project uses a monorepo structure with separate frontend and backend folders. Key directories:

- `/frontend` - React application with Chakra UI
- `/backend` - Express server with API routes
- `/backend/routes` - API endpoints for setlists, auth, playlists
- `/backend/utils` - Core logic for data fetching and processing

## Contributing

This is a personal project, but feel free to fork and adapt for your own use!

---

_Built for music lovers who want to make the most of every concert experience._
