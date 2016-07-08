import requests
r = requests.post('http://localhost:3000/api/games/submit/' + gameID, data={'playerID': playerID, 'move': 1});
print(r.json);