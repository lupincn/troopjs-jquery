/*!
 * TroopJS jQuery weave plug-in
 * @license TroopJS 0.0.1 Copyright 2012, Mikael Karon <mikael@karon.se>
 * Released under the MIT license.
 */
define([ "jquery" ], function WeaveModule($) {
	var UNDEFINED = undefined;
	var NULL = null;
	var TRUE = true;
	var ARRAY = Array;
	var ARRAY_PROTO = ARRAY.prototype;
	var JOIN = ARRAY_PROTO.join;
	var WHEN = $.when;
	var WEAVE = "weave";
	var UNWEAVE = "unweave";
	var WOVEN = "woven";
	var WIDGET_WEAVE = "widget/" + WEAVE;
	var WIDGET_UNWEAVE = "widget/" + UNWEAVE;
	var DATA_WEAVE = "data-" + WEAVE;
	var DATA_WOVEN = "data-" + WOVEN;
	var RE_WEAVE = /[\s,]*([\w_\-\/]+)(?:\(([^\)]+)\))?/g;
	var RE_SEPARATOR = /\s*,\s*/;
	var RE_STRING = /^(["']).*\1$/;
	var RE_DIGIT = /^\d+$/;
	var RE_BOOLEAN = /^false|true$/i;

	$.fn[WEAVE] = function weave(/* arg, arg, arg, */ deferred) {
		var required = [];
		var i = 0;
		var $elements = $(this);

		// Make arguments into a real array
		var argx  = ARRAY.apply(ARRAY_PROTO, arguments);

		// Update deferred to the last argument
		deferred = argx.pop();

		$elements.each(function elementIterator(index, element) {
			var $element = $(element);
			var $data = $element.data();
			var weave = $element.attr(DATA_WEAVE) || "";
			var widgets = [];
			var mark = i;
			var j = 0;
			var matches;

			$element
				// Store DATA_WEAVE attribute as WEAVE
				.data(WEAVE, weave)
				// Store widgets array as WOVEN
				.data(WOVEN, widgets)
				// Make sure to remove DATA_WEAVE (so we don't try processing this again)
				.removeAttr(DATA_WEAVE);

			// Iterate widgets (while the rexep matches)
			while ((matches = RE_WEAVE.exec(weave)) !== NULL) {
				// Add deferred to required array
				required[i] = $.Deferred(function deferedRequire(dfd) {
					// Store prefixed values as they will not be available during require
					var _j = j;
					var _matches = matches;

					// Get widget name
					var name = _matches[1];

					// Get widget args
					var args = _matches[2];

					try {
						// Require widget
						require([ name ], function required(widget) {
							var k;
							var l;
							var kMax;
							var value;

							// Set initial argv
							var argv = [ $element, name ];

							// Copy values from argx to argv
							for (k = 0, kMax = argx.length, l = argv.length; k < kMax; k++, l++) {
								argv[l] = arg[k];
							}

							// Any widget arguments
							if (args !== UNDEFINED) {
								// Convert args to array
								args = args.split(RE_SEPARATOR);

								// Iterate to 'cast' values
								for (k = 0, kMax = args.length, l = argv.length; k < kMax; k++, l++) {
									// Get value
									value = args[k];

									if (value in $data) {
										argv[l] = $data[value];
									} else if (RE_STRING.test(value)) {
										argv[l] = value.slice(1, -1);
									} else if (RE_DIGIT.test(value)) {
										argv[l] = Number(value);
									} else if (RE_BOOLEAN.test(value)) {
										argv[l] = value === TRUE;
									} else {
										argv[l] = UNDEFINED;
									}
								}
							}

							// Simple or complicated instantiation
							widget = l === 2
								? widget($element, name)
								: widget.apply(widget, argv);

							$element
								// Wire widget (widget)
								.wire(widget)
								// Trigger weave
								.triggerHandler(WIDGET_WEAVE, [ widget ]);

							// Store widgets[_j] and resolve with widget instance
							dfd.resolve(widgets[_j] = widget);
						});
					}
					catch (e) {
						// Reset widgets[_j] and resolve with UNDEFINED
						dfd.resolve(widgets[_j] = UNDEFINED);
					}
				});

				// Step i, j
				i++;
				j++;
			}

			// Slice out widgets woven for this element
			WHEN.apply($, required.slice(mark, i)).done(function doneRequired() {
				// Set 'data-woven' attribute
				$element.attr(DATA_WOVEN, JOIN.call(arguments, " "));
			});
		});

		if (deferred) {
			// When all deferred are resolved, resolve original deferred
			WHEN.apply($, required).then(deferred.resolve, deferred.reject);
		}

		return $elements;
	};

	$.fn[UNWEAVE] = function unweave() {
		return $(this)
			.each(function elementIterator(index, element) {
				var $element = $(element);
				var widgets = $element.data(WOVEN);
				var widget;

				$element
					// Remove WOVEN data
					.removeData(WOVEN)
					// Remove DATA_WOVEN attribute
					.removeAttr(DATA_WOVEN);

				// Somewhat safe(r) iterator over widgets
				while (widget = widgets.shift()) {
					// If we don't exist, we can't unwire
					if (widget === NULL || widget === UNDEFINED) {
						continue;
					}

					// Trigger unweave
					$element.triggerHandler(WIDGET_UNWEAVE, [ widget ]);

					// Unwire
					$element.unwire(widget);
				}

				$element
					// Copy woven data to data-weave attribute
					.attr(DATA_WEAVE, $element.data(WEAVE))
					// Remove data fore WEAVE
					.removeData(DATA_WEAVE);
			});
	};
});