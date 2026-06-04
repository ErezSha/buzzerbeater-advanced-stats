# BBAPI Programmer’s Manual
BBAPI allows client applications to access all sorts of data about BuzzerBeater teams wrapped inside formally defined XML containers by issuing a sequence of HTTP GET requests.

Basics
------

The workflow of an application accessing data via BBAPI is as follows:

*   The client program hits `login.aspx`, passing the login name and the password of the user.
*   The server sets an authentication cookie, which must be sent with all the following requests (your HTTP client library will usually take care of this part).
*   The client program hits various pages and retrieves the data.
*   The client program hits `logout.aspx` in order to end the session.

The rest of this document will walk you through the various pages. You can ask for clarifications in the BB App Developers forum. The staff will try to answer BBAPI-related questions as quickly as possible; keep in mind, though, that we cannot guarantee we’ll answer programming questions that do not concern BBAPI (we might be busy fixing the site, implementing some new feature or, well, we might not know your language of choice :).

Pages
-----

The rest of this document will walk you through the various pages. You can ask for clarifications in the BB App Developers forum.

### Generics

#### Errors

Errors result in pages having the following structure:

```

            <?xml version='1.0' encoding='utf-8'?>
            <bbapi version='1'>
                <error message='ErrorType'/>
            </bbapi>
        
```


There are two error types that can be returned by every page:

*   `ServerError`: something unexpected happened on the server side (the database is down, the server is too busy, or the BBAPI pages didn’t handle correctly some error condition). If the error persists, you can contact us in the BB App Developers forum.
*   `NotAuthorized`: either you did not authenticate using `login.aspx`, or provided a wrong login name/security code combination, or your session expired. You should re-authenticate.

#### Dates

Dates are in the [ISO standard format](https://en.wikipedia.org/wiki/ISO_8601) for dates, and refer to _Coordinated Universal Time_ ([UTC](https://en.wikipedia.org/wiki/UTC)) (**not** to the server time). The format is `yyyy-MM-ddThh:mm:ssZ` (e.g. `2008-06-22T13:12:49Z` (`T` is a separator, `Z` means that the timestamp refers to UTC).

#### Schema

The format of the XML documents returned by BBAPI is described in a [RelaxNG schema](https://bbapi.buzzerbeater.com/docs/bbapi.rnc). The schema is meant to be self-documenting — BuzzerBeater users with a couple of months of in-game experience should be able to recognize the semantics of all the attributes and elements. If clarifications are needed, you can ask for them on the BB App Developers forum.

If a document returned by BBAPI does not validate against the schema, it must be considered a serious bug which will be addressed as soon as possible. Backwards compatible changes to the schema (e.g. adding new pages) are possible, and will be announced in the BB App Developers forum.

#### Base URL

All the BBAPI pages live in the directory `http://bbapi.buzzerbeater.com/`; for instance, in order to login you should send an HTTP GET request for `http://bbapi.buzzerbeater.com/login.aspx?login=yourUserName&code=yourSecurityCode`

### login.aspx

**Must** be visited at the beginning of each session.

#### Parameters

*   `login`: The login name — remember to URL-encode it properly!
*   `code`: The read-only password.
*   `secondteam`: If set to 1, will allow access to second team. Does not work with quickinfo.
*   `quickinfo`: If set to 1, returns the contents of this users' TeamInfo page and does not set the authentication cookie (i.e. you can't access other BBAPI pages). Useful if you just want to authenticate against the BB users database without the need to access more data. Defaults to 0.

#### Errors

*   `NotAuthorized`: wrong login name / security code combination.
*   `ServerError`

### logout.aspx

Closes the current session, and invalidates the current authentication cookie.

#### Parameters

_None_

#### Errors

*   `NotAuthorized`
*   `ServerError`

### arena.aspx

Retrieves data about the arena of the specified team, including the number of seats, current and planned prices, and expansion status.

#### Parameters

*   `teamid`: If not specified, defaults to the team ID of the current user.

#### Errors

*   `UnknownTeamID`: the specified team ID does not exist.
*   `NotAuthorized`
*   `ServerError`

### boxscore.aspx

Retrieves data about the specified match, including team strategies, offensive efficiency measurements and player performances.

#### Parameters

*   `matchid`: If not specified, defaults to the last _finished_ game played by the current user.

#### Errors

*   `UnknownMatchID`: the specified match ID does not exist.
*   `BoxscoreNotAvailable`: the match has not been completed yet. Boxscores are usually available immediately after the end of the game, but in some cases there might be a small delay.
*   `NotAuthorized`
*   `ServerError`

### pbp.aspx

Retrieves play-by-play commentary for the specified match, including lineups and ordered in-game events.

#### Parameters

*   `matchid`: If not specified, defaults to the last game for the current user.

#### Errors

*   `SupporterOnly`: this page is available to Supporters only.
*   `UnknownMatchID`: the specified match ID does not exist.
*   `NotAuthorized`
*   `ServerError`

### economy.aspx

Retrieves data about the economy situation of the current team. Shows all the economic transactions that took place in the last two weeks, including salaries, transfer incomes/expenses and match revenues.

#### Parameters

No parameters are needed.

#### Errors

*   `NotAuthorized`
*   `ServerError`

### roster.aspx

Retrieves information about the players belonging to the specified team.

#### Parameters

*   `teamid`: If not specified, defaults to the team ID of the current user.

#### Errors

*   `UnknownTeamID`
*   `NotAuthorized`
*   `ServerError`

### player.aspx

Retrieves information about a player.

#### Parameters

*   `playerid`: Mandatory.

#### Errors

*   `UnknownPlayerID`: playerid is either missing or invalid.
*   `UnknownStaffID`: staffid is either missing or invalid.
*   `NotAuthorized`
*   `ServerError`

### schedule.aspx

Retrieves the list of all the matches scheduled for the specified season, including the score of all the finished games.

#### Parameters

*   `teamid`: If not specified, defaults to the team ID of the current user.
*   `season`: If not specified, defaults to the current season.

#### Errors

*   `UnknownTeamID`
*   `UnknownSeason`
*   `NotAuthorized`
*   `ServerError`

### seasons.aspx

Retrieves a list of all the seasons, including start and finish dates.

#### Parameters

_None_

#### Errors

*   `NotAuthorized`
*   `ServerError`

### standings.aspx

Retrieves the standings of a given league for the specified season, including regular season standings and, if available, results of the playoff games.

#### Parameters

*   `leagueid`: If not specified, defaults to the ID of the league the current user is in.
*   `season`: If not specified, defaults to the current season.

#### Errors

*   `UnknownLeagueID`
*   `UnknownSeason`
*   `NotAuthorized`
*   `ServerError`

### teaminfo.aspx

Retrieves basic information about a team, including its name and the alias of the owner.

#### Parameters

*   `teamid`: If not specified, defaults to the team ID of the current user.

#### Errors

*   `UnknownTeamID`
*   `NotAuthorized`
*   `ServerError`

### teamstats.aspx

Retrieves in-game statistics for players on a specified team in a given season, including games played and averages.

#### Parameters

*   `teamid`: If not specified, defaults to the team ID of the current user.
*   `season`: If not specified, defaults to the current season.
*   `mode`: When set to `averages`, returns shot percentages and per-game stats; when set to `totals`, returns... well, totals. If omitted or incorrectly specified, defaults to `averages`.

#### Errors

*   `UnknownTeamID`
*   `UnknownSeason`
*   `NotAuthorized`
*   `ServerError`

### countries.aspx

Retrieves the list of all active countries.

#### Parameters

_None_

#### Errors

*   `NotAuthorized`
*   `ServerError`

### leagues.aspx

Retrieves the list of all the leagues at a given level for the specified country.

#### Parameters

*   `countryid`: Mandatory.
*   `level`: Mandatory.

#### Errors

*   `IncorrectParameters`: `countryid` and `level` are either missing or invalid.
*   `NotAuthorized`
*   `ServerError`
