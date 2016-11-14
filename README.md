#F2016 UPE AI Competition

##Setup
###Installation
* The server is built from the MEAN Stack (https://github.com/meanjs/mean), you should install all of its dependencies too (Ruby, Grunt, Bower)
* If you're installing on Windows, you may need to install the dependencies for node-gyp (https://github.com/nodejs/node-gyp), like Visual Studio and Build Tools
* If you're installing on Linux, make sure you do NOT use sudo apt-get nodejs, because that node version is EXTREMELY out of date. There are many guides online for building nodejs in the correct way.
* Make sure Node.JS, MongoDB is installed on your computer, this will by default install npm
* Navigate to the root directory of this (clone, fork, whatever), and then run npm install

###Running
* Go to mongo/bin (installation folder), then run mongod --dbpath (this project root)/data
* Run the command "grunt" in the root directory of the server
* Then open a browser and go to localhost:3000

###TESTING
* Run the server (see above)
* Open two terminals in the /sample_AIs/ directory, and then run two versions of the python AIs
* Go to the Games List page (normally, by going to localhost:3000 etc), then scroll to the bottom of the list and look at the game
* There should be a submitted move and everything!

###Folder Structure
* /modules/games/ <-- all relevant classes, views and routing for the game module (includes matchmaking)

###Routes
* localhost <-- default landing page
* /api/games/search <-- python27.py will POST here, and this symbolizes looking for a game (run another instance in another terminal and it should find and start the game)
* /api/games/submit/<gameID> <-- for submission of moves

##Helpful Reading
* http://www.bossable.com/564/mean-stack-app-structure/ <-- introduction to the mean stack

##Generating a mailing list
* Run mongo (small terminal that allows you to look at the mongodb directly), and type use ai-comp
* Run the command: results = []
* Then: db.users.find().forEach(function(u) { results.push(u.email); } )
* Then: print results

##Full Rules/Documentation
See aicomp.io/docs for the full documentation!