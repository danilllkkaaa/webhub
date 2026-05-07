param(
  [string]$BaseUrl = "http://localhost",
  [switch]$SkipDocker
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message"
}

function Assert-HttpOk {
  param(
    [string]$Name,
    [string]$Url,
    [int[]]$AllowedStatus = @(200)
  )

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 15
  } catch {
    throw "$Name failed: $Url ($($_.Exception.Message))"
  }

  if ($AllowedStatus -notcontains [int]$response.StatusCode) {
    throw "$Name failed: $Url returned HTTP $($response.StatusCode)"
  }

  [pscustomobject]@{
    Check = $Name
    Url = $Url
    Status = [int]$response.StatusCode
  }
}

function Assert-JsonStatusOk {
  param(
    [string]$Name,
    [string]$Url
  )

  try {
    $response = Invoke-RestMethod -Uri $Url -TimeoutSec 15
  } catch {
    throw "$Name failed: $Url ($($_.Exception.Message))"
  }

  if ($response.status -ne "ok") {
    throw "$Name failed: expected status=ok, got $($response | ConvertTo-Json -Compress)"
  }

  [pscustomobject]@{
    Check = $Name
    Url = $Url
    Status = "ok"
  }
}

Write-Step "StudentHub smoke checks against $BaseUrl"

if (-not $SkipDocker) {
  Write-Step "Checking Docker Compose services"
  $composeJson = docker compose ps --format json
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose ps failed with exit code $LASTEXITCODE"
  }
  $services = $composeJson | ConvertFrom-Json
  $required = @("postgres", "redis", "backend", "nginx")

  foreach ($serviceName in $required) {
    $service = $services | Where-Object { $_.Service -eq $serviceName } | Select-Object -First 1
    if (-not $service) {
      throw "Docker service '$serviceName' is missing"
    }
    if ($service.State -ne "running") {
      throw "Docker service '$serviceName' is not running (state: $($service.State))"
    }
    if ($service.Health -and $service.Health -ne "healthy") {
      throw "Docker service '$serviceName' is not healthy (health: $($service.Health))"
    }
  }
}

$checks = @()
$checks += Assert-JsonStatusOk -Name "API health" -Url "$BaseUrl/api/health"
$checks += Assert-HttpOk -Name "Frontend root" -Url "$BaseUrl/"
$checks += Assert-HttpOk -Name "Admin login route" -Url "$BaseUrl/admin/login"
$checks += Assert-HttpOk -Name "Forgot password route" -Url "$BaseUrl/admin/forgot-password"
$checks += Assert-HttpOk -Name "Reset password route" -Url "$BaseUrl/admin/reset-password"
$checks += Assert-HttpOk -Name "Admin register route" -Url "$BaseUrl/admin/register"
$checks += Assert-HttpOk -Name "Admin projects route" -Url "$BaseUrl/admin/projects"
$checks += Assert-HttpOk -Name "Admin settings route" -Url "$BaseUrl/admin/settings"
$checks += Assert-HttpOk -Name "Admin courses route" -Url "$BaseUrl/admin/courses"
$checks += Assert-HttpOk -Name "Course builder route" -Url "$BaseUrl/admin/courses/demo/builder"
$checks += Assert-HttpOk -Name "Webinar watch route" -Url "$BaseUrl/webinars/demo/watch"
$checks += Assert-HttpOk -Name "Course invite route" -Url "$BaseUrl/course/join/demo"
$checks += Assert-HttpOk -Name "Student dashboard route" -Url "$BaseUrl/student/dashboard"

$checks | Format-Table -AutoSize
Write-Host "Smoke checks passed."
