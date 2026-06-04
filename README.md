# Bass Interval Board

A mobile-friendly web app: 5-string bass fretboard (open + 20 frets, nut-to-bridge taper) with draggable, color-coded interval stickers (R, b2, 2, b3, …).

## Run on your computer

```bash
cd ~/Projects/bass-interval-board
python3 -m http.server 8080
```

Open http://localhost:8080 on your phone (same Wi‑Fi): use your Mac’s local IP, e.g. http://192.168.1.x:8080

## Use on your phone

1. Serve the folder (command above, or deploy to Netlify/Vercel/GitHub Pages).
2. Open the URL in Safari or Chrome.
3. **iOS:** Share → Add to Home Screen for an app-like shortcut.
4. Drag stickers onto any fret wire (replaces any sticker already there). Tap a placed sticker to remove it.
5. Choose **Root** + **Scale** (e.g. C + Major), enable **Show scale notes** to label scale tones on the neck (root in gold).

Layouts auto-save to the browser when you tap **Save**. Scale settings are saved automatically.
