# Offline API help

`gtapi` is the searchable, browse-first reference for the Lua API implemented
by this SDK. It works without a network connection and formats its output for
the PicoCalc terminal.

```sh
gtapi                 # browse categories
gtapi spr             # exact function lookup
gtapi controller      # search names and descriptions
gthelp sprite         # PicoCalc alias
```

Inside the browser, enter a displayed number to open it, `n` or `p` to change
pages, `b` to return to the categories, `/` to search, `?` for controls, and
`q` to quit.

## Using help while editing with Nano

Nano does not expose the word under its cursor to external commands. Suspend
Nano, run the browser, and resume the same editing session:

1. Press `Ctrl+Z` in Nano.
2. Run `gtapi` or `gtapi function_name`.
3. Quit with `q`.
4. Run `fg` to return to Nano.

This deliberately leaves the source buffer and global Nano configuration
untouched.

## Maintaining the index

The tracked `docs/api.json` inventory is generated from
`compiler/builtins.js`. After changing the API surface, run:

```sh
npm run api:generate
npm run api:check
```

`gtapi` also checks the descriptor hash at startup and refuses to display a
stale index.
