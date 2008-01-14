// ** TO DO **
// INVERTING parents(li.closed)
// WORKING AROUND async tree with open callback ( when refreshing nested nodes )

function tree_component () {
	return {
		settings : {
			path			: "_components/tree/",
			data			: false,
			xsl			: "nested.xsl",
			languages	: [],
			dflt			: false,
			move			: {
				rules			: [],
				draggables	: []
			},
			callback		: {
				onchange		: function() { },
				onrename		: function() { },
				onmove		: function(what,where,how) { },
				onopen		: function() { },
				onclose		: function() { }
			}
		},
		init : function(elem, opts) {
			this.container		= elem;
			if(opts && opts.callback) {
				this.settings.callback = $.extend({},this.settings.callback,opts.callback);
				delete opts.callback;
			}
			this.settings		= $.extend({},this.settings,opts);
			this.current_lang	= this.settings.languages && this.settings.languages.length ? this.settings.languages[0] : false;
			if(this.settings.languages && this.settings.languages.length) {
				this.sn = get_sheet_num("tree_component.css");
				var st = false;
				var id = $(elem).attr("id") ? "#" + $(elem).attr("id") : ".tree";
				for(var ln = 0; ln < this.settings.languages.length; ln++) {
					st = add_css(id + " ." + this.settings.languages[ln], this.sn);
					if(st !== false) {
						if(this.settings.languages[ln] == this.current_lang)	st.style.display = "block";
						else																	st.style.display = "none";
					}
				}
			}
			var offs = {};
			$(this.container).addClass("tree").css({ position: "relative" }).offset({},offs).css( { position : "" } );
			if(this.settings.move.draggables.length && this.settings.move.rules.length) {
				var _this = this;
				$("<img>")
					.attr({
						id		: "marker", 
						src	: _this.settings.path + "images/marker.gif" 
					})
					.css({
						height	: "5px",
						width		: "40px",
						display	: "block",
						position	: "absolute",
						left		: "30px",
						top		: "30px"
					}).hide().appendTo("body");
			}
			this.offset = offs;
			this.refresh();
			this.attachEvents();
			var _this = this;
			$.hotkeys.add('f2',		{ disableInInput: true },	function() { _this.rename(); });
			$.hotkeys.add('n',		{ disableInInput: true },	function() { _this.create(); });
			$.hotkeys.add('l',		{ disableInInput: true },	function() { _this.cycle(); });
			$.hotkeys.add('r',		{ disableInInput: true },	function() { _this.refresh(); });
			$.hotkeys.add('up',		{ disableInInput: true },	function() { _this.get_prev(); });
			$.hotkeys.add('down',	{ disableInInput: true },	function() { _this.get_next(); });
			$.hotkeys.add('left',	{ disableInInput: true },	function() { _this.get_left(); });
			$.hotkeys.add('right',	{ disableInInput: true },	function() { _this.get_right(); });
		},
		attachEvents : function () {
			var _this = this;

			$(this.container)
				.bind("click", function (event) { 
					//event.preventDefault(); 
					event.stopPropagation(); 
					return true;
				})
				.listen("click", "li", function(event) {
					_this.toggle_branch.apply(_this, [event.target]);
					event.stopPropagation();
				})
				.listen("click", "a", function (event) {
					_this.select_branch.apply(_this, [event.target]);
					event.preventDefault(); 
					return false;
				})
				.listen("dblclick", "a", function (event) {
					_this.open_branch.apply(_this, [event.target]);
					_this.select_branch.apply(_this, [event.target]);
					event.preventDefault(); 
					event.stopPropagation();
				});

				if(this.settings.move.draggables.length && this.settings.move.rules.length) {

					$(this.container)
						.listen("mousedown", "a", function (event) {
							var obj			= $(event.target).parent("li").eq(0);
							if($.inArray(obj.attr("rel"),_this.settings.move.draggables) != -1) {
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
							//event.preventDefault(); 
							event.stopPropagation();
							return true;
						})
						.bind("mouseup", function (event) {
							if(_this.to) clearTimeout(_this.to);
							if(_this.drag && _this.drag.parentNode && _this.drag.parentNode == $(_this.container).get(0)) {
								$(_this.container).get(0).removeChild(_this.drag);
								if(_this.moveType) {
									_this.moved(_this._drag, _this.moveRef, _this.moveType);
								}
								_this.moveType = false;
								_this.moveRef = false;
							}
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
								if(_this.to) clearTimeout(_this.to);
								if(!_this.appended) {
									$(_this.container).get(0).appendChild(_this.drag);
									_this.appended = true;
								}
								$(_this.drag).css({ "left" : (event.pageX + 5), "top" : (event.pageY + 15) });

								// MOVING OVER SELF OR CHILDREN
								if($(event.target).parents("li").andSelf().index(_this._drag.get(0)) != -1) {
									if($(_this.drag).children("IMG").size() == 0) {
										$(_this.drag).append("<img style='position:absolute; left:4px; top:0px; background:white; padding:2px;' src='" + _this.settings.path + "images/remove.png' />");
									}
									_this.moveType = false;
									_this.moveRef = false;
									$("#marker").hide();
									return false;
								}

								var mov = false;
								var st = $(_this.container).get(0).scrollTop;
								if(event.target.tagName == "A" ) {
									var goTo = { 
										x : ($(event.target).offset().left - 1),
										y : (event.pageY - _this.offset.top)
									}
									if( (goTo.y + st)%18 < 7 ) {
										mov = "before";
										goTo.y = event.pageY - (goTo.y + st)%18 - 2 ; // $(event.target).offset().top - 1
									}
									else if((goTo.y + st)%18 > 11 ) {
										mov = "after";
										goTo.y = event.pageY - (goTo.y + st)%18 + 16 ; // $(event.target).offset().top + 16
									}
									else {
										mov = "inside";
										goTo.x -= 2;
										goTo.y = event.pageY - (goTo.y + st)%18 + 7 ; // $(event.target).offset().top + 7
										if($(event.target).parent("LI").hasClass("closed")) {
											_this.to = setTimeout( function () { _this.open_branch("#" + $(event.target).parent("LI").attr("id")); }, 500);
										}
									}
									
									if($.inArray( $(_this._drag).attr("rel") + " " + mov + " " + $(event.target).parents("li:eq(0)").attr("rel") ,_this.settings.move.rules) != -1) {
										if(mov == "inside")	$("#marker").attr("src", _this.settings.path + "images/plus.gif").width(11);
										else						$("#marker").attr("src", _this.settings.path + "images/marker.gif").width(40);
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

				} // ENDIF OF DRAG & DROP FUNCTIONS
		},
		refresh : function (t_node) {
			var _this = this;
			if(this.selected) this.settings.dflt = this.selected.id;
			_this.opened	= Array();
			_this.scrtop	= $(_this.container).get(0).scrollTop;
			$("li.open").each(function (i) {
				_this.opened.push("#" + this.id);
			});
			if(t_node) {
				if($(t_node).children("ul").size()) ;
			}
			$(this.container).getTransform(this.settings.path + this.settings.xsl, this.settings.data, { callback: function () { _this.reselect.apply(_this); } });
		},
		reselect : function () {
			var _this = this;
			if(this.opened.length) {
				for(var j = 0; j < this.opened.length; j++) {
					// POSSIBLE PROBLEM IN ASYNC - NESTED OPEN NODES
					this.open_branch(this.opened[j]);
				}
				delete this.opened;
			}
			$(this.container).get(0).scrollTop = this.scrtop;
			delete this.scrtop;
			if(this.settings.dflt) {
				this.selected = document.getElementById(this.settings.dflt) || false;
				this.settings.dflt = false;
				$(this.selected)
						.children("A").addClass("clicked").end()
						.parents("li.closed").each( function () {
							_this.open_branch(this);
						});
			}
		},
		toggle_branch : function (obj) {
			if(typeof obj == "string")	obj = $("#" + obj).get(0);
			if(obj.tagName != "LI")		obj = $(obj).parent("li").get(0);
			if($(obj).hasClass("closed"))	return this.open_branch(obj);
			if($(obj).hasClass("open"))	return this.close_branch(obj); 
		},
		open_branch : function (obj) {
			$(obj).removeClass("closed").addClass("open");
			this.settings.callback.onopen.call(null, $(obj).get(0));
		},
		close_branch : function (obj) {
			$(obj).removeClass("open").addClass("closed");
			this.settings.callback.onclose.call(null, obj);
		},
		select_branch : function (obj) {
			var _this = this;
			$(this.selected)
				.children("A").removeClass("clicked");
			this.selected = $(obj).blur().parent("li").get(0);
			$(this.selected)
				.children("A").addClass("clicked").end()
				.parents("li.closed").each( function () {
						_this.open_branch(this);
					});
			this.settings.callback.onchange.call(null, this.selected);
		},

		show_lang : function (i) { 
			if(this.settings.languages[i] == this.current_lang) return true;
			var st = false;
			var id = $(this.container).attr("id") ? "#" + $(this.container).attr("id") : ".tree";
			st = get_css(id + " ." + this.current_lang, this.sn);
			if(st !== false) st.style.display = "none";
			st = get_css(id + " ." + this.settings.languages[i], this.sn);
			if(st !== false) st.style.display = "block";
			this.current_lang = this.settings.languages[i];
			return true;
		},
		cycle : function() {
			var i = $.inArray(this.current_lang, this.settings.languages);
			i ++;
			if(i > this.settings.languages.length - 1) i = 0;
			this.show_lang(i);
		},

		create : function () {
			$li = $("<li/>");
			for(i = 0; i < this.settings.languages.length; i++) {
				$li.append("<a href='#' class='" + this.settings.languages[i] + "'>Нова категория</a>");
			}
			this.moved($li,$(this.selected).find("a:first"),"inside");
			this.select_branch($li.find("a:first"));
			this.rename();
		},
		rename : function () {
			if(this.selected) {
				var obj = this.selected;
				if(this.current_lang)	obj = $(obj).find("a." + this.current_lang).get(0);
				else							obj = $(obj).find("a:first").get(0);
				last_value = obj.innerHTML;

				_this = this;
				var inp = $("<input type='text' value='" + last_value + "' />");
				inp
					.bind("mousedown",	function (event) { event.stopPropagation(); })
					.bind("mouseup",		function (event) { event.stopPropagation(); })
					.bind("click",			function (event) { event.stopPropagation(); })
					.bind("keyup",			function (event) { 
							var key = event.keyCode || event.which;
							if(key == 27) {
								this.blur();
							}
							if(key == 13) {
								this.blur();
							}
						});
				inp.get(0).onblur = function(event) {
						if(this.value == "") this.value == last_value; 
						$(obj).html( $(obj).parent().find("input").eq(0).attr("value") ).get(0).style.display = ""; 
						$(obj).prevAll("span").remove(); 
						_this.settings.callback.onrename.call(null, obj);
					};
				var spn = $("<span />").addClass(obj.className).append(inp);
				spn.attr("style", $(obj).attr("style"));
				obj.style.display = "none";
				$(obj).parent().prepend(spn);
				inp.get(0).focus();
				inp.get(0).select();
			}
		},

		get_next : function() {
			if(this.selected) {
				if($(this.selected).hasClass("open")) {
					if(this.current_lang)	obj = $(this.selected).find("li:first").find("a." + this.current_lang).get(0);
					else							obj = $(this.selected).find("li:first").find("a:first").get(0);
					return this.select_branch(obj);
				}
				else if($(this.selected).nextAll("li").size() > 0) {
					if(this.current_lang)	obj = $(this.selected).nextAll("li").find("a." + this.current_lang).get(0);
					else							obj = $(this.selected).nextAll("li").find("a:first").get(0);
					return this.select_branch(obj);
				}
				else {
					obj = $(this.selected).parents("li").next("li").eq(0);
					if(this.current_lang)	obj = obj.find("a." + this.current_lang).get(0);
					else							obj = obj.find("a:first").get(0);
					return this.select_branch(obj);
				}
			}
		},
		get_prev : function() {
			if(this.selected) {
				if($(this.selected).prev("li").size()) {
					obj = $(this.selected).prev("li").eq(0);
					while(obj.hasClass("open")) {
						obj = obj.children("ul").eq(0).children("li:last");
					}
					if(this.current_lang)	obj = obj.children("a." + this.current_lang).get(0);
					else							obj = obj.children("a:first").get(0);
					return this.select_branch(obj);
				}
				else {
					obj = $(this.selected).parents("li:eq(0)");
					if(this.current_lang)	obj = obj.children("a." + this.current_lang).get(0);
					else							obj = obj.children("a:first").get(0);
					return this.select_branch(obj);
				}
			}
		},
		get_left : function() {
			if(this.selected) {
				if($(this.selected).hasClass("open")) $(this.selected).removeClass("open").addClass("closed");
				else this.get_prev();
			}
		},
		get_right : function() {
			if(this.selected) {
				if($(this.selected).hasClass("closed")) $(this.selected).removeClass("closed").addClass("open");
				else this.get_next();
			}
		},

		moved : function (what, where, how) {
			var $parent = $(what).parents("ul").eq(0);
			var $where = $(where);
			switch(how) {
				case "before":
					$where.parents("ul").eq(0).children("li.last").removeClass("last");
					$where.parent().before(what.removeClass("last"));
					$where.parents("ul").eq(0).children("li:last").addClass("last");
					break;
				case "after":
					$where.parents("ul").eq(0).children("li.last").removeClass("last");
					$where.parent().after(what.removeClass("last"));
					$where.parents("ul").eq(0).children("li:last").addClass("last");
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
			if($parent.find("li").size() == 0) {
				var $li = $parent.parent();
				$li.removeClass("open").removeClass("closed").find("ul").remove();
				$li.parents("ul").eq(0).children("li.last").removeClass("last");
				$li.parents("ul").eq(0).children("li:last").addClass("last");
			}
			else {
				$parent.children("li.last").removeClass("last");
				$parent.children("li:last").addClass("last");
			}
			this.settings.callback.onmove.call(null, what, where, how);
		}
	}
}
