#!/usr/bin/env bash
set -euo pipefail

# Render the same Liquid template used by the Publish workflow.
yq -I 0 -o json _data/rules.yml > _data/rules.json
trap 'rm -f _data/rules.json' EXIT

for service in $(jq -r '.groups[].services[] | @base64' _data/rules.json); do
  serviceJson=$(printf '%s' "$service" | base64 --decode)
  subdir="test/rules/$(printf '%s' "$serviceJson" | jq -r '.name | ascii_downcase | split(" ") | join("-")')"
  mkdir -p "$subdir"

  for exporter in $(printf '%s' "$serviceJson" | jq -r '.exporters[] | @base64'); do
    exporterJson=$(printf '%s' "$exporter" | base64 --decode)
    exporterName=$(printf '%s' "$exporterJson" | jq -r '.slug')
    liquid "$exporterJson" < dist/template.yml > "$subdir/$exporterName.yml"
    printf '%s\n' "$subdir/$exporterName.yml"
  done
done
