# NBA Win Shares | Basketball-Reference.com
I. Introduction
---------------

Win Shares is a player statistic which attempts to divvy up credit for team success to the individuals on the team. Full details are available below, but the important things to note are that it is calculated using player, team and league-wide statistics and the sum of player win shares on a given team will be roughly equal to that team’s win total for the season. Kareem Abdul-Jabbar’s total of 25.4 Win Shares in 1971-72 is the all-time single-season record and his 273.4 career Win Shares are the all-time career record. Abdul-Jabbar played long enough to compile many such career records. The all-time leader (among retired players) in Win Shares per 48 minutes is Michael Jordan (which falls in line with the prevailing wisdom on Jordan’s G.O.A.T. status).

This article will describe how I came up with the Win Shares system for basketball (stealing a page from baseball’s Bill James). If you believe that any attempt to attribute team success to individual players is an abomination, then read no further, as this article will be of no interest to you.

II. What is a Win Share?
------------------------

Bill James developed his system such that one win is equivalent to three Win Shares. My system deviates from James's system in three key ways:

1.  In James's system, one win is equivalent to three Win Shares. In my system, one win is equivalent to one Win Share.
2.  James made team Win Shares directly proportional to team wins. In his system, a baseball team that wins 80 games will have exactly 240 Win Shares, a baseball team that wins 90 games will have exactly 270 Win Shares, etc. In my system, a basketball team that wins 50 games will have about 50 Win Shares, give or take.
3.  James did not allow for the possibility of negative Win Shares. In his system, the fewest number of Win Shares a player can have is zero. In my system, a player can have negative Win Shares. I justify this by thinking about it in the following way: a player with negative Win Shares was so poor that he essentially took away wins that his teammates had generated.

III. Crediting Offensive Win Shares to Players
----------------------------------------------

### A. 1977-78 to present NBA

Offensive Win Shares are credited to players based on Dean Oliver's points produced and offensive possessions. The formulas are quite detailed, so I would point you to Oliver's book Basketball on Paper for complete details. The process for crediting Offensive Win Shares is outlined below (using [](https://www.basketball-reference.com/players/j/jamesle01.html)
LeBron James of the 2008-09 Cleveland Cavaliers as an example):

1.  **Calculate points produced for each player.** In 2008-09, James had an estimated 2345.9 points produced.
2.  **Calculate offensive possessions for each player.** James had an estimated 1928.1 offensive possessions in 2008-09.
3.  **Calculate marginal offense for each player.** Marginal offense is equal to (points produced) - 0.92 \* (league points per possession) \* (offensive possessions). For James this is 2345.9 - 0.92 \* 1.083 \* 1928.1 = 424.8. Note that this formula may produce a negative result for some players.
4.  **Calculate marginal points per win.** Marginal points per win reduces to 0.32 \* (league points per game) \* ((team pace) / (league pace)). For the 2008-09 Cavaliers this is 0.32 \* 100.0 \* (88.7 / 91.7) = 30.95.
5.  **Credit Offensive Win Shares to the players.** Offensive Win Shares are credited using the following formula: (marginal offense) / (marginal points per win). James gets credit for 424.8 / 30.95 = 13.73 Offensive Win Shares.

### B. 1973-74 to 1976-77 NBA

The NBA did not track player turnovers until the 1977-78 season, and player turnovers are needed to calculate player possessions. However, the NBA did track turnovers at the team level from 1973-74 to 1976-77. Since player turnovers are the only thing holding us back from using the method outlined above, I have chosen to estimate player turnovers for this time period. Player turnovers are estimated as follows (using [](https://www.basketball-reference.com/players/a/abdulka01.html)
Kareem Abdul-Jabbar of the 1976-77 Los Angeles Lakers as an example):

1.  **Obtain an initial estimate of the player's turnovers.** To do this use the following formula:
    
    ```
 -0.0005075172 * (minutes played) * (player age)
- 0.0873982755 * (field goals)
+ 0.0925506598 * (field goal attempts)
+ 0.1566322510 * (free throw attempts)
+ 0.0449241773 * (total rebounds)
+ 0.2321637159 * (assists)
+ 0.2040169400 * (personal fouls)

```

    
    Note that if this number is less than zero, then it should be rounded up to zero. Plugging Abdul-Jabbar's statistics into the formula above we get an estimate of 280.316 turnovers.
2.  **Find the sum of estimated turnovers for the players on the given team.** The sum for the players on the 1976-77 Lakers is 1448.057.
3.  **Calculate the player's share of this total.** Abdul-Jabbar's share of the team total is 280.316 / 1448.057 = 0.194.
4.  **Multiply the team's turnovers (adjusted for team turnovers) by the player's share.** As mentioned, the NBA tracked turnovers at the team level in these seasons. However, the team totals include team turnovers (i.e., turnovers that are not attributed to an individual player). Thus, we multiply the team's turnovers by 0.985, then multiply this adjusted figure by the player's share. For Abdul-Jabbar this is 1538 \* 0.985 \* 0.194 = 293.9, which we round up to 294.

Now that we have this estimate, the method above is used to complete the calculation of Offensive Win Shares.

### C. 1946-47 to 1948-49 BAA and 1949-50 to 1972-73 NBA

Because so many statistics are missing prior to the 1973-74 season (offensive rebounds, turnovers, etc.), we will not use Oliver's points produced and offensive possessions for this time period, although the basic framework will remain the same. Here is the process for crediting Offensive Win Shares prior to the 1973-74 season (using [](https://www.basketball-reference.com/players/r/roberos01.html)
Oscar Robertson of the 1964-65 Cincinnati Royals as an example):

1.  **Calculate the player's modified points.** The formula is:
    
    ```
  2.0 * (field goals) * (1 - ((team assists) / (team field goals)))
+ 1.5 * (field goals) * ((team assists) / (team field goals))
+ 1.0 * (free throws)
+ 0.5 * (assists)

```

    
    Plugging Robertson's statistics into the formula above we get 2495.93 modified points.
2.  **Calculate the player's modified shot attempts.** The formula is:
    
    ```
  1.00 * (field goals) * (1 - ((team assists) / (team field goals)))
+ 0.50 * (field goals) * ((team assists) / (team field goals))
+ 1.00 * ((field goal attempts) - (field goals))
+ 0.44 * (free throw attempts)
+ 0.50 * (assists)

```

    
    Plugging Robertson's statistics into the formula above we get 2246.85 modified shot attempts.
3.  **Calculate league points per shot attempt.** League points per shot attempt is equal to (league points) / (league field goal attempts + 0.44 \* (league free throw attempts)). For the 1964-65 NBA this is 79641 / (71882 + 0.44 \* 25604) = 0.9578.
4.  **Calculate marginal offense for each player.** Marginal offense is equal to (modified points) - 0.92 \* (league points per shot attempt) \* (modified shot attempts). For Robertson this is 2495.93 - 0.92 \* 0.9578 \* 2246.85 = 515.06. Note that this formula may produce a negative result for some players.
5.  **Calculate marginal points per win.** Marginal points per win reduces to 0.16 \* (team points per game + opponent points per game). For the 1964-65 Royals this is 0.16 \* (114.2 + 111.9) = 36.176.
6.  **Credit Offensive Win Shares to the players.** Offensive Win Shares are credited using the following formula: (marginal offense) / (marginal points per win). Robertson gets credit for 516.06 / 36.176 = 14.27 Offensive Win Shares.

IV. Crediting Defensive Win Shares to Players
---------------------------------------------

### A. 1973-74 to present NBA

Crediting Defensive Win Shares to players is based on Dean Oliver's Defensive Rating. Defensive Rating is an estimate of the player's points allowed per 100 defensive possessions (please see Oliver's book for further details). Here is a description of the process (once again using LeBron James in 2008-09 as an example):

1.  **Calculate the Defensive Rating for each player.** James's Defensive Rating in 2008-09 was 99.1.
2.  **Calculate marginal defense for each player.** Marginal defense is equal to (player minutes played / team minutes played) \* (team defensive possessions) \* (1.08 \* (league points per possession) - ((Defensive Rating) / 100)). For James this is (3054 / 19780) \* 7341 \* ((1.08 \* 1.083) - (99.1 / 100)) = 202.5. Note that this formula may produce a negative result for some players.
3.  **Calculate marginal points per win.** Marginal points per win reduces to 0.32 \* (league points per game) \* ((team pace) / (league pace)). For the 2008-09 Cavaliers this is 0.32 \* 100.0 \* (88.7 / 91.7) = 30.95.
4.  **Credit Defensive Win Shares to the players.** Defensive Win Shares are credited using the following formula: (marginal defense) / (marginal points per win). James gets credit for 202.5 / 30.95 = 6.54 Defensive Win Shares.

### B. 1951-52 to 1972-73 NBA

Prior to the 1973-74 season, the NBA did not track defensive rebounds, steals, or blocks, so allocating defensive credit is a difficult task. Nevertheless, here is the process for crediting Defensive Win Shares in those seasons (once again using Robertson in 1964-65 as an example):

1.  **Calculate team marginal defense.** Team marginal defense is equal to 1.08 \* (league points per shot attempt) \* (team field goal attempts + 0.44 \* (team free throw attempts)) - (opponent points). If you're wondering why we're using team shot attempts as opposed to opponent shot attempts, the answer is (a) we don't have opponent shot attempts prior to 1970-71 and (b) the system works better using team shot attempts. For the 1964-65 Royals we get 1.08 \* 0.9578 \* (7797 + 0.44 \* 2866) - 8952 = 417.854.
2.  **Calculate the player's share of the team's marginal defense.** The player's share of the team's marginal defense is equal to 0.25 \* ((minutes played) / (team minutes played)) + 0.5 \* ((total rebounds) / (team total rebounds)) + 0.25 \* ((assists) / (team assists)). How did I get those weights? Modern Defensive Win Shares are most dependent on minutes played, defensive rebounds, steals, and blocks. I regressed DWS on those stats and then found the relative importance of each regressor (approximately 25% for minutes played, 35% for defensive rebounds, 25% for steals, and 15% for blocks). Since those defensive statistics are not available for past seasons, I used total rebounds as a proxy for defensive rebounds and blocks; and assists as a proxy for steals. A couple more notes: (1) prior to the 1964-65 season, team minutes played were not an official statistic, so for those seasons estimate the team's minutes played using the formula 5 \* 48 \* (team games) + 125; and (2) prior to the 1967-68 season, team total rebounds included team rebounds, so to account for this multiply the team total by 0.875. Getting back to our example, Robertson's share on the 1964-65 Royals is equal to 0.25 \* (3421 / 19325) + 0.5 \* (674 / (0.875 \* 5387)) + 0.25 \* (861 / 1843) = 0.2325.
3.  **Calculate marginal defense for each player.** Marginal defense is equal to (team marginal defense) \* (player share). For Robertson this is 417.854 \* 0.2325 = 97.151. Note that this formula may produce a negative result for some players.
4.  **Calculate marginal points per win.** Marginal points per win reduces to 0.16 \* (team points per game + opponent points per game). For the 1964-65 Royals this is 0.16 \* (114.2 + 111.9) = 36.176.
5.  **Credit defensive Win Shares to the players.** Defensive Win Shares are credited using the following formula: (marginal defense) / (marginal points per win). Robertson gets credit for 97.151 / 36.176 = 2.69 Defensive Win Shares.

### B. 1950-51 NBA

Prior to the 1951-52 season, the NBA did not track minutes played, so allocating defensive credit is an even more difficult task. Nevertheless, here is the process for crediting Defensive Win Shares in the 1950-51 season (using George Mikan as an example):

1.  **Calculate team marginal defense.** Team marginal defense is equal to 1.08 \* (league points per shot attempt) \* (team field goal attempts + 0.44 \* (team free throw attempts)) - (opponent points). If you're wondering why we're using team shot attempts as opposed to opponent shot attempts, the answer is (a) we don't have opponent shot attempts prior to 1970-71 and (b) the system works better using team shot attempts. For the 1950-51 Minneapolis Lakers we get 1.08 \* 0.8553 \* (5590 + 0.44 \* 1989) - 5264 = 708.023.
2.  **Calculate the player's share of the team's marginal defense.** The player's share of the team's marginal defense is equal to 0.25 \* ((field goal attempts) / (team field goal attempts)) + 0.5 \* ((total rebounds) / (team total rebounds)) + 0.25 \* ((assists) / (team assists)). How did I get those weights? Modern Defensive Win Shares are most dependent on minutes played, defensive rebounds, steals, and blocks. I regressed DWS on those stats and then found the relative importance of each regressor (approximately 25% for minutes played, 35% for defensive rebounds, 25% for steals, and 15% for blocks). Since those defensive statistics are not available for past seasons, I used field goal attempts as a proxy for minutes played; total rebounds as a proxy for defensive rebounds and blocks; and assists as a proxy for steals. Note that prior to the 1967-68 season, team total rebounds included team rebounds, so to account for this multiply the team total by 0.875. Getting back to our example, Mikan's share on the 1950-51 Lakers is equal to 0.25 \* (1584 / 5590) + 0.5 \* (958 / (0.875 \* 3049)) + 0.25 \* (208 / 1408) = 0.2873.
3.  **Calculate marginal defense for each player.** Marginal defense is equal to (team marginal defense) \* (player share). For Mikan this is 708.023 \* 0.2873 = 203.415. Note that this formula may produce a negative result for some players.
4.  **Calculate marginal points per win.** Marginal points per win reduces to 0.16 \* (team points per game + opponent points per game). For the 1950-51 Lakers this is 0.16 \* (82.8 + 77.4) = 25.632.
5.  **Credit defensive Win Shares to the players.** Defensive Win Shares are credited using the following formula: (marginal defense) / (marginal points per win). Mikan gets credit for 203.415 / 25.632 = 7.94 Defensive Win Shares.

### B. 1946-47 to 1948-49 BAA and 1949-50 NBA

Prior to the 1950-51 season, the NBA did not track total rebounds, so allocating defensive credit is an almost impossible task. Nevertheless, here is the process for crediting Defensive Win Shares in those seasons (using Bob Feerick in 1946-47 as an example):

1.  **Calculate team marginal defense.** Team marginal defense is equal to 1.08 \* (league points per shot attempt) \* (team field goal attempts + 0.44 \* (team free throw attempts)) - (opponent points). If you're wondering why we're using team shot attempts as opposed to opponent shot attempts, the answer is (a) we don't have opponent shot attempts prior to 1970-71 and (b) the system works better using team shot attempts. For the 1946-47 Washington Capitols we get 1.08 \* 0.6528 \* (5794 + 0.44 \* 1391) - 3836 = 680.412.
2.  **Calculate the player's share of the team's marginal defense.** The player's share of the team's marginal defense is equal to 0.25 \* ((field goal attempts) / (team field goal attempts)) + 0.5 \* ((personal fouls) / (team personal fouls)) + 0.25 \* ((assists) / (team assists)). How did I get those weights? Modern Defensive Win Shares are most dependent on minutes played, defensive rebounds, steals, and blocks. I regressed DWS on those stats and then found the relative importance of each regressor (approximately 25% for minutes played, 35% for defensive rebounds, 25% for steals, and 15% for blocks). Since those defensive statistics are not available for past seasons, I used field goal attempts as a proxy for minutes played; personal fouls as a proxy for defensive rebounds and blocks; and assists as a proxy for steals. Getting back to our example, Feerick's share on the 1946-47 Capitols is equal to 0.25 \* (908 / 5794) + 0.5 \* (142 / 1144) + 0.25 \* (69 / 378) = 0.1469.
3.  **Calculate marginal defense for each player.** Marginal defense is equal to (team marginal defense) \* (player share). For Feerick this is 680.412 \* 0.1469 = 99.953. Note that this formula may produce a negative result for some players.
4.  **Calculate marginal points per win.** Marginal points per win reduces to 0.16 \* (team points per game + opponent points per game). For the 1946-47 Capitols this is 0.16 \* (73.8 + 63.9) = 22.032.
5.  **Credit defensive Win Shares to the players.** Defensive Win Shares are credited using the following formula: (marginal defense) / (marginal points per win). Feerick gets credit for 99.953 / 22.032 = 4.54 Defensive Win Shares.

V. Putting It All Together
--------------------------

The final step of the process is to add Offensive Win Shares to Defensive Win Shares. In our examples, LeBron James total in 2008-09 is 13.73 + 6.54 = 20.27 Win Shares and Oscar Robertson total in 1964-65 is 14.27 + 2.69 = 16.96 Win Shares.

VI. Does This Work?
-------------------

Because this metric is designed to estimate a player's contribution in terms of wins, it makes sense to see if the sum of player Win Shares for a particular team closely matches the team win total. For the 2008-09 Cavaliers the sum of player Win Shares is 67.9, while the team win total is 66, an error of 66 - 67.9 = -1.9 wins. For the 1964-65 Royals the sum of player Win Shares is 43.5, while the team total is 48, an error of 48 - 43.5 = 4.5 wins. These errors are actually close to the "typical" error; looking at all NBA teams since the 1962-63 season (the last season we have complete player splits), the average absolute error is 2.74 wins and the root mean squared error is 3.41 wins.

VII. Feedback
-------------

If you have any comments or questions about the Win Shares methodology, please send me some feedback.

VIII. Revision History
----------------------

### Version 4.0

*   Extended Win Shares back to the 1946-47 BAA season.

### Version 3.1

*   Changed the calculation of marginal points per win. Prior to this update the league average marginal points per win was used for all players, but now the pace-adjusted league average is used instead.

### Version 3.0

*   Extended Win Shares back to the 1951-52 NBA season.

### Version 2.0

*   Changed the ratio of Win Shares to team wins from 3:1 to 1:1.
*   Removed the adjustment that forced team Win Shares to add up to team wins.
*   Modified the formulas to allow for the possibility of negative Win Shares.

### Version 1.0

*   Initial release.
