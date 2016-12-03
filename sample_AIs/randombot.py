import time
import requests # if not installed already, run python -m pip install requests OR pip install requests, whatever you normally do
import random
r = requests.post('http://localhost:80/api/games/search', data={'devkey': "581ced5d7563227053011823", 'username': 'darwinbot2'}) # search for new game
json = r.json() # when request comes back, that means you've found a match! (validation if server goes down?)
print(json)
gameID = json['gameID']
playerID = json['playerID']
print(gameID)
print(playerID)
possibleMoves = ['mu', 'ml', 'mr', 'md', 'tu', 'tl', 'tr', 'td', '', 'op', 'bp', 'buy_count', 'buy_range', 'buy_pierce', 'buy_block']
output = {'state': 'in progress'}
while output['state'] != 'complete':
	randomInt = random.randint(0,len(possibleMoves)-1)
	r = requests.post('http://localhost:80/api/games/submit/' + gameID, data={'playerID': playerID, 'move': possibleMoves[randomInt], 'devkey': "581ced5d7563227053011823"}); # submit sample move
	json = r.json()
	print(json)
	output = json