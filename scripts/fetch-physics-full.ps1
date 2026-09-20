$ErrorActionPreference = 'Stop'

$project = 'BA1F39653304A5B041B656915DC36B38'
$endpoint = 'https://ege.fipi.ru/bank/questions.php'
$pageSize = 100

for ($page = 0; $page -lt 100; $page++) {
    $target = Join-Path $PSScriptRoot "..\physics-$($page + 1).raw.html"
    $form = "search=1&pagesize=$pageSize&proj=$project&qkind=ILI_STD_FULL"
    if ($page -gt 0) {
        $form += "&page=$page"
    }

    & curl.exe -k --fail --silent --show-error --max-time 60 -X POST $endpoint -d $form -o $target
    if ($LASTEXITCODE -ne 0) {
        throw "Не удалось загрузить страницу $($page + 1)"
    }

    $html = [Text.Encoding]::GetEncoding(1251).GetString([IO.File]::ReadAllBytes($target))
    $count = [regex]::Matches($html, '<div\s+class=[''\"][^''\"]*\bqblock\b[^''\"]*[''\"]\s+id=[''\"]q[0-9A-Fa-f]+[''\"]').Count
    Write-Output "page=$($page + 1) tasks=$count file=$([IO.Path]::GetFileName($target))"

    if ($page -eq 0 -and $count -eq 0) {
        throw 'FIPI returned no full-answer tasks'
    }
    if ($count -lt $pageSize) {
        break
    }
}

$assetRoot = Join-Path $PSScriptRoot '..\fipi-assets'
$assetPaths = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
Get-ChildItem (Join-Path $PSScriptRoot '..') -Filter 'physics-*.raw.html' | ForEach-Object {
    $html = [Text.Encoding]::GetEncoding(1251).GetString([IO.File]::ReadAllBytes($_.FullName))
    [regex]::Matches($html, '(?:src|href)=["'']\.\./\.\./([^"''?#]+)(?:\?[^"'']*)?["'']', 'IgnoreCase') | ForEach-Object {
        [void]$assetPaths.Add($_.Groups[1].Value)
    }
    [regex]::Matches($html, '["''](docs/[^"'']+)["'']', 'IgnoreCase') | ForEach-Object {
        [void]$assetPaths.Add($_.Groups[1].Value)
    }
}

foreach ($relativePath in $assetPaths) {
    $target = Join-Path $assetRoot ($relativePath.Replace('/', [IO.Path]::DirectorySeparatorChar))
    if (Test-Path -LiteralPath $target) {
        continue
    }
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    $segments = $relativePath.Split('/') | ForEach-Object { [uri]::EscapeDataString($_) }
    & curl.exe -k --fail --silent --show-error --retry 3 --retry-all-errors --retry-delay 2 --max-time 60 ("https://ege.fipi.ru/" + ($segments -join '/')) -o $target
    if ($LASTEXITCODE -ne 0) {
        Remove-Item -LiteralPath $target -Force -ErrorAction SilentlyContinue
        Write-Warning "Failed to download asset: $relativePath"
    }
}

$taskMatches = Select-String -Path (Join-Path $PSScriptRoot '..\physics-*.raw.html') -Pattern 'id=''q[0-9A-Fa-f]+' -AllMatches
Write-Output "physics_tasks=$($taskMatches.Matches.Count) assets=$($assetPaths.Count)"
