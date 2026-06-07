param(
    [string] $EnvPath = ".env.local",
    [string] $BaseUrl = "http://bbapi.buzzerbeater.com",
    [string] $PlayerId
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Read-DotEnv {
    param([string] $Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "Missing $Path. Create it with BB_LOGIN and BB_SECURITY_CODE before running this smoke test."
    }

    $values = @{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()
        if ($trimmed.Length -eq 0 -or $trimmed.StartsWith("#")) {
            continue
        }

        $match = [regex]::Match($trimmed, "^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$")
        if (-not $match.Success) {
            continue
        }

        $key = $match.Groups[1].Value
        $value = $match.Groups[2].Value.Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        $values[$key] = $value
    }

    return $values
}

function New-BbapiUrl {
    param(
        [string] $Endpoint,
        [hashtable] $Params
    )

    $pairs = New-Object System.Collections.Generic.List[string]
    foreach ($key in $Params.Keys) {
        $value = $Params[$key]
        if ($null -eq $value -or "$value" -eq "") {
            continue
        }

        $encodedKey = [uri]::EscapeDataString([string] $key)
        $encodedValue = [uri]::EscapeDataString([string] $value)
        $pairs.Add("${encodedKey}=${encodedValue}")
    }

    $url = "$($BaseUrl.TrimEnd('/'))/$Endpoint"
    if ($pairs.Count -gt 0) {
        $url = "$url`?$($pairs -join '&')"
    }

    return $url
}

function Get-XmlShape {
    param([xml] $Xml)

    $elements = $Xml.SelectNodes("//*")
    $counts = @{}
    $attributesByElement = @{}
    foreach ($element in $elements) {
        if (-not $counts.ContainsKey($element.Name)) {
            $counts[$element.Name] = 0
        }
        $counts[$element.Name] += 1

        if ($null -ne $element.Attributes -and $element.Attributes.Count -gt 0) {
            if (-not $attributesByElement.ContainsKey($element.Name)) {
                $attributesByElement[$element.Name] = @{}
            }
            foreach ($attr in $element.Attributes) {
                $attributesByElement[$element.Name][$attr.Name] = $true
            }
        }
    }

    $top = $counts.GetEnumerator() |
        Sort-Object -Property @{ Expression = "Value"; Descending = $true }, @{ Expression = "Key"; Ascending = $true } |
        Select-Object -First 20 |
        ForEach-Object { "$($_.Key)=$($_.Value)" }

    $attributeSummary = $attributesByElement.GetEnumerator() |
        Sort-Object -Property Key |
        Select-Object -First 20 |
        ForEach-Object {
            $names = $_.Value.Keys | Sort-Object
            "$($_.Key)($($names -join ','))"
        }

    $root = $Xml.DocumentElement
    $rootAttrs = @()
    if ($null -ne $root.Attributes) {
        foreach ($attr in $root.Attributes) {
            $rootAttrs += $attr.Name
        }
    }

    $directChildren = @()
    foreach ($child in $root.ChildNodes) {
        if ($child.NodeType -eq [System.Xml.XmlNodeType]::Element) {
            $directChildren += $child.Name
        }
    }

    return [pscustomobject]@{
        Root = $root.Name
        RootAttributes = ($rootAttrs | Sort-Object -Unique) -join ","
        DirectChildren = ($directChildren | Sort-Object -Unique) -join ","
        ElementCounts = $top -join "; "
        ElementAttributes = $attributeSummary -join "; "
    }
}

function Get-BbapiError {
    param([xml] $Xml)

    $errorNode = $Xml.SelectSingleNode("//error")
    if ($null -eq $errorNode) {
        return $null
    }

    return $errorNode.GetAttribute("message")
}

function Invoke-BbapiXml {
    param(
        [string] $Endpoint,
        [hashtable] $Params = @{}
    )

    $uri = New-BbapiUrl -Endpoint $Endpoint -Params $Params
    $response = Invoke-WebRequest -Uri $uri -WebSession $script:Session -UseBasicParsing -TimeoutSec 30
    [xml] $xml = $response.Content
    $errorMessage = Get-BbapiError -Xml $xml
    $shape = Get-XmlShape -Xml $xml

    return [pscustomobject]@{
        Endpoint = $Endpoint
        StatusCode = [int] $response.StatusCode
        Error = $errorMessage
        Xml = $xml
        Shape = $shape
    }
}

function Write-EndpointReport {
    param([pscustomobject] $Result)

    Write-Host "Endpoint: $($Result.Endpoint)"
    Write-Host "  HTTP: $($Result.StatusCode)"
    if ($null -ne $Result.Error) {
        Write-Host "  BBAPI error: $($Result.Error)"
    }
    Write-Host "  Root: $($Result.Shape.Root)"
    Write-Host "  Root attrs: $($Result.Shape.RootAttributes)"
    Write-Host "  Direct children: $($Result.Shape.DirectChildren)"
    Write-Host "  Element counts: $($Result.Shape.ElementCounts)"
    Write-Host "  Element attrs: $($Result.Shape.ElementAttributes)"
}

function Find-FinishedMatchId {
    param([xml] $ScheduleXml)

    $candidateNodes = $ScheduleXml.SelectNodes("//*[ @matchid or @matchId or @id ]")
    foreach ($node in $candidateNodes) {
        $id = $node.GetAttribute("matchid")
        if ([string]::IsNullOrWhiteSpace($id)) {
            $id = $node.GetAttribute("matchId")
        }
        if ([string]::IsNullOrWhiteSpace($id)) {
            $id = $node.GetAttribute("id")
        }
        if ([string]::IsNullOrWhiteSpace($id)) {
            continue
        }

        $attributeText = ""
        foreach ($attr in $node.Attributes) {
            $attributeText += " $($attr.Name)=$($attr.Value)"
        }
        $innerText = $node.InnerText

        $looksFinished =
            $attributeText -match "(?i)(score|homeScore|awayScore|homepoints|awaypoints)" -or
            $null -ne $node.SelectSingleNode(".//score[normalize-space(.) != '']") -or
            $innerText -match "\d+\s*-\s*\d+" -or
            $attributeText -match "(?i)(played|finished|completed)"

        if ($looksFinished) {
            return $id
        }
    }

    return $null
}

$envValues = Read-DotEnv -Path $EnvPath
$login = $envValues["BB_LOGIN"]
if ([string]::IsNullOrWhiteSpace($login)) {
    $login = $envValues["BB_LOGIN_NAME"]
}

$code = $envValues["BB_SECURITY_CODE"]
if ([string]::IsNullOrWhiteSpace($code)) {
    $code = $envValues["BB_ACCESS_KEY"]
}

$secondTeam = $envValues["BB_SECOND_TEAM"]

if ([string]::IsNullOrWhiteSpace($login) -or [string]::IsNullOrWhiteSpace($code)) {
    throw "$EnvPath must define BB_LOGIN and BB_SECURITY_CODE. Legacy aliases BB_LOGIN_NAME and BB_ACCESS_KEY are also accepted by this smoke script."
}

$script:Session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$results = New-Object System.Collections.Generic.List[object]

try {
    Write-Host "BBAPI smoke test started. Secrets and cookies are intentionally not printed."

    $loginParams = @{
        login = $login
        code = $code
    }
    if ($secondTeam -eq "1") {
        $loginParams["secondteam"] = "1"
    }

    $loginResult = Invoke-BbapiXml -Endpoint "login.aspx" -Params $loginParams
    $results.Add($loginResult)
    Write-EndpointReport -Result $loginResult

    $cookieCount = $script:Session.Cookies.Count
    Write-Host "  Cookie captured: $($cookieCount -gt 0)"

    if ($loginResult.Error) {
        throw "Login returned BBAPI error $($loginResult.Error)."
    }

    foreach ($endpoint in @("teaminfo.aspx", "roster.aspx", "schedule.aspx", "teamstats.aspx")) {
        $result = Invoke-BbapiXml -Endpoint $endpoint
        $results.Add($result)
        Write-EndpointReport -Result $result
    }

    if (-not [string]::IsNullOrWhiteSpace($PlayerId)) {
        Write-Host "Requested one player.aspx smoke test for a supplied player id. The player id is redacted."
        $playerResult = Invoke-BbapiXml -Endpoint "player.aspx" -Params @{ playerid = $PlayerId }
        $results.Add($playerResult)
        Write-EndpointReport -Result $playerResult
    }

    $scheduleResult = $results | Where-Object { $_.Endpoint -eq "schedule.aspx" } | Select-Object -First 1
    $matchId = Find-FinishedMatchId -ScheduleXml $scheduleResult.Xml
    if ($null -ne $matchId) {
        Write-Host "Selected one finished match candidate for boxscore smoke test. Match id is redacted."
        $boxscoreResult = Invoke-BbapiXml -Endpoint "boxscore.aspx" -Params @{ matchid = $matchId }
        $results.Add($boxscoreResult)
        Write-EndpointReport -Result $boxscoreResult
    } else {
        Write-Host "No finished match candidate was detected from schedule shape; skipping boxscore.aspx."
    }
}
finally {
    try {
        $logoutResult = Invoke-BbapiXml -Endpoint "logout.aspx"
        Write-EndpointReport -Result $logoutResult
    } catch {
        Write-Host "logout.aspx failed during cleanup: $($_.Exception.Message)"
    }
}

Write-Host "BBAPI smoke test finished."
