import time
import requests # if not installed already, run python -m pip install requests OR pip install requests, whatever you normally do
import random
r = requests.post('http://upe21.cs.rpi.edu:3000/api/games/search', data={'devkey': "57fc3d08ae9d4f817fb61b56", 'username': 'darwinbot1'}) # search for new game
json = r.json() # when request comes back, that means you've found a match! (validation if server goes down?)
print(json)
gameID = json['gameID']
playerID = json['playerID']
print(gameID)
print(playerID)
possibleMoves = ['mu', 'ml', 'mr', 'md', 'tu', 'tl', 'tr', 'td', 'b', '', 'op', 'bp', 'buy_count', 'buy_range', 'buy_pierce', 'buy_block']
output = {'state': 'in progress'}
while output['state'] != 'complete':
	randomInt = random.randint(0,len(possibleMoves)-1)
	r = requests.post('http://upe21.cs.rpi.edu:3000/api/games/submit/' + gameID, data={'playerID': playerID, 'move': possibleMoves[randomInt], 'devkey': "57fc3d08ae9d4f817fb61b56"}); # submit sample move
	json = r.json()
	print(json)
	output = json