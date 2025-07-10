# SetlistScout Scraper Service

This is a separate microservice that handles web scraping for SetlistScout. It's designed to be deployed independently from the main application to separate concerns and comply with best practices.

## Why This Service Exists

The main SetlistScout application uses the official Setlist.fm API, but to get tour lists we need to scrape web pages. To maintain separation between API usage and web scraping, this service runs independently.

## Local Development

1. Install dependencies:
```bash
cd scraper-service
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Run the service:
```bash
npm run dev
```

The service will run on http://localhost:3001

## Deployment Options

### Option 1: Deploy to Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
cd scraper-service
vercel
```

3. Set environment variables in Vercel dashboard:
   - `USER_AGENT`: A unique user agent string
   - `ALLOWED_ORIGINS`: Your main backend URL

4. Update your main backend's `.env`:
```
SCRAPER_SERVICE_URL=https://your-project.vercel.app
```

### Option 2: Deploy to Netlify

1. Install Netlify CLI:
```bash
npm i -g netlify-cli
```

2. Deploy:
```bash
cd scraper-service
netlify deploy --prod
```

3. Set environment variables in Netlify dashboard

4. Update your main backend's `.env`:
```
SCRAPER_SERVICE_URL=https://your-project.netlify.app
```

### Option 3: Deploy to Railway/Render

Both platforms support Node.js applications. Simply:
1. Connect your repository
2. Set the root directory to `scraper-service`
3. Add environment variables
4. Deploy

## API Endpoints

### GET /health
Health check endpoint

### GET /tours/:slug
Fetches tours for a given artist slug

Example:
```bash
curl https://your-scraper.vercel.app/tours/the-beatles-23d6a88b
```

Response:
```json
{
  "tours": [
    {
      "id": "tour-id",
      "name": "Tour Name",
      "year": "2024",
      "showCount": 25
    }
  ],
  "artistSlug": "the-beatles-23d6a88b",
  "count": 10
}
```

## Security Notes

- Always use a different hosting provider than your main application
- Set appropriate CORS headers
- Use rate limiting in production
- Monitor usage to ensure respectful scraping

## Testing

Test the deployed service:
```bash
# Health check
curl https://your-scraper.vercel.app/health

# Get tours (replace with actual artist slug)
curl https://your-scraper.vercel.app/tours/radiohead-bd6bd8c
```