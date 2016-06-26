# posting to: http://localhost:3000/api/articles/update/:articleid with title, content
# changes title, content
#
import requests # if not installed already, run python -m pip install requests OR pip install requests, whatever you normally do
r = requests.post('http://localhost:3000/api/games/search', data={'personID': 0})
print(r.text)