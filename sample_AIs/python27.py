# posting to: http://localhost:3000/api/articles/update/:articleid with title, content
# changes title, content
#
import requests # if not installed already, run python -m pip install requests OR pip install requests, whatever you normally do
r = requests.post('http://localhost:3000/api/articles/update/57636e5af4428df80aec66b6', data = {'title':'title', 'content': 'content'})
print(r.text)