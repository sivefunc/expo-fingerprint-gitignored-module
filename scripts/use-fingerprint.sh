#!/bin/sh
# Copies one version of @expo/fingerprint's build/sourcer/Sourcer.js into node_modules.
#   0.21.10   the published file
#   proposed  the fix: files that git ignores in a local module are not hashed
set -eu
cd "$(dirname "$0")/.."
cp "fingerprint-variants/Sourcer.$1.js" node_modules/@expo/fingerprint/build/sourcer/Sourcer.js
echo "@expo/fingerprint Sourcer.js: $1"
