#!/bin/sh
set -eu
VERSION=8.14.8
SHA256=94da89692fc3ca6d2d0ce6bb48548762ea0f1897ba444286f5c7f3759c7af651
CACHE="${GRADLE_USER_HOME:-$HOME/.gradle}/mdr-bootstrap/gradle-$VERSION"
if [ ! -x "$CACHE/bin/gradle" ]; then
  command -v curl >/dev/null 2>&1 || { echo "Install curl first" >&2; exit 1; }
  command -v unzip >/dev/null 2>&1 || { echo "Install unzip first" >&2; exit 1; }
  command -v sha256sum >/dev/null 2>&1 || { echo "Install coreutils (sha256sum) first" >&2; exit 1; }
  mkdir -p "$(dirname "$CACHE")"
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  curl -fL --retry 3 "https://services.gradle.org/distributions/gradle-$VERSION-bin.zip" -o "$TMP/gradle.zip"
  echo "$SHA256  $TMP/gradle.zip" | sha256sum -c -
  mkdir -p "$TMP/unpacked"
  unzip -q "$TMP/gradle.zip" -d "$TMP/unpacked"
  mv "$TMP/unpacked/gradle-$VERSION" "$CACHE"
fi
exec "$CACHE/bin/gradle" "$@"
