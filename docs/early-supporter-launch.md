# LitVerse Genesis — Early Supporter NFT Launch Plan

## Confirmed campaign decisions

- Collection: **LitVerse Genesis — Early Supporter**
- Supply target: **250 NFTs**
- Mint price: **0 zkLTC** (free to eligible recipients)
- Network: **LitVM LiteForge Testnet**, chain ID **4441** (`0x1159`)
- Existing NFT marketplace and deployed contract must be preserved.
- Audience: selected official early users and genuine early LitVerse/LitVM supporters.
- Do not publish a public mint button until the distribution and eligibility controls are verified.

## Existing contract constraints

The previously recorded deployed proxy is `0x07F5178920C3C48d582f9FeB04fd1387d25a9B39` on LiteForge. The recorded ABI includes:

- `ownerMint(address,uint256,string)` — owner-only reserved mint.
- `publicMint(uint256,string)` — public mint.
- `reservedRemaining()` and `setReservedRemaining(uint256)`.
- `maxSupply()`, `walletMintLimit()`, and `walletMinted(address)`.

The recorded ABI did not show a whitelist/allowlist mint function. Therefore, the safest contract-preserving first approach is **owner-distributed free mints to a verified recipient list**, not an open public mint. Do not assume the current reserve is at least 250 or that the function's string argument is a per-token URI until the exact deployed ABI/source and on-chain state are checked.

## Launch phases

### Phase 1 — Preflight (read-only; no transactions)

1. Confirm the deployed proxy address and chain ID.
2. Read the proxy's owner, max supply, total minted, reserved remaining, wallet limit, sale state, and relevant implementation/ABI.
3. Confirm that at least 250 reserved mint slots are available without reducing an existing commitment or breaking the public sale.
4. Confirm the exact `ownerMint(address,uint256,string)` parameter semantics and emitted events from the verified source/ABI.
5. Confirm metadata URI strategy and that all 250 JSON metadata files and artwork resolve correctly.
6. Do not call `configureSale`, `setReservedRemaining`, upgrade, pause, or any mint function during preflight.

### Phase 2 — Artwork and metadata

- Create one original Genesis artwork direction and a consistent 250-piece collection identity.
- Assign stable serials `#001` through `#250`.
- Prepare a metadata JSON for each token with name, description, image URI, collection name, serial/edition attributes, and external URL.
- Pin artwork and metadata to durable IPFS storage (or the project's chosen permanent storage); test every URI before minting.
- Do not put private recipient information in token metadata.

### Phase 3 — Eligibility and recipient list

- Use a manually reviewed list of up to 250 wallet addresses.
- Eligibility categories: verified early LitVerse users, active early community contributors, and selected genuine LitVM supporters.
- Deduplicate and checksum/validate every address; confirm each recipient opted in and can receive an NFT.
- Keep the recipient list private; never publish wallet-to-person identity mappings.
- Save a CSV with columns: `wallet_address, recipient_label, eligibility_reason, approved, token_serial, mint_status, tx_hash`.
- A recipient gets at most the approved allocation; the campaign total must never exceed 250.

### Phase 4 — Distribution

- Use the existing owner-only reserved mint only after the preflight is passed.
- Test with one internal wallet first; verify token ownership, token URI, serial/metadata, and explorer display.
- Then distribute in small batches with a transaction log and independently verify every receipt.
- Track successful mints against the 250 cap; retry only failed recipients after checking chain state.
- Do not enable public mint for this campaign. No new contract or upgrade is authorized by this plan.

### Phase 5 — Claim communication and launch

- Announce eligibility and claim instructions only after the mint flow is tested.
- Explain that NFT minting may consume gas from the project owner wallet; recipients should not be asked to pay a mint fee.
- Never ask users for seed phrases or private keys. Users should only share a public wallet address.
- Publish the collection page and explorer links after metadata and ownership are verified.
- Report the actual minted count; do not claim all 250 are distributed unless on-chain checks confirm it.

## Go / no-go checklist

Launch only when all are true:

- [ ] Deployed proxy, owner, reserve and supply values verified on-chain.
- [ ] At least 250 eligible reserved slots confirmed, or a separately approved safe allocation is documented.
- [ ] Exact ownerMint ABI semantics verified from source/ABI.
- [ ] Artwork and all metadata URIs tested.
- [ ] Recipient list reviewed, opted-in, valid and deduplicated.
- [ ] One internal test mint and explorer verification completed.
- [ ] Gas funding for the distributing owner wallet confirmed.
- [ ] Rollback/stop procedure and transaction log prepared.

**Current status: PLANNING / NOT LIVE.** No contract transaction, mint, sale configuration change, or upgrade has been performed by adding this document.
