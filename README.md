# @expo/fingerprint: a gitignored file in a local module changes the fingerprint after prebuild

A blank `create-expo-app` project (SDK 58) with `expo-updates` and `runtimeVersion: { policy: "fingerprint" }`.

- `modules/my-module` is a local Expo module, made with `npx create-expo-module --local`.
- `plugins/withSharedAttributes.js` is a local config plugin. On each prebuild, it copies `shared/SharedAttributes.swift`
  into `modules/my-module/ios/`. This is how an app shares one Swift file between its own module and another target,
  for example a widget extension.
- `.gitignore` lists the copy, `/modules/my-module/ios/SharedAttributes.swift`.

`@expo/fingerprint` hashes the whole directory of a local module, gitignored files included. The copy does not exist
before prebuild (a local machine, CI, the check that `eas build` runs before the upload). It exists after prebuild (on
EAS Build). So the iOS fingerprint is different before and after prebuild.

## Steps

Needs Node and git. No device and no native build.

```sh
npm install

# 1. iOS fingerprint before prebuild.
npx expo-updates fingerprint:generate --platform ios --debug > before.json

# 2. Prebuild. The config plugin copies the gitignored file into the local module.
npx expo prebuild -p ios --no-install
ls modules/my-module/ios        # MyModule.podspec MyModule.swift SharedAttributes.swift

# 3. iOS fingerprint after prebuild, and the sources that changed.
npx expo-updates fingerprint:generate --platform ios --debug > after.json
node scripts/diff-sources.js before.json after.json
```

**Expected:** the same fingerprint. The file is not in the repository, and EAS Build does not upload it.

**Actual:**

```text
hash: 55e5bbc158edcf4b9db5e559729b4f866d4e719a -> 5f24ed76241e8ec74ce6665d8f13241a22631ccd
changed source dir:modules/my-module/ios (expoAutolinkingIos): 5d3ed4323cf78ac53ac3de8ca885694848888d21 -> 7a466df30b53270352ff6bea749ca113c82db326
  file modules/my-module/ios/SharedAttributes.swift: absent -> 4aad8e4f79a437bbac9129a775ebaf168e880287
```

The Android fingerprint does not change, because the plugin writes only into `ios/`.

## Scripts

- `scripts/compare-prebuild.sh` runs the steps for iOS and Android from a clean state, then prints `MATCH` or
  `MISMATCH` for each platform. Outputs go to `build-logs/` (`OUT_DIR` changes it). It deletes `ios/`, `android/`, and
  the copy when it ends.
- `scripts/use-fingerprint.sh <variant>` copies one version of `build/sourcer/Sourcer.js` from `fingerprint-variants/`
  into `node_modules/@expo/fingerprint`:
  - `0.21.10`: the published file.
  - `proposed`: the proposed fix. Files that `.gitignore` ignores in a local module are not hashed.
- `scripts/simulate-eas-upload.sh` copies the project the way `eas build` uploads it (`git clone --no-checkout`, then
  the working tree without the gitignored files), runs prebuild in the copy, and prints its iOS fingerprint. Then it
  prints the iOS fingerprint of this checkout before prebuild. These are the two values that EAS Build compares.
- `scripts/diff-sources.js <before.json> <after.json>` prints the sources and files whose hash changed between two
  `fingerprint:generate --debug` outputs.

## Results (2026-11-19, macOS 26.7.3, Node 26.5.0, expo 58.0.26, @expo/fingerprint 0.21.10)

`scripts/compare-prebuild.sh`:

| `Sourcer.js` | iOS, before vs after prebuild | Android, before vs after prebuild |
|---|---|---|
| `0.21.10` | `55e5bbc1…` vs `5f24ed76…`: MISMATCH | `5aa793cd…` vs `5aa793cd…`: MATCH |
| `proposed` | `55e5bbc1…` vs `55e5bbc1…`: MATCH | `5aa793cd…` vs `5aa793cd…`: MATCH |

`scripts/simulate-eas-upload.sh`:

| `Sourcer.js` | Upload copy, after prebuild | This checkout, before prebuild |
|---|---|---|
| `0.21.10` | `5f24ed76…` | `55e5bbc1…` |
| `proposed` | `55e5bbc1…` | `55e5bbc1…` |

With `proposed`, a change to a tracked file of the module (`MyModule.swift`) still changes the iOS fingerprint.
