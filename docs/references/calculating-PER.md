# Calculating PER | Basketball-Reference.com
The Player Efficiency Rating (PER) is a per-minute rating developed by ESPN.com columnist John Hollinger. In John's words, "The PER sums up all a player's positive accomplishments, subtracts the negative accomplishments, and returns a per-minute rating of a player's performance." It appears from his books that John's database only goes back to the 1988-89 season. I decided to expand on John's work and calculate PER for all players since minutes played were first recorded (1951-52).

All calculations begin with what I am calling unadjusted PER (uPER). The formula is:

```
uPER = (1 / MP) *
     [ 3P
     + (2/3) * AST
     + (2 - factor * (team_AST / team_FG)) * FG
     + (FT *0.5 * (1 + (1 - (team_AST / team_FG)) + (2/3) * (team_AST / team_FG)))
     - VOP * TOV
     - VOP * DRB% * (FGA - FG)
     - VOP * 0.44 * (0.44 + (0.56 * DRB%)) * (FTA - FT)
     + VOP * (1 - DRB%) * (TRB - ORB)
     + VOP * DRB% * ORB
     + VOP * STL
     + VOP * DRB% * BLK
     - PF * ((lg_FT / lg_PF) - 0.44 * (lg_FTA / lg_PF) * VOP) ]

```


Most of the terms in the formula above should be clear, but let me define the less obvious ones:

```
factor = (2 / 3) - (0.5 * (lg_AST / lg_FG)) / (2 * (lg_FG / lg_FT))
VOP    = lg_PTS / (lg_FGA - lg_ORB + lg_TOV + 0.44 * lg_FTA)
DRB%   = (lg_TRB - lg_ORB) / lg_TRB

```


I am not going to go into details about what each component of the PER is measuring; that's why John writes and sells books.

Problems arise for seasons prior to 1979-80:

*   1979-80 — debut of 3-point shot in NBA
*   1977-78 — player turnovers first recorded in NBA
*   1973-74 — player offensive rebounds, steals, and blocked shots first recorded in NBA

The calcuation of uPER obviously depends on these statistics, so here are my solutions for years when the data are missing:

*   Zero out three-point field goals, turnovers, blocked shots, and steals.
*   Set the league value of possession (VOP) equal to 1.
*   Set the defensive rebound percentage (DRB%) equal to 0.7.
*   Set player offensive rebounds (ORB) equal to 0.3 \* TRB.

Some of these solutions may not be elegant, but I think they are reasonable. After uPER is calculated, an adjustment must be made for the team's pace. The pace adjustment is:

```
pace adjustment = lg_Pace / team_Pace

```


League and team pace factors cannot be computed for seasons prior to 1973-74, so I estimate the above using:

```
estimated pace adjustment = 2 * lg_PPG / (team_PPG + opp_PPG)

```


To give you an idea of the accuracy of these estimates, here are the actual pace adjustments and the estimated pace adjustments for teams from the Eastern Conference in 2002-03:

```
Tm       Act       Est

ATL     1.00      0.99
BOS     1.00      1.02
CHI     0.97      0.98
CLE     0.97      0.99
DET     1.05      1.06
IND     0.99      1.00
MIA     1.04      1.08
MIL     1.01      0.96
NJN     0.99      1.03
NOH     1.01      1.02
NYK     1.00      0.98
ORL     0.98      0.97
PHI     1.00      0.99
TOR     1.01      1.01
WAS     1.03      1.03

```


For all seasons where actual pace adjustments can be computed, the root mean square error of the estimates is 0.01967.

Now the pace adjustment is made to uPER (I will call this aPER):

```
aPER = (pace adjustment) * uPER

```


The final step is to standardize aPER. First, calculate league average aPER (lg\_aPER) using player minutes played as the weights. Then, do the following:

```
PER = aPER * (15 / lg_aPER)

```


The step above sets the league average to 15 for all seasons.

Those are the gory details. If you have any comments or questions, please send me some feedback.
