# Luminordic Chatbot

Render-ready chatbot service and embeddable widget for the cloned LUMI / Luminordic site.

## Local

Run the backend from [`server`](./server):

```bash
npm install
npm start
```

Default local URLs:

- `http://localhost:3001/health`
- `http://localhost:3001/demo`
- `http://localhost:3001/widget/loader.js`

## Product Catalog

The chatbot does not use Shopify or WooCommerce APIs directly. It rebuilds a local product catalog from the mirrored website files in `../toode`.

Rebuild it with:

```bash
python3 scripts/build_product_catalog.py
```

## Deploy

- The widget/backend is intended for Render.
- In this monorepo, the root [`render.yaml`](../render.yaml) deploys the `chatbot` folder.
- Required env vars are listed in [`.env.example`](./.env.example).
- Embed snippet after deploy:

```html
<script src="https://YOUR-RENDER-URL/widget/loader.js" defer></script>
```
