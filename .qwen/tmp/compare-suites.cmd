@echo off
setlocal
set "PATH=C:\Program Files\nodejs;%PATH%"
set "ANCHOR_WALLET=target/deploy/atmogrid-keypair.json"
set "ANCHOR_PROVIDER_URL=https://api.devnet.solana.com"
set "ANCHOR_IDL_DIR=target/idl"
set "TS_NODE_PROJECT=tsconfig.anchor.json"
set "TS_NODE_TRANSPILE_ONLY=1"
cd /d "C:\Users\Dell\OneDrive\Documents\GitHub\dAppSolQwen"
git show HEAD:tests/atmogrid.ts > .qwen\tmp\old-atmogrid.ts
echo ==================================================================
echo  HEAD (neutered, commit 66c6b56) -- same env, same cluster
echo ==================================================================
"C:\Program Files\nodejs\node.exe" node_modules\mocha\bin\mocha.js --require ts-node/register -t 120000 .qwen\tmp\old-atmogrid.ts
echo ### old suite exit code %ERRORLEVEL%
echo ==================================================================
echo  REMEDIATED (this rewrite) -- same env, same cluster
echo ==================================================================
"C:\Program Files\nodejs\node.exe" node_modules\mocha\bin\mocha.js --require ts-node/register -t 120000 tests\atmogrid.ts
echo ### new suite exit code %ERRORLEVEL%
