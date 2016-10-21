exports.getMove = function(game) {
	var possibleMoves = ['mu', 'ml', 'mr', 'md', 'tu', 'tl', 'tr', 'td', '', 'op', 'bp', 'buy_count', 'buy_range', 'buy_pierce', 'buy_block'];
	var chosen = Math.floor(Math.random() * possibleMoves.length);
	return possibleMoves[chosen];
}