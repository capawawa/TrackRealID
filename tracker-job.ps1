Set-Location "$PWD"
$env:NODE_ENV = 'production'
node src/index.js > tracker-output.log 2>&1