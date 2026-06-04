# Calculating Individual Offensive and Defensive Ratings | Basketball-Reference.com
Individual Offensive and Defensive Ratings are efficiency metrics developed by Dean Oliver in his 2004 book _Basketball on Paper_. What follows is a basic guide to their calculation, though we encourage you to read his book for the full details and explanation of these statistics.

Offensive Rating
----------------

In Dean's words, "Individual offensive rating is the number of points produced by a player per hundred total individual possessions. In other words, 'How many points is a player likely to generate when he tries?'"

The basic building blocks of the Offensive Rating calculation are Individual Total Possessions and Individual Points Produced. The formula for Total Possessions is broken down into four components: Scoring Possessions, Missed FG Possessions, Missed FT Possessions, and Turnovers.

The Scoring Possessions formula is by far the most complex:

*   `ScPoss = (FG_Part + AST_Part + FT_Part) * (1 - (Team_ORB / Team_Scoring_Poss) * Team_ORB_Weight * Team_Play%) + ORB_Part`

where:

*   `FG_Part = FGM * (1 - 0.5 * ((PTS - FTM) / (2 * FGA)) * qAST)`
*   `qAST = ((MP / (Team_MP / 5)) * (1.14 * ((Team_AST - AST) / Team_FGM))) + ((((Team_AST / Team_MP) * MP * 5 - AST) / ((Team_FGM / Team_MP) * MP * 5 - FGM)) * (1 - (MP / (Team_MP / 5))))`
*   `AST_Part = 0.5 * (((Team_PTS - Team_FTM) - (PTS - FTM)) / (2 * (Team_FGA - FGA))) * AST`
*   `FT_Part = (1-(1-(FTM/FTA))^2)*0.4*FTA`
*   `Team_Scoring_Poss = Team_FGM + (1 - (1 - (Team_FTM / Team_FTA))^2) * Team_FTA * 0.4`
*   `Team_ORB_Weight = ((1 - Team_ORB%) * Team_Play%) / ((1 - Team_ORB%) * Team_Play% + Team_ORB% * (1 - Team_Play%))`
*   `Team_ORB% = Team_ORB / (Team_ORB + (Opponent_TRB - Opponent_ORB))`
*   `Team_Play% = Team_Scoring_Poss / (Team_FGA + Team_FTA * 0.4 + Team_TOV)`
*   `ORB_Part = ORB * Team_ORB_Weight * Team_Play%`

Missed FG and Missed FT Possessions are calculated as follows:

*   `FGxPoss = (FGA - FGM) * (1 - 1.07 * Team_ORB%)`
*   `FTxPoss = ((1 - (FTM / FTA))^2) * 0.4 * FTA`

Total Possessions are then computed like so:

*   `TotPoss = ScPoss + FGxPoss + FTxPoss + TOV`

Now, Individual Points Produced must also be calculated:

*   `PProd = (PProd_FG_Part + PProd_AST_Part + FTM) * (1 - (Team_ORB / Team_Scoring_Poss) * Team_ORB_Weight * Team_Play%) + PProd_ORB_Part`

where:

*   `PProd_FG_Part = 2 * (FGM + 0.5 * 3PM) * (1 - 0.5 * ((PTS - FTM) / (2 * FGA)) * qAST)`
*   `PProd_AST_Part = 2 * ((Team_FGM - FGM + 0.5 * (Team_3PM - 3PM)) / (Team_FGM - FGM)) * 0.5 * (((Team_PTS - Team_FTM) - (PTS - FTM)) / (2 * (Team_FGA - FGA))) * AST`
*   `PProd_ORB_Part = ORB * Team_ORB_Weight * Team_Play% * (Team_PTS / (Team_FGM + (1 - (1 - (Team_FTM / Team_FTA))^2) * 0.4 * Team_FTA))`

After all of that, we can finally calculate the player's individual Offensive Rating:

*   `ORtg = 100 * (PProd / TotPoss)`

As a side note, we can also calculate what Oliver calls Floor Percentage, which answers the question, "What percentage of the time that a player wants to score does he actually score?":

*   `Floor% = ScPoss / TotPoss`

The difference between Offensive Rating and Floor Percentage, Oliver notes, is the average number of Points Produced per Scoring Possession. "Though \Shaquille O'Neal\] may have a high floor percentage," Oliver writes, "his poor foul shooting means that he has a lot of one-point possessions, bringing his offensive rating down a bit. Good three-point shooters like Reggie Miller, who may not have the highest floor percentage, will have higher offensive ratings."

Defensive Rating
----------------

Just as Oliver's Offensive Rating represents points produced by the player per 100 possessions consumed, his Defensive Rating estimates how many points the player allowed per 100 possessions he individually faced while on the court.

The core of the Defensive Rating calculation is the concept of the individual Defensive Stop. Stops take into account the instances of a player ending an opposing possession that are tracked in the boxscore (blocks, steals, and defensive rebounds), in addition to an estimate for the number of forced turnovers and forced misses by the player which aren't captured by steals and blocks.

The formula for Stops is:

*   `Stops = Stops1 + Stops2`

where:

*   `Stops1 = STL + BLK * FMwt * (1 - 1.07 * DOR%) + DRB * (1 - FMwt)`
*   `FMwt (Forced Miss weight) = (DFG% * (1 - DOR%)) / (DFG% * (1 - DOR%) + (1 - DFG%) * DOR%)`
*   `DOR% = Opponent_ORB / (Opponent_ORB + Team_DRB)`
*   `DFG% = Opponent_FGM / Opponent_FGA`
*   `Stops2 = (((Opponent_FGA - Opponent_FGM - Team_BLK) / Team_MP) * FMwt * (1 - 1.07 * DOR%) + ((Opponent_TOV - Team_STL) / Team_MP)) * MP + (PF / Team_PF) * 0.4 * Opponent_FTA * (1 - (Opponent_FTM / Opponent_FTA))^2`

Also necessary is the calculation of Stop%, which is the rate at which a player forces a defensive stop as a percentage of individual possessions faced (essentially the inverse of Floor%, but for defenders):

*   `Stop% = (Stops * Opponent_MP) / (Team_Possessions * MP)`

With those numbers in hand, individual Defensive Rating can be computed:

*   `DRtg = Team_Defensive_Rating + 0.2 * (100 * D_Pts_per_ScPoss * (1 - Stop%) - Team_Defensive_Rating)`

where:

*   `Team_Defensive_Rating = 100 * (Opponent_PTS / Team_Possessions)`
*   `D_Pts_per_ScPoss = Opponent_PTS / (Opponent_FGM + (1 - (1 - (Opponent_FTM / Opponent_FTA))^2) * Opponent_FTA*0.4)`

Notes:

*   In a later chapter of _Basketball on Paper_, Oliver emphasized that Offensive Ratings shouldn't be viewed in a vacuum. Introducing a concept he called "Skill Curves", he acknowledged that a player's ORtg needed to be judged in conjunction with his Usage Rate, a measure of how big a role the player fills in his team's offense. The bigger the role, the more difficult it is to maintain a high ORtg; the smaller the role, the easier it is to be highly efficient. Because of this, Oliver stressed that a player's ORtg should primarily be compared to those of other players in a similar role.
  
*   Out of necessity (owing to a lack of defensive data in the basic boxscore), individual Defensive Ratings are heavily influenced by the team's defensive efficiency. They assume that all teammates are equally good (per minute) at forcing non-steal turnovers and non-block misses, as well as assuming that all teammates face the same number of total possessions per minute.
  
*   Perhaps as a byproduct, big men tend to have the best Defensive Ratings (although Oliver notes that history's best defensive teams were generally anchored by dominant defensive big men, suggesting that those types of players are the most important to a team's defensive success). A corollary to this is that excellent perimeter defenders who don't steal the ball a lot — for instance, Joe Dumars or Doug Christie — are underrated defensively by DRtg, and are prone to look only as good as their team's overall defense performs.

As always, if you have any comments or questions, please send us feedback.
