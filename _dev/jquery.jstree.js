// TODO: go through all callbacks and fill the data param as neccessary
// TODO: I18N - loading text, default node title (languages too), context menu (maybe label as a function)
// TODO: contextmenu plugin - do not open when empty, option to select node on right click?, type based entries - maybe a function to return entries ... if an object - use it always, stop animation on two fast clicks
// TODO: finish __destroy methods for all plugins so that they remove the classes/events they added
// TODO: get methods for datasources (JSON mainly)
// TODO: cut/copy/paste

// TODO: redo all other themes (themeroller?)
// TODO: MVC plugin - expose the JSON object and refresh onchange
// TODO: ??? use class on A nodes to make CSS selectors faster ??? (dom will be heavier, as well as fixing nodes onload)
// TODO: IE6 support - single theme or plugin (hook to some events and additional classes)

// TODO: demo for sort only using custom callback

// TEST: * unit testing (using each on ._fn?)
// TEST: multiple nodes to be initially open (async alltogether)
// TEST: foreign drag'n'drop example

// NOTE: dependencies can be described and checked for in the init section of the plugin ( if(!this.data[`needed_plugin`]) throw ... )
// NOTE: prepare EXAMPLES and DOCUMENTATON

"use strict";
// Common functions not related to jsTree 
// * decided to move them to a `vakata` namespace
(function ($) {
	$.vakata = {};
	// CSS related functions
	$.vakata.css = {
		get_css : function(rule_name, delete_flag, sheet) {
			rule_name = rule_name.toLowerCase();
			var css_rules = sheet.cssRules || sheet.rules,
				j = 0;
			do {
				if(css_rules.length && j > css_rules.length + 5) { return false; }
				if(css_rules[j].selectorText && css_rules[j].selectorText.toLowerCase() == rule_name) {
					if(delete_flag === true) {
						if(sheet.removeRule) { sheet.removeRule(j); }
						if(sheet.deleteRule) { sheet.deleteRule(j); }
						return true;
					}
					else { return css_rules[j]; }
				}
			}
			while (css_rules[++j]);
			return false;
		},
		add_css : function(rule_name, sheet) {
			if($.jstree.css.get_css(rule_name, false, sheet)) { return false; }
			if(sheet.insertRule) { sheet.insertRule(rule_name + ' { }', 0); } else { sheet.addRule(rule_name, null, 0); }
			return $.vakata.css.get_css(rule_name);
		},
		remove_css : function(rule_name, sheet) { 
			return $.vakata.css.get_css(rule_name, true, sheet); 
		},
		add_sheet : function(opts) {
			var tmp;
			if(opts.str) {
				tmp = document.createElement("style");
				tmp.setAttribute('type',"text/css");
				if(tmp.styleSheet) {
					document.getElementsByTagName("head")[0].appendChild(tmp);
					tmp.styleSheet.cssText = opts.str;
				}
				else {
					tmp.appendChild(document.createTextNode(opts.str));
					document.getElementsByTagName("head")[0].appendChild(tmp);
				}
				return tmp.sheet || tmp.styleSheet;
			}
			if(opts.url) {
				if(document.createStyleSheet) {
					try { tmp = document.createStyleSheet(opts.url); } catch (e) { }
				}
				else {
					tmp			= document.createElement('link');
					tmp.rel		= 'stylesheet';
					tmp.type	= 'text/css';
					tmp.media	= "all";
					tmp.href	= opts.url;
					document.getElementsByTagName("head")[0].appendChild(tmp);
					return tmp.styleSheet;
				}
			}
		}
	};
})(jQuery);

/*
 * jsTree 1.0-rc1
 * http://jstree.com/
 *
 * Copyright (c) 2010 Ivan Bozhanov (vakata.com)
 *
 * Dual licensed under the MIT and GPL licenses (same as jQuery):
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 * Date: 2010-03-23
 */
(function ($) {
	// private variables 
	var instances = [],			// instance array (used by $.jstree.reference/create/focused)
		focused_instance = -1,	// the index in the instance array of the currently focused instance
		plugins = {},			// list of included plugins
		prepared_move = {};		// for the move plugin

	// jQuery plugin wrapper (thanks to jquery UI widget function)
	$.fn.jstree = function (settings) {
		var isMethodCall = (typeof settings == 'string'), // is this a method call like $().jstree("open_node")
			args = Array.prototype.slice.call(arguments, 1), 
			returnValue = this;

		// extend settings and allow for multiple hashes and metadata
		if(!isMethodCall && $.meta) { args.push($.metadata.get(this).jstree); }
		settings = !isMethodCall && args.length ? $.extend.apply(null, [true, settings].concat(args)) : settings;
		// block calls to "private" methods
		if(isMethodCall && settings.substring(0, 1) == '_') { return returnValue; }

		// if a method call execute the method on all selected instances
		if(isMethodCall) {
			this.each(function() {
				var instance = instances[$.data(this, "jstree-instance-id")],
					methodValue = (instance && $.isFunction(instance[settings])) ? instance[settings].apply(instance, args) : instance;
					if(typeof methodValue !== "undefined") { returnValue = methodValue; return false; }
			});
		}
		else {
			this.each(function() {
				var instance_id = $.data(this, "jstree-instance-id"),
					s = false;
				// if an instance already exists, destroy it first
				if(instance_id && instances[instance_id]) { instances[instance_id].destroy(); }
				// push a new empty object to the instances array
				instance_id = parseInt(instances.push({}),10) - 1;
				// store the jstree instance id to the container element
				$.data(this, "jstree-instance-id", instance_id);
				// clean up all plugins
				settings.plugins = $.isArray(settings.plugins) ? settings.plugins : $.jstree.defaults.plugins;
				if($.inArray("core", settings.plugins) === -1) { settings.plugins.unshift("core"); }
				
				// only unique plugins (NOT WORKING)
				// settings.plugins = settings.plugins.sort().join(",,").replace(/(,|^)([^,]+)(,,\2)+(,|$)/g,"$1$2$4").replace(/,,+/g,",").replace(/,$/,"").split(",");

				// extend defaults with passed data
				s = $.extend(true, {}, $.jstree.defaults, settings);
				s.plugins = settings.plugins;
				// push the new object to the instances array (at the same time set the default classes to the container) and init
				instances[instance_id] = new $.jstree._instance(instance_id, $(this).addClass("jstree jstree-" + instance_id), s); 
				// init all activated plugins for this instance
				$.each(instances[instance_id].get_settings().plugins, function (i, val) { instances[instance_id].data[val] = {}; });
				$.each(instances[instance_id].get_settings().plugins, function (i, val) { if(plugins[val]) { plugins[val].__init.apply(instances[instance_id]); } });
				// initialize the instance
				instances[instance_id].init();
			});
		}
		// return the jquery selection (or if it was a method call that returned a value - the returned value)
		return returnValue;
	};
	// object to store exposed functions and objects
	$.jstree = {
		defaults : {
			plugins : []
		},
		_focused : function () { return instances[focused_instance] || null; },
		_reference : function (needle) { 
			// get by instance id
			if(instances[needle]) { return instances[needle]; }
			// get by DOM (if still no luck - return null
			var o = $(needle); 
			if(!o.length && typeof needle === "string") { o = $("#" + needle); }
			if(!o.length) { return null; }
			return instances[o.closest(".jstree").data("jstree-instance-id")] || null; 
		},
		_instance : function (index, container, settings) { 
			// for plugins to store data in
			this.data = { core : {} };
			this.get_settings	= function () { return $.extend(true, {}, settings); };
			this.get_index		= function () { return index; };
			this.get_container	= function () { return container; };
			this._set_settings	= function (s) { 
				settings = $.extend(true, {}, settings, s);
			};
		},
		_fn : { },
		plugin : function (pname, pdata) {
			pdata = $.extend({}, {
				__init		: $.noop, 
				__destroy	: $.noop,
				_fn			: {},
				defaults	: false
			}, pdata);
			plugins[pname] = pdata;

			$.jstree.defaults[pname] = pdata.defaults;
			$.each(pdata._fn, function (i, val) {
				val.plugin		= pname;
				val.old			= $.jstree._fn[i];
				$.jstree._fn[i] = function _self() {
					var rslt,
						func = val,
						args = Array.prototype.slice.call(arguments),
						stgs = this.get_settings(),
						rlbk = false;

					// Check if function belongs to the included plugins of this instance
					do {
						if(func && func.plugin && $.inArray(func.plugin, stgs.plugins) !== -1) { break; }
						func = func.old;
					} while(func);
					if(!func) { return; }

					// for callback lovers - a change to modify the arguments before calling
					// if boolean false is returned the func is not called
					args = stgs.core.before.call(this, i, args);
					if(args === false) { return; }

					// context and function to trigger events
					func.context	= this;
					func.call_old	= function (replace_arguments) {
						return func.old.apply(func.context, (replace_arguments ? Array.prototype.slice.call(arguments, 1) : args ) );
					};
					func.rollback	= function () {
						rlbk = this.context.get_rollback();
						return rlbk;
					};
					func.callback	= function (data) {
						this.context.get_container().triggerHandler('jstree.' + i, { "inst" : func.context, "args" : args, "rslt" : data, "rlbk" : rlbk });
					};

					// finally call the function
					rslt = func.apply(this, args);

					// once again - for callback lovers
					stgs.core.after.call(this, i, args, rslt, rlbk);

					// return the result
					return rslt;
				};
				$.jstree._fn[i].old = val.old;
				$.jstree._fn[i].plugin = pname;
			});
		},
		rollback : function (rb) {
			if(rb) {
				if(!$.isArray(rb)) { rb = [ rb ]; }
				$.each(rb, function (i, val) {
					instances[val.i].set_rollback(val.h, val.d);
				});
			}
		}
	};
	// set the prototype for all instances
	$.jstree._fn = $.jstree._instance.prototype = {};

	// css functions - used internally

	// load the css when DOM is ready
	$(function() {
		// code is copied form jQuery ($.browser is deprecated + there is a bug in IE)
		var u = navigator.userAgent.toLowerCase(),
			v = (u.match( /.+?(?:rv|it|ra|ie)[\/: ]([\d.]+)/ ) || [0,'0'])[1],
			css_string = '' + 
				'.jstree ul, .jstree li { display:block; margin:0 0 0 0; padding:0 0 0 0; list-style-type:none; } ' + 
				'.jstree li { display:block; min-height:18px; line-height:18px; white-space:nowrap; margin-left:18px; } ' + 
				'.jstree > ul > li { margin-left:0px; } ' + 
				'.jstree ins { display:inline-block; text-decoration:none; width:18px; height:18px; margin:0 0 0 0; padding:0; } ' + 
				'.jstree a { display:inline-block; line-height:16px; height:16px; color:black; white-space:nowrap; text-decoration:none; padding:1px 2px; margin:0; } ' + 
				'.jstree a:focus { outline: none; } ' + 
				'.jstree a > ins { height:16px; width:16px; } ' + 
				'.jstree a > .jstree-icon { margin-right:3px; } ' + 
				'li.jstree-open > ul { display:block; } ' + 
				'li.jstree-closed > ul { display:none; } ';
		// Correct IE 6 (does not support the > CSS selector
		if(/msie/.test(u) && parseInt(v, 10) == 6) { 
			css_string += '' + 
				'.jstree li { height:18px; margin-left:0; } ' + 
				'.jstree li li { margin-left:18px; } ' + 
				'li.jstree-open ul { display:block; } ' + 
				'li.jstree-closed ul { display:none !important; } ' + 
				'.jstree li a { display:inline; } ' + 
				'.jstree li a ins { height:16px; width:16px; margin-right:3px; } ';
		}
		$.vakata.css.add_sheet({ str : css_string });
	});

	// core functions (open, close, create, update, delete)
	$.jstree.plugin("core", {
		__init : function () {
			this.data.core.to_open = $.map($.makeArray(this.get_settings().core.initially_open), function (n) { return "#" + n.toString().replace(/^#/,"").replace('\\/','/').replace('/','\\/'); });
		},
		defaults : { 
			before		: function (func, arg) { return arg; },
			after		: function (func, arg, ret, rb) { },
			animation	: 500,
			initially_open : []
		},
		_fn : { 
			init	: function _self() { 
				this.set_focus(); 
				this.get_container().html("<ul><li class='jstree-last jstree-leaf'><ins>&nbsp;</ins><a class='jstree-loading' href='#'><ins class='jstree-icon'>&nbsp;</ins>Loading ...</a></li></ul>");
				this.data.core.li_height = this.get_container().find("ul li.jstree-closed, ul li.jstree-leaf").eq(0).height() || 18;

				this.get_container()
					.delegate("li > ins", "click", $.proxy(function (event) {
							var trgt = $(event.target);
							if(trgt.is("ins") && event.pageY - trgt.offset().top < this.data.core.li_height) { this.toggle_node(trgt); }
						}, this))
					.bind("mousedown", $.proxy(function () { 
							this.set_focus(); // This used to be setTimeout(set_focus,0) - why?
						}, this))
					.bind("dblclick", function (event) { 
						var sel;
						if(document.selection && document.selection.empty) { document.selection.empty(); }
						else {
							if(window.getSelection) {
								sel = window.getSelection();
								try { 
									sel.removeAllRanges();
									sel.collpase();
								} catch (err) { }
							}
						}
					});
				_self.callback();
				this.load_node(-1, function () { this.loaded(); this.reopen(); });
			},
			destroy	: function _self() { 
				var i,
					n = this.get_index(), 
					c = this.get_container(),
					s = this.get_settings(),
					_this = this;

				$.each(s.plugins, function (i, val) {
					plugins[val].__destroy.apply(_this);
				});
				_self.callback();
				// set focus to another instance if this one is focused
				if(this.is_focused()) { 
					for(i in instances) { 
						if(instances.hasOwnProperty(i) && i != n) { 
							instances[i].set_focus(); 
							break; 
						} 
					}
				}
				$.removeData(c, "jstree-instance-id");
				// remove all traces of jstree in the DOM (only the ones set by the core, plugins should clean themselves)
				c.removeClass("jstree jstree-" + this.get_index() + " jstree-focused");
				// remove the actual data
				instances[n] = null;
				delete instances[n];
			},
			save_opened : function _self() {
				var _this = this;
				this.data.core.to_open = [];
				this.get_container().find(".jstree-open").each(function () { 
					_this.data.core.to_open.push("#" + this.id.toString().replace(/^#/,"").replace('\\/','/').replace('/','\\/')); 
				});
				_self.callback();
			},
			reopen : function _self(is_callback) {
				var _this = this,
					done = true,
					current = [],
					remaining = [];

				if(!is_callback) { this.data.core.reopen = false; }
				if(this.data.core.to_open.length) {
					$.each(this.data.core.to_open, function (i, val) {
						if(val == "#") { return true; }
						if($(val).length && $(val).is(".jstree-closed")) { current.push(val); }
						else { remaining.push(val); }
					});
					if(current.length) {
						this.data.core.to_open = remaining;
						$.each(current, function (i, val) { 
							_this.open_node(val, function () { _this.reopen(true); }, true); 
						});
						done = false;
					}
				}
				if(done) { 
					// TODO: find a more elegant approach to syncronizing returning requests
					if(this.data.core.reopen) { clearTimeout(this.data.core.reopen); }
					this.data.core.reopen = setTimeout(function () { _self.callback(); }, 50);
				}
			},
			refresh : function _self(obj) {
				this.save_opened();
				this.load_node(obj, function () { _self.callback(); this.reopen(); });
			},
			// Dummy function to fire after the first load (so that there is a jstree.loaded event)
			loaded	: function _self() { 
				_self.callback(); 
			},
			// deal with focus
			set_focus	: function _self() { 
				var f = $.jstree._focused();
				if(f && f !== this) {
					f.get_container().removeClass("jstree-focused"); 
				}
				if(f !== this) {
					this.get_container().addClass("jstree-focused"); 
					focused_instance = this.get_index(); 
				}
				_self.callback();
			},
			is_focused	: function () { 
				return focused_instance == this.get_index(); 
			},

			// traverse
			_get_node		: function (obj) { 
				var $obj = $(obj, this.get_container()); 
				if($obj.is(".jstree") || obj == -1) { return -1; } 
				$obj = $obj.closest("li", this.get_container()); 
				return $obj.length ? $obj : false; 
			},
			_get_next		: function (obj, strict) {
				obj = this._get_node(obj);
				if(!obj.length) { return false; }
				if(strict) { return (obj.nextAll("li").size() > 0) ? obj.nextAll("li:eq(0)") : false; }

				if(obj.hasClass("jstree-open")) { return obj.find("li:eq(0)"); }
				else if(obj.nextAll("li").size() > 0) { return obj.nextAll("li:eq(0)"); }
				else { return obj.parentsUntil(this.get_container(),"li").next("li").eq(0); }
			},
			_get_prev		: function (obj, strict) {
				obj = this._get_node(obj);
				if(!obj.length) { return false; }
				if(strict) { return (obj.prevAll("li").length > 0) ? obj.prevAll("li:eq(0)") : false; }

				if(obj.prev("li").length) {
					obj = obj.prev("li").eq(0);
					while(obj.hasClass("jstree-open")) { obj = obj.children("ul:eq(0)").children("li:last"); }
					return obj;
				}
				else { var o = obj.parentsUntil(this.get_container(),"li:eq(0)"); return o.length ? o : false; }
			},
			_get_parent		: function (obj) {
				obj = this._get_node(obj);
				if(obj == -1 || !obj.length) { return false; }
				var o = obj.parentsUntil(this.get_container(), "li:eq(0)");
				return o.length ? o : -1;
			},
			_get_children	: function (obj) {
				obj = this._get_node(obj);
				if(obj === -1) { return this.get_container().children("ul:eq(0)").children("li"); }
				if(!obj.length) { return false; }
				return obj.children("ul:eq(0)").children("li");
			},
			get_path		: function (obj, id_mode) {
				var p = [],
					_this = this;
				obj = this._get_node(obj);
				if(obj === -1 || !obj || !obj.length) { return false; }
				obj.parentsUntil(this.get_container(), "li").each(function () {
					p.push( id_mode ? this.id : _this.get_text(this) );
				});
				p.reverse();
				p.push( id_mode ? obj.attr("id") : this.get_text(obj) );
				return p;
			},

			// open/close
			open_node	: function _self(obj, callback, skip_animation) {
				obj = this._get_node(obj);
				if(!obj.length) { return false; }
				var s = skip_animation ? 0 : this.get_settings().core.animation,
					t = this;
				if(!this._is_loaded(obj)) {
					obj.children("a").addClass("jstree-loading");
					this.load_node(obj, function () { t.open_node(obj, callback); }, callback);
				}
				else {
					if(s) { obj.children("ul").css("display","none"); }
					obj.removeClass("jstree-closed").addClass("jstree-open").children("a").removeClass("jstree-loading");
					if(s) { obj.children("ul").slideDown(s, function () { this.style.display = ""; }); }
					_self.callback({ "obj" : obj });
					if(callback) { callback.call(); }
				}
			},
			close_node	: function _self(obj, skip_animation) {
				obj = this._get_node(obj);
				var s = skip_animation ? 0 : this.get_settings().core.animation;
				if(!obj.length) { return false; }
				if(s) { obj.children("ul").attr("style","display:block !important"); }
				obj.removeClass("jstree-open").addClass("jstree-closed");
				if(s) { obj.children("ul").slideUp(s, function () { this.style.display = ""; }); }
				_self.callback();
			},
			toggle_node	: function (obj) {
				obj = this._get_node(obj);
				if(obj.hasClass("jstree-closed")) { return this.open_node(obj); }
				if(obj.hasClass("jstree-open")) { return this.close_node(obj); }
			},
			open_all	: function _self(obj, original_obj) {
				obj = obj ? this._get_node(obj) : this.get_container();
				if(original_obj) { 
					obj = obj.find("li.jstree-closed");
				}
				else {
					original_obj = obj;
					if(obj.is(".jstree-closed")) { obj = obj.find("li.jstree-closed").andSelf(); }
					else { obj = obj.find("li.jstree-closed"); }
				}
				var _this = this;
				obj.each(function () { 
					var __this = this; 
					_this.open_node(this, function() { _this.open_all(__this, original_obj); });
				});
				// so that callback is fired AFTER all nodes are open
				if(original_obj && original_obj.find('li.jstree-closed').length === 0) { _self.callback(); }
			},
			close_all	: function _self(obj) {
				var _this = this;
				obj = obj ? this._get_node(obj) : this.get_container();
				obj.find("li.jstree-open").andSelf().each(function () { _this.close_node(this); });
				_self.callback();
			},
			clean_node	: function _self(obj) {
				obj = obj && obj != -1 ? $(obj) : this.get_container();
				obj = obj.is("li") ? obj.find("li").andSelf() : obj.find("li");
				obj.removeClass("jstree-last")
					.filter("li:last-child").addClass("jstree-last").end()
					.filter(":has(ul)")
						.not(".jstree-open").removeClass("jstree-leaf").addClass("jstree-closed");
				obj.not(".jstree-open, .jstree-closed").addClass("jstree-leaf");
				_self.callback({ "obj" : obj });
			},
			// rollback
			get_rollback : function _self() { 
				_self.callback();
				return { i : this.get_index(), h : this.get_container().children("ul").clone(true), d : this.data }; 
			},
			set_rollback : function _self(html, data) {
				this.get_container().empty().append(html);
				this.data = data;
				_self.callback();
			},
			// Dummy functions to be overwritten by any datastore plugin included
			load_node	: function _self(obj, s_call, e_call) { _self.callback(); },
			_is_loaded	: function (obj) { return true; },

			// Basic operations: create
			create_node	: function _self(obj, position, js, callback, skip_check) {
				obj = this._get_node(obj);
				position = typeof position === "undefined" ? "last" : position;
				var d = $("<li>"), 
					tmp;

				if(!obj.length) { return false; }
				if(!skip_check && !this._is_loaded(obj)) { this.load_node(obj, function () { this.create_node(obj, position, js, callback, true); }); return false; }

				_self.rollback();

				if(!js) { js = {}; }
				if(js.attr) { d.attr(js.attr); }
				if(js.state) { d.addClass("jstree-" + js.state); }
				if(!js.data) { js.data = "New node"; }
				if(!$.isArray(js.data)) { tmp = js.data; js.data = []; js.data.push(tmp); }
				$.each(js.data, function (i, m) {
					tmp = $("<a>");
					if($.isFunction(m)) { m = m.call(this, js); }
					if(typeof m == "string") { tmp.attr('href','#').text(m); }
					else {
						if(!m.attr) { m.attr = {}; }
						if(!m.attr.href) { m.attr.href = '#'; }
						tmp.attr(m.attr).text(m.title);
						if(m.language) { tmp.addClass(m.language); }
					}
					tmp.prepend("<ins class='jstree-icon'>&nbsp;</ins>");
					if(m.icon) { 
						if(m.icon.indexOf("/") === -1) { tmp.children("ins").addClass(m.icon); }
						else { tmp.children("ins").css("background","url('" + m.icon + "') center center no-repeat;"); }
					}
					d.append(tmp);
				});
				d.prepend("<ins class='jstree-icon'>&nbsp;</ins>");
				switch(position) {
					case "before": obj.before(d); tmp = this._get_parent(obj); break;
					case "after" : obj.after(d);  tmp = this._get_parent(obj); break;
					case "inside":
					case "first" :
						if(!obj.children("ul").length) { obj.append("<ul>"); }
						obj.children("ul").prepend(d);
						tmp = obj;
						break;
					case "last":
						if(!obj.children("ul").length) { obj.append("<ul>"); }
						obj.children("ul").append(d);
						tmp = obj;
						break;
					default:
						if(!obj.children("ul").length) { obj.append("<ul>"); }
						if(!position) { position = 0; }
						tmp = obj.children("ul").children("li").eq(position);
						if(tmp.length) { tmp.before(d); }
						else { obj.children("ul").append(d); }
						tmp = obj;
						break;
				}
				this.clean_node(tmp);
				if(callback) { callback.call(this, d); }
				_self.callback({ "obj" : d, "parent" : tmp });
				return d;
			},
			// Basic operations: rename (deal with text)
			get_text	: function (obj) {
				obj = this._get_node(obj);
				if(!obj.length) { return false; }
				obj = obj.children("a:eq(0)");
				obj = obj.contents().filter(function() { return this.nodeType == 3; })[0];
				return obj.nodeValue;
			},
			set_text	: function _self(obj, val) {
				obj = this._get_node(obj);
				if(!obj.length) { return false; }
				obj = obj.children("a:eq(0)");
				obj = obj.contents().filter(function() { return this.nodeType == 3; })[0];
				_self.callback({ "obj" : this._get_node(obj) });
				return (obj.nodeValue = val);
			},
			rename_node : function _self(obj, val) {
				obj = this._get_node(obj);
				if(obj && obj.length && this.set_text.apply(this, Array.prototype.slice.call(arguments))) { _self.callback({ "obj" : obj }); }
			},
			// Basic operations: deleting nodes
			delete_node : function _self(obj) {
				obj = this._get_node(obj);
				if(!obj.length) { return false; }
				_self.rollback();
				var p = this._get_parent(obj);
				this.deselect_node(obj);
				obj = obj.remove();
				if(p.find("> ul > li").length === 0) {
					p.removeClass("jstree-open, jstree-closed").addClass("jstree-leaf");
				}
				this.clean_node(p);
				_self.callback();
				return obj;
			},
			prepare_move : function _self(o, r, pos, cb, is_cb) {
				var p = {};
				// TODO: maybe use original references (now the original node is collected using the receiving tree's get node function)
				p.o = this._get_node(o);
				p.r = r === - 1 ? -1 : this._get_node(r);
				p.p = (typeof p === "undefined") ? "bottom" : pos; // TODO: move to a setting
				if(!is_cb && prepared_move.o && prepared_move.o[0] === p.o[0] && prepared_move.r[0] === p.r[0] && prepared_move.p === p.p) {
					_self.callback(prepared_move);
					if(cb) { cb.call(this, prepared_move); }
					return;
				}
				p.ot = $.jstree._reference(p.o) || this;
				p.rt = r === -1 ? p.ot : $.jstree._reference(p.r) || this;
				if(p.r === -1) {
					p.cr = -1;
					switch(p.p) {
						case "top":
						case "before":
						case "inside":
							p.cp = 0; 
							break;
						case "after":
						case "bottom":
							p.cp = p.rt.get_container().find(" > ul > li").length; 
							break;
						default:
							p.cp = p.p;
							break;
					}
				}
				else {
					if(!/^(before|after)$/.test(p.p) && !this._is_loaded(p.r)) {
						return this.load_node(p.r, function () { this.prepare_move(o, r, p, cb, true); });
					}
					switch(p.p) {
						case "before":
							p.cp = p.r.index();
							p.cr = p.rt._get_parent(p.r);
							break;
						case "after":
							p.cp = p.r.index() + 1;
							p.cr = p.rt._get_parent(p.r);
							break;
						case "inside":
						case "top":
							p.cp = 0;
							p.cr = p.r;
							break;
						case "bottom":
							p.cp = p.r.find(" > ul > li").length; 
							p.cr = p.r;
							break;
						default: 
							p.cp = p.p;
							p.cr = p.r;
							break;
					}
				}
				p.np = p.cr == -1 ? p.rt.get_container() : p.cr;
				p.op = p.ot._get_parent(p.o);
				p.or = p.np.find(" > ul > li:nth-child(" + (p.cp + 1) + ")");

				prepared_move = p;
				_self.callback(prepared_move);
				if(cb) { cb.call(this, prepared_move); }
			},
			check_move : function () {
				var obj = prepared_move;
				if(obj.or[0] === obj.o[0] || obj.r.parentsUntil(".jstree").andSelf().filter("li").index(obj.o) !== -1) { return false; }
				return true;
			},
			move_node : function _self(obj, ref, position, is_copy, is_prepared, skip_check) {
				if(!is_prepared) { 
					return this.prepare_move(obj, ref, position, function (p) {
						this.move_node(p, false, false, is_copy, true, skip_check);
					});
				}
				if(!skip_check && !this.check_move()) { return false; }
				var o = false;
				if(is_copy) {
					o = obj.o.clone();
					o.find("*[id]").andSelf().each(function () {
						if(this.id) { this.id = "copy_" + this.id; }
					});
				}
				else { o = obj.o; }

				if(obj.or.length) { obj.or.before(o); }
				else { 
					if(!obj.np.children("ul").length) { $("<ul>").appendTo(obj.np); }
					obj.np.children("ul:eq(0)").append(o); 
				}

				try { 
					obj.ot.clean_node(obj.op);
					obj.rt.clean_node(obj.np);
					if(!obj.op.find("> ul > li").length) {
						obj.op.removeClass("jstree-open jstree-closed").addClass("jstree-leaf").children("ul").remove();
					}
				} catch (e) { }
				_self.callback(prepared_move);
				return prepared_move;
			},
			_get_move : function () { return prepared_move; }
		}
	});
})(jQuery);
//*/

/* 
 * jsTree selection plugin 1.0
 * This plugins handles selecting/deselecting/hovering/dehovering nodes
 */
(function ($) {
	$.jstree.plugin("ui", {
		__init : function () { 
			this.data.ui.selected = $(); 
			this.data.ui.last_selected = false; 
			this.data.ui.hovered = null;
			this.data.ui.to_select = this.get_settings().ui.initially_select;

			this.get_container()
				.delegate("a", "click", $.proxy(function (event) {
						var s = this.get_settings().ui,
							obj = this._get_node(event.currentTarget),
							is_multiple = (s.select_multiple_modifier == "on" || (s.select_multiple_modifier !== false && event[s.select_multiple_modifier + "Key"])),
							is_selected = this.is_selected(obj);
						switch(true) {
							case (is_selected && !is_multiple): break;
							case (!is_selected && !is_multiple): 
								if(s.select_limit == -1 || s.select_limit > 0) {
									this.deselect_all();
									this.select_node(obj);
								}
								break;
							case (is_selected && is_multiple): 
								this.deselect_node(obj);
								break;
							case (!is_selected && is_multiple): 
								if(s.select_limit == -1 || this.data.ui.selected.length + 1 <= s.select_limit) { this.select_node(obj); }
								break;
						}
						event.preventDefault();
					}, this))
				.delegate("a", "mouseenter", $.proxy(function (event) {
						this.hover_node(event.target);
					}, this))
				.delegate("a", "mouseleave", $.proxy(function (event) {
						this.dehover_node(event.target);
					}, this))
				.bind("jstree.reopen", $.proxy(function () { 
						this.reselect();
					}, this))
				.bind("jstree.get_rollback", $.proxy(function () { 
						this.dehover_node();
						this.save_selected();
					}, this))
				.bind("jstree.set_rollback", $.proxy(function () { 
						this.reselect();
					}, this))
				.bind("jstree.close_node", $.proxy(function (event, data) { 
						var s = this.get_settings().ui,
							obj = this._get_node(data.args[0]),
							clk = (obj && obj.length) ? obj.find(".jstree-clicked") : [],
							_this = this;
						if(s.selected_parent_close === false || !clk.length) { return; }
						clk.each(function () { 
							_this.deselect_node(this);
							if(s.selected_parent_close === "select_parent") { _this.select_node(obj); }
						});
					}, this));
		},
		defaults : {
			select_limit : -1, // 0, 1, 2 ... or -1 for unlimited
			select_multiple_modifier : "ctrl", // always on, or ctrl, shift, alt
			selected_parent_close : "select_parent", // false, "deselect", "select_parent"
			initially_select : [],
			input_width_limit : 200
		},
		_fn : { 
			_get_node : function _self(obj, allow_multiple) {
				if(typeof obj === "undefined" || obj === null) { return allow_multiple ? this.data.ui.selected : this.data.ui.last_selected; }
				return _self.call_old();
			},
			save_selected : function _self() {
				var _this = this;
				this.data.ui.to_select = [];
				this.data.ui.selected.each(function () { _this.data.ui.to_select.push("#" + this.id.toString().replace(/^#/,"").replace('\\/','/').replace('/','\\/')); });
				_self.callback();
			},
			reselect : function _self() {
				var _this = this,
					s = this.data.ui.to_select;
				s = $.map($.makeArray(s), function (n) { return "#" + n.toString().replace(/^#/,"").replace('\\/','/').replace('/','\\/'); });
				this.deselect_all();
				$.each(s, function (i, val) { _this.select_node(val); });
				_self.callback();
			},
			refresh : function _self(obj) {
				this.save_selected();
				return _self.call_old();
			},
			hover_node : function _self(obj) {
				obj = this._get_node(obj);
				if(!obj.length) { return false; }
				//if(this.data.ui.hovered && obj.get(0) === this.data.ui.hovered.get(0)) { return; }
				if(!obj.hasClass("jstree-hovered")) { this.dehover_node(); }
				this.data.ui.hovered = obj.children("a").addClass("jstree-hovered").parent();
				_self.callback();
			},
			dehover_node : function () {
				var obj = this.data.ui.hovered, p;
				if(!obj || !obj.length) { return false; }
				p = obj.children("a").removeClass("jstree-hovered").parent();
				if(this.data.ui.hovered[0] === p[0]) { this.data.ui.hovered = null; }
			},
			select_node : function _self(obj) {
				obj = this._get_node(obj);
				if(!obj.length) { return false; }
				if(!this.is_selected(obj)) {
					obj.children("a").addClass("jstree-clicked");
					this.data.ui.selected = this.data.ui.selected.add(obj);
					this.data.ui.last_selected = obj;
					_self.callback();
				}
			},
			deselect_node : function _self(obj) {
				obj = this._get_node(obj);
				if(!obj.length) { return false; }
				if(this.is_selected(obj)) {
					obj.children("a").removeClass("jstree-clicked");
					this.data.ui.selected = this.data.ui.selected.not(obj);
					_self.callback();
				}
			},
			toggle_select : function (obj) {
				obj = this._get_node(obj);
				if(!obj.length) { return false; }
				if(this.is_selected(obj)) { this.deselect_node(obj); }
				else { this.select_node(obj); }
			},
			is_selected : function (obj) { return this.data.ui.selected.index(this._get_node(obj)) >= 0; },
			get_selected : function (context) { 
				return context ? $(context).find(".jstree-clicked").parent() : this.data.ui.selected; 
			},
			deselect_all : function _self(context) {
				if(context) { $(context).find(".jstree-clicked").removeClass("jstree-clicked"); } 
				else { this.get_container().find(".jstree-clicked").removeClass("jstree-clicked"); }
				this.data.ui.selected = $([]);
				_self.callback();
			}
		}
	});
	// include the selection plugin by default
	$.jstree.defaults.plugins.push("ui");
})(jQuery);
//*/

/* 
 * jsTree CRRM plugin 1.0
 * Handles creating/renaming/removing nodes by user interaction.
 */
(function ($) {
	$.jstree.plugin("crrm", { 
		__init : function () {
			this.get_container()
				.bind("jstree.move_node", $.proxy(function (e, data) {
					if(this.get_settings().crrm.move.open_onmove) {
						var t = this;
						data.rslt.np.parentsUntil(".jstree").andSelf().filter(".jstree-closed").each(function () {
							t.open_node(this, false, true);
						});
					}
				}, this));
		},
		defaults : {
			input_width_limit : 200,
			move : {
				always_copy			: false, // false, true or "multitree"
				open_onmove			: true,
				default_position	: "bottom",
				check_move			: function (m) { return true; }
			}
		},
		_fn : {
			_show_input : function (obj, callback) {
				obj = this._get_node(obj);
				var w = this.get_settings().crrm.input_width_limit,
					w1 = obj.children("ins").width(),
					w2 = obj.find("> a > ins").width(),
					t = this.get_text(obj),
					h1 = $("<div>", { css : { "position" : "absolute", "top" : "-200px", "left" : "-1000px", "visibility" : "hidden" } }).appendTo("body"),
					h2 = obj.css("position","relative").append(
					$("<input>", { 
						"value" : t,
						// "size" : t.length,
						"css" : {
							"padding" : "0",
							"border" : "1px solid silver",
							"position" : "absolute",
							"left" : (w1 + w2 + 4) + "px",
							"top" : "0px",
							"height" : (this.data.core.li_height - 2) + "px",
							"lineHeight" : (this.data.core.li_height - 2) + "px",
							"width" : "150px" // will be set a bit further down
						},
						"blur" : $.proxy(function () {
							var i = obj.children("input"),
								v = i.val();
							if(v === "") { v = t; }
							this.rename_node(obj, v);
							callback.call(this, obj, v, t);
							i.remove();
							obj.css("position","");
						}, this),
						"keyup" : function (event) {
							var key = event.keyCode || event.which;
							if(key == 27) { this.value = t; this.blur(); return; }
							else if(key == 13) { this.blur(); return; }
							else {
								h2.width(Math.min(h1.text("pW" + this.value).width(),w));
							}
						}
					})
				).children("input"); 
				this.set_text(obj, "");
				h1.css({
						fontFamily		: h2.css('fontFamily')		|| '',
						fontSize		: h2.css('fontSize')		|| '',
						fontWeight		: h2.css('fontWeight')		|| '',
						fontStyle		: h2.css('fontStyle')		|| '',
						fontStretch		: h2.css('fontStretch')		|| '',
						fontVariant		: h2.css('fontVariant')		|| '',
						letterSpacing	: h2.css('letterSpacing')	|| '',
						wordSpacing		: h2.css('wordSpacing')		|| ''
				});
				h2.width(Math.min(h1.text("pW" + h2[0].value).width(),w))[0].select();
			},
			rename : function _self(obj) {
				obj = this._get_node(obj);
				_self.rollback();
				this._show_input(obj, function (obj, new_name, old_name) { 
					_self.callback({ "obj" : obj, "new_name" : new_name, "old_name" : old_name });
				});
			},
			create : function _self(obj, position, js, callback, skip_rename) {
				obj = this._get_node(obj);
				_self.rollback();
				var t = this.create_node(obj, position, js, function (t) {
					var p = this._get_parent(t);
					if(callback) { callback.call(this, t); }
					if(p.hasClass("jstree-closed")) { this.open_node(p, false, true); }
					if(!skip_rename) { 
						this._show_input(t, function (obj, new_name, old_name) { 
							_self.callback({ "obj" : obj, "name" : new_name });
						});
					}
					else { _self.callback({ "obj" : obj, "name" : this.get_text(t) }); }
				});
				return t;
			},
			remove : function _self(obj) {
				obj = this._get_node(obj, true);
				_self.rollback();
				this.delete_node(obj);
				_self.callback();
			},
			check_move : function _self() {
				if(!_self.call_old()) { return false; }
				var s = this.get_settings().crrm.move;
				if(!s.check_move.call(this, this._get_move())) { return false; }
				return true;
			},
			move_node : function _self(obj, ref, position, is_copy, is_prepared, skip_check) {
				var s = this.get_settings().crrm.move;
				if(!is_prepared) { 
					if(!position) { position = s.default_position; }
					return _self.call_old(true, obj, ref, position, is_copy, false, skip_check);
				}
				// if the move is already prepared
				if(s.always_copy === true || (s.always_copy === "multitree" && obj.rt.get_index() === obj.ot.get_index() )) {
					is_copy = true;
				}
				_self.call_old(true, obj, ref, position, is_copy, true, skip_check);
			}
		}
	});
	// include the crr plugin by default
	$.jstree.defaults.plugins.push("crrm");
})(jQuery);

/* 
 * jsTree themes plugin 1.0
 * Handles loading and setting themes, as well as detecting path to themes, etc.
 */
(function ($) {
	var themes_loaded = [];
	// this variable stores the path to the themes folder - if left as false - it will be autodetected
	$.jstree._themes = false;
	$.jstree.plugin("themes", {
		__init : function () { 
			this.get_container()
				.bind("jstree.init", $.proxy(function () {
						var s = this.get_settings().themes;
						if(s && s.theme) {
							this.data.themes.dots = s.dots; 
							this.data.themes.icons = s.icons; 
							this.set_theme(s.theme, s.url);
						}
					}, this));
		},
		defaults : { 
			theme : "default", 
			url : false,
			dots : true,
			icons : true
		},
		_fn : {
			set_theme : function _self(theme_name, theme_url) {
				if(!theme_name) { return false; }
				if(!theme_url) { theme_url = $.jstree._themes + theme_name + '/style.css'; }
				if($.inArray(theme_url, themes_loaded) == -1) {
					$.vakata.css.add_sheet({ "url" : theme_url, "rel" : "jstree" });
					themes_loaded.push(theme_url);
				}
				if(this.data.theme != theme_name) {
					this.get_container().removeClass('jstree-' + this.data.theme);
					this.data.themes.theme = theme_name;
				}
				this.get_container().addClass('jstree-' + theme_name);

				if(!this.data.themes.dots) { this.hide_dots(); }
				else { this.show_dots(); }
				if(!this.data.themes.icons) { this.hide_icons(); }
				else { this.show_icons(); }
				_self.callback();
			},
			get_theme	: function () { return this.data.themes.theme; },

			show_dots	: function () { this.data.themes.dots = true; this.get_container().children("ul").removeClass("jstree-no-dots"); },
			hide_dots	: function () { this.data.themes.dots = false; this.get_container().children("ul").addClass("jstree-no-dots"); },
			toggle_dots	: function () { if(this.data.themes.dots) { this.hide_dots(); } else { this.show_dots(); } },

			show_icons	: function () { this.data.themes.icons = true; this.get_container().children("ul").removeClass("jstree-no-icons"); },
			hide_icons	: function () { this.data.themes.icons = false; this.get_container().children("ul").addClass("jstree-no-icons"); },
			toggle_icons: function () { if(this.data.themes.icons) { this.hide_icons(); } else { this.show_icons(); } }
		}
	});
	// autodetect themes path
	$(function () {
		if($.jstree._themes === false) {
			$("script").each(function () { 
				if(this.src.toString().match(/jquery\.jstree[^\/]*?\.js(\?.*)?$/)) { 
					$.jstree._themes = this.src.toString().replace(/jquery\.jstree[^\/]*?\.js(\?.*)?$/, "") + 'themes/'; 
					return false; 
				}
			});
		}
		if($.jstree._themes === false) { $.jstree._themes = "themes/"; }
	});
	// include the themes plugin by default
	$.jstree.defaults.plugins.push("themes");
})(jQuery);
//*/

/* 
 * jsTree HTML data 1.0
 * The HTML data store. Datastores are build by replacing the `load_node` and `_is_loaded` functions.
 */
(function ($) {
	$.jstree.plugin("html_data", {
		__init : function () { 
			this.data.html_data.original_container_html = this.get_container().html().replace(/<\/([^>]+)>\s+</ig,"</$1><").replace(/>\s+<([a-z]{1})/ig,"><$1");
		},
		defaults : { 
			data : false,
			ajax : false,
			correct_state : false
		},
		_fn : {
			load_node : function _self(obj, s_call, e_call) { this.load_node_html(obj, function () { _self.callback({ "obj" : obj }); s_call.call(this); }, e_call); },
			_is_loaded : function (obj) { 
				obj = this._get_node(obj); 
				return obj == -1 || !obj || !this.get_settings().html_data.ajax || obj.is(".jstree-open, .jstree-leaf") || obj.children("ul").children("li").size() > 0;
			},
			load_node_html : function (obj, s_call, e_call) {
				var d,
					s = this.get_settings().html_data,
					error_func = function () {},
					success_func = function () {};
				switch(true) {
					case (!s.data && !s.ajax):
						if(!obj || obj == -1) {
							this.get_container()
								.html(this.data.html_data.original_container_html)
								.find("li, a").filter(function () { return this.firstChild.tagName !== "INS"; }).prepend("<ins class='jstree-icon'>&nbsp;</ins>");
							this.clean_node();
						}
						if(s_call) { s_call.call(this); }
						break;
					case (!!s.data && !s.ajax) || (!!s.data && !!s.ajax && (!obj || obj === -1)):
						if(!obj || obj == -1) {
							d = $(s.data);
							if(!d.is("ul")) { d = $("<ul>").append(d); }
							this.get_container()
								.children("ul").empty().append(d.children())
								.find("li, a").filter(function () { return this.firstChild.tagName !== "INS"; }).prepend("<ins class='jstree-icon'>&nbsp;</ins>");
							this.clean_node();
						}
						if(s_call) { s_call.call(this); }
						break;
					case (!s.data && !!s.ajax) || (!!s.data && !!s.ajax && obj && obj !== -1):
						obj = this._get_node(obj);
						error_func = function (x, t, e) {
							var ef = this.get_settings().html_data.ajax.error; 
							if(ef) { ef.call(this, x, t, e); }
							if(obj != -1 && obj.length) {
								obj.children(".jstree-loading").removeClass("jstree-loading");
								if(s.correct_state) { obj.removeClass("jstree-open jstree-closed").addClass("jstree-leaf"); }
							}
							if(e_call) { e_call.call(this); }
						};
						success_func = function (d, t, x) {
							if(d == "") {
								return error_func.call(this, x, t, "");
							}
							var sf = this.get_settings().html_data.ajax.success; 
							if(sf) { d = sf.call(this,d,t,x) || d; }
							d = $(d);
							if(!d.is("ul")) { d = $("<ul>").append(d); }
							if(obj == -1) { this.get_container().children("ul").empty().append(d.children()).find("li, a").filter(function () { return this.firstChild.tagName !== "INS"; }).prepend("<ins class='jstree-icon'>&nbsp;</ins>"); }
							else { obj.children(".jstree-loading").removeClass("jstree-loading").append(d).find("li, a").filter(function () { return this.firstChild.tagName !== "INS"; }).prepend("<ins class='jstree-icon'>&nbsp;</ins>"); }
							this.clean_node(obj);
							if(s_call) { s_call.call(this); }
						};
						s.ajax.context = this;
						s.ajax.error = error_func;
						s.ajax.success = success_func;
						if($.isFunction(s.ajax.data)) { s.ajax.data = s.ajax.data.call(this, obj); }
						$.ajax(s.ajax);
						break;
				}
			}
		}
	});
	// include the HTML data plugin by default
	$.jstree.defaults.plugins.push("html_data");
})(jQuery);
//*/

/*
 * jsTree hotkeys plugin 1.0
 * Enables keyboard navigation for all tree instances
 * Depends on the jstree ui & jquery hotkeys plugins
 */
(function ($) {
	var bound = [];
	function exec(i, event) {
		var f = $.jstree._focused();
		if(f && f.data && f.data.hotkeys && f.data.hotkeys.enabled) { return f.get_settings().hotkeys[i].call(f, event); }
	}
	$.jstree.plugin("hotkeys", {
		__init : function () {
			if(typeof $.hotkeys == "undefined") { throw "jsTree hotkeys: jQuery hotkeys plugin not included."; }
			if(!this.data.ui) { throw "jsTree hotkeys: jsTree UI plugin not included."; }
			$.each(this.get_settings().hotkeys, function (i, val) {
				if($.inArray(i, bound) == -1) {
					$(document).bind("keydown", i, function (event) { return exec(i, event); });
					bound.push(i);
				}
			});
			this.enable_hotkeys();
		},
		defaults : {
			"up" : function () { 
				this.hover_node(this._get_prev(this.data.ui.hovered));
				return false; 
			},
			"down" : function () { 
				this.hover_node(this._get_next(this.data.ui.hovered));
				return false;
			},
			"left" : function () { 
				var o = this.data.ui.hovered || this.data.ui.last_selected;
				if(o) {
					if(o.hasClass("jstree-open")) { this.close_node(o); }
					else { this.hover_node(this._get_prev(o)); }
				}
				return false;
			},
			"right" : function () { 
				var o = this.data.ui.hovered || this.data.ui.last_selected;
				if(o && o.length) {
					if(o.hasClass("jstree-closed")) { this.open_node(o); }
					else { this.hover_node(this._get_next(o)); }
				}
				return false;
			},
			"space" : function () { 
				if(this.data.ui.hovered) { this.data.ui.hovered.children("a:eq(0)").click(); } 
				return false; 
			},
			"ctrl+space" : function (event) { 
				event.type = "click";
				if(this.data.ui.hovered) { this.data.ui.hovered.children("a:eq(0)").trigger(event); } 
				return false; 
			},
			"f2" : function () { this.rename(this.data.ui.hovered || this.data.ui.last_selected); },
			"del" : function () { this.remove(); }
		},
		_fn : {
			enable_hotkeys : function () {
				this.data.hotkeys.enabled = true;
			},
			disable_hotkeys : function () {
				this.data.hotkeys.enabled = false;
			}
		}
	});
})(jQuery);
//*/

/* 
 * jsTree JSON 1.0
 * The JSON data store. Datastores are build by overriding the `load_node` and `_is_loaded` functions.
 */
// TODO: create get_json method
(function ($) {
	$.jstree.plugin("json_data", {
		defaults : { 
			data : false,
			ajax : false,
			correct_state : false,
			progressive_render : false
		},
		_fn : {
			load_node : function _self(obj, s_call, e_call) { this.load_node_json(obj, function () { _self.callback({ "obj" : obj }); s_call.call(this); }, e_call); },
			_is_loaded : function (obj) { 
				var s = this.get_settings().json_data;
				obj = this._get_node(obj); 
				if(obj && obj !== -1 && s.progressive_render) {
					obj.append(this.parse_json(obj.data("jstree-children")));
					$.removeData(obj, "jstree-children");
				}
				return obj == -1 || !obj || !s.ajax || obj.is(".jstree-open, .jstree-leaf") || obj.children("ul").children("li").size() > 0;
			},
			load_node_json : function (obj, s_call, e_call) {
				var s = this.get_settings().json_data,
					error_func = function () {},
					success_func = function () {};
				switch(true) {
					case (!s.data && !s.ajax): throw "Neither data nor ajax settings supplied.";
					case (!!s.data && !s.ajax) || (!!s.data && !!s.ajax && (!obj || obj === -1)):
						if(!obj || obj == -1) {
							this.get_container().children("ul").empty().append(this.parse_json(s.data).children());
							this.clean_node();
						}
						if(s_call) { s_call.call(this); }
						break;
					case (!s.data && !!s.ajax) || (!!s.data && !!s.ajax && obj && obj !== -1):
						obj = this._get_node(obj);
						error_func = function (x, t, e) {
							var ef = this.get_settings().json_data.ajax.error; 
							if(ef) { ef.call(this, x, t, e); }
							if(obj != -1 && obj.length) {
								obj.children(".jstree-loading").removeClass("jstree-loading");
								if(s.correct_state) { obj.removeClass("jstree-open jstree-closed").addClass("jstree-leaf"); }
							}
							if(e_call) { e_call.call(this); }
						};
						success_func = function (d, t, x) {
							if(d == "" || (!$.isArray(d) && !$.isPlainObject(d))) {
								return error_func.call(this, x, t, "");
							}
							var sf = this.get_settings().json_data.ajax.success; 
							if(sf) { d = sf.call(this,d,t,x) || d; }
							if(obj == -1) { this.get_container().children("ul").empty().append(this.parse_json(d).children()); }
							else { obj.children(".jstree-loading").removeClass("jstree-loading").parent().append(this.parse_json(d)); }
							this.clean_node(obj);
							if(s_call) { s_call.call(this); }
						};
						s.ajax.context = this;
						s.ajax.error = error_func;
						s.ajax.success = success_func;
						if($.isFunction(s.ajax.data)) { s.ajax.data = s.ajax.data.call(this, obj); }
						$.ajax(s.ajax);
						break;
				}
			},
			parse_json : function (js, is_callback) {
				var d = $(), tmp, i, j, s = this.get_settings().json_data, ul1, ul2;
				if(!js) { return d; }
				if($.isFunction(js)) { 
					js = js.call(this);
				}
				if($.isArray(js)) { 
					for(i = 0, j = js.length; i < j; i++) {
						tmp = this.parse_json(js[i], true);
						if(tmp.length) { d = d.add(tmp); }
					}
				}
				else {
					if(!js.data) { return d; }
					d = $("<li>");
					if(js.attr) { d.attr(js.attr); }
					if(js.state) { d.addClass("jstree-" + js.state); }
					if(!$.isArray(js.data)) { tmp = js.data; js.data = []; js.data.push(tmp); }
					$.each(js.data, function (i, m) {
						tmp = $("<a>");
						if($.isFunction(m)) { m = m.call(this, js); }
						if(typeof m == "string") { tmp.attr('href','#').text(m); }
						else {
							if(!m.attr) { m.attr = {}; }
							if(!m.attr.href) { m.attr.href = '#'; }
							tmp.attr(m.attr).text(m.title);
							if(m.language) { tmp.addClass(m.language); }
						}
						tmp.prepend("<ins class='jstree-icon'>&nbsp;</ins>");
						if(m.icon) { 
							if(m.icon.indexOf("/") === -1) { tmp.children("ins").addClass(m.icon); }
							else { tmp.children("ins").css("background","url('" + m.icon + "') center center no-repeat;"); }
						}
						d.append(tmp);
					});
					d.prepend("<ins class='jstree-icon'>&nbsp;</ins>");
					if(js.children) { 
						if(s.progressive_render && js.state !== "open") {
							d.data("jstree-children", js.children);
						}
						else {
							if($.isFunction(js.children)) {
								js.children = js.children.call(this, js);
							}
							if($.isArray(js.children) && js.children.length) {
								tmp = this.parse_json(js.children, true);
								if(tmp.length) {
									ul2 = $("<ul>");
									ul2.append(tmp);
									d.append(ul2);
								}
							}
						}
					}
				}
				if(!is_callback) {
					ul1 = $("<ul>");
					ul1.append(d);
					d = ul1;
				}
				return d;
			}
		}
	});
})(jQuery);
//*/

/* 
 * jsTree languages plugin 1.0
 * Adds support for multiple language versions in one tree
 * This basically allows for many titles coexisting in one node, but only one of them being visible at any given time
 * This is useful for maintaining the same structure in many languages (hence the name of the plugin)
 */
(function ($) {
	$.jstree.plugin("languages", {
		__init : function () { this._load_css();  },
		defaults : [],
		_fn : {
			set_lang : function _self(i) { 
				var langs = this.get_settings().languages,
					st = false,
					selector = ".jstree-" + this.get_index() + ' ul li a';
				if(!$.isArray(langs) || langs.length === 0) { return false; }
				if($.inArray(i,langs) == -1) {
					if(!!langs[i]) { i = langs[i]; }
					else { return false; }
				}
				if(i == this.data.languages.current_language) { return true; }
				st = $.vakata.css.get_css(selector + "." + this.data.languages.current_language, false, this.data.languages.language_css);
				if(st !== false) { st.style.display = "none"; }
				st = $.vakata.css.get_css(selector + "." + i, false, this.data.languages.language_css);
				if(st !== false) { st.style.display = ""; }
				this.data.languages.current_language = i;
				_self.callback();
				return true;
			},
			get_lang : function () {
				return this.data.languages.current_language;
			},
			get_text : function (obj, lang) {
				obj = this._get_node(obj) || this.data.ui.last_selected;
				if(!obj.size()) { return false; }
				var langs = this.get_settings().languages;
				if($.isArray(langs) && langs.length) {
					lang = (lang && $.inArray(lang,langs) != -1) ? lang : this.data.languages.current_language;
					obj = obj.children("a." + lang);
				}
				else { obj = obj.children("a:eq(0)"); }
				obj = obj.contents().filter(function() { return this.nodeType == 3; })[0];
				return obj.nodeValue;
			},
			set_text : function _self(obj, val, lang) {
				obj = this._get_node(obj) || this.data.ui.last_selected;
				if(!obj.size()) { return false; }
				var langs = this.get_settings().languages;
				if($.isArray(langs) && langs.length) {
					lang = (lang && $.inArray(lang,langs) != -1) ? lang : this.data.languages.current_language;
					obj = obj.children("a." + lang);
				}
				else { obj = obj.children("a:eq(0)"); }
				obj = obj.contents().filter(function() { return this.nodeType == 3; })[0];
				_self.callback();
				return (obj.nodeValue = val);
			},
			_load_css : function () {
				var langs = this.get_settings().languages,
					str = "/* languages css */",
					selector = ".jstree-" + this.get_index() + ' a',
					ln;
				if($.isArray(langs) && langs.length) {
					this.data.languages.current_language = langs[0];
					for(ln = 0; ln < langs.length; ln++) {
						str += selector + "." + langs[ln] + " {";
						if(langs[ln] != this.data.languages.current_language) { str += " display:none; "; }
						str += " } ";
					}
					this.data.language_css = $.vakata.css.add_sheet({ 'str' : str });
				}
			},
			create_node : function _self(obj, position, js, callback) {
				var t = _self.call_old(true, obj, position, js, function (t) {
					var langs = this.get_settings().languages,
						a = t.children("a"),
						ln;
					if($.isArray(langs) && langs.length) {
						for(ln = 0; ln < langs.length; ln++) {
							if(!a.is("." + langs[ln])) {
								t.append(a.eq(0).clone().removeClass(langs.join(" ")).addClass(langs[ln]));
							}
						}
						a.not("." + langs.join(", .")).remove();
					}
					if(callback) { callback.call(this, t); }
				});
				return t;
			}
		}
	});
})(jQuery);
//*/

/*
 * jsTree cookies plugin 1.0
 * Stores the currently opened/selected nodes in a cookie and then restores them
 * Depends on the jquery.cookie plugin
 */
(function ($) {
	$.jstree.plugin("cookies", {
		__init : function () {
			if(typeof $.cookie === "undefined") { throw "jsTree cookie: jQuery cookie plugin not included."; }

			var s = this.get_settings().cookies,
				tmp;
			if(!!s.save_opened) {
				tmp = $.cookie(s.save_opened);
				if(tmp && tmp.length) { this.data.core.to_open = tmp.split(","); }
			}
			if(!!s.save_selected) {
				tmp = $.cookie(s.save_selected);
				if(tmp && tmp.length) { this.data.ui.to_select = tmp.split(","); }
			}
			this.get_container()
				.one("jstree." + ( this.data.ui ? "reselect" : "reopen" ), $.proxy(function () {
					this.get_container()
						.bind("jstree.open_node jstree.close_node jstree.select_node jstree.deselect_node", $.proxy(function (e) { 
								if(this.get_settings().cookies.auto_save) { this.save_cookie((e.handleObj.namespace + e.handleObj.type).replace("jstree","")); }
							}, this));
				}, this));
		},
		defaults : {
			save_opened		: "jstree_open",
			save_selected	: "jstree_select",
			auto_save		: true,
			cookie_options	: {}
		},
		_fn : {
			save_cookie : function (c) {
				var s = this.get_settings().cookies;
				if(!c) { // if called manually and not by event
					if(s.save_opened) {
						this.save_opened();
						$.cookie(s.save_opened, this.data.core.to_open.join(","), s.cookie_options);
					}
					if(s.save_selected && this.data.ui) {
						this.save_selected();
						$.cookie(s.save_selected, this.data.ui.to_select.join(","), s.cookie_options);
					}
					return;
				}
				switch(c) {
					case "open_node":
					case "close_node":
						if(!!s.save_opened) { 
							this.save_opened(); 
							$.cookie(s.save_opened, this.data.core.to_open.join(","), s.cookie_options); 
						}
						break;
					case "select_node":
					case "deselect_node":
						if(!!s.save_selected && this.data.ui) { 
							this.save_selected(); 
							$.cookie(s.save_selected, this.data.ui.to_select.join(","), s.cookie_options); 
						}
						break;
				}
			}
		}
	});
	// include cookies by default
	$.jstree.defaults.plugins.push("cookies");
})(jQuery);
//*/

/*
 * jsTree sort plugin 1.0
 * Sorts items alphabetically (or using any other function)
 */
(function ($) {
	$.jstree.plugin("sort", {
		__init : function () {
			this.get_container()
				.bind("jstree.load_node", $.proxy(function (e, data) {
						var obj = this._get_node(data.rslt.obj);
						obj = obj === -1 ? this.get_container().children("ul") : obj.children("ul");
						this.sort(obj);
					}, this))
				.bind("jstree.rename_node", $.proxy(function (e, data) {
						this.sort(data.rslt.obj.parent());
					}, this))
				.bind("jstree.move_node", $.proxy(function (e, data) {
						var m = data.rslt.np == -1 ? this.get_container() : data.rslt.np;
						this.sort(m.children("ul"));
					}, this));
		},
		defaults : function (a, b) { return this.get_text(a) > this.get_text(b) ? 1 : -1; },
		_fn : {
			sort : function (obj) {
				var s = this.get_settings().sort,
					t = this;
				obj.append($.makeArray(obj.children("li")).sort($.proxy(s, t)));
				obj.find("> li > ul").each(function() { t.sort($(this)); });
				this.clean_node(obj);
			}
		}
	});
})(jQuery);
//*/

/*
 * jsTree DND plugin 1.0
 * Drag and drop plugin for moving/copying nodes
 */
(function ($) {
	var o = false,
		r = false,
		m = false;
	$.vakata.dnd = {
		is_down : false,
		is_drag : false,
		helper : false,
		init_x : 0,
		init_y : 0,
		threshold : 5,
		user_data : {},

		drag_start : function (e, data, html) { 
			if($.vakata.dnd.is_drag) { $.vakata.drag_stop({}); }
			try {
				e.currentTarget.unselectable = "on";
				e.currentTarget.onselectstart = function() { return false; };
				if(e.currentTarget.style) { e.currentTarget.style.MozUserSelect = "none"; }
			} catch(err) { }
			$.vakata.dnd.init_x = e.pageX;
			$.vakata.dnd.init_y = e.pageY;
			$.vakata.dnd.user_data = data;
			$.vakata.dnd.is_down = true;
			$.vakata.dnd.helper = $("<div id='vakata-dragged'>").html(html).css("opacity", "0.75");
			$(document).bind("mousemove", $.vakata.dnd.drag);
			$(document).bind("mouseup", $.vakata.dnd.drag_stop);
			return false;
		},
		drag : function (e) { 
			if(!$.vakata.dnd.is_down) { return; }
			if(!$.vakata.dnd.is_drag) {
				if(Math.abs(e.pageX - $.vakata.dnd.init_x) > 5 || Math.abs(e.pageY - $.vakata.dnd.init_y) > 5) { 
					$.vakata.dnd.helper.appendTo("body");
					$.vakata.dnd.is_drag = true;
					$(document).triggerHandler("vakata.drag_start", { "event" : e, "data" : $.vakata.dnd.user_data });
				}
				else { return; }
			}
			$.vakata.dnd.helper.css({ left : (e.pageX + 5) + "px", top : (e.pageY + 10) + "px" });
			$(document).triggerHandler("vakata.drag", { "event" : e, "data" : $.vakata.dnd.user_data });
		},
		drag_stop : function (e) {
			$(document).unbind("mousemove", $.vakata.dnd.drag);
			$(document).unbind("mouseup", $.vakata.dnd.drag_stop);
			$(document).triggerHandler("vakata.drag_stop", { "event" : e, "data" : $.vakata.dnd.user_data });
			$.vakata.dnd.helper.remove();
			$.vakata.dnd.init_x = 0;
			$.vakata.dnd.init_y = 0;
			$.vakata.dnd.user_data = {};
			$.vakata.dnd.is_down = false;
			$.vakata.dnd.is_drag = false;
		}
	};
	$(function() {
		var css_string = '#vakata-dragged { display:block; margin:0 0 0 0; padding:4px 4px 4px 24px; position:absolute; left:-2000px; top:-2000px; line-height:16px; } ';
		$.vakata.css.add_sheet({ str : css_string });
	});

	$.jstree.plugin("dnd", {
		__init : function () {
			this.data.dnd = {
				after : false,
				inside : false,
				before : false,
				off : false,
				prepared : false,
				w : 0,
				to1 : false,
				to2 : false,
				cof : false,
				cw : false,
				ch : false,
				i1 : false,
				i2 : false
			};
			// TODO: move when near scrollbar
			this.get_container()
				.bind("mouseenter", $.proxy(function () {
						if($.vakata.dnd.is_drag && $.vakata.dnd.user_data.jstree && this.data.themes) {
							m.attr("class", "jstree-" + this.data.themes.theme); 
							$.vakata.dnd.helper.attr("class", "jstree-" + this.data.themes.theme);
						}
					}, this))
				.bind("mouseleave", $.proxy(function () {
						if($.vakata.dnd.is_drag && $.vakata.dnd.user_data.jstree) {
							if(this.data.dnd.i1) { clearInterval(this.data.dnd.i1); }
							if(this.data.dnd.i2) { clearInterval(this.data.dnd.i2); }
						}
					}, this))
				.bind("mousemove", $.proxy(function (e) {
						if($.vakata.dnd.is_drag && $.vakata.dnd.user_data.jstree) {
							var cnt = this.get_container()[0];

							// Horizontal scroll
							if(e.pageX + 20 > this.data.dnd.cof.left + this.data.dnd.cw) {
								if(this.data.dnd.i1) { clearInterval(this.data.dnd.i1); }
								this.data.dnd.i1 = setInterval($.proxy(function () { this.scrollLeft += 5; }, cnt), 100);
							}
							else if(e.pageX - 20 < this.data.dnd.cof.left) {
								if(this.data.dnd.i1) { clearInterval(this.data.dnd.i1); }
								this.data.dnd.i1 = setInterval($.proxy(function () { this.scrollLeft -= 5; }, cnt), 100);
							}
							else {
								if(this.data.dnd.i1) { clearInterval(this.data.dnd.i1); }
							}

							// Vertical scroll
							if(e.pageY + 20 > this.data.dnd.cof.top + this.data.dnd.ch) {
								if(this.data.dnd.i2) { clearInterval(this.data.dnd.i2); }
								this.data.dnd.i2 = setInterval($.proxy(function () { this.scrollTop += 5; }, cnt), 100);
							}
							else if(e.pageY - 20 < this.data.dnd.cof.top) {
								if(this.data.dnd.i2) { clearInterval(this.data.dnd.i2); }
								this.data.dnd.i2 = setInterval($.proxy(function () { this.scrollTop -= 5; }, cnt), 100);
							}
							else {
								if(this.data.dnd.i2) { clearInterval(this.data.dnd.i2); }
							}

						}
					}, this))
				.delegate("a", "mousedown", $.proxy(function (e) { 
						o = this._get_node(e.currentTarget);
						if(this.data.ui && this.is_selected(o)) { o = this._get_node(null, true); }
						$.vakata.dnd.drag_start(e, { jstree : true, obj : o }, "<ins class='jstree-icon'></ins>" + (o.length > 1 ? "Multiple selection" : this.get_text(o)) );
						if(this.data.themes) { 
							m.attr("class", "jstree-" + this.data.themes.theme); 
							$.vakata.dnd.helper.attr("class", "jstree-" + this.data.themes.theme); 
						}
						var cnt = this.get_container();
						this.data.dnd.cof = cnt.children("ul").offset();
						this.data.dnd.cw = parseInt(cnt.width(),10);
						this.data.dnd.ch = parseInt(cnt.height(),10);
						return false;
					}, this))
				.delegate("a", "mouseenter", $.proxy(function (e) { 
						if($.vakata.dnd.is_drag && $.vakata.dnd.user_data.jstree) {
							var s = this.get_settings().dnd;
							this.data.dnd.prepared = false;
							r = this._get_node(e.currentTarget);
							if(s.check_timeout) { 
								// do the calculations after a minimal timeout (users tend to drag quickly to the desired location)
								if(this.data.dnd.to1) { clearTimeout(this.data.dnd.to1); }
								this.data.dnd.to1 = setTimeout($.proxy(this.dnd_prepare, this), s.check_timeout); 
							}
							else { 
								this.dnd_prepare(); 
							}
							if(s.open_timeout) { 
								if(this.data.dnd.to2) { clearTimeout(this.data.dnd.to2); }
								if(r.hasClass("jstree-closed")) { 
									// if the node is closed - open it, then recalculate
									this.data.dnd.to2 = setTimeout($.proxy(this.dnd_open, this), s.open_timeout);
								}
							}
							else {
								if(r.hasClass("jstree-closed")) { 
									this.dnd_open();
								}
							}
						}
					}, this))
				.delegate("a", "mousemove", $.proxy(function (e) { 
						if($.vakata.dnd.is_drag && $.vakata.dnd.user_data.jstree) {
							if(typeof this.data.dnd.off.top === "undefined") { this.data.dnd.off = $(e.target).offset(); }
							this.data.dnd.w = (e.pageY - (this.data.dnd.off.top || 0)) % this.data.core.li_height;
							if(this.data.dnd.w < 0) { this.data.dnd.w += this.data.core.li_height; }
							this.dnd_show();
						}
					}, this))
				.delegate("a", "mouseleave", $.proxy(function (e) { 
						if($.vakata.dnd.is_drag && $.vakata.dnd.user_data.jstree) {
							this.data.dnd.after		= false;
							this.data.dnd.before	= false;
							this.data.dnd.inside	= false;
							$.vakata.dnd.helper.children("ins").attr("class","jstree-invalid");
							m.hide();
							if(r && r[0] === e.target.parentNode) {
								if(this.data.dnd.to1) {
									clearTimeout(this.data.dnd.to1);
									this.data.dnd.to1 = false;
								}
								if(this.data.dnd.to2) {
									clearTimeout(this.data.dnd.to2);
									this.data.dnd.to2 = false;
								}
							}
						}
					}, this))
				.delegate("a", "mouseup", $.proxy(function (e) { 
						if($.vakata.dnd.is_drag && $.vakata.dnd.user_data.jstree) {
							this.dnd_finish(e);
						}
					}, this));

			$(document).bind("vakata.drag_stop", $.proxy(function () {
				this.data.dnd.after		= false;
				this.data.dnd.before	= false;
				this.data.dnd.inside	= false;
				this.data.dnd.off		= false;
				this.data.dnd.prepared	= false;
				this.data.dnd.w			= false;
				this.data.dnd.to1		= false;
				this.data.dnd.to2		= false;
			}, this));
		},
		defaults : {
			copy_modifier : "ctrl",
			check_timeout : 200,
			open_timeout : 500
		},
		_fn : {
			dnd_prepare : function () {
				this.data.dnd.off = r.offset();
				this.prepare_move(o, r, "before");
				this.data.dnd.before = this.check_move();
				this.prepare_move(o, r, "after");
				this.data.dnd.after = this.check_move();
				if(this._is_loaded(r)) {
					this.prepare_move(o, r, "inside");
					this.data.dnd.inside = this.check_move();
				}
				else {
					this.data.dnd.inside = false;
				}
				this.data.dnd.prepared = true;
				return this.dnd_show();
			},
			dnd_show : function _self() {
				if(!this.data.dnd.prepared) { return; }
				var o = ["before","inside","after"],
					r = false;
				if(this.data.dnd.w < this.data.core.li_height/3) { o = ["before","inside","after"]; }
				else if(this.data.dnd.w <= this.data.core.li_height*2/3) {
					o = this.data.dnd.w < this.data.core.li_height/2 ? ["inside","before","after"] : ["inside","after","before"];
				}
				else { o = ["after","inside","before"]; }
				$.each(o, $.proxy(function (i, val) { 
					if(this.data.dnd[val]) {
						$.vakata.dnd.helper.children("ins").attr("class","jstree-ok");
						r = val;
						return false;
					}
				}, this));
				switch(r) {
					case "before":
						m.css({ "left" : (this.data.dnd.off.left + 10) + "px", "top" : (this.data.dnd.off.top - 6) + "px" }).show();
						break;
					case "after":
						m.css({ "left" : (this.data.dnd.off.left + 10) + "px", "top" : (this.data.dnd.off.top + this.data.core.li_height - 7) + "px" }).show();
						break;
					case "inside":
						m.css({ "left" : (this.data.dnd.off.left + 14) + "px", "top" : (this.data.dnd.off.top + this.data.core.li_height/2 - 5) + "px" }).show();
						break;
					default:
						m.hide();
						break;
				}
				return r;
			},
			dnd_open : function () {
				this.data.dnd.to2 = false;
				this.open_node(r, $.proxy(this.dnd_prepare,this), true);
			},
			dnd_finish : function (e) {
				this.dnd_prepare();
				this.move_node(o, r, this.dnd_show(), e[this.get_settings().dnd.copy_modifier + "Key"]);
				o = false;
				r = false;
				m.hide();
			}
		}
	});
	$(function() {
		var css_string = '' + 
			'#vakata-dragged ins { display:block; text-decoration:none; width:16px; height:16px; margin:0 0 0 0; padding:0; position:absolute; top:4px; left:4px; } ' + 
			'#vakata-dragged .jstree-ok { background:green; } ' + 
			'#vakata-dragged .jstree-invalid { background:red; } ' + 
			'#jstree-marker { padding:0; margin:0; line-height:12px; font-size:1px; overflow:hidden; height:12px; width:8px; position:absolute; left:-45px; top:-30px; z-index:1000; background-repeat:no-repeat; display:none; background-color:silver; } ';
		$.vakata.css.add_sheet({ str : css_string });
		m = $("<div>").attr({ id : "jstree-marker" }).hide().appendTo("body");
		$(document).bind("vakata.drag_start", function (e, data) {
			if(data.data.jstree) { 
				m.show(); 
			}
		});
		$(document).bind("vakata.drag_stop", function (e, data) {
			if(data.data.jstree) { m.hide(); }
		});
	});
})(jQuery);
//*/

/*
 * jsTree checkbox plugin 1.0
 * Inserts checkboxes in front of every node
 * Depends on the ui plugin
 * DOES NOT WORK NICELY WITH MULTITREE DRAG'N'DROP
 */
(function ($) {
	$.jstree.plugin("checkbox", {
		__init : function () {
			if(!this.data.ui) { throw("jsTree checkboxes: jsTree UI plugin not included"); }
			this.get_selected = this.select_node = this.deselect_node = this.deselect_all = $.noop;

			this.get_container()
				.bind("jstree.open_node", $.proxy(function (e, data) { 
						this._prepare_checkboxes(data.rslt.obj);
					}, this))
				.bind("jstree.loaded", $.proxy(function (e) {
						this._prepare_checkboxes();
					}, this))
				.bind("jstree.clean_node", $.proxy(function (e, data) {
						this._repair_state(data.args[0]);
					}, this))
				.delegate("a", "click", $.proxy(function (e) {
						this.change_state(e.target);
						this.save_selected();
						if(this.data.cookies) { this.save_cookie("select_node"); }
						e.preventDefault();
					}, this));
		},
		_fn : {
			_prepare_checkboxes : function (obj) {
				obj = !obj || obj == -1 ? this.get_container() : this._get_node(obj);
				var c = obj.is("li") && obj.hasClass("jstree-checked") ? "jstree-checked" : "jstree-unchecked";
				obj.find("a").not(":has(.checkbox)").prepend("<ins class='checkbox'>&nbsp;</ins>").parent().addClass(c);
			},
			change_state : function (obj, state) {
				obj = this._get_node(obj);
				state = (state === false || state === true) ? state : obj.hasClass("jstree-checked");
				if(state) { obj.find("li").andSelf().removeClass("jstree-checked jstree-undetermined").addClass("jstree-unchecked"); }
				else { obj.find("li").andSelf().removeClass("jstree-unchecked jstree-undetermined").addClass("jstree-checked"); }

				var _this = this;
				obj.parentsUntil(this.get_container(), "li").each(function () {
					var $this = $(this);
					if(state) {
						if($this.children("ul").children(".jstree-checked, .jstree-undetermined").length) {
							$this.parentsUntil(_this.get_container(), "li").andSelf().removeClass("jstree-checked jstree-unchecked").addClass("jstree-undetermined");
							return false;
						}
						else {
							$this.removeClass("jstree-checked jstree-undetermined").addClass("jstree-unchecked");
						}
					}
					else {
						if($this.children("ul").children(".jstree-unchecked, .jstree-undetermined").length) {
							$this.parentsUntil(_this.get_container(), "li").andSelf().removeClass("jstree-checked jstree-unchecked").addClass("jstree-undetermined");
							return false;
						}
						else {
							$this.removeClass("jstree-unchecked jstree-undetermined").addClass("jstree-checked");
							_this.data.ui.last_selected = $this;
						}
					}
				});
				this.data.ui.selected = this.get_checked();
			},
			check_node : function (obj) {
				this.change_state(obj, false);
			},
			uncheck_node : function (obj) {
				this.change_state(obj, true);
			},
			check_all : function () {
				var _this = this;
				this.get_container().children("ul").children("li").each(function () {
					_this.check_node(this, false);
				});
			},
			uncheck_all : function () {
				var _this = this;
				this.get_container().children("ul").children("li").each(function () {
					_this.change_state(this, true);
				});
			},

			is_checked : function(obj) {
				obj = this._get_node(obj);
				return obj.length ? obj.is(".jstree-checked") : false;
			},
			get_checked : function (obj) {
				obj = !obj || obj === -1 ? this.get_container() : this._get_node(obj);
				return obj.find("> ul > .jstree-checked, .jstree-undetermined > ul > .jstree-checked");
			},
			get_unchecked : function (obj) { 
				obj = !obj || obj === -1 ? this.get_container() : this._get_node(obj);
				return obj.find("> ul > .jstree-unchecked, .jstree-undetermined > ul > .jstree-unchecked");
			},

			show_checkboxes : function () { this.get_container().children("ul").removeClass("jstree-no-checkboxes"); },
			hide_checkboxes : function () { this.get_container().children("ul").addClass("jstree-no-checkboxes"); },

			_repair_state : function (obj) {
				obj = this._get_node(obj);
				if(!obj.length) { return; }
				var a = obj.find("> ul > .jstree-checked").length,
					b = obj.find("> ul > .jstree-undetermined").length,
					c = obj.find("> ul > li").length;

				if(c === 0) { if(obj.hasClass("jstree-undetermined")) { this.check_node(obj); } }
				else if(a === 0 && b === 0) { this.uncheck_node(obj); }
				else if(a === c) { this.check_node(obj); }
				else { 
					obj.parentsUntil(this.get_container(),"li").andSelf().removeClass("jstree-checked jstree-unchecked").addClass("jstree-undetermined");
				}
			},

			reselect : function _self() {
				var _this = this,
					s = this.data.ui.to_select;
				s = $.map($.makeArray(s), function (n) { return "#" + n.toString().replace(/^#/,"").replace('\\/','/').replace('/','\\/'); });
				this.deselect_all();
				$.each(s, function (i, val) { _this.check_node(val); });
				_self.callback();
			}
		}
	});
})(jQuery);
//*/

/* 
 * jsTree XML 1.0
 * The XML data store. Datastores are build by overriding the `load_node` and `_is_loaded` functions.
 */
(function ($) {
	var xsl = {
		'nest' : '<?xml version="1.0" encoding="utf-8" ?>' + 
			'<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" >' + 
			'<xsl:output method="html" encoding="utf-8" omit-xml-declaration="yes" standalone="no" indent="no" media-type="text/html" />' + 
			'<xsl:template match="/">' + 
			'	<xsl:call-template name="nodes">' + 
			'		<xsl:with-param name="node" select="/root" />' + 
			'	</xsl:call-template>' + 
			'</xsl:template>' + 
			'<xsl:template name="nodes">' + 
			'	<xsl:param name="node" />' + 
			'	<ul>' + 
			'	<xsl:for-each select="$node/item">' + 
			'		<xsl:variable name="children" select="count(./item) &gt; 0" />' + 
			'		<li>' + 
			'			<xsl:attribute name="class">' + 
			'				<xsl:if test="position() = last()">jstree-last </xsl:if>' + 
			'				<xsl:choose>' + 
			'					<xsl:when test="@state = \'open\'">jstree-open </xsl:when>' + 
			'					<xsl:when test="$children or @hasChildren or @state = \'closed\'">jstree-closed </xsl:when>' + 
			'					<xsl:otherwise>jstree-leaf </xsl:otherwise>' + 
			'				</xsl:choose>' + 
			'				<xsl:value-of select="@class" />' + 
			'			</xsl:attribute>' + 
			'			<xsl:for-each select="@*">' + 
			'				<xsl:if test="name() != \'class\' and name() != \'state\' and name() != \'hasChildren\'">' + 
			'					<xsl:attribute name="{name()}"><xsl:value-of select="." /></xsl:attribute>' + 
			'				</xsl:if>' + 
			'			</xsl:for-each>' + 
			'			<xsl:for-each select="content/name">' + 
			'				<a>' + 
			'				<xsl:attribute name="href">' + 
			'					<xsl:choose>' + 
			'					<xsl:when test="@href"><xsl:value-of select="@href" /></xsl:when>' + 
			'					<xsl:otherwise>#</xsl:otherwise>' + 
			'					</xsl:choose>' + 
			'				</xsl:attribute>' + 
			'				<xsl:attribute name="class"><xsl:value-of select="@lang" /> <xsl:value-of select="@class" /></xsl:attribute>' + 
			'				<xsl:attribute name="style"><xsl:value-of select="@style" /></xsl:attribute>' + 
			'				<xsl:for-each select="@*">' + 
			'					<xsl:if test="name() != \'style\' and name() != \'class\' and name() != \'href\'">' + 
			'						<xsl:attribute name="{name()}"><xsl:value-of select="." /></xsl:attribute>' + 
			'					</xsl:if>' + 
			'				</xsl:for-each>' + 
			'					<ins>' + 
			'						<xsl:attribute name="class">jstree-icon ' + 
			'							<xsl:if test="string-length(attribute::icon) > 0 and not(contains(@icon,\'/\'))"><xsl:value-of select="@icon" /></xsl:if>' + 
			'						</xsl:attribute>' + 
			'						<xsl:if test="string-length(attribute::icon) > 0 and contains(@icon,\'/\')"><xsl:attribute name="style">background:url(<xsl:value-of select="@icon" />) center center no-repeat;</xsl:attribute></xsl:if>' + 
			'						<xsl:text>&#xa0;</xsl:text>' + 
			'					</ins>' + 
			'					<xsl:value-of select="current()" />' + 
			'				</a>' + 
			'			</xsl:for-each>' + 
			'			<xsl:if test="$children or @hasChildren"><xsl:call-template name="nodes"><xsl:with-param name="node" select="current()" /></xsl:call-template></xsl:if>' + 
			'		</li>' + 
			'	</xsl:for-each>' + 
			'	</ul>' + 
			'</xsl:template>' + 
			'</xsl:stylesheet>',

		'flat' : '<?xml version="1.0" encoding="utf-8" ?>' + 
			'<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" >' + 
			'<xsl:output method="html" encoding="utf-8" omit-xml-declaration="yes" standalone="no" indent="no" media-type="text/xml" />' + 
			'<xsl:template match="/">' + 
			'	<ul>' + 
			'	<xsl:for-each select="//item[not(@parent_id) or @parent_id=0]">' + 
			'		<xsl:call-template name="nodes">' + 
			'			<xsl:with-param name="node" select="." />' + 
			'			<xsl:with-param name="is_last" select="number(position() = last())" />' + 
			'		</xsl:call-template>' + 
			'	</xsl:for-each>' + 
			'	</ul>' + 
			'</xsl:template>' + 
			'<xsl:template name="nodes">' + 
			'	<xsl:param name="node" />' + 
			'	<xsl:param name="is_last" />' + 
			'	<xsl:variable name="children" select="count(//item[@parent_id=$node/attribute::id]) &gt; 0" />' + 
			'	<li>' + 
			'	<xsl:attribute name="class">' + 
			'		<xsl:if test="$is_last = true()">jstree-last </xsl:if>' + 
			'		<xsl:choose>' + 
			'			<xsl:when test="@state = \'open\'">jstree-open </xsl:when>' + 
			'			<xsl:when test="$children or @hasChildren or @state = \'closed\'">jstree-closed </xsl:when>' + 
			'			<xsl:otherwise>jstree-leaf </xsl:otherwise>' + 
			'		</xsl:choose>' + 
			'		<xsl:value-of select="@class" />' + 
			'	</xsl:attribute>' + 
			'	<xsl:for-each select="@*">' + 
			'		<xsl:if test="name() != \'parent_id\' and name() != \'hasChildren\' and name() != \'class\' and name() != \'state\'">' + 
			'		<xsl:attribute name="{name()}"><xsl:value-of select="." /></xsl:attribute>' + 
			'		</xsl:if>' + 
			'	</xsl:for-each>' + 
			'	<xsl:for-each select="content/name">' + 
			'		<a>' + 
			'		<xsl:attribute name="href">' + 
			'			<xsl:choose>' + 
			'			<xsl:when test="@href"><xsl:value-of select="@href" /></xsl:when>' + 
			'			<xsl:otherwise>#</xsl:otherwise>' + 
			'			</xsl:choose>' + 
			'		</xsl:attribute>' + 
			'		<xsl:attribute name="class"><xsl:value-of select="@lang" /> <xsl:value-of select="@class" /></xsl:attribute>' + 
			'		<xsl:attribute name="style"><xsl:value-of select="@style" /></xsl:attribute>' + 
			'		<xsl:for-each select="@*">' + 
			'			<xsl:if test="name() != \'style\' and name() != \'class\' and name() != \'href\'">' + 
			'				<xsl:attribute name="{name()}"><xsl:value-of select="." /></xsl:attribute>' + 
			'			</xsl:if>' + 
			'		</xsl:for-each>' + 
			'			<ins>' + 
			'				<xsl:attribute name="class">jstree-icon ' + 
			'					<xsl:if test="string-length(attribute::icon) > 0 and not(contains(@icon,\'/\'))"><xsl:value-of select="@icon" /></xsl:if>' + 
			'				</xsl:attribute>' + 
			'				<xsl:if test="string-length(attribute::icon) > 0 and contains(@icon,\'/\')"><xsl:attribute name="style">background:url(<xsl:value-of select="@icon" />) center center no-repeat;</xsl:attribute></xsl:if>' + 
			'				<xsl:text>&#xa0;</xsl:text>' + 
			'			</ins>' + 
			'			<xsl:value-of select="current()" />' + 
			'		</a>' + 
			'	</xsl:for-each>' + 
			'	<xsl:if test="$children">' + 
			'		<ul>' + 
			'		<xsl:for-each select="//item[@parent_id=$node/attribute::id]">' + 
			'			<xsl:call-template name="nodes">' + 
			'				<xsl:with-param name="node" select="." />' + 
			'				<xsl:with-param name="is_last" select="number(position() = last())" />' + 
			'			</xsl:call-template>' + 
			'		</xsl:for-each>' + 
			'		</ul>' + 
			'	</xsl:if>' + 
			'	</li>' + 
			'</xsl:template>' + 
			'</xsl:stylesheet>'
	};
	$.jstree.plugin("xml_data", {
		__init : function () {
			if(typeof Sarissa == "undefined") { throw "jsTree XML data: Sarissa not included."; }
			else {
				if(typeof xsl.flat === "string") { xsl.flat = (new DOMParser()).parseFromString(xsl.flat,'text/xml'); }
				if(typeof xsl.nest === "string") { xsl.nest = (new DOMParser()).parseFromString(xsl.nest,'text/xml'); }
			}
		},
		defaults : { 
			data : false,
			ajax : false,
			xsl : "flat",
			clean_node : false
		},
		_fn : {
			load_node : function _self(obj, s_call, e_call) { this.load_node_xml(obj, function () { _self.callback({ "obj" : obj }); s_call.call(this); }, e_call); },
			_is_loaded : function (obj) { 
				var s = this.get_settings().xml_data;
				return obj == -1 || !obj || !s.ajax || obj.is(".jstree-open, .jstree-leaf") || obj.children("ul").children("li").size() > 0;
			},
			load_node_xml : function (obj, s_call, e_call) {
				var s = this.get_settings().xml_data,
					error_func = function () {},
					success_func = function () {};
				switch(true) {
					case (!s.data && !s.ajax): throw "Neither data nor ajax settings supplied.";
					case (!!s.data && !s.ajax) || (!!s.data && !!s.ajax && (!obj || obj === -1)):
						if(!obj || obj == -1) {
							this.get_container().children("ul").empty().append(this.parse_xml(s.data).children());
							if(s.clean_node) { this.clean_node(obj); }
						}
						if(s_call) { s_call.call(this); }
						break;
					case (!s.data && !!s.ajax) || (!!s.data && !!s.ajax && obj && obj !== -1):
						obj = this._get_node(obj);
						error_func = function (x, t, e) {
							var ef = this.get_settings().xml_data.ajax.error; 
							if(ef) { ef.call(this, x, t, e); }
							if(obj != -1 && obj.length) {
								obj.children(".jstree-loading").removeClass("jstree-loading");
								if(s.correct_state) { obj.removeClass("jstree-open jstree-closed").addClass("jstree-leaf"); }
							}
							if(e_call) { e_call.call(this); }
						};
						success_func = function (d, t, x) {
							if(d == "") {
								return error_func.call(this, x, t, "");
							}
							var sf = this.get_settings().xml_data.ajax.success; 
							if(sf) { d = sf.call(this,d,t,x) || d; }
							if(obj == -1) { this.get_container().children("ul").empty().append(this.parse_xml(d).children()); }
							else { obj.children(".jstree-loading").removeClass("jstree-loading").parent().append(this.parse_xml(d)); }
							if(s.clean_node) { this.clean_node(obj); }
							if(s_call) { s_call.call(this); }
						};
						s.ajax.context = this;
						s.ajax.error = error_func;
						s.ajax.success = success_func;
						if($.isFunction(s.ajax.data)) { s.ajax.data = s.ajax.data.call(null, obj); }
						$.ajax(s.ajax);
						break;
				}
			},
			parse_xml : function (xml) {
				var processor = new XSLTProcessor(),
					s = this.get_settings().xml_data,
					result;
				processor.importStylesheet(xsl[s.xsl]);

				result = $((new XMLSerializer()).serializeToString(processor.transformToDocument(xml)).replace('<?xml version="1.0"?>',''));
				if(result.size() > 1) { result = result.eq(1); }
				if(!result.is("ul")) { result = result.find("ul:eq(0)"); }
				return result;
			}
		}
	});
})(jQuery);
//*/

/*
 * jsTree search plugin 1.0
 * Enables both sync and async search on the tree
 * DOES NOT WORK WITH JSON PROGRESSIVE RENDER
 */
// TODO: test - multiple request reported (n instead of one request for search)
// TODO: config option to show only matching nodes (it will be heavy but still?)
(function ($) {
	$.expr[':'].jstree_contains = function(a,i,m){
		return (a.textContent || a.innerText || "").toLowerCase().indexOf(m[3].toLowerCase())>=0;
	};
	$.jstree.plugin("search", {
		__init : function () {
			this.data.search.str = "";
			this.data.search.result = $();
		},
		defaults : {
			ajax : false, // OR ajax object
			case_insensitive : false
		},
		_fn : {
			search : function (str, skip_async) {
				var s = this.get_settings().search, 
					t = this,
					error_func = function () { },
					success_func = function () { };
				this.data.search.str = str;

				if(!skip_async && s.ajax !== false && this.get_container().find(".jstree-closed:eq(0)").length > 0) {
					this.search.supress_callback = true;
					error_func = function () { };
					success_func = function (d, t, x) {
						var sf = this.get_settings().search.ajax.success; 
						if(sf) { d = sf.call(this,d,t,x) || d; }
						this.data.search.to_open = d;
						this._search_open();
					};
					s.ajax.context = this;
					s.ajax.error = error_func;
					s.ajax.success = success_func;
					if($.isFunction(s.ajax.data)) { s.ajax.data = s.ajax.data.call(this); }
					if(!s.ajax.dataType || /^json/.exec(s.ajax.dataType)) { s.ajax.dataType = "json"; }
					$.ajax(s.ajax);
					return;
				}
				this.search.supress_callback = false;
				this.clear_search();
				this.data.search.result = this.get_container().find("a" + (this.data.languages ? "." + this.get_lang() : "" ) + ":" + (s.case_insensitive ? "jstree_contains" : "contains") + "(" + this.data.search.str + ")");
				this.data.search.result.addClass("jstree-search").parents(".jstree-closed").each(function () {
					t.open_node(this, false, true);
				});
			},
			clear_search : function (str) {
				this.data.search.result.removeClass("jstree-search");
				this.data.search.result = $();
			},
			_search_open : function (is_callback) {
				var _this = this,
					done = true,
					current = [],
					remaining = [];
				if(this.data.search.to_open.length) {
					$.each(this.data.search.to_open, function (i, val) {
						if(val == "#") { return true; }
						if($(val).length && $(val).is(".jstree-closed")) { current.push(val); }
						else { remaining.push(val); }
					});
					if(current.length) {
						this.data.search.to_open = remaining;
						$.each(current, function (i, val) { 
							_this.open_node(val, function () { _this._search_open(true); }); 
						});
						done = false;
					}
				}
				if(done) { this.search(this.data.search.str, true); }
			}
		}
	});
})(jQuery);
//*/

