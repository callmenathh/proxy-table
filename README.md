# Proxy Table

Play Commander in the browser with official cards, your own proxy art, and cards you design yourself.

## What works today (milestone 1)

- **Card creator** (`/creator`): upload art and let the site draw the card, or upload a finished image of the whole card. Mark a card as a reprint, search Scryfall for the real card, and its rules fill in and lock. Otherwise you set name, mana cost, supertype, type, subtypes, rules text, flavor text, power/toughness or loyalty, colors, rarity and artist. The card preview updates as you type. Text in parentheses renders as reminder text, `{W}`, `{2}`, `{T}` and friends render as symbols, and long text shrinks to fit. Download any card as a PNG. Tick "This is a token" to use it from the token button in game.
- **Decks** (`/decks`): paste a list in the usual export formats (Moxfield, Archidekt, MTGA style, plain `1 Sol Ring`). Official cards come from Scryfall. Cards whose names match something you made in the creator use your version. For any card you can upload a proxy image, paste an image link, or pick another official printing. Commander checks (100 cards, color identity, singleton) show as warnings.
- **Solo table** (`/play/<deck>`): opening hand of 7, drag cards between hand, battlefield, graveyard, exile, library and command zone. Click to tap, right-click for counters, face down, transform, token copies and moving to any zone. Life total, turns, mulligan, tokens, commander tax. Keys: `D` draw, `N` next turn, `U` untap all, `S` shuffle, `T` tap hovered card.

Everything is saved in your browser (IndexedDB). There are no accounts or servers yet.

## Running it

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000.

## Next

1. Multiplayer rooms (4 to 6 seats) on a Colyseus game server, with proxy images synced to everyone.
2. Accounts, decks and creations saved to a database, image storage, spectators.
3. Moderation for uploaded images, more card layouts (double-faced, sagas).

## Notes

Card data and images come from [Scryfall](https://scryfall.com). Proxy Table is unofficial fan content, not approved or endorsed by Wizards of the Coast. The card creator uses its own frame design, and cards it makes are marked as proxies.
