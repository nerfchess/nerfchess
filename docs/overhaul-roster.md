# Overhaul Roster: 224 New Buffs + 300 Hexes + 300 Boons

Owner-approved at Checkpoint 2 (2026-07-22), amended same day: hexes/boons raised to 300 each
(many may derive from buff mechanics and reuse their animations), gambling set redesigned to be
more creative/stronger with BOARD-BASED payouts (time only as garnish), and new-card designs
overall must not lean heavily on clock-time effects. Draft-skip UX: skipped/banked/blocked drafts
get a clear popup animation and the opponent's pick that round is revealed to the skipped player.
Numbers 1-200 are the approved roster (29 replacements folded in); 201-224 are the gambling set.
Each card: Name | Category | Effect (exact) | Animation concept.
Hexes/Boons are designed in their own sections at the bottom as they are implemented.

Conventions:
- "your turns" = card owner's own turns; opponent durations say "opponent's turns".
- All randomness draws from the seeded effect RNG (api.rng); gambling odds shown to players must match code.
- No em dashes in any user-visible string. No Nerf references in buff-mode cards.
- id convention for new cards: `ov_<snake_name>` (overhaul), gambling `gm_<snake_name>`.

## Tier 1 (25)

1. Pigeon Post | info | For your next 3 turns, enemy pieces attacking your queen get a pigeon marker. | Pigeon flies in from screen edge, perches, feather marker.
2. Pebble Toss | movement | Choose an unmoved enemy pawn; it loses its two-square first move. | Pebble arcs across board, bonk, dust puff.
3. Sock Slide | movement | One of your pawns may move one square sideways, once (empty destination). | Sock-slide squeak streak with arm flail.
4. Warm-Up Stretch | movement | One knight's next move may be a camel leap (3,1). | Knight stretches, sweat drop, springs far.
5. Free Sample | draft | See the tier of your next draft one turn early. | Gift box parachutes in, opens to glowing numeral.
6. Lucky Penny | random | Coin flip. Heads: one pawn of your choice advances one square now. Tails: nothing. | Giant penny drops, bounces, sparkle or sad trombone.
7. Wet Paint | square | Chosen square cannot be ended on by enemy pieces for opponent's next 2 turns. | Paint roller, glossy sheen, WET PAINT sign.
8. Polite Cough | resource | Steal 5 seconds from the opponent's clock. | "Ahem" bubble near enemy king; seconds fly to your clock.
9. Pet Rock | protection | One pawn cannot be captured during the opponent's next turn. | Googly-eyed rock rolls up and glares.
10. Backwards Hat | capture | One pawn may capture straight ahead on its next move. | Cap spins backwards, swagger bounce.
11. Squeaky Shoes | info | For 5 turns, enemy pieces moving adjacent to your king squeak and flash. | Cartoon squeak lines; shoe marker by king.
12. Second Opinion | info | Highlight all currently undefended enemy pieces, once. | Monocle sweep; red arrow stamps.
13. Window Shopping | draft | Peek at one of the two cards in your next draft before it begins. | Storefront window, fog circle wipe reveal.
14. Growth Spurt | comedy | One of your pawns appears twice as large. No other effect. | Pawn inflates with a boing; neighbors lean away.
15. Coupon | draft | Gain one extra reroll for your next draft. | Scissors cut dotted line, coupon flutters into tray.
16. Nightlight | protection | Opponent's next 2 turns: enemy knights cannot end adjacent to your king. | Lamp clicks on, warm cone, knights recoil.
17. Whittle | attack | Remove one unmoved enemy pawn on the a-file or h-file. | Pocketknife whittles pawn to shavings.
18. Static Cling | movement | The enemy piece that moved last cannot move on the opponent's next turn. | Static sparks pin it; frizz wiggle.
19. Rain Check | delayed | In 5 turns, gain 15 seconds. | Cloud stamps ticket; later drizzles seconds.
20. Kazoo Fanfare | comedy | Your next capture plays a kazoo solo with confetti. No other effect. | Herald pawn, kazoo, confetti burst.
21. Left Foot First | movement | Once, your king may move two squares toward the queenside (path empty and safe). | Exaggerated lunge-step, stretch sound.
22. Spare Button | revival | If you lose a pawn within 3 turns, restore a pawn on its starting square (once). | Needle stitches a button in pawn silhouette.
23. Tiny Trebuchet | movement | Launch one of your pawns two squares forward (path+destination empty, no capture). | Mini trebuchet lobs pawn, whistle, thud.
24. Name Tag | resource | Tag one enemy piece; if you capture it, gain 10 seconds. | "GARY" sticker; farewell card on capture.
25. Fresh Socks | tempo | Your next move costs no clock time. | Clean socks pulled on; speed lines.

## Tier 2 (25)

26. Broom Sweep | rank | Chosen rank: enemy pawns on it retreat one square if empty behind. | Giant broom sweep, pawns tumble.
27. Grappling Hook | movement | Pull one enemy piece one square toward you along its file (empty destination). | Hook, rope, cartoon stretch yank.
28. Moat Digger | square | 2 adjacent empty squares in your half become moat: enemy cannot enter for opponent's next 3 turns. | Shovel pawn digs; water, bobbing duck.
29. Mirror Shield | capture | Next time your minor piece is captured, remove one enemy pawn of your choice. | Mirrored buckler flash, reflected beam zap.
30. Loose Floorboard | square | Chosen empty square: first enemy piece landing there bounces back to its origin (one use). | Floorboard flips, catapult boing.
31. Second Breakfast | movement | One pawn may make two separate one-square advances on your next turn (no captures). | Tiny meal, belly pat, vigorous march.
32. Loading Screen Tip | info | Fake loading tip, then highlight the lowest-value undefended enemy piece. | Parody loading bar, spotlight snap.
33. Sandbags | protection | Choose 2 pawns; they cannot be captured during the opponent's next turn. | Sandbags thud and stack.
34. Slingshot | attack | One pawn removes an enemy pawn up to 2 squares directly ahead (shooter stays). | Slingshot band snaps, pebble flies.
35. Molting Season | transform | One of your bishops permanently becomes a knight. | Robe molts into feathers, horse reveal, whinny.
36. Traffic Cone | file | Up to 3 squares of one file in your half: enemy may pass but not stop for opponent's next 2 turns. | Cones drop, truck beeps, flagger waves.
37. Group Photo | info | See which enemy pieces have moved at least once. | Camera flash, polaroid with checkmarks.
38. Sugar Glider | movement | One knight's next move may be a (2,2) diagonal leap. | Gliding membranes, hang-time, squeak landing.
39. Overdue Library Book | delayed | Mark an enemy minor; in 6 turns if alive it returns to its starting square. | Due-date stamp ticks; librarian hand drags it home.
40. Wheelbarrow | movement | Move one of your pawns to any adjacent empty square, once. | Squeaky wheelbarrow trundle and dump.
41. Loot Filter | draft | In your next draft, you may reroll one of the offered cards once. | Loot-filter UI, grey card dissolves, rarity beam.
42. Encore | tempo | If your next move gives check, immediately make one extra pawn move. | Spotlight curtain call; pawn steps forward.
43. Compost Heap | resource | For 5 turns, gain 8 seconds whenever one of your pawns is captured. | Steaming compost bin; sprout on clock.
44. Velcro Gloves | capture | On your next capture, the capturing piece may return to its origin square. | Velcro rip, elastic spring-back.
45. Smoke Ring | board | 2x2 area for opponent's next 2 turns: your pieces inside show as silhouettes to the opponent (squares stay visibly occupied). | Smoke rings settle; shadowy outlines.
46. Tandem Bike | movement | Two adjacent friendly pawns advance one square together as one move. | Tandem bicycle, bell, synchronized pedal.
47. Rubber Stamp | resource | For your next 3 turns, each pawn move refunds 3 seconds. | Giant APPROVED stamp, ink splat.
48. Speedrun Timer | meta | For your next 3 turns, moving within 5 seconds earns 8 seconds each. | Splits timer docks by clock; gold/red splits.
49. Left on Read | comedy | Opponent's next 3 turns: typing indicator over their king while they think. No other effect. | Chat bubble with cycling dots.
50. Barn Door | file | Chosen file: enemy pieces cannot enter your back rank there for opponent's next 3 turns. | Wooden doors slam, bar drops, hay puff.

## Tier 3 (25)

51. Focus Group | draft | Your next draft shows a star rating on each card from its real power score. | One-way glass silhouettes; star stamps.
52. Frog Prince | transform | One enemy minor becomes a Frog for opponent's next 3 turns: hops one square diagonally, cannot capture. | Green smoke, crown pop, ribbit; poof back.
53. Milkman's Round | pieces | Spawn a pawn on an empty square of your second rank now, another in 3 turns. | Milk truck leaves bottles that morph to pawns.
54. Lightning Rod | chain | Choose your piece: next capture of it within 6 turns destroys both it and the capturer. | Rod bolts on; storm forms, bolt chars both.
55. Portal Pair | movement | Two portals on empty squares for 5 turns: your pieces ending on one exit at the other. | Orange/blue ovals; taffy-stretch pass.
56. Backseat Gamer | meta | Opponent's next turn: a giant red arrow suggests a move on their board; if they play anything else you gain 8 seconds. | Chalk arrow, "JUST TAKE THE ROOK" bubble.
57. Ventriloquist | comedy | Once, make an enemy knight perform a legal non-capture move of your choice. | Hand puppet behind knight, wooden clacks.
58. Fire Drill | movement | Once, freely rearrange your pieces among their occupied squares within one rank of your half. | Alarm, hard hats, jogging line-up.
59. Counterfeit Crown | comedy | King and queen swap appearances for 5 turns (logic, legality, hitboxes stay true; hover reveals). | Shady merchant sleight-of-hand swap.
60. Draft Dodger | draft | Skip your next draft: gain 25 seconds now, and the draft after offers 3 cards. | Tray arrives, king dives away, note left.
61. Tax Audit | resource | Opponent loses 15 seconds per piece they have beyond your piece count (max 45). | Auditor desk, abacus, briefcase lock.
62. Knight Court | power | For 3 turns, your knights may also move one square any direction. | Powdered wigs, tiny gavels, gavel bang steps.
63. Quicksilver | movement | Your queen's next move may bend once at 90 degrees (≤7 squares total, clear path). | Queen liquefies to chrome, streams, reforms.
64. Poltergeist | random | Opponent's next 3 turns: one random enemy pawn nudged one square sideways at start of each (if empty). | Ghostly drag, rattle, faint giggle.
65. Bake Sale | resource | Gain 10 seconds now; +5 per your pawn advance for 5 turns. | Bake stand, cash bell, cookie toss.
66. Siege Ladder | file | Chosen file: for 3 turns your pieces may jump over enemy pawns on it. | Ladders slap on, clamber-over grunts.
67. Emote Wheel | comedy | Emote wheel for 6 turns; once, a GG emote stuns one enemy piece adjacent to your pieces for 1 turn. | Radial wheel, bouncing emotes, fatal GG.
68. Masterclass | power | One pawn permanently gains straight-ahead captures. | One-desk lecture, cap toss, medal.
69. Tasting Flight | draft | Your next draft offers 3 cards instead of 2. | Cards fan on serving board, pour sparkle.
70. Boomerang | attack | Remove an enemy pawn up to 3 squares away in a straight line from your piece; on return, if a friendly piece is directly in front of the thrower it is stunned 1 turn. | Boomerang whirl, chop, risky catch.
71. Growth Ring | square | Chosen square + neighbors: for 4 turns your pieces there cannot be captured by pawns. | Tree rings ripple; mossy glow.
72. Night Shift | power | For 3 turns your rooks may move through your own pawns. | Lights dim, headlamps, phasing past yawns.
73. Pillow Fort | protection | Opponent's next 2 turns: sliders cannot give check (knights/pawns can). | Pillow stack; feather burst on blocked lines.
74. Gold Rush | random | 3 random empty squares hide gold for 6 turns; either player gains 10 seconds landing there first. | Pickaxe cracks, glint, nugget-lift pose.
75. Chariot Lessons | transform | One rook becomes a Chariot for 5 turns: rook moves plus one-square diagonal steps. | Wheels and reins sprout, whip crack.

## Tier 4 (25)

76. Puppet Practice | movement | Once, make any legal non-capture move with an enemy bishop or rook. | Strings drop, marionette jerks, offended shudder.
77. Dragon Egg | delayed | Egg in your half; hatches in 6 turns to a Wyrmling (king moves; every 3 turns removes one adjacent enemy pawn). If captured first, opponent gains 15 seconds. | Wobble, cracks, hatch burst, flame hiccup.
78. Thunderstorm | random | 3 turns: lightning strikes a random enemy-half square at your turn start, destroying any pawn there. | Rolling clouds, bolt crack, rumble.
79. Glass Bridge | board | One middle rank becomes glass for 4 turns: any piece landing there has 50% to fall through and be removed (both sides). | Translucent rank, creaks, shatter drop.
80. Royal Food Taster | protection | Taster pawn adjacent to queen; next queen capture kills Taster instead, queen shifts to Taster's square. | Slow-mo leap, posthumous medal.
81. Mole Tunnels | movement | 5 turns, up to twice: a pawn tunnels to the empty square directly behind an enemy pawn on its file. | Hard hat, traveling dirt mound, pop-up.
82. Weather Balloon | info | 3 turns: heatmap of every square the opponent could reach next move. | Balloon rises, radar sweep.
83. Petting Zoo | pieces | Goat, Duck, Sheep on random empty squares in your half for 8 turns: block, drift one random square at your turn end, cannot capture, worth nothing. | Gate opens, waddle-in, idle fidgets.
84. Ivy Crown | power | Your king may step two squares once every 4 turns (never through/into check). | Ivy winds crown, blooms; leaf trail.
85. Fireworks Barge | attack | 2x2 area: at end of opponent's next turn, enemy pawns there removed, others pushed one square outward. | Barge slides in, rockets burst in sequence.
86. Bodyswap Ball | random | One random pair in each army swaps places within its own army. | Disco ball, spinning lights, dance-swap.
87. Templar Vows | transform | One bishop becomes a Templar for 6 turns: bishop moves plus knight captures. | Armor assembles plate by plate.
88. Alt Account | meta | 5 turns: display name becomes a guest name, pieces wear sunglasses; first capture while disguised gains 15 seconds. | Nameplate flip, sunglasses wave.
89. Hall of Mirrors | board | 3 turns: your rooks moving horizontally may wrap around the board edge. | Mirror panels rise; wrap shimmer.
90. Loan Shark | resource | Gain 60 seconds now; in 8 turns lose 90 unless you captured 3+ pieces since. | Suited shark, briefcase; goons or fin-shake.
91. Sponsored Segment | resource | Parody ad banner 4 seconds (clocks paused, skippable); gain 20 seconds. | "RAID: Shadow Pawns" banner, coin ticks.
92. Sleeping Draught | movement | One enemy minor sleeps for opponent's next 3 turns; wakes early if any adjacent piece is captured. | Potion tips, Zzz bubbles, alarm jolt.
93. Wallhack Goggles | info | 3 turns: enemy sliders' attack lines drawn through blockers (X-ray threats). | Green wireframe flicker.
94. Prank Call | comedy | Opponent's next draft interrupted 3 seconds by fake incoming call overlay (their clock paused). | Rotary phone, caller ID "Your Rook".
95. Growth Potion | transform | One knight becomes a Warhorse for 5 turns: knight moves; after capturing a pawn may immediately move again (once per turn). | Vial gulp, muscle pop, hoofprint dust.
96. Priest Hole | protection | Once within 5 turns when checked, your king may swap with one of your rooks (must resolve check). | Bookshelf spins, dust-off reappear.
97. Rube Goldberg | chain | Pawn advances 1; if adjacent to enemy pawn, push it back 1; if push blocked, blocker stunned 1 turn; if blocker is a rook, gain 10 seconds. | Dominoes, marble, see-saw, boot on stick.
98. Rules Lawyer | meta | Once within 6 turns when opponent gives check: check stands, they lose 10 seconds, you gain 10. | Rulebook slam, OBJECTION! bubble.
99. Booster Pack | draft | Immediately receive 1 random card from your current draft tier's pool (fair odds). | Foil pack tear, rainbow light.
100. Identity Crisis | comedy | One random friendly minor and one random enemy minor swap owners for 4 turns, then swap back if both survive. | Question marks, mid-air repaint.

## Tier 5 (25)

101. Cloud Serpent | rank | Serpent coils a chosen rank 5 turns: enemy pieces cannot cross it (yours can). Once: remove one enemy pawn adjacent to its rank. | Serpent flows in, undulates; coil squeeze.
102. Wizard Duel | random | Your bishop duels an enemy bishop: 50/50 loser removed; winner gains king-steps 3 turns. | Beams meet, spark tug-of-war, disintegrate.
103. Royal Wedding | pieces | If king and queen adjacent: spawn 2 pawns next to them, gain 20 seconds. | Bells, rice confetti, procession.
104. Chat Vote | random | Fake chat poll among three boons: 25 seconds, all your pawns may step one square this turn, or stun one enemy minor 1 turn. Winner random. | Scrolling parody chat, racing poll bars.
105. Manager's Challenge | meta | Challenge opponent's last move: 50% it is undone and they replay differently; 50% you lose 10 seconds. | Red flag, replay hood, verdict slam.
106. Trojan Pawn | pieces | Choose your pawn: if captured within 8 turns, two pawns pop out onto adjacent empty squares. | Wooden pawn, hatch, rappel out.
107. Checkmate Rehearsal | info | Once: 15-second sandbox moving ghost pieces (both sides), then revert. Costs 5 seconds. | Blueprint mode, clapboard start/end.
108. Volcanic Vent | square | Vent on empty square 9 turns: erupts every 3 turns, destroying adjacent pawns (both sides) and pushing others one square. | Glowing crack, ember eruption.
109. Pied Piper | movement | Up to 3 enemy pawns on a chosen file are pulled one square toward you (if empty). | Piper dance, hypnotized bobbing line.
110. Off-Broadway Queen | transform | Chosen pawn promotes immediately on reaching the 6th rank (until used). | Broom-crown rehearsal; spotlight coronation.
111. Blood Moon | power | 3 turns: after any of your captures, that piece may move one extra square any direction. | Crimson moon rises; red afterimages.
112. Locust Swarm | rank | All pawns (both sides) on a chosen rank are removed. | Buzzing cloud sweep, stripped squares.
113. Compound Interest | resource | Lock 45 seconds; in 6 turns returned doubled if your queen lives, else lost. | Vault door, spinning dial, coin geyser.
114. Nesting Doll | transform | 10 turns: captured queen leaves a rook; that rook a bishop; that bishop a pawn. | Matryoshka paint; shell cracks per death.
115. Ghost Ship | file | Ship sails a chosen file 1 square/turn for 6 turns, passing through pieces; enemy pieces passed are frozen 1 turn. | Translucent galleon, fog, creaks.
116. Upper Shelf | draft | Your next draft draws from one tier higher. | Ladder slides, glowing higher shelf.
117. Algorithm Boost | draft | Your next draft offers 4 cards; pick within 8 seconds or receive a random one. | Infinite-scroll feed, shrinking timer ring.
118. Winter Palace | square | Your back two ranks freeze 4 turns: entering enemy pieces frozen 1 turn. | Corner frost crawl; ice-block flash.
119. Puppeteer's Gala | movement | Control one enemy minor during your next 2 turns (it cannot capture). | Strings from gloved hand, jerky dance.
120. Demolition Derby | random | 3x3 area: every non-royal piece moves one random square; colliding pairs both removed. | Rev, spins, tire screech, crash stars.
121. Raven Parliament | info | 5 turns: ravens mark undefended enemy pieces at your turn start. | Ravens perch board frame, flap to marks.
122. Squire's Ascension | transform | One pawn becomes a knight permanently; if it captures a queen it becomes a queen. | Sword-tap ceremony; later full coronation.
123. Flash Mob | pieces | 4 pawns on random empty squares of your third rank (cannot move the turn they appear). | Boombox, synchronized breakdance, salute.
124. Gravity Flip | board | 2 turns: all pawns (both sides) may also step one square backward (no backward captures). | Board tilt, antigravity motes, hover-steps.
125. Player Trade | movement | Swap two of your pieces; then opponent may swap two of theirs. | Referee whistle, jersey-number flash.

## Tier 6 (25)

126. Hostile Takeover | movement | Make the opponent's next move for them: any legal non-capture move, their king excluded. | Corporate raiders spin their chair away; visitor badge.
127. Frost Wyrm | rank | Ice dragon sweeps a chosen rank: enemy pieces frozen 2 turns; empty squares become ice walls 2 turns. | Skeletal ice dragon flies the rank, crystalline breath.
128. Stack Overflow | meta | Opponent's next 3 turns: any move over 20 seconds costs 5 extra seconds. | "Closed as duplicate" stamps, smug tooltips.
129. Midas Gauntlet | capture | Your next 3 captures: +15 seconds each; capture square gilded (your pieces there cannot be pushed/pulled). | Gold gauntlet, victims crumble to coins.
130. Tornado | random | Funnel travels a chosen file: every non-royal piece within one square of it relocates to a random empty square in its own half. | Wandering funnel, debris, bounce landings.
131. Duplicate Glitch | draft | The card you pick in your next draft is duplicated (two copies). | Card stutters, datamosh split.
132. Archmage's Sabbatical | power | 4 turns: once per turn, teleport one of your pieces to an empty square in your half instead of moving. | Corner wizard tower; rune beam-up/down.
133. Rage Bait | meta | 4 turns: opponent captures cost them 6 seconds (taunt plays). | Clown horn, "EZ" sticker, steaming clock.
134. High Water Mark | board | 4 turns: the two middle ranks flood; any piece entering must end its move there (both sides). | Rain sheets, rising water, wading splashes.
135. Golden Goose | resource | Goose in your half 10 turns: +8 seconds at your turn start while alive; if opponent captures it they gain 40. | Strut-in, golden egg per turn, slow-mo feather death.
136. Grand Illusionist | board | 4 turns: your pieces appear as pawns to the opponent (1-second hover reveals; legality unaffected). | Curtain sweep, sea of "pawns", magician bow.
137. Emergency Patch | meta | 5 turns: each turn one random enemy slider type is limited to 2 squares of movement that turn. | Patch-notes scroll, dev hammer, version tick.
138. Regency Council | power | 5 turns: while your queen is off the board, rooks and bishops may also move one square any direction. | Council vignette, wax-seal stamps.
139. Meteor Golf | attack | Choose any square: meteor lands after opponent's next turn (both see target); destroys non-royal piece there, pushes neighbors one square. | Golf wind-up, "FORE!", dotted arc, crater.
140. Vampire Court | transform | Up to 2 of your minors become Vampires permanently: captures grant 6 seconds; when killed they return once after 3 turns adjacent. | Cape flourish, red eyes; bat-swarm reassembly.
141. Great Migration | movement | All your pawns advance one square simultaneously as your move (blocked stay). | Herd rumble, dust wave, light shake.
142. Wish Fish | random | Random boon: 30 seconds, pawn spawn next to king, or 2 draft rerolls. | Cast beyond board, reel scream, sparkle burp.
143. Season Pass | draft | 1 free reroll in each of your next 3 drafts. | Gold card swipe, battle-pass track lights.
144. Coup d'Etat | meta | 6 turns: queen becomes the royal (checkmate target); king gains queen movement. Needs both alive. | Throne room, crown procession, fanfare.
145. Plot Armor | protection | Once within 6 turns: one of your non-royal pieces survives a capture attempt; attacker returns to its origin. | Golden script pages swirl, caption.
146. Feng Shui Plot | square | Claim a 2x2 area 6 turns: your pieces inside may also move one square any direction. | Realtor sign, serene glow, wind chime.
147. Private Gallery | draft | Your next draft shows 4 cards; pick 1 and gain 10 seconds. | Velvet rope, easels, white glove.
148. Rolling Boulder | attack | Boulder rolls down a chosen file from your side: removes first enemy pawn hit, pushes next piece one square, then blocks 3 turns. | Gathering speed, flattened pawn peel, grind halt.
149. Lantern Festival | revival | Revive up to 4 captured pawns as Wisps on your second rank: block, move 1 forward, no captures, fade after 6 turns. | Floating lanterns drift up, settle, glow.
150. Paperwork Avalanche | capture | Opponent's next 3 turns: any capturing enemy piece cannot move on their following turn. | Forms rain, stamp desk, buried to crown.

## Tier 7 (25)

151. Mod Powers | movement | Each of your next 3 turns: mute one enemy non-royal piece (cannot move opponent's following turn). | Mod badge, giant MUTED slash, gavel click.
152. The Great Flood | board | Wave washes every piece on the central four ranks one square toward its own side (blocked stay). | Full-width tidal wave, bobbing drift, fish flop.
153. Write the Patch Notes | draft | Before your next draft, view its tier pool and remove 3 cards from your own pool for that draft. | Red pen strikethroughs on a scroll.
154. Puppet Coronation | movement | Move the enemy queen yourself for one of your turns (no captures). | Golden strings, stiff marionette walk.
155. Time Heist | meta | Opponent skips their next turn; within 10 turns they may respond by skipping one of yours (their choice when). | Heist crew steals hourglass; reverse-replay revenge.
156. Colossal Visitor | attack | Colossal lizard crosses a chosen file: pawns on it destroyed, others pushed adjacent, two footprints burn 2 turns. | Giant foot stomps up the file, tail exit, roar.
157. Prophecy Engine | info | Name a piece type: 6 turns, each opponent move of it gains you 6 seconds; if never, gain 40 at end. | Brass orrery aligns, gear chimes.
158. Speedhack | tempo | Your next 5 turns: moves within 10 seconds cost no clock time. | Datamosh blur moves, anticheat shrug toast.
159. Split the Timeline | meta | Once: both players secretly submit next moves simultaneously; both resolve (collisions bounce back). | Ghost boards split and slam together.
160. Olympus Voicemail | delayed | Next 3 turns: bolt stuns the enemy non-royal piece that moved most recently (1 turn each). | Answering machine, cloud-hatch bolts.
161. Patient Grift | draft | Skip your next 2 drafts; your third offers 2 Tier 8 cards, keep 1. | Card shark winks; gilded payoff deal.
162. Grail Quest | transform | One knight leaves for 5 turns; returns to your half as Grail Knight: knight+king moves, immune to stuns/freezes. | Sunset ride-off; cloud-parting return.
163. World Serpent | board | 4 turns: a-file and h-file joined; horizontal moves wrap (both players). | Serpent bites tail around board frame.
164. Insider Trading | draft | See both cards of opponent's next draft; secretly predict their pick; right = 15 seconds. | Ticker tape, briefcase peek, stamped slip.
165. Coliseum | attack | Choose your non-royal piece and an enemy non-royal piece of equal/greater value: both removed; gain 10 seconds per value point difference. | Sand arena rises, silhouette clash, banner falls.
166. The Big Nap | board | 2 turns: all pieces except kings and pawns sleep (cannot move, both sides). | Night falls, blankets, snoring, alarm.
167. Promotion Jubilee | transform | 5 turns: your pawns may promote on the 7th rank. | Bunting, per-promotion fireworks parade.
168. Fourth Wall Repair Crew | meta | 3 turns: tiny workers carry captured pieces off-screen; each enemy piece removed gains you 4 seconds. | Stretcher crew, cone and tape.
169. Deja Vu | meta | The last full move pair replays immediately if both moves are still legal. | Film flicker, sepia REPLAY stamp.
170. Heavenly Bureaucracy | protection | 8 turns, once: a checkmate against you downgrades to check; king teleports to a random safe square (mate stands if none). | Angel clerks, DENIED stamp, fax teleport.
171. Menagerie Stampede | attack | 2 adjacent files: pawns on them shoved to neighboring files (removed if blocked); non-pawns stunned 1 turn. | Rhinos, ostriches, confused cow, dust wall.
172. Chess Boxing | random | Kings box: 50/50; winner's player immediately makes an extra move. | Ring ropes, gloves, three swings, stars.
173. Living Board | board | Swap the entire contents of two chosen 2x2 areas (illegal if either king ends in check). | Hydraulic tiles lift, cross, slot down.
174. Ancestral Audience | revival | Revive your highest-value captured piece to an empty square; opponent revives their highest-value captured pawn or minor. | Twin spirit doors, incense, bows.
175. Cartographer's Vault | draft | Your next 2 drafts each offer 3 cards. | Map vault, unfurling card-scrolls.

## Tier 8 (25)

176. The Elder Wyrm | pieces | Dragon lands on chosen empty 2x2 for 6 turns (impassable). Each of your turns command one: fire breath down a file (destroy first enemy pawn, scorch 2 squares 1 turn), wing gust (push all adjacent pieces 1 square), or tail sweep (stun enemy pieces on one adjacent rank 1 turn). | Shadow grows, screen-shaking landing, per-command choreography, takeoff blast.
177. The Rapture of Pawns | transform | All your pawns permanently become Seraph Pawns: move 1 forward/diagonal-forward/sideways; capture diagonally forward. | Light pillars, sequential wings, choral note.
178. Board of Directors | random | 6 turns: at your turn start a random directive: 6 seconds, mark undefended enemy piece, one pawn may sidestep this turn, +1 reroll, or push one random enemy pawn back. | Five chairs spin, memo paper airplanes.
179. Continental Drift | board | 5 turns: chasm between ranks 4 and 5; only knights cross, except at 2 bridge squares you place. | Board halves split, dust vents, rope bridges.
180. The Menu | draft | Your next draft reveals the entire eligible tier pool; choose any 1 card. | Menu unrolls past screen edges, chef's kiss.
181. Let Me Play For You | movement | You make your opponent's next 3 moves (their king cannot be moved; your clock runs during those turns). | Giant hand reaches across; P2 CONTROLLER toast; glowing eyes.
182. Deus Ex Machina | revival | Once, choose one: revive your captured queen to an empty square; or cleanse all your freezes/stuns and stun the last 2 enemy movers 1 turn; or restore 90 seconds. | Brass machine god descends, giant hand miracle.
183. Pandemonium Carnival | random | 4 turns: at every turn start (both players) a random minor event from a visible wheel of 8 (nudges, small time gifts, 1-turn freezes, frog spawn, pawn shuffles, confetti). | Ferris wheel, calliope, barker banners.
184. The Ninth Rank | board | 6 turns: phantom rank behind your first; king and up to one rook may retreat there (cannot act or be captured; may return). | Ghostly squares slide out, torchlit mist.
185. All the King's Men | revival | Up to 4 of your pieces captured in the last 5 turns return on random empty squares in your half. | Banner wall, horseback returns, dismounts.
186. Anti-Gravity Gala | board | 3 turns: any moving piece (either side) may overshoot its destination by one extra square in the same direction. | Everything floats, zero-g trails, slow rotation.
187. One Thousand Ducks | comedy | Duck tide: every enemy pawn adjacent to your pieces is swept back one square; 3 ducks remain as blockers on random empty squares 4 turns. | Screen-filling yellow flood (skippable), mass squeaks.
188. Crown of the Undying | protection | Once per game: when you would be checkmated, every enemy piece adjacent to your king is destroyed and mate must be re-delivered. | Black-gold crown beam; dark nova camera kick.
189. Symphony of the Legion | power | Three movements replacing your next 3 moves: (1) all pawns may step 1; (2) all minors may king-step; (3) rooks/queen may move through one friendly piece. | Conductor podium, baton waves, sheet-music particles.
190. The Tutorial | meta | 3 turns: lying tutorial mascot points arrows at bad moves for the opponent (labeled untrustworthy to both); +5 seconds when opponent plays a suggested move. | Paperclip-knight, giant arrows, GREAT JOB balloons.
191. Ragnarok Postponed | delayed | In 10 turns every piece except kings and pawns is removed (both sides). Cannot be cancelled. | Giant clock face tolls; ash wave finale.
192. My Cousin From Out of Town | comedy | Giant checkers piece on chosen empty square 8 turns: one king-step per your turn, cannot capture, immune to pawns; its capturer is stunned 1 turn under a checkers stack. | Disco slide-in, confused question marks.
193. Terraform | board | Permanently reshape up to 4 empty squares: mountain (impassable), forest (no slider captures of pieces inside), or spring (your piece there gains you 4 seconds per turn). | Celestial toolbox, terrain dioramas rise.
194. Standing Ovation | resource | 5 turns: each check you give earns 10 seconds; a check the opponent escapes earns 20. | Silhouette crowd, applause ripples, roses.
195. Leviathan Below | attack | Mark 3 squares (visible to both): after your next turn, tentacles erupt, removing non-royal pieces there; squares impassable 2 turns. | Water darkens, synchronized tentacle smash.
196. Dev Console | meta | Open once: run one command: spawn a pawn in your half, add 45 seconds, or reveal both players' next draft offers. | Terminal window, self-typing green text.
197. Democracy | comedy | 3 of your turns: three random legal moves nominated; you must play one; each earns 15 seconds (+10 more if a capture). | Podiums, picket signs, ballot confetti.
198. Monks of the Fifth Bell | power | Permanent: every fifth of your turns, after your move one pawn or your king may take one extra single-square step. | Bell tower vignette, time-ripple bonus step.
199. The Fool | comedy | Fool adjacent to enemy king 6 turns: cannot capture or be captured; at opponent turn start 25% one enemy piece adjacent to it is too embarrassed to move that turn. | Somersault entrance, juggling, dunce-cap blush.
200. NerfChess: The Musical | meta | Once: short skippable musical number; rearrange up to 5 of your pieces onto empty squares in your half; both players gain 15 seconds. | Kick-line, curtains, playbill at camera.

## Gambling set (24; 3 per tier). Redesign v2 (owner feedback: more creative, stronger,
## board-based payouts, minimal clock-time prizes). All odds server-seeded and displayed.

201. Penny Slots | T1 | 50% nothing; 35% one pawn of your choice may step sideways this turn; 15% jackpot: spawn a pawn on your second rank. | Real slot reels land on the true symbols; jackpot spills the new pawn out of the coin tray.
202. Heads or Tails | T1 | Call the flip. Right: immediately make a free one-square pawn advance. Wrong: nothing (the coin laughs). | Slow-mo coin, true face, tiny "ha ha" engraving on a loss.
203. Claw Machine | T1 | 45% plush mascot (cosmetic, sits by the board 5 turns); 35% peek at your next draft; 20% the claw drops a pawn onto your second rank. | Cabinet, wobbling claw, prize chute delivers the actual prize.
204. Raffle Ticket | T2 | For your next 3 turns: 1-in-3 draw each; each hit lets one pawn advance a free square at turn start. | Raffle drum spins per turn; matched stubs light up.
205. Card Counting | T2 | Up to 3 higher/lower calls, push your luck: 1 right = a pawn sidestep token; 2 = one minor gains king-steps for 2 turns; 3 = spawn a pawn; any miss loses the accumulated prizes. | Blackjack shoe, growing prize tray, sweep on a bust.
206. Loaded Dice | T2 | Roll 2d6: 7+ = a pawn of choice advances 1; exactly 12 = advances 2 and may capture straight ahead once; under 7 = the loaded dice grant one free re-throw. | Physical dice tumble across real squares, pips visible; the re-throw wobbles suspiciously.
207. Lootbox | T3 | 55% common: one knight may camel-leap on its next move; 25% rare: pawn spawn on your second rank; 15% epic: your next draft offers 3 cards; 5% legendary: random Tier 5 buff granted. | Actual lootbox: crate thud, lock dials, creaking lid, rarity beam in the true color (grey/blue/purple/gold + screen flash), item card rises.
208. Three-Card Monte | T3 | Track the queen card through a real on-screen shuffle and pick. Right: a free reroll plus see the opponent's next draft. Wrong: nothing. | Street table, genuinely trackable shuffle, truth flip.
209. Underdog Parlay | T3 | Two legs: give check within 5 turns AND capture within 3. Both hit: spawn a knight on your back rank. One: pawn spawn. None: opponent gains a free reroll. | Betting slip pinned on screen, legs stamp HIT/MISS live, payout rides in.
210. River Card | T4 | You and opponent get hidden 1-13. Fold (nothing) or call: the winner steals a pawn of their choice from the loser (it walks across and defects). | Face-down deal, chip push, double flip, pawn walk-of-shame defection.
211. Piece Roulette | T4 | Bet one pawn: 45% promotes to knight; 10% promotes to rook (the green zero); 25% nothing; 20% removed. | Pawn stands on a real wheel; ball circles and drops into the deciding pocket.
212. Jackpot Pawn | T4 | One pawn for 5 turns: each advance spins its reels: 20% it gains a permanent king-step charge (stackable); 3% jackpot: promotes to queen immediately. | Belly reels spin per step; charges glow as stored cherries; jackpot is a siren coronation.
213. Double Down Draft | T5 | In your next draft, after picking you may double down: 50% keep BOTH offered cards, 50% keep neither. | Chips slide onto the draft tray, dealer knocks, both cards flip together.
214. Crash Game | T5 | One of your pawns rides the rocket. Cash out as the multiplier climbs: 1.5x = pawn returns + sidestep token; 2x = returns as knight; 3x = knight + free reroll; 5x = returns as rook; crash = the pawn burns up. | Rocket on a live climbing graph beyond the board edge; ejection parachute at cash-out; real explosion at the true crash point.
215. Blood Wager | T5 | Wager one minor piece: 55% it becomes a rook; 35% removed; 10% the blood god is pleased: rook plus a pawn spawn beside it. | Dueling dais, fate coin, forge-blast transformation, trapdoor, or double-payout crimson eruption.
216. Progressive Jackpot | T6 | For 6 turns every capture (both sides) adds a soul to a visible pot; whoever made the LAST capture when it ends summons the pot: 2 souls = pawn, 4 = knight, 6+ = rook. | Neon soul-jar fills per capture; summoning cascade for the final capturer.
217. The House | T6 | For 6 turns, every random effect resolving for either player pays you a chip; cash 3 chips for a free reroll or a pawn sidestep token, 6 chips for a pawn spawn. | Green visor, croupier rake sweeps chips to your tray, cash-in register.
218. Gacha Banner | T6 | 3 pulls: 55% common (pawn sidestep token); 30% rare (pawn spawn); 12% epic (random T4 buff); 3% SSR (random T7 buff). Pity: three commons upgrade the third to epic. | Full gacha sequence, star-color telegraph, gold screen crack on SSR.
219. Seven Cases | T7 | Seven cases: pawn, pawn, knight, bishop, rook, a leak of the opponent's next TWO drafts, and a dud. Open one; the banker offers a guaranteed knight to walk away; refuse and open a second case, keeping only it. | Spotlit briefcases, real contents on open, banker phone silhouette.
220. Martingale | T7 | Army pot doubles per winning flip: 1 pawn, then 2 pawns, then knight+pawn, then rook+knight (max 4). Bank anytime; any loss forfeits the pot and stuns your last-moved piece 1 turn. | Chip stacks morph into piece silhouettes as they double; sweep or triumphant cash-out.
221. Devil's Deck | T7 | Draw 3 from a shown 6-card deck: 4 blessings (spawn a knight; stun three enemy pieces 1 turn; one minor upgraded to bishop; revive a captured minor) and 2 curses (lose a random pawn; one of your minors frozen 2 turns). All three resolve. | Horned dealer fans the deck face-up first, shuffles, each draw ignites gold or red.
222. Break the Bank | T8 | Heist, three 60% laser-grid rolls: 3 hits = revive your highest-value captured piece + random T6 buff; 2 = random T6 buff; 1 = pawn spawn but one random piece jailed 2 turns; 0 = two pieces jailed 2 turns. | Vault drill, per-roll laser dodge or trip, getaway or tiny handcuffs + cell overlay.
223. Wheel of the Cosmos | T8 | 12 visible segments, no time prizes: 8 good (revive a minor; all pawns may step; a 3-card draft; stun two enemies; promote-on-7th for 3 turns; 2 rerolls; cleanse your army; spawn a knight) and 4 bad (lose a random pawn; a minor frozen 2 turns; opponent gains a free reroll; one of your pawns defects). | Screen-filling constellation wheel, agonizing clacker, landed fate plays its own full effect.
224. The Last Bet | T8 | Stake your queen: 70% she returns empowered for 6 turns (queen + knight moves); 30% held in the back room for 2 turns, then returns unharmed. | Crown pushed as chips, giant dealer hand, single card decides; bouncer rooks escort on a loss with a visible return counter.

## New Hexes (300) and Boons (300)

Owner amendment: 300 hexes + 300 boons. Tier split each: T1-T4 38 per tier, T5-T8 37 per tier (4x38 + 4x37 = 300).
Owner explicitly allows deriving many from buff mechanics (mirrored into curse/relief form) and reusing/copying their animations.
Designs must be board-focused, not time-focused. Recorded in `docs/overhaul-hexes-boons.md` as implemented; each entry: id | name | tier | effect.
