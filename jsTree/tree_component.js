/*
 * jsTree 0.5
 *
 * Copyright (c) 2008 Ivan Bozhanov (vakata.com)
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 * Date: 2008-06-12
 *
 */

/* 
 * TODO:
 * commented throughout the code with '// TODO: '
 *   !IMPLEMENT: cut & paste nodes
 *   !IMPLEMENT: native async loading and nested nodes fix
 *   !IMPLEMENT: error and other messages (language file?)
 *   !IMPLEMENT: popup with text while dragging - see above
 *   !IMPLEMENT: drag & drop between trees
 *   !OPTIMIZE: #marker position calculation
 *   !NOTE: 'type_attr' cannot be 'class'
 *   !NOTE: file opera bug (event.pageY) when dragging and scrolling
 */

/* 
 * CREATE EXAMPLES:
 *   nested sets (PHP, AJAX)
 *   adjacency (PHP, AJAX)
 *   combined (PHP, AJAX)
 *   no data - events only
 *   JSON data
 *   simple example 'tree.init($("#box"));'
 *   CSS default image '.tree li a { background-image:url(); }'
 */

/*  
 * CHANGELOG:
 *   current language is passed when renaming
 *   added onbeforechange callback
 *   'data' can be JSON and none (only events attached to structure)
 *   Opera comaptible
 *   scroll node into view when node selected
 *   scroll container while dragging and mouse is near the edge
 *   'remove' function 
 *   rules and rule checking reinvented (added inline_rules, max_depth, max_children, valid_children, renameable)
 *   dots are optional ('toggleDots' function, '.no_dots' classname)
 *   various optimizations
 */

function tree_component () {
	return {
		settings : {
			data		: false,		// where is the tree data file located
			xsl			: "nested.xsl",	// which xsl to transform with (depends on data type "nested" or "flat")
			languages	: [],			// what are the languages - default - no language versions
			dflt		: false,		// default node to select on load
			dots		: true,			// Dotted or not initially - can be changed by the .no_dots class on the container
			type_attr	: "rel",		// in what attribute is the type stored (if not metadata)
			metadata	: false,		// USE METADATA PLUGIN false OR attribute name
			rules		: {				// RULES - read below
				use_inline	: false,	// CHECK FOR INLINE RULES - REQUIRES METADATA
				clickable	: "all",	// which node types can the user select | default - all
				renameable	: "all",	// which node types can the user select | default - all
				deletable	: "all",	// which node types can the user delete | default - all
				creatable	: "all",	// which node types can the user create in | default - all
				draggable	: "none",	// which node types can the user move | default - none | "all"
				dragrules	: "none"	// what move operations between nodes are allowed | default - none | "all"
			},
			callback	: {										// various callbacks to attach custom logic to
				onbeforechange : function(NODE) { return true },// before focus change should return true | false
				onchange	: function(NODE) { },				// focus changed
				onrename	: function(NODE,LANG) { },			// node renamed ISNEW - TRUE|FALSE, current language
				onmove		: function(NODE,REF_NODE,TYPE) { },	// move completed (TYPE is BELOW|ABOVE|INSIDE)
				oncreate	: function(NODE,REF_NODE,TYPE) { },	// node created (TYPE is BELOW|ABOVE|INSIDE)
				ondelete	: function(NODE) { },				// node deleted
				onopen		: function(NODE) { },				// node opened
				onclose		: function(NODE) { }				// node closed
			}
		},
		// INITIALIZATION
		init : function(elem, opts) {
			var _this = this;
			this.container		= $(elem);

			// MERGE OPTIONS WITH DEFAULTS
			if(opts && opts.callback) {
				this.settings.callback = $.extend({},this.settings.callback,opts.callback);
				delete opts.callback;
			}
			if(opts && opts.rules) {
				this.settings.rules = $.extend({},this.settings.rules,opts.rules);
				delete opts.rules;
			}
			this.settings		= $.extend({},this.settings,opts);

			// PATH TO IMAGES AND XSL
			this.path = "";
			$("script").each( function () { 
				if(this.src.toString().match(/tree_component.js$/)) {
					_this.path = this.src.toString().replace("tree_component.js", "");
				}
			});

			// DEAL WITH LANGUAGE VERSIONS
			this.current_lang	= this.settings.languages && this.settings.languages.length ? this.settings.languages[0] : false;
			if(this.settings.languages && this.settings.languages.length) {
				this.sn = get_sheet_num("tree_component.css");
				var st = false;
				var id = this.container.attr("id") ? "#" + this.container.attr("id") : ".tree";
				for(var ln = 0; ln < this.settings.languages.length; ln++) {
					st = add_css(id + " ." + this.settings.languages[ln], this.sn);
					if(st !== false) {
						if(this.settings.languages[ln] == this.current_lang)	st.style.display = "block";
						else													st.style.display = "none";
					}
				}
			}

			this.container.addClass("tree").css({ position: "relative" });
			this.offset = this.container.offset();
			this.container.css({ position : "" });
			if(this.settings.dots == false) this.container.addClass("no_dots");

			// CREATE DUMMY FOR MOVING
			if(this.settings.rules.draggable != "none" && this.settings.rules.dragrules != "none") {
				var _this = this;
				$("<img>")
					.attr({
						id		: "marker", 
						src	: _this.path + "images/marker.gif" 
					})
					.css({
						height		: "5px",
						width		: "40px",
						display		: "block",
						position	: "absolute",
						left		: "30px",
						top			: "30px"
					}).hide().appendTo("body");
			}
			this.refresh();
			this.attachEvents();
		},
		// REPAINT TREE
		refresh : function () {
			var _this = this;
			// SAVE SELECTED
			this.settings.dflt	= (this.selected) ? "#" + this.selected.attr("id") : this.settings.dflt;

			if(this.settings.data !== false && typeof this.settings.data != "object") {
				this.scrtop			= this.container.get(0).scrollTop;
				// SAVE OPENED
				this.opened			= Array();
				$("li.open").each(function (i) { _this.opened.push("#" + this.id); });
				this.container.getTransform(this.path + this.settings.xsl, this.settings.data, { callback: function () { _this.reselect.apply(_this); } });
				return;
			}
			// IF JSON - PARSE IN AND ADD IT IN THE CONTAINER
			if(typeof this.settings.data == "object") {
				this.container.html("<ul>" + this.parseJSON(this.settings.data) + "</ul>");
			}
			// IF DATA WAS JSON OR PREDEFINED
			this.container.find("li:last-child").addClass("last").end().find("li:has(ul)").not(".open").addClass("closed");
			this.reselect();
		},
		// CONVERT JSON TO HTML
		parseJSON : function (data) {
			var str = "";
			str += "<li ";
			for(i in data.attributes) str += " " + i + "='" + data.attributes[i] + "' ";
			str += ">";
			if(this.settings.languages.length) {
				for(var i = 0; i < this.settings.languages.length; i++) {
					str += "<a href='#' class='" + this.settings.languages[i] + "' ";
					if(data.icons[this.settings.languages[i]]) 
						str += " style='background-image:url(\"" + data.icons[this.settings.languages[i]] + "\");' ";
					str += ">" + data.data[this.settings.languages[i]] + "</a>";
				}
			}
			else {
				str += "<a href='#' ";
				if(data.icons) 
					str += " style='background-image:url(\"" + data.icons + "\");' ";
				str += ">" + data.data + "</a>";
			}
			if(data.children && data.children.length) {
				str += '<ul>';
				for(var i = 0; i < data.children.length; i++) {
					str += this.parseJSON(data.children[i]);
				}
				str += '</ul>';
			}
			str += "</li>";
			return str;
		},
		// ALL EVENTS
		attachEvents : function () {
			var _this = this;

			this.container
				.bind("click", function (event) { 
					event.stopPropagation(); 
					return true;
				})
				.listen("click", "li", function(event) { // WHEN CLICK IS ON THE ARROW
					_this.toggle_branch.apply(_this, [event.target]);
					event.stopPropagation();
				})
				.listen("click", "a", function (event) { // WHEN CLICK IS ON THE TEXT OR ICON
					_this.select_branch.apply(_this, [event.target]);
					event.preventDefault(); 
					event.target.blur();
					return false;
				})
				.listen("dblclick", "a", function (event) { // WHEN DOUBLECLICK ON TEXT OR ICON
					_this.toggle_branch.apply(_this, [event.target]);
					_this.select_branch.apply(_this, [event.target]);
					event.preventDefault(); 
					event.stopPropagation();
					event.target.blur();
				});

				// ATTACH DRAG & DROP ONLY IF NEEDED
				if(this.settings.rules.draggable != "none" && this.settings.rules.dragrules != "none") {
					$(this.container)
						.listen("mousedown", "a", function (event) {
							// SELECT LIST ITEM NODE
							var obj = _this.get_node(event.target);
							// IF ITEM IS DRAGGABLE
							if(_this.check("draggable", obj)) {
								_this._drag		= obj;
								_this.drag		= obj.get(0).cloneNode(true);
								_this.drag.id	= "dragged";
								_this.isdown	= true;
							}
							obj.blur();
							event.preventDefault(); 
							event.stopPropagation();
							return false;
						});
					$(document)
						.bind("mousedown", function (event) {
							event.stopPropagation();
							return true;
						})
						.bind("mouseup", function (event) {
							// CLEAR TIMEOUT FOR OPENING HOVERED NODES WHILE DRAGGING
							if(_this.to)	clearTimeout(_this.to);
							if(_this.sto)	clearTimeout(_this.sto);
							if(_this.drag && _this.drag.parentNode && _this.drag.parentNode == $(_this.container).get(0)) {
								$(_this.drag).remove();
								// CALL FUNCTION FOR COMPLETING MOVE
								if(_this.moveType) _this.moved(_this._drag, _this.moveRef, _this.moveType);
								_this.moveType = false;
								_this.moveRef = false;
							}
							// RESET EVERYTHING
							$("#marker").hide();
							_this._drag		= false;
							_this.drag		= false;
							_this.isdown	= false;
							_this.appended	= false;
							event.preventDefault(); 
							event.stopPropagation();
							return false;
						})
						.bind("mousemove", function (event) {
							if(_this.isdown) {
								// CLEAR TIMEOUT FOR OPENING HOVERED NODES WHILE DRAGGING
								if(_this.to) clearTimeout(_this.to);
								if(!_this.appended) {
									_this.container.append(_this.drag);
									_this.appended = true;
								}
								$(_this.drag).css({ "left" : (event.pageX + 5), "top" : (event.pageY + ($.browser.opera ? _this.container.scrollTop() : 0) + 15) });

								if(_this.sto) clearTimeout(_this.sto);
								_this.sto = setTimeout( function() { _this.scrollCheck(event.pageX,event.pageY); }, 50);

								// MOVING OVER SELF OR CHILDREN
								if($(event.target).parents("li").andSelf().index(_this._drag.get(0)) != -1) {
									if($(_this.drag).children("IMG").size() == 0) {
										$(_this.drag).append("<img style='position:absolute; left:4px; top:0px; background:white; padding:2px;' src='" + _this.path + "images/remove.png' />");
									}
									_this.moveType = false;
									_this.moveRef = false;
									$("#marker").hide();
									return false;
								}

								var mov = false;
								var st = _this.container.scrollTop();
								if(event.target.tagName == "A" ) {
									var goTo = { 
										x : ($(event.target).offset().left - 1),
										y : (event.pageY - _this.offset.top)
									}
									if( (goTo.y + st)%18 < 7 ) {
										mov = "before";
										goTo.y = event.pageY - (goTo.y + st)%18 - 2 ;
									}
									else if((goTo.y + st)%18 > 11 ) {
										mov = "after";
										goTo.y = event.pageY - (goTo.y + st)%18 + 16 ;
									}
									else {
										mov = "inside";
										goTo.x -= 2;
										goTo.y = event.pageY - (goTo.y + st)%18 + 7 ;
										if(_this.get_node(event.target).hasClass("closed")) {
											_this.to = setTimeout( function () { _this.open_branch(_this.get_node(event.target)); }, 500);
										}
									}

									// CHECKING FOR MAX_DEPTH, MAX_CHILDREN, VALID_CHILDREN
									if(_this.settings.rules.use_inline && _this.settings.metadata) {
										var nd = false;
										if(mov == "inside")	nd = $(event.target).parents("li:eq(0)");
										else				nd = $(event.target).parents("li:eq(1)");
										if(nd.size()) {
											// CHECK IF dragged IS A VALID CHILD OD PARENT
											if(typeof nd.metadata()["valid_children"] != "undefined") {
												if($.inArray(_this.get_type(_this._drag), nd.metadata()["valid_children"]) == -1) {
													if($(_this.drag).children("IMG").size() == 0) {
														$(_this.drag).append("<img style='position:absolute; left:4px; top:0px; background:white; padding:2px;' src='" + _this.path + "images/remove.png' />");
													}
													_this.moveType = false;
													_this.moveRef = false;
													$("#marker").hide();
													return false;
												}
											}
											// CHECK IF PARENT HAS FREE SLOTS FOR CHILDREN
											if(typeof nd.metadata()["max_children"] != "undefined") {
												if( (nd.children("ul:eq(0)").children("li").not(_this._drag).size() + 1) > nd.metadata().max_children) {
													if($(_this.drag).children("IMG").size() == 0) {
														$(_this.drag).append("<img style='position:absolute; left:4px; top:0px; background:white; padding:2px;' src='" + _this.path + "images/remove.png' />");
													}
													_this.moveType = false;
													_this.moveRef = false;
													$("#marker").hide();
													return false;
												}
											}
											// CHECK FOR MAXDEPTH UP THE CHAIN
											var ok = true;
											nd.parents("li").each(function(i) {
												if($(this).metadata().max_depth) {
													if( (i + 1) >= $(this).metadata().max_depth) ok = false;
												}
											});
											if(!ok) {
												if($(_this.drag).children("IMG").size() == 0) {
													$(_this.drag).append("<img style='position:absolute; left:4px; top:0px; background:white; padding:2px;' src='" + _this.path + "images/remove.png' />");
												}
												_this.moveType = false;
												_this.moveRef = false;
												$("#marker").hide();
												return false;
											}
										}
									}

									// ONLY IF ALLOWED
									if(_this.check("dragrules", [$(_this._drag), mov, $(event.target).parents("li:eq(0)")])) {
										if(mov == "inside")	$("#marker").attr("src", _this.path + "images/plus.gif").width(11);
										else				$("#marker").attr("src", _this.path + "images/marker.gif").width(40);
										_this.moveType	= mov;
										_this.moveRef	= event.target;
										$(_this.drag).children("IMG").remove();
										$("#marker").css({ "left" : goTo.x , "top" : goTo.y }).show();
									}
									else {
										_this.moveType = false;
										_this.moveRef = false;
										$("#marker").hide();
										if($(_this.drag).children("IMG").size() == 0) {
											$(_this.drag).append("<img style='position:absolute; left:4px; top:0px; background:white; padding:2px;' src='/minfin/admin/_modules/_basic/icons/remove.png' />");
										}
									}
								}
								else if(event.target.tagName == "IMG" && event.target.id == "marker") {
									;
								}
								else {
									_this.moveType = false;
									_this.moveRef = false;
									$("#marker").hide();
								}
								event.preventDefault();
								event.stopPropagation();
								return false;
							}
							return true;
						});
				} 
				// ENDIF OF DRAG & DROP FUNCTIONS
		},
		// USED AFTER REFRESH
		reselect : function () {
			var _this = this;
			// REOPEN BRANCHES
			if(this.opened && this.opened.length) {
				for(var j = 0; j < this.opened.length; j++) {
					
					// TODO: POSSIBLE PROBLEM IN ASYNC - NESTED OPEN NODES
					// NEED TO IMPLEMENT QUEUE

					this.open_branch(this.opened[j]);
				}
				delete this.opened;
			}
			// REPOSITION SCROLL - WHEN QUEUE IMPLEMENTED - SHOULD BE AT THE END
			if(this.scrtop) {
				this.container.scrollTop(_this.scrtop);
				delete this.scrtop;
			}
			// RESELECT PREVIOUSLY SELECTED OR DEFAULT
			if(this.settings.dflt) {
				this.selected		= $(this.settings.dflt);
				this.settings.dflt	= false;
				this.select_branch(this.selected);
			}
		},
		// GET THE EXTENDED LI ELEMENT
		get_node : function (obj) {
			var obj = $(obj);
			return obj.is("li") ? obj : obj.parents("li:eq(0)");
		},
		// GET THE TYPE OF THE NODE
		get_type : function (obj) {
			obj = !obj ? this.selected : this.get_node(obj);
			if(!obj) return;
			if(this.settings.metadata) {
				$.metadata.setType("attr", this.settings.metadata);
				return obj.metadata().type;
			} 
			else return obj.attr(this.settings.type_attr);
		},
		// SCROLL CONTAINER WHILE DRAGGING
		scrollCheck : function (x,y) { 
			var _this = this;
			// NEAR TOP
			if(y - _this.offset.top < 20) {
				_this.container.scrollTop(Math.max(_this.container.scrollTop()-4,0));
			}
			// NEAR BOTTOM (DETECT HORIZONTAL SCROLL)
			var h_cor = (_this.container.get(0).scrollWidth > _this.container.width()) ? 40 : 20;
			if(_this.container.height() - (y - _this.offset.top) < h_cor) {
				_this.container.scrollTop(_this.container.scrollTop()+4);
			}
			// NEAR LEFT
			if(x - _this.offset.left < 20) {
				_this.container.scrollLeft(_this.container.scrollLeft()-4);
			}
			// NEAR RIGHT
			if(_this.container.width() - (x - _this.offset.left) < 40) {
				_this.container.scrollLeft(_this.container.scrollLeft()+4);
			}
			_this.sto = setTimeout( function() { _this.scrollCheck(x,y); }, 50);
		},
		check : function (rule, nodes) {
			// CHECK LOCAL RULES IF METADATA
			if(rule != "dragrules" && this.settings.rules.use_inline && this.settings.metadata) {
				$.metadata.setType("attr", this.settings.metadata);
				if(typeof this.get_node(nodes).metadata()[rule] != "undefined") return this.get_node(nodes).metadata()[rule];
			}
			if(!this.settings.rules[rule])			return false;
			if(this.settings.rules[rule] == "none")	return false;
			if(this.settings.rules[rule] == "all")	return true;
			// TODO: MAX_DEPTH AND MAX_CHILD CHECK
			if(rule == "dragrules")
				return ($.inArray(this.get_type(nodes[0]) + " " + nodes[1] + " " + this.get_type(nodes[2]), this.settings.rules.dragrules) != -1) ? true : false;
			else 
				return ($.inArray(this.get_type(nodes),this.settings.rules[rule]) != -1) ? true : false;
		},
		// CALLED WHEN BRANCH SELECTED
		select_branch : function (obj) {
			var _this = this;
			var obj = _this.get_node(obj);
			// CHECK AGAINST RULES FOR SELECTABLE NODES
			if(!_this.check("clickable", obj)) return false;
			if(_this.settings.callback.onbeforechange.call(null) === false) return false;

			// DEFOCUS CURRELNTLY SELECTED NODE
			if(this.selected) this.selected.children("A").removeClass("clicked");
			// SAVE NEWLY SELECTED
			this.selected = obj;

			// FOCUS NEW NODE AND OPEN ALL PARENT NODES IF CLOSED
			this.selected.children("a").removeClass("clicked").addClass("clicked").end().parents("li.closed").each( function () { _this.open_branch(this); });

			// SCROLL SELECTED NODE INTO VIEW
			var off_t = this.selected.offset({ scroll : false }).top;
			var beg_t = this.container.offset({ scroll : false }).top;
			var end_t = beg_t + this.container.height();
			var h_cor = (this.container.get(0).scrollWidth > this.container.width()) ? 40 : 20;
			if(off_t + 5 < beg_t) this.container.scrollTop(this.container.scrollTop() - (beg_t - off_t + 5) );
			if(off_t + h_cor > end_t) this.container.scrollTop(this.container.scrollTop() + (off_t + h_cor - end_t) );

			// CALLBACK FOR CUSTOM LOGIC
			this.settings.callback.onchange.call(null, this.selected.get(0));
		},
		toggle_branch : function (obj) {
			var obj = this.get_node(obj);
			if(obj.hasClass("closed"))	return this.open_branch(obj);
			if(obj.hasClass("open"))	return this.close_branch(obj); 
		},
		open_branch : function (obj) {
			var obj = this.get_node(obj);
			obj.removeClass("closed").addClass("open");
			this.settings.callback.onopen.call(null, obj.get(0));
		},
		close_branch : function (obj) {
			var obj = this.get_node(obj);
			obj.removeClass("open").addClass("closed");
			this.settings.callback.onclose.call(null, obj.get(0));
		},
		open_all : function () {
			var _this = this;
			$(this.container).find("li.closed").each( function () { _this.open_branch(this); });
		},
		close_all : function () {
			var _this = this;
			$(this.container).find("li.open").each( function () { _this.close_branch(this); });
		},
		show_lang : function (i) { 
			if(this.settings.languages[i] == this.current_lang) return true;
			var st = false;
			var id = this.container.attr("id") ? "#" + this.container.attr("id") : ".tree";
			st = get_css(id + " ." + this.current_lang, this.sn);
			if(st !== false) st.style.display = "none";
			st = get_css(id + " ." + this.settings.languages[i], this.sn);
			if(st !== false) st.style.display = "block";
			this.current_lang = this.settings.languages[i];
			return true;
		},
		cycle_lang : function() {
			var i = $.inArray(this.current_lang, this.settings.languages);
			i ++;
			if(i > this.settings.languages.length - 1) i = 0;
			this.show_lang(i);
		},
		create : function (type) {
			// NOTHING SELECTED
			if(!this.selected) return false;
			if(!this.check("creatable", this.selected)) return false;

			var t = type || this.get_type();
			if(this.settings.rules.use_inline && this.settings.metadata) {
				$.metadata.setType("attr", this.settings.metadata);
				if(typeof this.selected.metadata()["valid_children"] != "undefined") {
					if($.inArray(t, this.selected.metadata()["valid_children"]) == -1) return false;
				}
				if(typeof this.selected.metadata()["max_children"] != "undefined") {
					if( (this.selected.children("ul:eq(0)").children("li").size() + 1) > this.selected.metadata().max_children) return false;
				}
				var ok = true;
				this.selected.parents("li").each(function(i) {
					if($(this).metadata().max_depth) {
						if( (i + 1) >= $(this).metadata().max_depth) {
							ok = false;
						}
					}
				});
				if(!ok) return false;
			}

			$li = $("<li />");
			// NEW NODE IS OF PASSED TYPE OR PARENT'S TYPE
			if(this.settings.metadata) {
				$.metadata.setType("attr", this.settings.metadata);
				$li.attr(this.settings.metadata, "type: '" + t + "'");
			}
			else {
				$li.attr(this.settings.type_attr, t)
			}
			if(this.settings.languages.length) {
				for(i = 0; i < this.settings.languages.length; i++) {
					$li.append("<a href='#' class='" + this.settings.languages[i] + "'>Нова категория</a>");
				}
			}
			else { $li.append("<a href='#'>Нова категория</a>"); }
			this.moved($li,this.selected.find("a:first"),"inside", true);
			this.select_branch($li.find("a:first"));
			this.rename();
		},
		rename : function () {
			if(this.selected) {
				if(!this.check("renameable", this.selected)) return false;
				var obj = this.selected;
				if(this.current_lang)	obj = obj.find("a." + this.current_lang).get(0);
				else					obj = obj.find("a:first").get(0);
				last_value = obj.innerHTML;

				_this = this;
				var inp = $("<input type='text' value='" + last_value + "' />");
				inp
					.bind("mousedown",		function (event) { event.stopPropagation(); })
					.bind("mouseup",		function (event) { event.stopPropagation(); })
					.bind("click",			function (event) { event.stopPropagation(); })
					.bind("keyup",			function (event) { 
							var key = event.keyCode || event.which;
							if(key == 27) { this.blur(); }
							if(key == 13) { this.blur(); }
						});
				inp.get(0).onblur = function(event) {
						if(this.value == "") this.value == last_value; 
						$(obj).html( $(obj).parent().find("input").eq(0).attr("value") ).get(0).style.display = ""; 
						$(obj).prevAll("span").remove(); 
						_this.settings.callback.onrename.call(null, obj, this.current_lang);
					};
				var spn = $("<span />").addClass(obj.className).append(inp);
				spn.attr("style", $(obj).attr("style"));
				obj.style.display = "none";
				$(obj).parent().prepend(spn);
				inp.get(0).focus();
				inp.get(0).select();
			}
		},
		// REMOVE NODES
		remove : function() {
			if(this.selected) {
				if(!this.check("deletable", this.selected)) return false;
				$parent = this.selected.parent();
				var obj = this.selected.remove();
				$parent.children("li:last").addClass("last");
				if($parent.children("li").size() == 0) $parent.parents("li:eq(0)").removeClass("open").removeClass("closed").children("ul").remove();
				this.settings.callback.ondelete.call(null, obj);
				this.selected = false;
			}
		},
		// FOR EXPLORER-LIKE KEYBOARD SHORTCUTS
		get_next : function() {
			if(this.selected) {
				if(this.selected.hasClass("open"))					return this.select_branch(this.selected.find("li:eq(0)"));
				else if($(this.selected).nextAll("li").size() > 0)	return this.select_branch(this.selected.nextAll("li:eq(0)"));
				else												return this.select_branch(this.selected.parents("li").next("li").eq(0));
			}
		},
		get_prev : function() {
			if(this.selected) {
				if(this.selected.prev("li").size()) {
					var obj = this.selected.prev("li").eq(0);
					while(obj.hasClass("open")) obj = obj.children("ul:eq(0)").children("li:last");
					return this.select_branch(obj);
				}
				else { return this.select_branch(this.selected.parents("li:eq(0)")); }
			}
		},
		get_left : function() {
			if(this.selected) {
				if(this.selected.hasClass("open"))	this.close_branch(this.selected);
				else								this.get_prev();
			}
		},
		get_right : function() {
			if(this.selected) {
				if(this.selected.hasClass("closed"))	this.open_branch(this.selected);
				else									this.get_next();
			}
		},
		toggleDots : function () {
			this.container.toggleClass("no_dots");
		},
		moved : function (what, where, how, is_new) {
			var what	= $(what);
			var $parent	= $(what).parents("ul:eq(0)");
			var $where	= $(where);
			// ADD NODE TO NEW PLACE
			switch(how) {
				case "before":
					$where.parents("ul:eq(0)").children("li.last").removeClass("last");
					$where.parent().before(what.removeClass("last"));
					$where.parents("ul:eq(0)").children("li:last").addClass("last");
					break;
				case "after":
					$where.parents("ul:eq(0)").children("li.last").removeClass("last");
					$where.parent().after(what.removeClass("last"));
					$where.parents("ul:eq(0)").children("li:last").addClass("last");
					break;
				case "inside":
					if($where.parent().children("ul:first").size()) {
						$where.parent().children("ul:first").prepend(what.removeClass("last")).children("li:last").addClass("last");
					}
					else {
						what.addClass("last");
						$where.parent().append("<ul/>").addClass("open");
						$where.parent().children("ul:first").prepend(what);
					}
					break;
				default:
					break;
			}
			// CLEANUP OLD PARENT
			if($parent.find("li").size() == 0) {
				var $li = $parent.parent();
				$li.removeClass("open").removeClass("closed").children("ul").remove();
				$li.parents("ul").eq(0).children("li.last").removeClass("last");
				$li.parents("ul").eq(0).children("li:last").addClass("last");
			}
			else {
				$parent.children("li.last").removeClass("last");
				$parent.children("li:last").addClass("last");
			}
			if(is_new)	this.settings.callback.oncreate.call(null, what, where, how);
			else		this.settings.callback.onmove.call(null, what, where, how);
		}
	}
}