#!/bin/sh
# Copies one version of @expo/fingerprint's build/sourcer/Sourcer.js and build/ProjectWorkflow.js
# into node_modules.
#   0.21.10   the published files
#   proposed  the fix: files that .gitignore ignores in a local module are not hashed
set -eu
cd "$(dirname "$0")/.."
cp "fingerprint-variants/Sourcer.$1.js" node_modules/@expo/fingerprint/build/sourcer/Sourcer.js
cp "fingerprint-variants/ProjectWorkflow.$1.js" node_modules/@expo/fingerprint/build/ProjectWorkflow.js
echo "@expo/fingerprint Sourcer.js and ProjectWorkflow.js: $1"
