# posting to: http://localhost:3000/api/articles/update/:articleid with title, content
# changes title, content
#
# id1: (darwinbot1 P@ssw0rd!! 57d748bc67d0eaf026dff431) <-- this will change with differing mongo instances
import time # for testing, this is not good
import requests # if not installed already, run python -m pip install requests OR pip install requests, whatever you normally do
r = requests.post('http://localhost:80/api/games/search', data={'devkey': "581cef76756322705301183e", 'username': 'darwinbot1'}) # search for new game
json = r.json() # when request comes back, that means you've found a match! (validation if server goes down?)
print(json)
gameID = json['gameID']
playerID = json['playerID']
print(gameID)
print(playerID)
input = ' '
while input != '':
	input = raw_input('input move: ')
	r = requests.post('http://localhost:80/api/games/submit/' + gameID, data={'playerID': playerID, 'move': input, 'devkey': "581cef76756322705301183e"}); # submit sample move
	json = r.json()
	print(json)