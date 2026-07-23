# flyer-personalizer

Turn any Canva poster template into a self-serve poster generator — 
attendees enter their name, ID, and photo, and get back a personalized, 
downloadable event poster. No design software or manual editing needed.

## How it works
1. Design a poster in Canva (free plan), leaving marker placeholders 
   for photo/name/ID
2. Export as PDF and upload via the admin panel
3. The backend auto-detects the markers and stores their coordinates
4. Attendees fill a form → backend crops their photo to fit, merges 
   everything into the template, and returns a PNG/PDF

## Tech stack
- Backend: Python, FastAPI, PyMuPDF, OpenCV
- Frontend: React / plain HTML+Tailwind
- Storage: Supabase / Cloudflare R2
- Hosting: Render + Vercel (free tier)

## Setup
...

## License
MIT
