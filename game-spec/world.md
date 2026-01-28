Let's create the world that this otter lives in. The World is a separate, pure
class that represents the game's world state. The world is 500x500 tiles large.
Every tile in the world has a type. Some tile types can be walked over and some
block movement. Some tile types can be interacted with. Tiles that can be walked
over include dirt, grass, mud, shoreline. Tiles that cannot be walked over
include boulders, cliffs, and trees.

The player and all other NPCs such as other animals will always stand in their
own tiles and are blocked by other characters. Items are also placed in tiles as
allowed but may be placed freely in x,y position within the tile to look
natural. Some tiles contain a limited amount of natural resources that the
player can remove such as mud, rocks, shells or twigs. The player may remove 1-3
of these per tile type and then the tile will be empty.

There are also water tiles that include river and ocean tiles. When the player
is on a water tile they will be swimming and different items and animals can
appear in the water.

Create a World class that contains a grid of Tiles and a Tile class to represent
the properties of a tile. Generate a world that is 500x500 tiles. It should have
a river that winds through it from the southwest corner to the north edge of the
map. Tiles along the river are shoreline and mud transitioning into dirt or
grass. The edges of the map are surrounded by rocks and boulders or cliffs to
block player movement.
