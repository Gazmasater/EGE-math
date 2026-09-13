$ErrorActionPreference = 'Continue'
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$assetRoot = Join-Path $projectDir 'fipi-assets'
$baseUrl = 'https://ege.fipi.ru/'
$paths = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)

Get-ChildItem -LiteralPath $projectDir -Filter '*.raw.html' | ForEach-Object {
    $html = Get-Content -LiteralPath $_.FullName -Raw -Encoding Default
    [regex]::Matches($html, '(?:src|href)=["'']\.\./\.\./([^"''?#]+)(?:\?[^"'']*)?["'']', 'IgnoreCase') | ForEach-Object {
        [void]$paths.Add($_.Groups[1].Value)
    }
    [regex]::Matches($html, '["''](docs/[^"'']+)["'']', 'IgnoreCase') | ForEach-Object {
        [void]$paths.Add($_.Groups[1].Value)
    }
}

$downloaded = 0
$failed = 0
foreach ($relativePath in $paths) {
    try {
        $cleanPath = $relativePath.Replace('/', [IO.Path]::DirectorySeparatorChar)
        $target = Join-Path $assetRoot $cleanPath
        $parent = Split-Path -Parent $target
        if (-not (Test-Path -LiteralPath $parent)) {
            New-Item -ItemType Directory -Path $parent -Force | Out-Null
        }
        if (-not (Test-Path -LiteralPath $target)) {
            $segments = $relativePath.Split('/') | ForEach-Object { [uri]::EscapeDataString($_) }
            $url = $baseUrl + ($segments -join '/')
            Invoke-WebRequest -Uri $url -UseBasicParsing -OutFile $target -TimeoutSec 60
            $downloaded++
        }
    } catch {
        $failed++
        Write-Warning "Не удалось скачать: $relativePath"
    }
}

[pscustomobject]@{
    Found = $paths.Count
    Downloaded = $downloaded
    Failed = $failed
    Folder = $assetRoot
}
