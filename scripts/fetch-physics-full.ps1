$ErrorActionPreference = 'Stop'

$project = 'BA1F39653304A5B041B656915DC36B38'
$endpoint = 'https://ege.fipi.ru/bank/questions.php'
$pageSize = 100
$projectDir = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$downloaded = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)

for ($page = 0; $page -lt 100; $page++) {
    $target = [IO.Path]::GetFullPath((Join-Path $projectDir "physics-$($page + 1).raw.html"))
    if (-not $target.StartsWith($projectDir + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Invalid target path: $target"
    }
    $temporary = "$target.new"
    $form = "search=1&pagesize=$pageSize&proj=$project"
    if ($page -gt 0) {
        $form += "&page=$page"
    }

    & curl.exe -k --fail --silent --show-error --retry 3 --retry-all-errors --retry-delay 2 --max-time 90 -X POST $endpoint -d $form -o $temporary
    if ($LASTEXITCODE -ne 0) {
        Remove-Item -LiteralPath $temporary -Force -ErrorAction SilentlyContinue
        throw "Failed to download page $($page + 1)"
    }

    $html = [Text.Encoding]::GetEncoding(1251).GetString([IO.File]::ReadAllBytes($temporary))
    $count = [regex]::Matches($html, '<div\s+class=[''\"][^''\"]*\bqblock\b[^''\"]*[''\"]\s+id=[''\"]q[0-9A-Z]+[''\"]', 'IgnoreCase').Count
    if ($page -eq 0 -and $count -eq 0) {
        Remove-Item -LiteralPath $temporary -Force -ErrorAction SilentlyContinue
        throw 'FIPI returned no physics tasks'
    }
    if ($page -gt 0 -and $count -eq 0) {
        Remove-Item -LiteralPath $temporary -Force -ErrorAction SilentlyContinue
        break
    }

    Move-Item -LiteralPath $temporary -Destination $target -Force
    [void]$downloaded.Add($target)
    Write-Output "page=$($page + 1) tasks=$count file=$([IO.Path]::GetFileName($target))"

    if ($count -lt $pageSize) {
        break
    }
}

Get-ChildItem -LiteralPath $projectDir -Filter 'physics-*.raw.html' -File | ForEach-Object {
    if (-not $downloaded.Contains($_.FullName)) {
        Remove-Item -LiteralPath $_.FullName -Force
    }
}

$assetRoot = Join-Path $projectDir 'fipi-assets'
$assetPaths = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
Get-ChildItem -LiteralPath $projectDir -Filter 'physics-*.raw.html' -File | ForEach-Object {
    $html = [Text.Encoding]::GetEncoding(1251).GetString([IO.File]::ReadAllBytes($_.FullName))
    [regex]::Matches($html, '(?:src|href)=["'']\.\./\.\./([^"''?#]+)(?:\?[^"'']*)?["'']', 'IgnoreCase') | ForEach-Object {
        [void]$assetPaths.Add($_.Groups[1].Value)
    }
    [regex]::Matches($html, '["''](docs/[^"'']+)["'']', 'IgnoreCase') | ForEach-Object {
        [void]$assetPaths.Add($_.Groups[1].Value)
    }
}

foreach ($relativePath in $assetPaths) {
    $target = [IO.Path]::GetFullPath((Join-Path $assetRoot ($relativePath.Replace('/', [IO.Path]::DirectorySeparatorChar))))
    if (-not $target.StartsWith([IO.Path]::GetFullPath($assetRoot) + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Invalid asset path: $target"
    }
    if (Test-Path -LiteralPath $target) {
        continue
    }
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    $segments = $relativePath.Split('/') | ForEach-Object { [uri]::EscapeDataString($_) }
    & curl.exe -k --fail --silent --show-error --retry 3 --retry-all-errors --retry-delay 2 --max-time 90 ("https://ege.fipi.ru/" + ($segments -join '/')) -o $target
    if ($LASTEXITCODE -ne 0) {
        Remove-Item -LiteralPath $target -Force -ErrorAction SilentlyContinue
        Write-Warning "Failed to download asset: $relativePath"
    }
}

$taskIds = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
Get-ChildItem -LiteralPath $projectDir -Filter 'physics-*.raw.html' -File | ForEach-Object {
    $html = [Text.Encoding]::GetEncoding(1251).GetString([IO.File]::ReadAllBytes($_.FullName))
    [regex]::Matches($html, '<div\s+class=[''\"][^''\"]*\bqblock\b[^''\"]*[''\"]\s+id=[''\"]q([0-9A-Z]+)[''\"]', 'IgnoreCase') | ForEach-Object {
        [void]$taskIds.Add($_.Groups[1].Value)
    }
}

Write-Output "physics_tasks=$($taskIds.Count) assets=$($assetPaths.Count)"
