#!/usr/bin/env bash
# Stages a deployable dist/ folder for each Lambda that preserves the
# repo's real directory nesting (lambdas/<name>/index.mjs next to a
# shared/ sibling), rather than flattening everything to the zip root.
# That's deliberate: index.mjs's relative import of ../../shared/*.mjs is
# written once and works identically whether it's run locally out of the
# repo or deployed — nothing gets rewritten between the two, which is
# exactly the kind of path translation that's easy to get subtly wrong.
#
# Terraform's archive_file data source then just zips lambdas/<name>/dist/
# as-is, and the Lambda's handler is configured as
# "lambdas/<name>/index.handler" (a path within the zip), not "index.handler".
set -euo pipefail
cd "$(dirname "$0")/.."

build_one() {
  local name="$1"
  shift
  local shared_files=("$@")

  local dist="lambdas/$name/dist"
  rm -rf "$dist"
  mkdir -p "$dist/lambdas/$name"
  mkdir -p "$dist/shared"

  cp "lambdas/$name/index.mjs" "$dist/lambdas/$name/"
  cp "lambdas/$name/package.json" "$dist/lambdas/$name/"
  cp -r "lambdas/$name/node_modules" "$dist/lambdas/$name/node_modules"

  for f in "${shared_files[@]}"; do
    cp "shared/$f" "$dist/shared/"
  done

  echo "Built $dist"
}

build_one get-upload-url jwt.mjs
build_one process-import student-validation.mjs
build_one process-submission

echo "Done — terraform apply will zip lambdas/<name>/dist/ as each function's deployment package."
