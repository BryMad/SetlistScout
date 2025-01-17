# What is Concert Cram?

Ever go to a concert, only to realize the band isn't' playing that one song you love?

Or maybe you picked a Coachella band based on a Spotify "THIS IS Band X" playlist... only to realize that wasn't "Band X," and they're now only playing their new album.

Concert Cram is a web app that helps users discover the songs their favorites artists are currently playing on tour and generates Spotify playlists based on that information.

With concerts getting so ridiculously expensive, Concert Cram helps you be more informed before a big show. And once you've bought tickets, the app can help you cram for the show so you can sing along to every song (or know which songs you can skip for a bathroom break).

# How to install:

- clone from git
- run `npm install` in the /src folder to install the front-end libraries and dependencies
- run `npm install` in /server folder to install the server libraries and dependencies

# How to run:

- open 2 terminal windows
- in 1st window, navigate to ~/ConcertCram/server and run "node server"
- in 2nd window, navigate to ~/ConcertCram/src run "npm run dev"
- in your browser navigate to http://localhost:5173/

Now find a recent show from your desired artist from setlist.fm (make sure the show is part of a TOUR, not a one of random benefit concert!). Input the URL to ConcertCram's input bar, hit enter, then sit back an relax.

It will take some time, but the site will return the songs being played on the currents artist's tour in order of most played to least and give you likelihood that each will be played on any given night of the tour.

If you have a spotify account, you can log in and save a spotify playlist of the songs. It will also be in order from "most played" to "least played."
