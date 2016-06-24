/*
 * This file contains the server-side object representations of Bomberman objects.
 * These are easily exported into Exports that are then saved into MongoDB.
 * Exports represent the smallest amount of data necessary to rebuild an object from scratch.
 */

// Bomb
function Bomb(BombExport)
{
	if (BombExport.owner) this.owner = BombExport.owner; // player object that owns the bomb, used for kills
	if (BombExport.game) this.game = BombExport.game; // reference to the overarching game the bomb exists in
	if (BombExport.)
}

// Constructor
function Tournament(TournamentExport) 
{
	if(TournamentExport.name) this.name = TournamentExport.name; 			// name of tournament
	if(TournamentExport.creator) this.creator = TournamentExport.creator; 	// name of tournament's creator
	if(TournamentExport.key) this.key = TournamentExport.key;				// passkey to edit tournament
	if(TournamentExport._id) this._id = TournamentExport._id;				// database ID of the tournament
	if(TournamentExport.date) this.date = TournamentExport.date;			// date of the tournament
	this.created = TournamentExport.created || new Date();					// time of creation
	if(typeof TournamentExport.acceptSetups !== 'undefined') this.acceptSetups = TournamentExport.acceptSetups; //flag for whether tournament is accepting setups from participants
	if(TournamentExport.location) this.location = TournamentExport.location; //geographical location of tournament
	if(TournamentExport.description) this.description = TournamentExport.description; //tournament description
	
	if(TournamentExport.games) { //games featured at the tournament; multiple events can feature the same game
		var games = [];
		TournamentExport.games.forEach(function(game) {
			games.push(game);
		});
		this.games = games;
	}
	
	if(TournamentExport.events) { //events featured at the tournament; may or may not contain exports
		var events = [];
		TournamentExport.events.forEach(function(event) {
			events.push(event);
		});
		this.events = events;
	}
	
	if(TournamentExport.registrants) { //people registered for the tournament; may or may not contain exports
		var people = [];
		TournamentExport.registrants.forEach(function(event) {
			people.push(event);
		});
		this.registrants = people;
	}
	
	return this;
}

// Body
Tournament.prototype = 
{
	//set default values for this object
	//however, these values MAY NOT BE HANDLED CORRECTLY by other functions
	name: "Missing"
	, games: []
	, acceptSetups: false
	, date: new Date()
	, created: new Date()
	, location: "Missing"
	, description: "Missing"
	, events: []
	, registrants: []
	, setups: []
	
	//creates an object containing the minimum information needed to reconstruct this object from its own constructor
	//used for database storage and sometimes when passing objects
	, CreateExport: function (withKey, withID)
	{
		var expo = {};
		expo.name = this.name;
		expo.creator = this.creator;
		if(withKey) expo.key = this.key;
		if(withID) expo._id = this._id;
		expo.date = this.date;
		expo.created = this.created;
		expo.location = this.location;
		expo.description = this.description;
		expo.acceptSetups = this.acceptSetups;

		expo.games = [];
		
		this.games.forEach(function(game){ //may contain either Events or EventExports
			expo.games.push(game);
		});
		
		expo.events = []
		
		this.events.forEach(function(event) {
			expo.events.push(event);
		});
		
		expo.registrants = [];
		
		this.registrants.forEach(function(person){ //may contain either Persons or PersonExports
			expo.registrants.push(person);
		});
		
		return expo;
	}
}

if(typeof module !== 'undefined') //allows frontend to access this class
{
	module.exports = Tournament;
}