This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Chatbot & Scraping

This project includes a sample chatbot that uses data scraped from [smileon.com.au](https://www.smileon.com.au/).

### Scraping & Embedding Data

To scrape the latest data from the website and upload it to the Vector DB (Pinecone), run:

1.  **Scrape**:
    ```bash
    node scripts/scrape.js
    ```
2.  **Embed**:
    ```bash
    node scripts/embed.js
    ```

### Chatbot

The chatbot is available on the home page. It uses GPT-4o-mini and Pinecone to answer questions.

## Configuration

Create a `.env.local` file with the following keys:

```env
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=smile-on-index
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
