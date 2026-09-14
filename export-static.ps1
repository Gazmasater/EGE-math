$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$docsDir = Join-Path $projectDir 'docs'
$basePath = '/EGE-math/'

if (Test-Path -LiteralPath $docsDir) {
    Remove-Item -LiteralPath $docsDir -Recurse -Force
}
New-Item -ItemType Directory -Path $docsDir -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $projectDir 'fipi-assets') -Destination (Join-Path $docsDir 'fipi') -Recurse
New-Item -ItemType File -Path (Join-Path $docsDir '.nojekyll') -Force | Out-Null

$sections = @('', 'equations', 'inequalities', 'finance', 'optimal', 'planimetry', 'parameters', 'numbers')
foreach ($section in $sections) {
    $url = if ($section) { "http://localhost:8765/$section" } else { 'http://localhost:8765/' }
    $html = (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 60).Content
    $html = $html.Replace('href="/"', "href=`"$basePath`"")
    foreach ($name in $sections | Where-Object { $_ }) {
        $html = $html.Replace("href=`"/$name`"", "href=`"$basePath$name/`"")
    }
    $html = [regex]::Replace($html, 'href="/added\?section=[^"]+"', "href=`"${basePath}added/`"")
    $html = $html.Replace('href="/fipi/', "href=`"${basePath}fipi/")
    $html = $html.Replace('src="/fipi/', "src=`"${basePath}fipi/")
    $html = $html.Replace("var qfiles_location='/fipi/';", "var qfiles_location='${basePath}fipi/';")
    $html = [regex]::Replace($html, '<form method="post" action="/update\?section=[^"]+"><button[^>]*>[^<]*</button></form>', '<span class="local-page-label" style="color:white">Update is available locally</span>')
    $targetDir = if ($section) { Join-Path $docsDir $section } else { $docsDir }
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    [IO.File]::WriteAllText((Join-Path $targetDir 'index.html'), $html, [Text.UTF8Encoding]::new($false))
}

$addedDir = Join-Path $docsDir 'added'
New-Item -ItemType Directory -Path $addedDir -Force | Out-Null
$addedHtml = @"
<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>New tasks</title><style>body{font:16px Arial;max-width:760px;margin:60px auto;padding:20px;color:#183153}a{color:#1769aa}</style></head>
<body><h1>New tasks</h1><p>New tasks appear after refreshing the local version.</p><p><a href="$basePath">Back to tasks</a></p></body></html>
"@
[IO.File]::WriteAllText((Join-Path $addedDir 'index.html'), $addedHtml, [Text.UTF8Encoding]::new($false))

Write-Output "Static site created: $docsDir"
