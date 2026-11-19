#!/bin/sh
# Copies the project the way `eas build` uploads it (eas-cli, requireCommit: false): a
# `git clone --no-checkout`, then the working tree without the files that .gitignore ignores.
# In that copy, runs prebuild and prints the iOS fingerprint, as EAS Build calculates it.
# Then prints the iOS fingerprint of this checkout before prebuild, as the local check does.
set -eu
cd "$(dirname "$0")/.."
root=$PWD
copy=$(mktemp -d)/upload
git clone -q --no-checkout "file://$root" "$copy"
git ls-files -z --cached --others --exclude-standard | xargs -0 tar cf - | (cd "$copy" && tar xf -)
cp -R node_modules "$copy/node_modules"   # EAS Build runs `npm install`; a copy is faster here
hash() { npx expo-updates fingerprint:generate --platform ios | node -p 'JSON.parse(require("fs").readFileSync(0)).hash'; }

(cd "$copy" && npx expo prebuild -p ios --no-install > /dev/null 2>&1 && echo "upload copy, after prebuild:   $(hash)")
rm -rf ios modules/my-module/ios/SharedAttributes.swift
echo "this checkout, before prebuild: $(hash)"
rm -rf "$(dirname "$copy")"
