# Shared compiler development

The `android-termux` development branch uses `file:../../luacretro` as its
compiler dependency. Keep these sibling checkouts:

```text
dev/
  luacretro/                 branch: gtlua-compiler-sync
  gametank/gametank_lua_sdk/ branch: android-termux
  genesis/md_lua_sdk/        branch: luacretro-sync-test
```

Check out the synchronized compiler branch before installing SDK dependencies:

```sh
git -C ../../luacretro switch gtlua-compiler-sync
npm install --ignore-scripts
npm ls luacretro
npm test
node test/golden-c.mjs check
```

On PowerShell, use `npm.cmd`. `npm ls` should resolve luacretro to the sibling
checkout. Compiler edits there take effect immediately; no loader override or
copy into this SDK is required. The compiler must include the SDK descriptor
hooks for custom emission and numeric constant evaluation.

`compiler/builtins.js` owns API availability, GameTank palette policy, and the
runtime helper selection. `compiler/constant-math.js` owns GameTank's sqrt
approximation. The shared compiler owns parsing, type checking, and generic
lowering. The historical `vendor/luacretro` directory remains for comparison
and preservation of local work; it is no longer the installed dependency.

This relative dependency is for sibling-checkout development. Before publishing
the SDK, replace it with a tested release or an immutable Git commit available
to consumers, and regenerate the lockfile. Do not publish with the relative
development dependency.
