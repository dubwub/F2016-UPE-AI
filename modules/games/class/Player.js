var mongoose = require('mongoose'),
  mongoosePlayer = mongoose.model('Player');

function Player(index, boardSize) {
	this.alive = true;
	switch (index) { // initialize player position depending on index
      case 0:
        this.x = 1; // top left corner
        this.y = 1;
        break;
      case 1:
        this.x = boardSize - 2; // bottom right
        this.y = boardSize - 2;
        break;
      case 2: // this is just for future expansion, right now stick to 1v1
        this.x = 1; // bottom left
        this.y = boardSize - 2;
        break;
      case 3:
        this.x = boardSize - 2; // top right
        this.y = 1;
        break;
      default: // really should not be reaching here actually
        break;
    }
}

Player.prototype = {
	x: 0,
	y: 0,
	alive: true,
	model: null,
	getID: function() {
		if (this.model === null) this.model = new mongoosePlayer();
		return this.model._id;
	},
	save: function(callback) {
		if (this.model === null) this.model = new mongoosePlayer();
		this.model.x = this.x;
		this.model.y = this.y;
		this.model.alive = this.alive;
		this.model.save(callback);
	}
};

module.exports = Player;