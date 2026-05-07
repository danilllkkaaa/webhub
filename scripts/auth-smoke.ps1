param(
  [string]$BaseUrl = "http://localhost",
  [string]$EnvPath = ".env"
)

$ErrorActionPreference = "Stop"

function Read-DotEnvValue {
  param([string]$Name)
  if (-not (Test-Path $EnvPath)) {
    throw "Env file not found: $EnvPath"
  }
  $line = Get-Content $EnvPath | Where-Object { $_ -like "$Name=*" } | Select-Object -First 1
  if (-not $line) {
    throw "Missing $Name in $EnvPath"
  }
  return ($line -replace "^$Name=", "").Trim()
}

function Invoke-Json {
  param(
    [string]$Method,
    [string]$Url,
    [hashtable]$Body,
    [hashtable]$Headers = @{}
  )
  Invoke-RestMethod -Method $Method -Uri $Url -Headers $Headers -ContentType "application/json" -Body ($Body | ConvertTo-Json) -TimeoutSec 20
}

$adminEmail = Read-DotEnvValue "ADMIN_EMAIL"
$adminPassword = Read-DotEnvValue "ADMIN_PASSWORD"

Write-Host "==> Auth smoke checks against $BaseUrl"

$forgot = Invoke-Json -Method "Post" -Url "$BaseUrl/api/auth/forgot-password" -Body @{ email = $adminEmail }
if (-not $forgot.reset_token) {
  throw "forgot-password did not return reset_token. For local auth smoke set EXPOSE_PASSWORD_RESET_TOKEN=true."
}

Invoke-Json -Method "Post" -Url "$BaseUrl/api/auth/reset-password" -Body @{
  token = $forgot.reset_token
  new_password = $adminPassword
  password_confirm = $adminPassword
} | Out-Null

$login = Invoke-Json -Method "Post" -Url "$BaseUrl/api/auth/login" -Body @{
  email = $adminEmail
  password = $adminPassword
}
if (-not $login.access_token) {
  throw "login did not return access_token"
}

$me = Invoke-RestMethod -Uri "$BaseUrl/api/auth/me" -Headers @{ Authorization = "Bearer $($login.access_token)" } -TimeoutSec 20
if ($me.email -ne $adminEmail) {
  throw "auth/me returned unexpected email: $($me.email)"
}

try {
  Invoke-Json -Method "Post" -Url "$BaseUrl/api/auth/reset-password" -Body @{
    token = $forgot.reset_token
    new_password = $adminPassword
    password_confirm = $adminPassword
  } | Out-Null
  throw "reset-password allowed token reuse"
} catch {
  if ($_.Exception.Response.StatusCode.value__ -ne 400) {
    throw
  }
}

[pscustomobject]@{
  ForgotPassword = "ok"
  ResetPassword = "ok"
  Login = "ok"
  Me = "ok"
  TokenReuseRejected = "ok"
} | Format-Table -AutoSize

Write-Host "Auth smoke checks passed."
