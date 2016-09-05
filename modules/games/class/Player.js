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
	orientation: 0,
	bombCount: 1,
	bombRange: 3,
	bombPierce: 0,
	coins: 0,
	alive: true,
	model: null,
	orangePortal: null,
	bluePortal: null,
	getID: function() {
		if (this.model === null) this.model = new mongoosePlayer();
		return this.model._id;
	},
	save: function(callback) {
		if (this.model === null) this.model = new mongoosePlayer();
		this.model.x = this.x;
		this.model.y = this.y;
		this.model.orientation = this.orientation;
		this.model.bombCount = this.bombCount;
		this.model.bombRange = this.bombRange;
		this.model.bombPierce = this.bombPierce;
		this.model.alive = this.alive;
		this.model.coins = this.coins;

		this.model.orangePortal = this.orangePortal;
		this.model.bluePortal = this.bluePortal;
		this.model.markModified('orangePortal'); // marking modified required for objs apparently
		this.model.markModified('bluePortal');

		this.model.save(callback);
	}
};

module.exports = Player;