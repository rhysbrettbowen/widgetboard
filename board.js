// v1.0.0

// ==========================================
// Copyright 2013 Dataminr
// Licensed under The MIT License
// http://opensource.org/licenses/MIT
// ==========================================


define([
	'underscore'
], function(_) {

	/**
	 * creates a logical board for blocks
	 * @constructor
	 * @param  {number} columns
	 * @param  {number} rows
	 */
	var Board = function(columns, rows) {
		this.columns = columns;
		this.rows = rows;
		this._generate();
	};

	/**
	 * returns a clones board with cloned blocks
	 * @return {Board}
	 */
	Board.prototype.clone = function() {
		var board = new Board(this.cols, this.rows);
		var blocks = this.getBlocks();
		var cloneBlocks = _.map(blocks, function(block) {
			return block.clone();
		});
		for (var i = 0; i < this._board.length; i++)
			board._board[i] = cloneBlocks[blocks.indexOf(this._board[i])];
		return board;
	};

	/**
	 * creates the the internal array for the board
	 * @private
	 */
	Board.prototype._generate = function() {
		// create board
		this._board = [];
		// create panels
		for (var i = 0; i < this.cols * this.rows; i++) {
			this._board.push(undefined);
		}
	};

	/**
	 * resets the board and places in the blocks
	 */
	Board.prototype.regenerate = function() {
		var blocks = this.getBlocks();
		this._board = _.map(this._board, function(){});
		for (var i = 0; i < blocks.length; i++)
			blocks[i].eachSpace(function(x, y) {
				this.setBlockAt(x, y, blocks[i]);
			}, this);
	};

	/**
	 * returns the blocks on the board
	 * @return {Array.<Block>}
	 */
	Board.prototype.getBlocks = function() {
		return _.uniq(_.filter(this._board, _.identity));
	};

	/**
	 * returns the block at a position in the board
	 * @param  {number} x
	 * @param  {number} y
	 * @return {Block=}
	 */
	Board.prototype.getBlockAt = function(x, y) {
		return this._board[y * this.cols + x];
	};

	/**
	 * Set a block at a position on the board, mostly internal see addBlock
	 * @param  {number} x
	 * @param  {number} y
	 * @param  {Block} block
	 * @return {Block}
	 */
	Board.prototype.setBlockAt = function(x, y, block) {
		return this._board[y * this.cols + x] = block;
	};

	/**
	 * adds a block to the board returning any blocks that can't be resized to
	 * accomodate it
	 * @param  {Block} block
	 * @return {Array.<Block>}
	 */
	Board.prototype.addBlock = function(block) {
		var x = block.x;
		var y = block.y;
		if (_.contains(this.getBlocks(), block)) {
			this.removeBlock(block);
			block.x = x;
			block.y = y;
		}
		var leftOvers = [];
		var blocks = this.getBlocks();
		for (var i = 0; i < blocks.length; i++) {
			if (blocks[i].shrinkFrom(block) === false)
				leftOvers.push(blocks[i]);
		}
		block.eachSpace(function(x, y) {
			this.setBlockAt(x, y, block);
		}, this);
		this.regenerate();
		return _.uniq(leftOvers);
	};

	/**
	 * remove a block from the board
	 * @param  {Block} block
	 */
	Board.prototype.removeBlock = function(block) {
		block.eachSpace(function(x, y) {
			this.setBlockAt(x, y);
		}, this);
		block.x = -1;
		block.y = -1;
	};

	/**
	 * check to see if a block can fit in the board
	 * @param  {Block} block
	 * @param  {number} x
	 * @param  {number} y
	 * @return {boolean}
	 */
	Board.prototype.canFit = function(block, x, y) {
		block = block.clone();
		block.setPos(x, y);
		return x + block.width <= this.cols &&
			y + block.height <= this.rows &&
			_.all(this.getBlocks(), function(child) {
				return !block.overlaps(child);
			});
	};

	/**
	 * move a block in the board, this will move any blocks that can't
	 * accomodate the move in the space left behind
	 * @param  {Block} block
	 * @param  {number} x
	 * @param  {number} y
	 */
	Board.prototype.moveBlock = function(block, x, y) {
		var space = block.clone();
		space.value = -1;
		this.removeBlock(block);
		block.setPos(x, y);
		var blocks = this.addBlock(block);
		this.placeBlocksInBlock(space, blocks);
	};

	/**
	 * Place a block on the board with the given coords and size
	 * @param  {Block} block
	 * @param  {number} x
	 * @param  {number} y
	 * @param  {number} width
	 * @param  {number} height
	 * @return {Array.<Block>} Blocks pushed off board
	 */
	Board.prototype.placeBlock = function(block, x, y, width, height) {
		this.removeBlock(block);
		block.x = x;
		block.y = y;
		block.width = width;
		block.height = height;
		return this.addBlock(block);
	}

	/**
	 * recursive function to try and place a set of blocks inside a board area
	 * @param  {Block} block uses the position and size to represent an area
	 * on the board
	 * @param  {Array.<Block>} blocks to place
	 * @param  {number|undefined} level used internally, don't pass in
	 * @return {boolean}
	 */
	Board.prototype.placeBlocksInBlock = function(block, blocks, level) {
		level = level || 0;
		if (level == blocks.length)
			return true;
		var nextBlock = blocks[level];
		for (var y = block.y; y < block.y + block.height; y++) {
			for (var x = block.x; x < block.x + block.width; x++) {
				if (this.canFit(blocks[level], x, y)) {
					blocks[level].setPos(x, y);
					this.addBlock(blocks[level]);
					if (this.placeBlocksInBlock(block, blocks, level + 1))
						return true;
				}
			}
		}
		return false;
	};

	/**
	 * resize & reposition a block on the board
	 * @param  {Block} block
	 * @param  {number} width
	 * @param  {number} height
	 * @param  {number} x
	 * @param  {number} y
	 * @return {Array.<Block>}
	 */
	Board.prototype.resizeBlock = function(block, width, height, x, y) {
		if (x == null)
			x = block.x;
		if (y == null)
			y = block.y;
		this.removeBlock(block);
		block.setPos(x, y);
		block.width = width;
		block.height = height;
		return this.addBlock(block);
	};

	/**
	 * can a block be resized without removing any other blocks
	 * @param  {Block} block
	 * @param  {number} width
	 * @param  {number} height
	 * @param  {number} x
	 * @param  {number} y
	 * @return {boolean}
	 */
	Board.prototype.canResizeBlock = function(block, width, height, x, y) {
		var clone = this.clone();
		var blockClone = clone.getBlockAt(block.x, block.y);
		return !clone.resizeBlock(blockClone, width, height, x, y).length;
	};

	/**
	 * print out the board to the console
	 */
	Board.prototype.print = function() {
		console.log('---Board Start---');
		var vals = _.map(this._board, function(boardSpace) {
			return boardSpace ? boardSpace.value : -1;
		});
		for (var y = 0; y < this.rows; y++) {
			console.log(vals.slice(y*this.cols, y*this.cols + this.cols).join(','));
		}
		console.log('---Board End---');
	}

	/**
	 * A block that can be placed on the board
	 * @constructor
	 * @param  {number} x
	 * @param  {number} y
	 * @param  {number} width
	 * @param  {number} height
	 * @param  {Object=} value
	 * @param  {number=} minWidth
	 * @param  {number=} minHeight
	 */
	var Block = function(x, y, width, height, value, minWidth, minHeight) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.value = value;
		this.minWidth = minWidth || 1;
		this.minHeight = minHeight || 1;
	};

	/**
	 * set the position
	 * @param  {number} x
	 * @param  {number} y
	 */
	Block.prototype.setPosition = function(x, y) {
		this.x = x;
		this.y = y;
	};

	/**
	 * set the value
	 * @param {Object=} value
	 */
	Block.prototype.setValue = function(value) {
		this.value = value;
	};

	/**
	 * get the value
	 * @return {Object=}
	 */
	Block.prototype.getValue = function() {
		return this.value;
	};

	/**
	 * create a clone of the block with the same value
	 * @return {Block}
	 */
	Block.prototype.clone = function() {
		return new Block(this.x, this.y, this.width, this.height, this.getValue(), this.minWidth, this.minHeight);
	};

	/**
	 * run a function with context on each space in the block
	 * @param  {Function} fn
	 * @param  {Object=} ctx
	 */
	Block.prototype.eachSpace = function(fn, ctx) {
		for (var x = this.x; x < this.x + this.width; x++) {
			for(var y = this.y; y < this.y + this.height; y++) {
				fn.call(ctx, x, y);
			}
		}
	};

	/**
	 * shrink to allow the given block room
	 * @param {Block} block
	 * @return {boolean=}
	 */
	Block.prototype.shrinkFrom = function(block) {
		if (!this.overlaps(block))
			return;

		var _this = this;

		var choice = {
			'0': function() {
				return false;
			}
		};
		var choices = [0];

		if (this.x + this.width > block.x + block.width) {
			var width = this.width - (block.x + block.width - this.x);
			if (width >= this.minWidth) {
				choice[Math.abs(width * this.height)] = function() {
					_this.width = width;
					_this.x = block.x + block.width;
					return true;
				};
				choices.push(width * this.height);
			}
		}

		if (this.y + this.height > block.y + block.height) {
			var height = this.height - (block.y + block.height - this.y);
			if (height >= this.minHeight) {
				choice[Math.abs(this.width * height)] = function() {
					_this.height = height;
					_this.y = block.y + block.height;
					return true;
				};
				choices.push(this.width * height);
			}
		}

		if (this.x < block.x) {
			if (block.x - this.x >= this.minWidth) {
				choice[Math.abs((block.x - this.x) * this.height)] = function() {
					_this.width = block.x - _this.x;
					return true;
				}
				choices.push((block.x - this.x) * this.height);
			}
		}

		if (this.y < block.y) {
			if (block.y - this.y >= this.minWidth) {
				choice[Math.abs((block.y - this.y) * this.width)] = function() {
					_this.height = block.y - _this.y;
					return true;
				}
				choices.push((block.y - this.y) * this.width);
			}
		}

		return choice[Math.max.apply(null, choices)]();
	};

	/**
	 * if blocks overlap
	 * @param  {Block} block
	 * @return {boolean}
	 */
	Block.prototype.overlaps = function(block) {
		return this.x < block.x + block.width &&
			this.x + this.width > block.x &&
			this.y < block.y + block.height &&
			this.y + this.height > block.y;
	};

	return {
		Board: Board,
		Block: Block
	};
});