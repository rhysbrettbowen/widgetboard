// v1.0.0

// ==========================================
// Copyright 2013 Dataminr
// Licensed under The MIT License
// http://opensource.org/licenses/MIT
// ==========================================

define([
	"modules/board",
	'Backbone.AdviceFactory',
	'plugins/mousemover',
    "backbone",
    "Backbone.ComponentView"
], function(Board, Factory, MouseMover) {

	var WidgetBoard = {
		WidgetBoard: {
			mixin: {},
		},
		Widget: {
			mixin: {},
		},
	}

	var Block = Board.Block;
	var Board = Board.Board;

	/**
	 * used as a placeholder for a
	 */
	var widgetPlaceholder = {
		extend: {
			className:'widget widget-placeholder-container',
			template: '<div class="widget-placeholder"></div>',
			setPos: function(position) {
				if (!this.el)
					return;
	        	if (_.equals(this.positionSave, position))
	        		return;
	        	this.positionSave = position;
	            this.$el.css(position);
	            this.trigger('positionSet');
	        }
   		}
   	};

	var WidgetContainerTemplate = ''+
		'<div class="widget-inner"></div>' +
		'<div class="resize resize-tl"></div>' +
		'<div class="resize resize-tr"></div>' +
		'<div class="resize resize-br"></div>';

	var Widget = Factory.register('Widget', {
		base: Backbone.ComponentView,
		extend: {
			setValue: function(value) {
				this.setView(value);
			}
		}
	});

	var scroll = function() {
		if (!this.dontScroll) {
			if (this.getParent().moving)
				return;
			if (e.clientX < 10) {
				this.getParent().moveLeft(_.bind(function() {
					this.resetDragPos();
				}, this));
				return;
			}
			if (this.screenWidth - e.clientX - 10 < 0) {
				this.getParent().moveRight(_.bind(function() {
					this.resetDragPos();
				}, this));
				return;
			}
		}
	};

	WidgetBoard.Widget.mixin.movable = function(options) {

		var offsets = _.extend({
			'moveX': 0,
			'moveY': 0,
			'top': 0.5,
			'bottom': 0.5,
			'left': 0.5,
			'right': 0.5
		}, options.blockOffsets);

		var setters = _.extend({
			'top': function(y) {
				var block = this.getBlock();
				var bottom = block.y + block.height;
				return [Math.min(y, bottom - 1), bottom];
			},
			'bottom': function(y) {
				var top = this.getBlock().y;
				return [top, Math.max(y, top + 1)];
			},
			'left': function(x) {
				var block = this.getBlock();
				var right = block.x + block.width;
				return [Math.min(x, right - 1), right];
			},
			'right': function(x) {
				var left = this.getBlock().x;
				return [left, Math.max(x, left + 1)];
			},
			'moveX': function(x) {
				var width = this.getBlock().width;
				var parentWidth = this.getParent().WIDTH;
				x = Math.min(parentWidth - width, x);
				return [x, x + width];
			},
			'moveY': function(y) {
				var height = this.getBlock().height;
				var parentHeight = this.getParent().HEIGHT;
				y = Math.min(parentHeight - height, y);
				return [y, y + height];
			}
		}, options.blockSetters);

		this.after({
			initialize: function() {
				this.offsets = _.clone(offsets);
			}
		});

		this.setDefaults({
			getBlock: function() {
				return this.getParent().getBlockByWidget(this);
			},
			/**
			 * get the corner from an element
			 * @param  {Element} el
			 * @return {{H:string, V:string}=}
			 */
			getCornersFromElement: function(el) {
				var $el = $(el);
				if ($el.hasClass('move'))
					return {
						H: 'moveX',
						V: 'moveY'
					};
				var match = el.className.match(/resize-([^-]+)-([^-]+)/);
				if (!match)
					return;
				return {
					V: match[1],
					H: match[2]
				};
			},
			/**
			 * get the box in the board for a mouse position
			 * @param  {number} leftOffset offset number of boxes
			 * @param  {number} topOffset offset number of boxes
			 * @param  {number} boxWidth pixel width of a box
			 * @param  {number} boxHeight pixel height of a box
			 * @param  {number} x mouse position in the board
			 * @param  {number} y mouse position in the board
			 * @return {[number, number]} position of the box
			 */
			resolveToSquare: function(leftOffset, topOffset, boxWidth, boxHeight, x, y) {
				return [
					Math.floor((x + (boxWidth * leftOffset)) / boxWidth),
					Math.floor((y + (boxHeight * topOffset)) / boxHeight)
				];
			},
			/**
			 * setup variables needed for mouse movement
			 */
			startDrag: function(corners) {
				var parent = this.getParent();
				var parentOffset = parent.$el.offset();
				this.topOffset = parentOffset.top;
				this.leftOffset = parentOffset.left;
				this.block = this.getBlock();
				this.boxWidth = parent.$el.width() / parent.WIDTH;
				this.boxHeight = parent.$el.height() / parent.HEIGHT;
				this.lastBlock = [
					this.block.y,
					this.block.x + this.block.width,
					this.block.y + this.block.height,
					this.block.y
				];
			},
			/**
			 * returns the box for mouse coordinates given the type of resize
			 * @param  {{V:string,H:string}} corner
			 * @param  {{clientX:number, clientY:number}} coords
			 * @return {[number, number]}
			 */
			getSquare: function(corner, coords) {
				var parent = this.getParent();
				var xy = this.resolveToSquare(
					this.offsets[corner.H],
					this.offsets[corner.V],
					this.boxWidth,
					this.boxHeight,
					coords.clientX,
					coords.clientY
				);
				return [
					Math.min(Math.max(0, xy[0]), parent.WIDTH),
					Math.min(Math.max(0, xy[1]), parent.HEIGHT)
				];
			},
			/**
			 * Run on every mouse move
			 * @param  {function(number, number, number, number)} process
			 * @param  {{H:string, V:string}} corner
			 * @param  {{clientX:number, clientY:number}} coords
			 */
			onMouseMove: function(process, corner, coords) {
				var square = this.getSquare(corner, coords);
				var horizontal = setters[corner.H].call(this, square[0]);
				var vertical = setters[corner.V].call(this, square[1]);
				var temp = [
					vertical[0],
					horizontal[1],
					vertical[1],
					horizontal[0]
				];
				if (_.equals(this.lastBlock, temp))
					return;
				this.lastBlock = temp;
				process.apply(this, this.lastBlock);
			},
			/**
			 * get the mover based on coords
			 * @param  {{H:string, V:string}} coords
			 * @return {function(number,number,number,number)}
			 */
			getMover: function(coords) {
				var parent = this.getParent();
				if (coords.H == 'moveX') {
					return function(top, right, bottom, left) {
						parent.moveWidget(this,
							top,
							left);
					}
				} else {
					return function(top, right, bottom, left) {
						parent.resizeWidget(this,
							top,
							right,
							bottom,
							left);
					}
				}
			},
			/**
			 *
			 */
			updateOffset: function(corners, e) {
				if (corners.H != 'moveX')
					return;
				this.offsets['moveX'] = -Math.floor((e.clientX - this.$el.position().left) / this.boxWidth);
			},
			/**
			 * start moving
			 * @param {MouseEvent} e
			 */
			onMove: function(e) {
				var parent = this.getParent();
				var corners = this.getCornersFromElement(e.target);
				if (!corners)
					return;
				this.startDrag(corners);
				parent.startEdit();
				this.updateOffset(corners, e);
				if (this.mover) {
					this.mover.stop();
					$(window).off('mouseup.' + this.mover.id);
				}
				var moveFn = this.getMover(corners);
				this.mover = new MouseMover(_.bind(function(coords) {
					this.onMouseMove(moveFn,
						corners,
						coords);
				}, this));
				this.mover.start();
				var that = this;
				$(window).on('mouseup.' + this.mover.id, function(e) {
					parent.stopEdit();
					that.mover.stop();
					$(window).off('mouseup.' + that.mover.id);
					that.mover = null;
					that.endMove();
				});
				e.preventDefault();
			},
			endMove: function() {}
		});

		this.addToObj({
			events: {
				'mousedown .resize': 'onMove',
				'mousedown .move': 'onMove'
			}
		});
	};

	WidgetBoard.WidgetBoard.mixin.asdf = function(options) {
		this.mixin([
			WidgetBoard.WidgetBoard.mixin.movable
		], options);

		this.after({
			startEdit: function() {
				this.orig = this.board;
				this.board = this.board.clone();
			}
		});

		var cloneOrig = function() {
			this.board = this.orig.clone();
		};

		this.before({
			moveWidget: cloneOrig,
			resizeWidget: cloneOrig
		});

	};

	WidgetBoard.WidgetBoard.mixin.pageable = function(options) {

		this.setDefaults({
			getColumnWidth: function() {
				return this.$el.width() / this.WIDTH;
			}
		})

	};

	WidgetBoard.WidgetBoard.mixin.movable = function(options) {

		this.setDefaults({
			startEdit: function() {},
			stopEdit: function() {},
			/**
			 * resize a block if possible
			 * @param  {number} top
			 * @param  {number} right
			 * @param  {number} bottom
			 * @param  {number} left
			 * @return {number}
			 */
			resizeWidget: function(widget, top, right, bottom, left) {
				var block = this.getBlockByWidget(widget);
				if (!this.board.canReplaceBlock(
						block,
						right - left,
						bottom - top,
						left,
						top
						))
					return false;
				this.board.replaceBlock(
					block,
					right - left,
					bottom - top,
					left,
					top
					);
				this.placeViews();
				return true;
			},
			/**
			 * move the block in it's parent
			 * @param  {number} top
			 * @param  {number} left
			 * @return {boolean}
			 */
			moveWidget: function(widget, top, left) {
				var block = this.getBlockByWidget(widget);
				var temp = block.clone();
				this.board.placeBlocksInBlock(temp, this.board.replaceBlock(
					block,
					block.width,
					block.height,
					left,
					top
				));
				this.placeViews();
				return true;
			},
		});

	};


	Factory.register('WidgetPlaceholder', {
		base: 'Widget',
		className: 'widget-placeholder',
		setPosition: function(position) {
        	if (_.equals(this.positionSave, position))
        		return;
        	this.positionSave = position;
            this.$el.css(position);
            this.trigger('positionSet');
        }
	});

	WidgetBoard.Widget.mixin.fancyMove = function() {

		this.mixin(WidgetBoard.Widget.mixin.movable);

		this.setDefaults({
			placeholder: Factory.get('WidgetPlaceholder')
		});

		this.after({
			startDrag: function(corners) {
				if (corners.H != 'moveX')
					return;
				this.placeHolder_ = new this.placeholder();
				this.placeHolder_.createDom();
				this.block.value = this.placeHolder_;
				this.getParent().placeViews();
				this.placeHolder_.render(this.el.parentElement);
				this.moving_ = true;
				this.$el.addClass('moving');
			},
			onMove: function(e) {
				if (!this.moving_)
					return;
				this.pointX = e.clientX - this.$el.position().left;
				this.lastX = e.clientX;
			},
			onMouseMove: function(process, corners, coords) {
				if (corners.H != 'moveX')
					return;
				this.setPosition({
					top: coords.clientY,
					left: coords.clientX - this.pointX
				});
			},
			endMove: function() {
				this.moving_ = false;
				this.getBlock().value = this;
				this.$el.removeClass('moving');
				if (!this.placeHolder_)
					return;
				this.placeHolder_.dispose();
				this.placeHolder_ = null;
				this.getParent().placeViews();
			}
		});
		this.around({
			getBlock: function(orig) {
				if (this.placeHolder_)
					return this.getParent().getBlockByWidget(this.placeHolder_);
				return orig();
			},
			getMover: function(orig, coords) {
				var parent = this.getParent();
				if (coords.H == 'moveX') {
					return function(top, right, bottom, left) {
						parent.moveWidget(this.placeHolder_,
							top,
							left);
					}
				}
				return orig(coords);
			}
		});
	};

	var WidgetContainer = Factory.register('WidgetContainer', {
		base: 'Widget',
		extend: {
			className: 'widget',
			template: WidgetContainerTemplate,
			contentElement: '.widget-inner',
	        setPosition: function(position) {
	        	if (_.equals(this.positionSave, position))
	        		return;
	        	this.positionSave = position;
	            this.$el.css(position);
	            this.trigger('positionSet');
	        },
			remove: function() {
				this.getParent().removeWidget(this);
			}
		}
	});

	Factory.register('MovableWidget', {
		base: 'WidgetContainer',
		contentElement: '.content',
		template: '<div class="move">header</div><div class="content"></div><div class="resize resize-bottom-right"></div><div class="resize resize-top-left"></div><div class="resize resize-bottom-left"></div><div class="resize resize-top-right"></div>',
		mixins: [
			WidgetBoard.Widget.mixin.movable
		]
	});

	/**
	 * Base class for a widget board
	 */
	Factory.register('WidgetBoard', {
		base: Backbone.ComponentView,
		extend: {
			WIDTH: 4,
			HEIGHT: 10,
			SCREENCOLS: 4,
			MAXCOLS: Infinity,
			className: 'widgetboard',
			template: '',
			widget: Factory.get('WidgetContainer'),
			/**
			 * @inheritDoc
			 */
			initialize: function() {
				this.board = new Board(this.WIDTH, this.HEIGHT);
				this.setStyles();
			},
			/**
			 * @inheritDoc
			 */
			enterDocument: function() {
				this.placeViews();
			},
			/**
			 * create a new block and put value in a widget
			 * @param {Object} value
			 * @param {number} x
			 * @param {number} y
			 * @param {number} width
			 * @param {number} height
			 * @param {function(new: Widget){}=} widget
			 * @return {Widget|undefined}
			 */
			addWidget: function(value, x, y, width, height, widget) {
				var widget = new (widget || this.widget)();
				// TODO: rethink how this should be passed
				widget.setValue(value);
				var block = new Block(x, y, width, height, widget);
				var clone = this.board.clone();
				if (clone.addBlock(block).length)
					return;
				this.board.addBlock(block);
				this.addChild(widget, this.isInDocument());
				this.placeViews();
				return widget;
			},
			/**
			 * Sets the sie for the board
			 * @param {number} columns
			 * @param {number} rows
			 */
			setSize: function(columns, rows) {
				this.WIDTH = columns;
				this.HEIGHT = rows;
				this.setStyles();
				this.trigger('change:size', cols, rows);
			},
			/**
			 * sets the style to display the corrext number of columns
			 */
			setStyles: function() {
				if (!this.styleEl) {
					this.styleEl = document.createElement('style');
					document.body.appendChild(this.styleEl);
				}
				if (this.SCREENCOLS == 1) {
					this.styleEl.innerHTML = '.widgetboard{width:100%}';
					return;
				}
				this.styleEl.innerHTML = '@media(max-width:500px){' +
					'.widgetboard{width:' + (this.WIDTH * 100) + '%;}}\n' +
					'@media(min-width:500px){' +
					'.widgetboard{width:' + (this.WIDTH * 50) + '%;}}\n' +
					'@media(min-width:750px){' +
					'.widgetboard{width:' + (this.WIDTH / 3 * 100) + '%;}}\n' +
					'@media(min-width:1000px){' +
					'.widgetboard{width:' + (this.WIDTH * 25) + '%;}}' ;
			},
			/**
			 * tells each widget where is should be placed on the screen
			 */
			placeViews: function() {
				if (!this.isInDocument())
					return;
				var row = 100 / this.HEIGHT;
				var column = 100 / this.WIDTH;
				_.each(this.board.getBlocks(), function(block) {
					block.value.render();
	                block.value.setPosition({
	                    top: (block.y * row) + '%',
	                    left: (block.x * column) + '%',
	                    width: (block.width * column) + '%',
	                    height: (block.height * row) + '%'
	                });
				}, this);
			},
			/**
			 * return the block by it's widget value
			 * @param {Backbone.ComponentView}
			 * @return {Block}
			 */
			getBlockByWidget: function(view) {
				return _.find(this.board.getBlocks(), function(board) {
					return board.value == view;
				});
			},
			/**
			 * remove a widget and unrender it
			 * @param {Backbone.ComponentView} w
			 */
			removeWidget: function(w) {
				this.removeChild(w, true);
				this.board.removeBlock(this.getBlockByWidget(w));
			},
			/**
			 * get all the widgets added to the widgetboard
			 * @return {Array.<Backbone.ComponentView>}
			 */
			getWidgets: function() {
				function getVal(block) {
					return block.value;
				};
				return _.map(this.board.getBlocks, getVal);
			}
		}
	});

	WidgetBoard.WidgetBoard.mixin.AddColumn = function() {
		this.setDefaults({
			/**
			 * insert a column in to the board at a given index
			 * @param {number} index
			 * @return {boolean}
			 */
			addColumn: function(index) {
				this.setSize(this.WIDTH + 1, this.HEIGHT);
				this.board.cols = this.WIDTH;
				for (var i = 0; i < this.HEIGHT; i ++) {
					this.board._board.splice(i * this.WIDTH + index, 0, undefined);
				};
				_.each(this.board.getBlocks(), function(block) {
					if (block.x >= index)
						block.x += 1;
					if (block.x < index && block.x + block.width > index) {
						block.width += 1;
						for (var i = 0; i < block.height; i++) {
							this.board.setBlockAt(index, block.y + i, block);
						}
					}
				}, this);
				return true;
			}
		});
	};

	WidgetBoard.WidgetBoard.mixin.RemoveColumn = function() {
		this.setDefaults({
			/**
			 * remove a column in the board at a given index
			 * @param {number} index
			 */
			removeColumn: function(x) {
				this.setSize(this.WIDTH - 1, this.HEIGHT);
				this.board.cols = this.WIDTH;
				for (var i = 0; i < this.HEIGHT; i ++) {
					this.board._board.splice(i * this.WIDTH + x, 1);
				};
				_.each(this.board.getBlocks(), function(block) {
					if (block.x > x)
						block.x -= 1;
					if (block.x < x && block.x + block.width > x)
						block.width -= 1;
				});
			}
		});
	};

	WidgetBoard.WidgetBoard.mixin.GetBlankColumns = function() {
		this.setDefaults({
			/**
			 * get the indexes of blank columns
			 * @return {Array.<number>}
			 */
			getBlankColumns: function() {
				var cols = [];
				var y = [];
				for (var i = 0; i < this.HEIGHT; i++) {
					y.push(i);
				};
				for (var x = 0; x < this.WIDTH; x++) {
					if (_.all(y, function(y) {
						return !this.board.getBlockAt(x, y);
					}, this)) cols.push(x);
				};
				return cols;
			}
		});
	};

	WidgetBoard.WidgetBoard.mixin.RemoveBlanksColumns = function(options) {
		this.mixin([
			WidgetBoard.WidgetBoard.mixin.GetBlankColumns,
			WidgetBoard.WidgetBoard.mixin.RemoveColumn
		]);

		this.setDefaults({
			removeBlankColumns: function() {
				var blank = this.getBlankColumns();
				while (blank.length && this.WIDTH > this.SCREENCOLS) {
					this.removeColumn(blank.shift());
					blank = _.map(blank, function(a) {return a - 1;});
				}
			}
		});
	};

	Factory.register('MovableBoard', {
		base: 'WidgetBoard',
		extend: {
			widget: Factory.get('MovableWidget').extend().mixin(WidgetBoard.Widget.mixin.fancyMove)
		},
		mixins: [
			WidgetBoard.WidgetBoard.mixin.asdf
		]
	});

	return WidgetBoard;

});

