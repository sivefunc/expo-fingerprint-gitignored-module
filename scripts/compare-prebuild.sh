#!/bin/sh
# Generates the fingerprint before and after `npx expo prebuild`, for iOS and Android,
# and prints the sources that changed.
set -eu
cd "$(dirname "$0")/.."
out=${OUT_DIR:-build-logs}
mkdir -p "$out"

rm -rf ios android modules/my-module/ios/SharedAttributes.swift
for p in ios android; do
  npx expo-updates fingerprint:generate --platform $p --debug > "$out/$p-before-prebuild.json"
done

npx expo prebuild --no-install > "$out/prebuild.log" 2>&1
git checkout -- package.json   # prebuild rewrites the android and ios scripts
echo "after prebuild: $(ls modules/my-module/ios | tr '\n' ' ')"

for p in ios android; do
  npx expo-updates fingerprint:generate --platform $p --debug > "$out/$p-after-prebuild.json"
  echo "== $p"
  node scripts/diff-sources.js "$out/$p-before-prebuild.json" "$out/$p-after-prebuild.json"
  b=$(node -p "require('./$out/$p-before-prebuild.json').hash")
  a=$(node -p "require('./$out/$p-after-prebuild.json').hash")
  [ "$a" = "$b" ] && echo "MATCH" || echo "MISMATCH"
done
rm -rf ios android modules/my-module/ios/SharedAttributes.swift
