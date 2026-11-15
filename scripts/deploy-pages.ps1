# Build StudyOS lalu publikasikan ke GitHub Pages (branch gh-pages).
# Pakai: powershell -File scripts/deploy-pages.ps1
$ErrorActionPreference = 'Stop'

$root = Split-Path $PSScriptRoot -Parent
Push-Location $root
try {
  $env:BASE_PATH = '/studyos-kelas-9/'
  & npm.cmd run build

  $stage = Join-Path $env:TEMP 'studyos-pages'
  Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
  New-Item -ItemType Directory -Force -Path $stage | Out-Null
  Copy-Item 'dist\*' $stage -Recurse -Force
  Copy-Item (Join-Path $stage 'index.html') (Join-Path $stage '404.html')
  New-Item -ItemType File -Path (Join-Path $stage '.nojekyll') -Force | Out-Null

  Push-Location $stage
  git init -b gh-pages -q
  git add -A
  git commit -q -m "Deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
  git remote add origin https://github.com/Handipz/studyos-kelas-9.git
  git push -f origin gh-pages
  Pop-Location

  Write-Host 'Selesai. https://handipz.github.io/studyos-kelas-9/ (rebuild ~1 menit)' -ForegroundColor Green
}
finally {
  Pop-Location
}
