# Luminordic Website

Static mirror of `https://www.luminordic.com/` with the Askly chatbot removed.

## Netlify

- Build command: none
- Publish directory: `.`

## Render Chatbot

- Chatbot service lives in [`chatbot`](./chatbot).
- Root [`render.yaml`](./render.yaml) deploys that folder to Render as a separate Node service.
- Widget loader URL after deploy: `https://YOUR-RENDER-URL/widget/loader.js`

## Notes

- This is a static copy of a WordPress/WooCommerce site.
- Dynamic features such as cart, checkout, account pages, search, and some forms depend on the original backend and may not work on Netlify without extra backend work.
- SEO tags and canonical URLs still point to the original Luminordic domain and should be updated before going live on a new production domain.
