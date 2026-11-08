# LitVerse — NFT Marketplace & Community

LitVerse is a React + Vite NFT marketplace for LitVM LiteForge, with a wallet-authenticated community space powered by Supabase.

## Community features

- Public community feed
- Sign in with Ethereum wallet (EIP-4361 / SIWE) through Supabase Auth
- Wallet-authenticated posts and image uploads
- Likes, comments and threaded replies
- Creator profiles and follow/unfollow
- Notifications
- Report and block controls
- NFT showcase links
- Supabase Row Level Security (RLS)

Community posting is free. The community does not charge a posting fee or require an on-chain transaction; users sign a message to prove wallet ownership.

## Supabase project setup

The configured project is `litverse-community`.

1. In Supabase Dashboard, open **Authentication → Sign In / Providers → Web3 Wallet** and enable **Ethereum**.
2. In **Authentication → URL Configuration**, add your deployed frontend URL to the Redirect URLs allow-list. For Vercel preview URLs, add a suitable wildcard such as `https://*.vercel.app/**`; keep the production Site URL set to your actual production domain.
3. The database schema, RLS policies, indexes, and `community-images` Storage bucket are managed by the Supabase migrations in the project. The reference SQL is in `supabase/community.sql`.
4. Never expose a Supabase `service_role` key or secret key in frontend code.

The app has safe public defaults for this project's Supabase URL and publishable key. You may override them with environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

Deploy the repository root as a Vite project on Vercel. Build command: `npm run build`; output directory: `dist`.

## Network

LitVM LiteForge Testnet — Chain ID `4441` (`0x1159`).

- RPC: https://liteforge.rpc.caldera.xyz/http
- Explorer: https://liteforge.explorer.caldera.xyz
