# VirtuaNext

A free, open-source e-commerce platform built with **Next.js** and **Tailwind CSS**, designed to run on **Cloudflare** with zero hosting costs.

Built for startups, indie sellers, and small businesses. No monthly fees, no per-product charges.

**[Live Demo](https://virtuanext.dev)** · **[One-click Installer](https://virtuanext.com)**

## Features

- Multiple themes and color palettes, with dark and light mode
- Mobile-first, responsive design
- Dynamic, customizable navbar and footer
- Custom pages with their own slider
- Full admin panel to manage categories, brands, and products
- Dynamic SEO metadata for pages and products
- Shopping cart that can be turned on or off
- Optional WhatsApp contact button
- Payments with **Stripe** or **Mercado Pago**
- Cash payment in-store (optional)
- Shipping with your own carrier or **Melhor Envio**
- Basic sales reports

## Tech Stack

- [Next.js](https://nextjs.org/) and [Tailwind CSS](https://tailwindcss.com/)
- [Cloudflare Workers](https://workers.cloudflare.com/) via [OpenNext](https://opennext.js.org/cloudflare)

## Quick Start

The easiest way to get your store online is the installer at **[virtuanext.com](https://virtuanext.com)**. Enter your details and it deploys the store to your own Cloudflare account and domain.

## Running Locally

```bash
git clone https://github.com/Virtua-Next/ecommerce.git
cd ecommerce
npm install
cp .env.example .env
npm run dev
```

Then open http://localhost:3000.

## Requirements

To deploy your own store you will need:

- A [Cloudflare](https://www.cloudflare.com/) account
- Your Cloudflare Account ID and an API Token
- A domain (new or existing)

## Contributing

Issues and pull requests are welcome. For larger changes, please open an issue first to discuss what you would like to change.

## License

Released under the [MIT License](LICENSE).

## Disclaimer

VirtuaNext is an independent project and is not affiliated with, endorsed by, or sponsored by Cloudflare, Stripe, Mercado Pago, Melhor Envio, or any other company mentioned here. All trademarks belong to their respective owners.