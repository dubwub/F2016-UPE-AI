https://docs.google.com/document/d/1fRC1EvRcNP17UQdy2mRlxaClRezLiTTGL9MW3bGafS8/edit#

UPE AI Documentation
Introduction to Bomberman
Premise
Bomberman is a grid-based game where players aim to be the last man standing by blowing all of their opponents up.


http://bomberman.wikia.com/wiki/Bomberman_Series

Players start in various starting locations on a grid populated with blocks that impede movement. On each turn, the main engine pings all the AIs for their move and then executes all of these moves simultaneously. In traditional Bomberman, a turn can consist of doing nothing, moving up/down/left/right one square, or placing a bomb. Bombs tick down after being placed until their timer hits 0, at which point they destroy blocks, players and detonate other bombs within their range.

In usual games of Bomberman, destroyed blocks occasionally drop power-ups that players can pick up. Sample power ups include increasing the number of bombs a player can use, increasing the range of bombs, and increasing the speed of the player.

For further explanation on how default Bomberman works, see the extended documentation below or simply watch some videos of existing Bomberman games. The general concept is the same.

However, this isn’t default Bomberman. The variant of Bomberman that will be used for this AI competition can most aptly be described as “deterministic Bomberman with portals”. To summarize the big changes that set this apart from the classic ruleset:
Blocks are given values depending on their proximity to the center; blocks closer to the middle are the most valuable. Blowing up blocks give you coins you can spend in the global shop for power-ups. Buying from the global shop is considered an action that will take a turn.
By turning everything into predictable formulas, AIs can rely on pure skill to defeat their opponents. People will not get screwed over by randomly getting the power-up they needed or by not getting any power-ups.
Additionally, instead of doing any other action, players can shoot their portal gun in the direction they’re facing. The closest surface that the player faces (on a wall, destructible or not) will be either an orange or blue portal, depending on which color was shot previously. Anything that would move through the portal (players, moved blocks or bombs) will go through the other portal end. Bomb explosion trails will even go through too.
Why Bomberman?
Bomberman is turn-based in nature, and turn-based games are simply better for this sort of competition in a lot of ways:
Human vs AI testing: Contestants can test their bots by literally playing against them. Humans may not easily be able to keep up in most real-time games.
Allows for neural nets: Turn based games can be sped up computationally so that neural nets can be trained in a time-efficient manner.
Replays: Turn-based games can be easily summarized into a notation that is reconstructable, allowing for matches to be saved without the use of a 3rd party stream.
Ease of Organizer development: Makes things simpler for the back-end here -- it allows for the server to know exactly when to ping the AIs for values and makes the whole process way more streamlined for everything.
Ease of Contestant development: It’s much easier to develop an AI for a turn-based game. This does not necessarily lower the skill ceiling of the game, but still allows for a lower skill floor.

Bomberman is widely known as a classic game, and additionally is very simple at its core. At every point in time it is easy to delineate all of the options any one player has. However, that does not mean it necessarily has a low skill ceiling.

As a game, Bomberman is highly versatile. Depth can always be added to the simple Bomberman engine by complicating powerups or by changing around different mechanics. Bomberman can be played in a multitude of formats, from 1v1 to large map free-for-alls.
Full Documentation
Full Rules
Unless otherwise specified, below are the laws that govern all of the objects within Bomberman.
Definitions
Grid refers to the board on which everything in the game exists. This can be varied depending on the number of players, but will default to a 16x16 board. This means that there is a 16x16 board populated by players and blocks surrounded by a single row layer of indestructible blocks (functionally 16x16, but “truly” 18x18).
Players are the characters that AIs control. An AI is considered to be out of the match when all of its player objects are killed.
Bombs are objects that players put down. Players have a limited number of bombs they can have out at any point in time. After being placed, they will tick down for a specified amount of time then detonate in the four main directions (up/down/left/right), creating explosion trails (see the extended Bomb documentation).
Bomb Timer refers to the number of turns a bomb will tick for before detonating (default: 4 turns)
Range refers to the number of grid spaces away the explosion trail will try to reach after detonation. If an explosion trail encounters a block, it will refer to Pierce (below) to determine how much further to go. (default: 1 space)
Pierce is related to range, and refers to how many grid spaces a detonation trail will pass through after colliding with a destructible wall. (default: 0 space, meaning that bombs will ordinarily not pass through destructible walls).
Bomb Count refers to the number of bombs a player can have existing on the map at any point in time. (default: 1)
Blocks are objects that exist on the board and impede movement. These are initialized before any movement from any player is possible. An object that attempts to move into a face of a block that does not have a portal will retain its orientation but stop moving. There are two types of blocks: indestructible and destructible. Destructible blocks can be destroyed upon collision with an explosion trail. Any explosion trail overlapping on the block on the turn it is destroyed will award a number of coins to its owner. Indestructible blocks, as the name implies, cannot be destroyed.
Portals are objects that exist attached to blocks and are basically identical to those in the actual video game made by Valve. Players can spend their turn to shoot a portal instead of doing anything else. See the Full Documentation below for more Portal details.
Coins are awarded to players upon destruction of a block. These can be spent in a global shop, and this counts as an action you can spend a turn on.
Global shop refers to the omnipresent global shop that contains all of the power-ups that are usable in the Bomberman game. The power-ups that are purchasable are listed below in the Power-ups section.
Apocalypse refers to what happens after 200 turns have passed. In order to fairly but surely end the game in favor of one player, indestructible blocks will begin to spawn in a snake-like fashion around the edges of the board, killing players that touch them.
Initialization
Bomberman is a turn-based game.
On turn 0, the board is initialized:
Indestructible blocks are placed at set places each time (formula incoming) 
Destructible blocks are guaranteed at set places (formula + drawing incoming), and then pseudo-randomly generated elsewhere. Note that players are guaranteed a grouping of three free squares at the beginning to ensure that there is a way for the player to start the game.
These blocks are also given value equal to (formula incoming)
Players are initialized at start points in opposite corners of the grid, facing horizontally away from the indestructible block behind them. (i.e. if you start in the top left corner, you start facing to the right).

Players start with:
0 Coins
Bomb count 1
Bomb range 1
Bomb pierce 0
Bomb timer 4
Movement
Players can, on any turn, decide to move up, left, right or down one square.
This is done by inputting the move u, l, r or d depending on the direction the player wishes to travel.

When moving, all players’ target squares are calculated and then all of the target squares are resolved. Movement in this manner is resolved by first changing the player’s orientation to be facing the cardinal direction, and then moving the player to the square as long as the target square is not on a bomb, block or other non-moving player. If the player cannot move for this reason, they will still change their orientation, but will be stationary.

If a player attempts to walk onto a block that has a portal facing the player, the player will have a successful move as long as the portal is paired with another portal that faces an empty square. Note that the player’s orientation will be changed to match the orientation of the portal the player leaves.

If a player attempts to walk onto a bomb/destructible block and has the Kick Bomb/Block power-up, they will complete their movement successfully and move the bomb/destructible block into the next square if and only if one of the following is true:
The next square is an empty, legal square.
The next square is occupied by a block that has a portal facing towards the block to be moved, and that portal has a paired portal in another location facing an empty, legal square.

However there are two main edge cases:
If two players share a target square, they both bump back to their original squares.
If two players are next to each other, and try to move to the other players’ square (essentially moving through each other), they will both bump back to their original squares.
Bombs
Bombs work pretty much identically to traditional Bomberman.
Bombs are placed by submitting the move: b
Right after placing a bomb, the player and bomb will share a square. This is the only scenario (apart from Ghost, which may or may not be in the game) that a bomb can share a space with a player. Movement after placing a bomb works as normal.

Each turn, all existing bombs will tick down. If any are at 0, they detonate, creating detonation trails in the four squares immediately up, down, left and right from the detonation spot. These detonation trails will travel outwards, only stopping if one of the following occur:
The trail has travelled without hitting any blocks for the player’s bomb range amount of spaces.
The trail has collided with an indestructible block.
The trail has collided with a destructible block previously and has travelled for the player’s bomb pierce amount of spaces after.
One edge case to note is if a trail hits a block with a portal facing the trail, it will continue to the other end of the portal if it exists. It will also take the orientation of the paired portal. Essentially bomb trails do travel through portals.

Colliding with explosion trails is generally bad for the objects in Bomberman:
Bombs that are in the explosion trail will detonate on the turn that the explosion trail hits them. Chain reactions will all occur on the same turn, so a single bomb may trigger an extremely large explosion.
Players in the explosion trail will die.
Destructible blocks in the explosion trail will be removed, and will award all players who own explosion trails crossing the block at the time of death coins.
If a destructible block is destroyed by an explosion trail, the player will be awarded ceiling((average value of destroyed blocks) * (number of blocks destroyed)) number of coins. For instance, a bomb that hits two blocks valued at 2 and 10 will award its player 6 * 2 = 12 coins.
Portals
As in the original Portal game, players have an orange portal and a blue portal. Apart from color, these are identical. Shooting a portal is as easy as inputting the command: p

The color does have significance, however. When you shoot your first portal, it will be orange. When you shoot your second portal, it will always be blue. Subsequent shots will continue cycling in this way, but will replace the portal of the same color that already exists. You cannot specify which color of portal to shoot, you have to cycle naturally.

Portals also act like in the original Valve game. Players can walk through portals as long as that would be a legal move. Bombs and blocks that are being kicked by players can also move through portals this way. Bomb explosion trails will also go through portals.

Dev Note: Maybe make portals unable to be shot through bombs? Otherwise it may be too easy to get out of some traps.
Power-ups & Global Shop
You can buy a power-up using the move: buy xx, where xx corresponds to the enum of the power-up. For instance, range up is buy 00, and kick bomb is buy 05
When a power-up is bought, the price of the power-up is deducted from the player’s coin count. If the player has insufficient coins, the player does not get the power-up, and the move is considered to be a “do nothing”.

When your player has a power-up, the engine knows to act as if your player has the power-up.

Range up: Increases your player’s bomb range by 1 [Max: 8?]
Bomb up: Increases your player’s bomb count by 1 [Max: 5?]
Pierce up: Increases your player’s bomb pierce by 1 [Max: 8?]
Set Block?/Dirt Wand?: Creates a destructible block in the space your player is facing. Cost is variable to the value of the block being placed.
Kick Bomb?: Allows your player to push bombs by moving into them. This will put the bomb one square further
Kick Block?: Allows your player to push blocks by moving into them. This will put the block one square further
Clone?: 
Ghost?:
Engine details
When resolving what happens each turn, the following order is followed:
Players who have inputted a “buy” command from the global shop are resolved first.
Dev Note: Should probably be before the bombs go off to allow for smart AIs to shield themselves.
Players who have inputted a “portal” command are resolved.
Players who have inputted a “move” command are moved.
This is done before bombs are resolved to ensure you can move away from a bomb explosion on the last turn.
Existing bombs are ticked down, and if any are 0, they detonate.
Players who have inputted a “bomb” command place their bombs. Note that bombs are placed after existing bombs are ticked.
Apocalypse
After 200 turns have passed, if the game is still not over, it will transition into the Apocalypse stage. At this point, indestructible blocks will be spawned starting in the top left corner. The indestructible blocks will go all the way until reaching the end of the square, and then will start spawning going down to the bottom right, then bottom left, then back to top left. Players who are standing on a square that a block spawns on will be killed.
Accessing the Codebase
Using the Engine
Developing an AI (Python 3)
Developing an AI (Java)
Developing an AI (C/C++)
Submitting a move to the engine
Replays
Contributors
Darwin
Janice, eric, chris

TODO LIST
Is Bomberman copyrighted?
People sign up teams or something with UPE server, they get a hash key or something, when they connect they can connect using their hash key and specify unranked or ranked. Ranked == elo (seeding), 