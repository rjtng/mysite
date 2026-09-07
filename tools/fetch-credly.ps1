<#
    Regenerates assets/js/data-certs.js from the public Credly profile.
    Usage:  powershell -ExecutionPolicy Bypass -File tools/fetch-credly.ps1
#>
$ErrorActionPreference = "Stop"
$User = "rjt"
$Root = Split-Path -Parent $PSScriptRoot
$Out  = Join-Path $Root "assets\js\data-certs.js"

$all = @()
$page = 1
do {
    $r = Invoke-RestMethod -Uri "https://www.credly.com/users/$User/badges.json?page=$page" -Headers @{ "User-Agent" = "Mozilla/5.0" }
    $all += $r.data
    $page++
} while ($page -le $r.metadata.total_pages)

function Get-Brand($name, $entities) {
    $names = @($entities | ForEach-Object { $_.entity.name })
    foreach ($b in @("IBM", "Meta", "Microsoft", "Cisco", "Google Cloud")) { if ($names -contains $b) { return $b } }
    if ($name -match '^IBM')        { return "IBM" }
    if ($name -match '^Meta')       { return "Meta" }
    if ($name -match '^Microsoft')  { return "Microsoft" }
    if ($name -match 'Google Cloud'){ return "Google Cloud" }
    if ($name -match '^Google')     { return "Google" }
    if ($names -contains "Google")  { return "Google" }
    return "Coursera"
}

function Get-Domain($name, $skills) {
    $t = "$name $skills"
    if ($t -match 'Cybersecurity|Cyber Security|Network Security|Threat|Security Analyst') { return "Security" }
    if ($t -match 'Kubernetes|Load Balanc|Cloud Architecture|Prometheus|Cloud SQL|Compute Engine|Google Cloud|DevNet|Docker|DevOps') { return "Cloud & DevOps" }
    if ($t -match 'CCNA|Network|IoT|Hardware|Switching|Routing|Wireless|Troubleshoot') { return "Networking" }
    if ($t -match 'AI|Machine Learning|Data Scien|Data Analy|Analytics|Business Intelligence|Gemini|Vertex|Generative|Data Engineering|Prompting') { return "AI & Data" }
    if ($t -match 'Developer|Front-End|Back-End|Full Stack|Full-Stack|Android|Database|JavaScript|Automation|IT Support|Software') { return "Development" }
    if ($t -match 'UX|UI|Design|Product Manager|Project Management|Program Manager|Agile|Marketing|E-Commerce') { return "Design & Product" }
    return "Development"
}

$featured = @(
    "Google AI Professional Certificate",
    "IBM Full-Stack JavaScript Developer Professional Certificate",
    "DevNet Associate",
    "Meta Front-End Developer Professional Certificate(v.1)",
    "IBM Data Science Professional Certificate (V3)",
    "Google UX Design Professional Certificate",
    "CCNA: Switching, Routing, and Wireless Essentials",
    "Google Cybersecurity Professional Certificate V2",
    "Cloud Architecture: Design, Implement, and Manage Skill Badge",
    "Meta Android Developer Certificate",
    "IBM Cybersecurity Analyst Professional Certificate (V2)",
    "Google Data Analytics Professional Certificate"
)

$objs = $all | ForEach-Object {
    $clean  = $_.badge_template.skills | ForEach-Object { $_.name } | Where-Object { $_ -notmatch '^PWID' }
    $skills = ($clean -join ", ")
    $nm     = $_.badge_template.name
    [PSCustomObject]@{
        name     = $nm
        brand    = (Get-Brand $nm $_.badge_template.issuer.entities)
        domain   = (Get-Domain $nm $skills)
        date     = $_.issued_at_date
        img      = $_.badge_template.image_url
        url      = "https://www.credly.com/badges/$($_.id)/public_url"
        skills   = @($clean | Select-Object -First 5)
        featured = [bool]($featured -contains $nm)
    }
} | Sort-Object { [datetime]$_.date } -Descending

$json = $objs | ConvertTo-Json -Depth 5
$js = "// Auto-generated from the public Credly profile at https://www.credly.com/users/$User`r`n" +
      "// $($objs.Count) verified credentials. Regenerate with tools/fetch-credly.ps1`r`n" +
      "window.CERTIFICATIONS = $json;`r`n"
$js | Out-File -FilePath $Out -Encoding utf8
Write-Host "Wrote $($objs.Count) credentials to $Out"
