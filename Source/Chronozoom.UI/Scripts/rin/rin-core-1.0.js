// rin-core-1.0.js built Wed 03/13/2013 at  4:46:05.19 
﻿/*!
* RIN Core JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

window.rin = window.rin || {};
rin.contracts = rin.contracts || {};

// Simple event class to enable pub-sub pattern. All rin events use this class.
rin.contracts.Event = function () {
    var callbackItems = {};

    return {
        // To subscribe to this event, call this method.
        // callback: callback function to be called when an event is published.
        // id: Optional unique id to identify this subscription. If not specified, callback pointer is used as id.
        // context: Optional context under which the callback needs to be called. If specified, the "this" variable inside the callback will refer to this context object.
        subscribe: function (callback, id, context) {
            if (typeof (callback) != "function") throw new Error("Event callback needs to be a function");
            callbackItems[id || callback] = { callback: callback, context: context || this };
        },

        // To unsubscribe, call this method with the subscription id.
        unsubscribe: function (id) {
            delete callbackItems[id];
        },

        // To publish the event, call this method with the arguments for the callbacks.
        publish: function (eventArgs) {
            for (var id in callbackItems) {
                var callbackItem = callbackItems[id];
                callbackItem.callback.call(callbackItem.context, eventArgs);
            }
        }
    }
}

// enum of states a experience stream can be in. All experience streams start at closed state, then move to buffering (if buffering is required), and then to ready or error state.
rin.contracts.experienceStreamState = {
    closed: "closed",
    buffering: "buffering",
    ready: "ready",
    error: "error"
};

// An experience provider needs to implement following methods.
//    load: function (experienceStreamId) { } // Load experience stream contents at the passed experienceStreamId
//    play: function (offset, experienceStreamId) { } // Play contents from the given offset & experienceStreamId
//    pause: function (offset, experienceStreamId) { } // Pause experience stream with the first frame displayed at given offset & experienceStreamId
//    unload: function () { } // Release all resources and unload
//    getState: function () { } // Return current state - one of states listed in rin.contracts.experienceStreamState
//    stateChangedEvent: new rin.contracts.Event() // Publish this event whenever current state changes. Callers can subscribe to this event. 
                                                   // The publisher should pass an instance of rin.contracts.ESStateChangedEventArgs to describe state change information.
//    getUserInterfaceControl: function () { } // Return html element that displays contents of this experience provider.

// Class that describes the event arguments on state changed event.
rin.contracts.ESStateChangedEventArgs = function (fromState, toState, source) {
    this.fromState = fromState;
    this.toState = toState;
    this.source = source;
};

// The UI layer an experience stream can be in. This describes implicit z-index of the experience's user interface control. This is specified in RIN data model.
rin.contracts.experienceStreamLayer = {
    background: "background",
    foreground: "foreground",
    overlay: "overlay",
    projection: "projection"
};

// List of events that an ES can broadcast to other ESs or receive from other ESs. To broadcast an event, call orchestrator.onESEvent with event id and event related data.
// To listen to esEvents broadcasted by other ESs, implement onESEvent method in experience provider and react to events.
rin.contracts.esEventIds = {
    interactionActivatedEventId: "interactionActivatedEvent", // This event is raised by an ES to tell orchestrator and controller that user interacted and hence the narrative should be stopped 
                                                              // and relevant interaction controls should be shown.
    stateTransitionEventId: "stateTransitionEvent" // This event is raised by an ES to continously broadcast changes in state information. 
};

// Enum of system interaction controls available for an ES to use. Refer to developer documentation for how to get a system interaction control.
rin.contracts.interactionControlNames = {
    panZoomControl: "MicrosoftResearch.Rin.InteractionControls.PanZoomControl",
    mediaControl: "MicrosoftResearch.Rin.InteractionControls.MediaControl"
};

// Enum of types of factories that rin.ext registers and gives out. These are only system factories and rin.ext allows any type of factory to be registered.
rin.contracts.systemFactoryTypes = {
    esFactory: "ESFactory",
    interactionControlFactory: "InteractionControlFactory",
    behaviorFactory: "BehaviorFactory"
}

// A single instance class that holds plugins such as factories. Registering and getting factory methods such as "ES factories", "Interaction control factories" etc can be done here.
rin.ext = (function () {
    var defaultESFactoryFunction = null;
    var factoriesTypeMap = {};
    var defaultFactoryProviderId = "MicrosoftResearch.Rin.DefaultFactoryProvider";

    return {
        // Registers a factory. 
        // factoryType: Any string that identifies a specific factory type. Could be a value from rin.contracts.systemFactoryTypes or any unique string. 
        // providerTypeId: unique string that identifies a provider type.
        // factoryFunction: Function that return an instance of an object.
        // isSupportedCheckFunction: A function that takes version number as param and returns true if that version is supported.
        registerFactory: function (factoryType, providerTypeId, factoryFunction, isSupportedCheckFunction) {
            var factories = factoriesTypeMap[factoryType] || (factoriesTypeMap[factoryType] = []);
            factories.push({ providerTypeId: providerTypeId, factoryFunction: factoryFunction, isSupportedCheckFunction: isSupportedCheckFunction });
        },

        // Returns factory function for given factoryType string, providerTypeId string and optional version number.
        getFactory: function (factoryType, providerTypeId, version) {
            var factories = factoriesTypeMap[factoryType];
            if (!factories) return null;

            for (var i = factories.length - 1; i >= 0; i--) { 
                var factory = factories[i];
                if (factory.providerTypeId == providerTypeId) {
                    if (!version || typeof (factory.isSupportedCheckFunction) != "function" || factory.isSupportedCheckFunction(version)) return factory.factoryFunction;
                }
            }

            return factories[defaultFactoryProviderId];
        },

        // Sets default factory function for a given factory type. If no factory funtion is found for a given providerTypeId, this default factory is used.
        setDefaultFactory: function (factoryType, defaultFactoryFunction) {
            var factories = factoriesTypeMap[factoryType] || (factoriesTypeMap[factoryType] = []);
            factories[defaultFactoryProviderId] = defaultFactoryFunction;
        }
    };
})();﻿/*!
* RIN Core JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

window.rin = window.rin || {};
rin.contracts = rin.contracts || {};

// Enum that lists possible states RIN player can be in.
rin.contracts.playerState = {
    stopped: "stopped", // Initial state of the player. Player is stopped and not playing any content.
    pausedForBuffering: "pausedForBuffering", // Player is paused and is buffering content. Player will resume when enough content is buffered.
    pausedForExplore: "pausedForExplore", // Player is paused because user is interacting with the player. 
    playing: "playing", // Player is playing content.
    inTransition: "inTransition" // Player's state is in the middle of change. This state is set when player is changing from one state to another, for example, from stopped to playing.
};

// Enum that lists possible modes RIN player can be in.
rin.contracts.playerMode = {
    Demo: "demo", // Player is playing content from local narratives folder. Used during development and demoing from locally hosted content.
    Published: "published", // Player is hosted in some hosting solution like azure and is playing narrative & content pointed by web URLs.
    AuthorerPreview: "authorerPreview", // Player is playing inside an authoring tool's preview window. Authoring tool specific UI elements might be visible in this mode.
    AuthorerEditor: "authorerEditor" // Player is playing inside an authoring tool's path editor window. Path editing related UI controls & functionality may be visible in this mode.
};

// Enum that lists possible actions on narrative data load.
rin.contracts.playerStartupAction =
{
    play: "play", // Immediately play contents after loading
    pause: "pause", // Pause player at first frame after loading
    none: "none" // No action after load, continue to show blank screen
};

// Aspect ratio of narrative. This is specified in narrative data model.
rin.contracts.narrativeAspectRatio =
{
    none: "none",
    normal: "normal",
    wideScreen: "wideScreen"
};

// Class that specified event arguments of player state changed event.
rin.contracts.PlayerStateChangedEventArgs = function (previousState, currentState) {
    this.previousState = previousState;
    this.currentState = currentState;
};

rin.contracts.PlayerStateChangedEventArgs.prototype = {
    previousState: rin.contracts.playerState.stopped,
    currentState: rin.contracts.playerState.stopped
};

// Class that specified event arguments of player ES event.
rin.contracts.PlayerESEventArgs = function (sender, eventId, eventData) {
    this.sender = sender; this.eventId = eventId; this.eventData = eventData;
};﻿/*!
* RIN Core JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

/// <reference path="../contracts/DiscreteKeyframeESBase.js" />
/// <reference path="../contracts/IExperienceStream.js" />
/// <reference path="../contracts/IOrchestrator.js" />
/// <reference path="../core/Common.js" />
/// <reference path="../core/EventLogger.js" />
/// <reference path="../core/PlayerConfiguration.js" />
/// <reference path="../core/ResourcesResolver.js" />
/// <reference path="../core/TaskTimer.js" />

window.rin = window.rin || {};
rin.contracts = rin.contracts || {};

// Base class for any ES which uses keyframes at discrete intervals.
rin.contracts.DiscreteKeyframeESBase = function (orchestrator, esData) {
    this._esData = esData;
    this._orchestrator = orchestrator;
    this._keyframes = new rin.internal.List();
    this.stateChangedEvent = new rin.contracts.Event();
};

rin.contracts.DiscreteKeyframeESBase.prototype = {
    // Notify ES stage change.
    stateChangedEvent: new rin.contracts.Event(),
    // Method called every time a keyframe has to be applied.
    displayKeyframe: function (keyframeData) { },
    // Reset the UI.
    resetUserInterface: function () { },
    // Load the ES and initialize its components.
    load: function (experienceStreamId) {
        if (!this._esData || !this._orchestrator) throw new Error("orchestrator and esData should not be null. Make sure the base ES is instantiated using non-empty constructor during run time");
        this._initKeyframes(experienceStreamId);
    },
    // Play the ES from the specified offset.
    play: function (offset, experienceStreamId) {
        this.isLastActionPlay = true;
        if (this._taskTimer) {
            var isSeeked = this._seek(offset, experienceStreamId);
            this._taskTimer.play();
            if (!isSeeked && this._lastKeyframe) {
                var nextKeyframe = this._getNextKeyframe(this._lastKeyframe);
                var interpolationOffset = offset - this._lastKeyframe.offset;
                rin.internal.debug.assert(interpolationOffset >= 0);
                this._loadKeyframe(this._lastKeyframe, nextKeyframe, interpolationOffset);
            }
        }
    },
    // Pause the ES at the specified offset.
    pause: function (offset, experienceStreamId) {
        this.isLastActionPlay = false;
        if (this._taskTimer) {
            this._seek(offset, experienceStreamId);
            this._taskTimer.pause();
        }
    },

    // Unload the ES and release any resources.
    unload: function () {
        this.pause();
    },

    // Get the current state of this ES.
    getState: function () {
        return this._state;
    },

    // Get the state if this ES.
    setState: function (value) {
        if (this._state == value) return;
        var previousState = this._state;
        this._state = value;
        this.stateChangedEvent.publish(new rin.contracts.ESStateChangedEventArgs(previousState, value, this));

        if (this._taskTimer && this._state == rin.contracts.experienceStreamState.ready && previousState != rin.contracts.experienceStreamState.ready) {
            this._loadKeyframeAtOffset(this._taskTimer.getCurrentTimeOffset());
        }
    },
    getUserInterfaceControl: function () { return this._userInterfaceControl; },
    isLastActionPlay: false,

    // Load and initialize the keyframes and the timer.
    _initKeyframes: function (experienceStreamId) {
        var currentExperienceStreamId = experienceStreamId;
        if (!this._isValidExperienceStreamId(currentExperienceStreamId)) {
            rin.internal.debug.assert(false, "invalid experience stream id");
            this._orchestrator.eventLogger.logErrorEvent("Requested experience stream {0} missing in datamodel", currentExperienceStreamId);            
        } else {
            var self = this;
            this._keyframes = this._esData.experienceStreams[experienceStreamId].keyframes;
            if (this._taskTimer) this._taskTimer.pause();
            this._taskTimer = new rin.internal.TaskTimer();
            this._taskTimer.taskTriggeredEvent.subscribe(function (triggeredItems) { self._taskTimer_taskTriggered(triggeredItems) });
            if (this._keyframes && this._keyframes != null) {
                this._keyframes.sort(function (a, b) { return a.offset - b.offset; });
                for (var i = 0, len = this._keyframes.length; i < len; i++) {
                    var keyframe = this._keyframes[i];
                    this._taskTimer.add(parseFloat(keyframe.offset), keyframe);
                }
            }
            this._lastKeyframe = null;
            this._currentExperienceStreamId = currentExperienceStreamId;
        }
    },

    // Check if the experienceStreamId is valid.
    _isValidExperienceStreamId: function (experienceStreamId) {
        return experienceStreamId && this._esData.experienceStreams[experienceStreamId];
    },

    // Method called every time the timer triggers.
    _taskTimer_taskTriggered: function (triggeredItems) {
        var lastKeyframe = triggeredItems.lastOrDefault();
        var nextKeyframe = this._getNextKeyframe(lastKeyframe);
        this._loadKeyframe(lastKeyframe, nextKeyframe);
    },

    // Load a specified keyframe.
    _loadKeyframe: function (keyframeData, nextKeyframeData, interpolationOffset) {
        this._lastKeyframe = keyframeData;

        if (keyframeData) this.displayKeyframe(keyframeData, nextKeyframeData, interpolationOffset || 0);
        else this.resetUserInterface();
    },

    // Seek to the specified offset.
    _seek: function (offset, experienceStreamId) {
        var isSeeked = false;
        if (experienceStreamId != this._currentExperienceStreamId && this._isValidExperienceStreamId(experienceStreamId)) {
            this.resetUserInterface();
            this._initKeyframes(experienceStreamId);
            this._currentExperienceStreamId= experienceStreamId;
            isSeeked = true;
        }

        var epsilon = .05;
        var currentTimeOffset = this._taskTimer.getCurrentTimeOffset();
        if (this._taskTimer && (isSeeked || Math.abs(currentTimeOffset - offset) > epsilon)) {
            this._taskTimer.seek(offset);
            this._loadKeyframeAtOffset(offset);
            isSeeked = true;
        }
        return isSeeked;
    },

    // Load keyframe from a specified offset.
    _loadKeyframeAtOffset: function (offset) {
        var lastKeyframe = this._taskTimer.getCurrentOrPrevious(offset);
        if (!lastKeyframe) return true; // exit is there is no lastkeyframe

        var nextKeyframe = this._getNextKeyframe(lastKeyframe);
        var interpolationOffset = offset - lastKeyframe.offset;
        rin.internal.debug.assert(interpolationOffset >= 0);
        this._loadKeyframe(lastKeyframe, nextKeyframe, interpolationOffset);
    },

    // Find the next keyframe.
    _getNextKeyframe: function (keyframeData) {
        var keyframeIndex = keyframeData ? this._keyframes.indexOf(keyframeData) : -1;
        return (keyframeIndex >= 0 && (keyframeIndex + 1) < this._keyframes.length) ? this._keyframes[keyframeIndex + 1] : null;
    },

    _keyframes: [],
    _lastKeyframe: null,
    _currentExperienceStreamId: null,
    _taskTimer: null,
    _userInterfaceControl: null,
    _orchestrator: null,
    _esData: null
};﻿/*!
* RIN Core JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

window.rin = window.rin || {};
window.rin.internal = window.rin.internal || {};
// Call to register callback every time the browser redraws a page.
rin.internal.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 1000 / 60);
            };
})().bind(this);

// A helper module to download any content from a remote url
rin.internal.AjaxDownloadHelper = function (url, content) {

    // Get the source specified for this helper
    this.getSource = function () {
        return url ? url : content;
    };

    // Download the content from the specified source
    this.getContent = function (callback, resourceResolver) {
        if (content) {
            callback(content);
        }
        else if (url) {
            var resolvedUrl = resourceResolver ? resourceResolver.resolveSystemResource(url) : url;
            $.get(resolvedUrl, null, function (string) {
                callback(string);
            });
        }
        else
            throw new Error("Neither Url nor content is provided.");
    }
};

// Bunch of utility methods to help with developing components for RIN
// todo: Find correct way to do many of these util functions like startsWith, endsWith, isAbsoluteUrl, getDocumentLocationRootUrl etc.
rin.util = {
    // Util method for inheriting from a class and setting up basic properties to access the parent.
    extend : function(Super, Sub) {
        // By using a dummy constructor, initialization side-effects are eliminated.
        function Dummy() { }
        // Set dummy prototype to Super prototype.
        Dummy.prototype = Super.prototype;
        // Create Sub prototype as a new instance of dummy.
        Sub.prototype = new Dummy();
        // The .constructor propery is really the Super constructor.
        Sub.baseConstructor = Sub.prototype.constructor;
        // Update the .constructor property to point to the Sub constructor.
        Sub.prototype.constructor = Sub;
        // A convenient reference to the super constructor.
        Sub.parentConstructor = Super;
        // A convenient reference to the super prototype.
        Sub.parentPrototype = Super.prototype;
    },

    // Replace placeholders in a string with values. ex: stringFormat('From of {0} to {1}', 'top', 'bottom') -> 'From top to bottom'
    stringFormat: function (text) {
        var args = arguments;
        return text.replace(/\{(\d+)\}/g, function (matchedPattern, matchedValue) {
            return args[parseInt(matchedValue) + 1];
        });
    },

    // Remove leading and trailing white spaces from a string
    trim: function (text) {
        return (text || "").replace(/^\s+|\s+$/g, "");
    },

    // Checks if the string starts with a given substring.
    startsWith: function (text, string) {
        if (!text || !string || text.length < string.length) return false;
        return (text.substr(0, string.length) === string);
    },

    // Checks if the string ends with a given substring.
    endsWith: function (text, string) {
        if (!text || !string || text.length < string.length) return false;
        return (text.substr(text.length - string.length) === string);
    },

    // Checks if a given Url is absolute or not.
    isAbsoluteUrl: function (url) {
        return /^[a-z]{1,5}:\/\//i.test(url);
    },

    // Set the opacity of an element.
    setElementOpacity: function (targetElement, opacityValue) {
        if (targetElement && targetElement.style) {
            targetElement.style.opacity = opacityValue;
            targetElement.style.filter = "alpha(opacity=" + opacityValue * 100 + ")";
        }
    },

    // Checks if 'child' is present in 'childItems'.
    hasChildElement: function (childItems, child) {
        for (var i = 0, len = childItems.length; i < len; i++) if (childItems[i] == child) return true;
        return false;
        var x = "";
    },
    // Assigns a DOM string to a DOM element.
    assignAsInnerHTMLUnsafe: function (node, html) {
        if (window.MSApp !== undefined && window.MSApp.execUnsafeLocalFunction) {
            window.MSApp.execUnsafeLocalFunction(function () {
                node.innerHTML = html;
            });
        }
        else {
            node.innerHTML = html;
        }
    },
    // Creates a DOM element from the html specified and wraps it in a div.
    createElementWithHtml: function (html) {
        var div = document.createElement("div");
        rin.util.assignAsInnerHTMLUnsafe(div, html);
        return div;
    },

    // An arbitary string which is different everytime it is evaluated.
    expando: "rin" + Date.now(),

    // Counter for using as a unique id for items in rin scope.
    uuid: 0,

    // Returns the UID of the object.
    getUniqueIdIfObject: function (object) {
        if (typeof object != "object") return object;
        var id = object[this.expando];
        if (!id) id = object[this.expando] = ++this.uuid;
        return id;
    },

    // Replaces properties in 'toObject' with the ones in 'fromObject' but not add any extra.
    overrideProperties: function (fromObject, toObject) {
        for (var prop in fromObject) toObject[prop] = fromObject[prop];
        return toObject;
    },

    // Shallow copy the object. Only members are copied and so the resulting object will not be of the same type.
    shallowCopy: function (obj) {
        var temp = {};
        this.overrideProperties(obj, temp);
        return temp;
    },

    // Deep copy the object. Only members are copied and so the resulting object will not be of the same type.
    deepCopy: function (obj) {
        if (typeof (obj) != "object" || obj == null) return obj;
        var temp = obj.constructor();
        for (var i in obj) temp[i] = this.deepCopy(obj[i]);
        return temp;
    },

    // Extract query strings from a Url and return it as a property bag.
    getQueryStringParams: function (queryString) {
        var params = {}, queries, tokens, i, l;
        var query = (typeof (queryString) == "undefined") ? document.location.search : queryString;
        var posQuestion = query.indexOf("?");
        if (posQuestion >= 0) query = query.substr(posQuestion + 1);
        queries = query.split("&");

        for (i = 0, l = queries.length; i < l; i++) {
            tokens = queries[i].split('=');
            if (tokens.length == 2) params[tokens[0]] = tokens[1];
        }
        return params;
    },

    // Generates a random number between min and max.
    rand: function (min, max) {
        return Math.random() * (max - min) + min;
    },

    // Generates a random number between min to max and rounds it to the nearest integer.
    randInt: function (min, max) {
        return ~~(rin.util.rand(min, max));
    },

    // Hide an element by changing its opacity to 0.
    hideElementByOpacity: function (uiElem) {
        this.setElementOpacity(uiElem, 0);
    },

    // UnHide an element by changing its opacity to 1.
    unhideElementByOpacity: function (uiElem) {
        this.setElementOpacity(uiElem, 1);
    },

    // Parse a string to JSON.
    parseJSON: function (data) { // Code taken from jQuery
        if (typeof data !== "string" || !data) {
            return null;
        }

        // Make sure leading/trailing whitespace is removed (IE can't handle it)
        data = this.trim(data);

        // Attempt to parse using the native JSON parser first
        if (window.JSON && window.JSON.parse) {
            return window.JSON.parse(data);
        }

        // Make sure the incoming data is actual JSON
        // Logic borrowed from http://json.org/json2.js
        var rvalidchars = /^[\],:{}\s]*$/,
	        rvalidescape = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,
	        rvalidtokens = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,
	        rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g;

        if (rvalidchars.test(data.replace(rvalidescape, "@")
			.replace(rvalidtokens, "]")
			.replace(rvalidbraces, ""))) {

            return (new Function("return " + data))();

        }
        jQuery.error("Invalid JSON: " + data);
    },

    // Combines the arguments to form a relative path.
    combinePathElements: function () {
        var returnPath = "";
        for (var i = 0, l = arguments.length; i < l; i++) {
            var pathElement = rin.util.trim(arguments[i]);
            if (pathElement && pathElement[pathElement.length - 1] != "/") pathElement = pathElement + "/";
            if (returnPath && pathElement[0] == "/") pathElement = pathElement.substr(1, pathElement.length);
            returnPath += pathElement;
        }
        return (returnPath.length > 0) ? returnPath.substr(0, returnPath.length - 1) : returnPath;
    },

    // Get the root url of the document.
    getDocumentLocationRootUrl: function () {
        if (!this._getDocumentLocationRootUrl) {
            var baseUrl = document.location.href.replace(document.location.hash,'');
            var lastSlashPos = baseUrl.lastIndexOf("/"); // value 3 is used to skip slashes after protocol, sometime it could be upto 3 slashes.
            this._getDocumentLocationRootUrl = lastSlashPos > document.location.protocol.length + 3 ? baseUrl.substr(0, lastSlashPos) : baseUrl;
        }
        return this._getDocumentLocationRootUrl;
    },

    // Removes all child elements of the given element.
    removeAllChildren: function (element) {
        if (!element) return;
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    },

    // Get all keys in a dictionary as an Array.
    getDictionaryKeys: function (dictionary) {
        if (typeof Object.keys !== "function") {
            var keys = [], name;
            for (name in Object) {
                if (Object.hasOwnProperty(name)) {
                    keys.push(name);
                }
            }
            return keys;
        }
        else
            return Object.keys(dictionary);
    },

    // Get all values in a dictionary as an Array.
    getDictionaryValues: function (dictionary) {
        var dictValues = new rin.internal.List();
        for (var key in dictionary)
            if (dictionary.hasOwnProperty(key)) dictValues.push(dictionary[key]);
        return dictValues;
    },

    // Convert an array like object to an Array.
    makeArray: function (arrayLikeObject) {
        var result = [];
        for (var i = 0, j = arrayLikeObject.length; i < j; i++) {
            result.push(arrayLikeObject[i]);
        };
        return result;
    },

    // Empty function.
    emptyFunction: function () { }
};

// Class providing debug utilities.
rin.internal.debug = {
    // Check if the given expression is true and log if not.
    assert: function (expr, message) {
        if (!expr) {
            this.write(message || "assert failed");
            //debugger;
        }
    },
    debugWriteElement: null,

    // Log any message to the default log.
    write: function (info) {
        if (this.debugWriteElement && this.debugWriteElement.innerHTML) {
            rin.util.assignAsInnerHTMLUnsafe(this.debugWriteElement, info + "<br/>" + this.debugWriteElement.innerHTML);
        }
        if (typeof (console) != "undefined" && console && console.log) console.log(info);
    }
};

// prototype changes
if (!String.prototype.rinFormat) {
    String.prototype.rinFormat = function () {
        var args = arguments; // arguments[0].constructor == Array ? arguments[0] : arguments; //todo: make it robust
        return this.replace(/\{(\d+)\}/g, function (matchedPattern, matchedValue) {
            return args[parseInt(matchedValue)];
        });
    };
}

//todo: For creating our own Array like class, consider using below mechanism based on articles like http://dean.edwards.name/weblog/2006/11/hooray/ and http://perfectionkills.com/how-ecmascript-5-still-does-not-allow-to-subclass-an-array/
/*    var iframe = document.createElement("iframe");
iframe.style.display = "none";
document.body.appendChild(iframe);
frames[frames.length - 1].document.write("<script>parent.rin.internal.List = Array;<\/script>");
*/

// List object with many utility functions over a native array. Inherited from Array.
rin.internal.List = function () {
    if (arguments && arguments.length > 0) Array.prototype.push.apply(this, Array.prototype.slice.call(arguments, 0));
};
rin.internal.List.prototype = new Array;

// Get the last element of the list or null.
rin.internal.List.prototype.lastOrDefault = function (predicate) {
    for (var i = this.length - 1; i >= 0; i--) if (!predicate || predicate(this[i])) return this[i]; return null;
};

// Get the first element of the list or null.
rin.internal.List.prototype.firstOrDefault = function (predicate) {
    for (var i = 0, len = this.length; i < len; i++) if (!predicate || predicate(this[i])) return this[i]; return null;
};

// Returns true if any of the elements satisfies the predicate fuction.
rin.internal.List.prototype.any = function (predicate) {
    for (var i = 0, len = this.length; i < len; i++) if (!predicate || predicate(this[i])) return true; return false;
};

// Returns the index of the first item which satisfies the predicate function. Or returns null.
rin.internal.List.prototype.firstOrDefaultIndex = function (predicate) {
    for (var i = 0, len = this.length; i < len; i++) if (!predicate || predicate(this[i])) return i; return -1;
};

// Returns a new List with all the elements transformed as defined by the predicate.
rin.internal.List.prototype.select = function (predicate) {
    var out = new rin.internal.List(); for (var i = 0, len = this.length; i < len; i++) out.push(predicate(this[i])); return out;
};

// Calls the predicate function once with each item in the list.
rin.internal.List.prototype.foreach = function (predicate, context) {
    for (var i = 0, len = this.length; i < len; i++) predicate.call(context || this, this[i], i);
};

// Checks if the object specified is present in the list.
rin.internal.List.prototype.contains = function (obj) {
    return this.indexOf(obj) >= 0;
};

// Returns a new List with items except the ones in the array passed in.
rin.internal.List.prototype.except = function (items) {
    rin.internal.debug.assert(items.constructor == Array, "Non array is passed in except method");
    var temp = {}; var out = new rin.internal.List();
    for (var i = 0, len = items.length; i < len; i++) temp[rin.util.getUniqueIdIfObject(items[i])] = true;
    for (var i = 0, len = this.length; i < len; i++) if (!temp[rin.util.getUniqueIdIfObject(this[i])]) out.push(this[i]);
    return out;
};

// Returns a list of all distinct items in the list.
rin.internal.List.prototype.distinct = function () {
    var temp = {}; var out = new rin.internal.List();
    for (var i = 0, len = this.length; i < len; i++) {
        var item = this[i];
        var id = rin.util.getUniqueIdIfObject(item);
        if (!temp[id]) out.push(item);
        temp[id] = true;
    };
    return out;
};

// Defines an indexOf method in the List if Array implementation does not have it.
if (!rin.internal.List.prototype.indexOf) {
    rin.internal.debug.assert(false, "Array List has no indexOf");
    rin.internal.List.prototype.indexOf = function (obj) { for (var i = 0, len = this.length; i < len; i++) if (this[i] == obj) return i; return -1; }
};

// Filter a list and returns all elements satisfying the predicate condition.
rin.internal.List.prototype.filter = function (predicate) { var out = new rin.internal.List(); for (var i = 0, len = this.length; i < len; i++) if (predicate(this[i])) out.push(this[i]); return out; }

// Filter a list and returns all elements satisfying the predicate condition.
rin.internal.List.prototype.where = rin.internal.List.prototype.filter;

// Combine two lists to one.
rin.internal.List.prototype.concat = function (arr) { var out = new rin.internal.List(); Array.prototype.push.apply(out, this); Array.prototype.push.apply(out, arr); return out; }

// Remove the item form the list.
rin.internal.List.prototype.remove = function (item) {
    var index = this.indexOf(item);
    if (index >= 0) this.splice(index, 1);
    return this;
};

// Get the highest value from the list.
rin.internal.List.prototype.max = function (predicate) {
    var max = this.length > 0 ? predicate(this[0]) : NaN;
    var maxItem = this.length > 0 ? this[0] : null;
    for (var i = 1, len = this.length; i < len; i++) {
        var val = predicate(this[i]);
        if (val > max) { max = val; maxItem = this[i]; }
    }
    return maxItem;
};

// Class to maintain a timespan.
rin.internal.TimeSpan = function (timeSpanMilliSeconds) {
    this._currentTimeSpanMs = timeSpanMilliSeconds || 0;
};

rin.internal.TimeSpan.prototype = {
    // Add 'timespan' to existing timespan.
    add: function (timeSpan) {
        this._currentTimeSpan += timeSpan;
    },

    // Add 'timespan' from existing timespan.
    reduce: function (timeSpan) {
        this._currentTimeSpan -= timeSpan;
    },

    // Checks if 'timespan' is equal to this timespan.
    equals: function (timeSpan) { return timeSpan._currentTimeSpan == this._currentTimeSpan },

    // Returns the value of this timespan.
    valueOf: function () { return this._currentTimeSpan; },

    _currentTimeSpan: 0
};

// A timespan with zero milliseconds.
rin.internal.TimeSpan.zero = new rin.internal.TimeSpan();

// Timer for making callbacks at defined time period. Supports pause/resume.
rin.internal.Timer = function () { };

rin.internal.Timer.prototype = {
    // Default timer interval.
    intervalSeconds: 1,
    tick: null,
    data: null,
    // Start the timer.
    start: function () {
        this.stop();
        var self = this;
        this.timerId = setTimeout(function () { self._onTick() }, this.intervalSeconds * 1000);
        this._isRunnning = true;
    },
    // Stop the timer.
    stop: function () {
        if (this.timerId) clearTimeout(this.timerId);
        this._isRunnning = false;
    },
    // Check if the timer is running.
    getIsRunning: function () { return this._isRunnning; },
    timerId: -1,
    _isRunnning: false,
    _onTick: function () {
        if (this.tick) this.tick();
        this.start();
    }
};

// Start the timer with a defined interval and callback.
rin.internal.Timer.startTimer = function (intervalSeconds, tick, data) {
    var timer = new rin.internal.Timer();
    timer.intervalSeconds = intervalSeconds || timer.intervalSeconds;
    timer.tick = tick;
    timer.data = data;
    timer.start();
};

// Stopwatch implementation for maintaining elapsed times.
rin.internal.StopWatch = function () { };

rin.internal.StopWatch.prototype = {
    // Check if the stopwatch is running.
    getIsRunning: function () { return this._isRunning; },
    // Get the total number of seconds the stopwatch was running till now.
    getElapsedSeconds: function () {
        return this._isRunning ? (Date.now() / 1000 - this._startingOffset) + this._elapsedOffset : this._elapsedOffset;
    },
    // Reset the stopwatch.
    reset: function () {
        this._isRunning = false;
        this._startingOffset = 0;
        this._elapsedOffset = 0;
    },
    // Start or resume the stopwatch.
    start: function () {
        this._startingOffset = Date.now() / 1000;
        this._isRunning = true;
    },
    // Stop/Pause the stopwatch.
    stop: function () {
        if (this._isRunning) this._elapsedOffset = this.getElapsedSeconds();
        this._isRunning = false;
    },
    // Add time to the total elapsed seconds of the stopwatch.
    addElapsed: function (offsetSeconds) {
        this._elapsedOffset += offsetSeconds;
    },
    _isRunning: false,
    _startingOffset: 0,
    _elapsedOffset: 0
};

// Class for animating any number or an object with numeric properties from a start value to an end value.
rin.internal.DoubleAnimation = function (duration, from, to) {
    this.duration = duration || this.duration; this.from = from; this.to = to; this.keyframe = null;
    rin.internal.debug.assert(this.duration >= 0);
    if (typeof from == "object" && typeof to == "object") {
        this.keyframe = {};
        for (var prop in from) {
            if (from.hasOwnProperty(prop) && typeof from[prop] == "number") this.keyframe[prop] = from[prop];
        }
    }
};
rin.internal.DoubleAnimation.prototype = {
    // Default values.
    duration: 1,
    from: 0,
    to: 1,
    keyframe: null,
    // Start the animation.
    begin: function () {
        this._startingOffset = Date.now() / 1000;
    },
    // Stop the animation prematurely.
    stop: function () {
        var offset = Date.now() / 1000 - this._startingOffset;
        this._startingOffset = -1;
        this._endingValue = this.keyframe ? this._interpolateKeyframe(offset) : this._interpolateValue(offset, this.from, this.to);
    },
    // Get the current value of the animated values.
    getCurrentValue: function () {
        if (this._startingOffset == 0) return this.from;
        if (this._startingOffset < 0) return this._endingValue;
        if (this.duration == 0) return this.to;

        var offset = Date.now() / 1000 - this._startingOffset;
        if (offset >= this.duration) {
            this.stop();
            return this._endingValue;
        }

        return this.keyframe ? this._interpolateKeyframe(offset) : this._interpolateValue(offset, this.from, this.to);
    },
    // Get the the animated values at given time.
    getValueAt: function (offset) {
        if (offset <= 0) return this.from;
        if (this.duration == 0 || offset >= this.duration) return this.to;

        return this.keyframe ? this._interpolateKeyframe(offset) : this._interpolateValue(offset, this.from, this.to);
    },
    // Check if the animation is running.
    isRunning: function () {
        return this._startingOffset >= 0;
    },
    _interpolateKeyframe: function (offset) {
        for (var prop in this.keyframe) {
            this.keyframe[prop] = this._interpolateValue(offset, this.from[prop], this.to[prop]);
        }
        return this.keyframe;
    },
    _interpolateValue: function (offset, from, to) {
        return from + (to - from) * offset / this.duration;
    },
    _startingOffset: 0,
    _endingValue: 0
};

// Storyboard to host animations.
rin.internal.Storyboard = function (doubleAnimation, onAnimate, onCompleted) {
    this._doubleAnimation = doubleAnimation; this.onAnimate = onAnimate;
    // Callback method which will be called at the end of the storyboard.
    this.onCompleted = onCompleted;
};

rin.internal.Storyboard.prototype = {
    // Callback method which will be called at the end of the storyboard.
    onCompleted: null,
    // Callback method which will be called at every frame of the storyboard with the updated values.
    onAnimate: null,
    // Start the storyboard.
    begin: function () {
        if (!this._doubleAnimation) throw new Error("No animation is specified.");
        this._doubleAnimation.begin();
        this._animate();
    },
    // Stop the storyboard.
    stop: function () {
        this._stopFlag = true;
        if (this._doubleAnimation) this._doubleAnimation.stop();
    },

    _animate: function () {
        if (this._stopFlag === false) {
            var val = this._doubleAnimation.getCurrentValue();

            if (typeof this.onAnimate == "function") this.onAnimate(val);

            if (!this._doubleAnimation.isRunning()) { // animation ended without stop being called
                this._stopFlag = true;
                if (typeof this.onCompleted == "function") this.onCompleted();
                return; // end animation loop
            }

            // Use rin shim for redraw callbacks.
            rin.internal.requestAnimFrame(this._animate.bind(this));
        }
    },
    _stopFlag: false,
    _doubleAnimation: null
};

// Basic implementation of promise pattern.
rin.internal.Promise = function (context) {
    "use strict";
    var callContext = context || this,
        self = this,
        onFailure = null,
        onComplete = null,
        nextPromise = null,
        promiseStates = {
            notStarted: "notStarted",
            completed: "completed",
            failed: "failed"
        },
        currentState = promiseStates.notStarted,
        moveToState = function (targetState, data) {
            switch (targetState) {
                case promiseStates.completed:
                    currentState = targetState;
                    if (typeof onComplete === 'function') {
                        var evalutedPromise = onComplete.call(callContext, data);
                        if (evalutedPromise && evalutedPromise instanceof rin.internal.Promise) {
                            evalutedPromise._setNextPromise(nextPromise);
                        } else {
                            if (nextPromise) {
                                nextPromise.markSuccess(data);
                            }
                        }
                    } else {
                        if (nextPromise) {
                            nextPromise.markSuccess(data);
                        }
                    }
                    return;
                case promiseStates.failed:
                    self.currentState = targetState;
                    if (typeof onFailure === 'function') {
                        onFailure.call(callContext, data);
                    }
                    if (nextPromise) {
                        nextPromise.markFailed(data);
                    }
                    return;
                case promiseStates.notStarted:
                    throw new Error("Invalid state transition: Cannot set the state to not-started");
            }
        };

    // Method which will be called after a promise has been satisfied.
    this.then = function (completed, failed) {
        if (completed instanceof rin.internal.Promise) {
            return completed;
        }
        if (!onComplete && !onFailure) {
            onComplete = completed;
            onFailure = failed;
        } else {
            if (!nextPromise) {
                nextPromise = new rin.internal.Promise(callContext);
            }
            nextPromise.then(completed, failed);
        }
        if (currentState === promiseStates.completed) {
            moveToState(promiseStates.completed);
        } else if (currentState === promiseStates.failed) {
            moveToState(promiseStates.failed);
        }
        return self;
    };

    //(Private) Method to set the next sequence of promises
    //Usage in external methods leads to indeterminate output
    this._setNextPromise = function (promise) {
        if (promise instanceof rin.internal.Promise) {
            if (!nextPromise) {
                nextPromise = promise;
            } else {
                nextPromise._setNextPromise(promise);
            }
        } else if (promise !== null && promise !== undefined) {
            throw new Error("parameter is not of type promise");
        }
        return self;
    };

    // Mark the promise as a success.
    this.markSuccess = function (data) {
        if (currentState === promiseStates.notStarted)
            moveToState(promiseStates.completed, data);
    };
    // Mark the promise as a failure.
    this.markFailed = function (error) {
        if (currentState === promiseStates.notStarted)
            moveToState(promiseStates.failed, error);
    };
};

// Module for deffered loading of resources to RIN.
rin.internal.DeferredLoader = function (refWindow) {
    "use strict";
    var head,
        body,
        browser,
        win = refWindow || window,
        doc = win.document,
        CONST_CSS_TIMEOUT_MS = 10000,
        CONST_CSS_TIME_BETWEEN_POLLS_MS = 100,
        loadedResources = {},
        // Adds a node to the document - To Do Optimize this for cross-browser and Win 8 standards.
        addElement = function (element, referenceNode, referenceType) {
            var refChild = referenceNode || doc.lastChild;
            switch (referenceType) {
                case "before":
                    if (window.MSApp !== undefined && window.MSApp.execUnsafeLocalFunction) {
                        return window.MSApp.execUnsafeLocalFunction(function () {
                            doc.insertBefore(element, refChild);
                        });
                    } else {
                        doc.insertBefore(element, refChild);
                    }
                    break;
                default:
                    if (window.MSApp !== undefined && window.MSApp.execUnsafeLocalFunction) {
                        return window.MSApp.execUnsafeLocalFunction(function () {
                            refChild.parentNode.appendChild(element);
                        });
                    }
                    else {
                        refChild.parentNode.appendChild(element);
                    }
                    break;
            }
        },
        // Adds a node to the document.
        createAndAddElement = function (nodeName, attributes, referenceNode, referenceType) {
            var element = doc.createElement(nodeName),
                attrs = attributes || [],
                attributeName;
            for (attributeName in attrs) {
                if (attrs.hasOwnProperty(attributeName)) {
                    element.setAttribute(attributeName, attrs[attributeName]);
                }
            }
            addElement(element, referenceNode, referenceType);
            return element;
        },
        // Gets the first matching node by tag name or undefined.
        getFirstNodeByTagNameSafe = function (nodeName) {
            var nodes = doc.getElementsByTagName(nodeName);
            return nodes && (nodes.length > 0 ? nodes[0] : undefined);
        },
        // Gets the body node or undefined.
        getBodyNode = function () {
            body = body || doc.body || getFirstNodeByTagNameSafe("body");
            return body;
        },
        // Gets the head node or undefined.
        getHeadNode = function () {
            head = head || doc.head || getFirstNodeByTagNameSafe("head") || createAndAddElement("head", null, getBodyNode(), "before");
            return head;
        },
        // Initializes browser type object.
        getBrowser = function () {
            if (!browser) {
                var agent = win.navigator.userAgent;
                browser = {};
                (browser.chrome = (/AppleWebKit\//i.test(agent) && /Chrome/i.test(agent)))
                || (browser.webkit = /AppleWebKit\//i.test(agent))
                || (browser.win8 = window.MSApp)
                || (browser.ie10 = /MSIE 10/i.test(agent))
                || (browser.ie = /MSIE/i.test(agent))
                || (browser.other = true);
            }
            return browser;
        },
        // Gets the data specified in the Url.
        getSource = function (url, callback) {
            var xmlhttp, promise;
            if (loadedResources[url]) {
                return loadedResources[url].promise;
            }
            else {
                promise = new rin.internal.Promise();
                loadedResources[url] = { promise: promise };
                if (win.XMLHttpRequest) {
                    xmlhttp = new win.XMLHttpRequest();
                }
                else {
                    xmlhttp = new win.ActiveXObject("Microsoft.XMLHTTP");
                }
                xmlhttp.onreadystatechange = function () {
                    var data;
                    if (xmlhttp.readyState === 4) {
                        if (xmlhttp.status === 200) {
                            data = xmlhttp.responseText;
                            loadedResources[url].data = data;
                            if (typeof callback === 'function') {
                                callback(data);
                            }
                            promise.markSuccess(data);
                        } else {
                            data = xmlhttp.statusText;
                            loadedResources[url].data = data;
                            promise.markFailed(data);
                        }
                    }
                };
                xmlhttp.open("GET", url, true);
                xmlhttp.send(null);
            }
            return promise;
        },
        getDom = function (textData, mimeType) {
            var domParser = new win.DOMParser(),
                dom = domParser.parseFromString(textData, mimeType);
            return dom;
        },
        getHtmlDom = function (textData) {
            return rin.util.createElementWithHtml(textData).childNodes;
        },
        scriptReferenceNode = getHeadNode().lastChild,
        cssReferenceNode = scriptReferenceNode,
        htmlTemplateReferenceNode = scriptReferenceNode,
        getUrlType = function (url) {
            var type;
            if (/\.css$/i.test(url)) {
                type = "css";
            }
            else if (/\.js$/i.test(url)) {
                type = "script";
            }
            else if (/\.htm?$/i.test(url)) {
                type = "html";
            }
            else {
                type = "unknown";
            }
            return type;
        },
        // Checks of the style sheet is loaded.
        isStylesheetLoaded = function (cssRef) {
            var stylesheets = doc.styleSheets,
                i = stylesheets.length - 1;
            while (i >= 0 && stylesheets[i].href !== cssRef) {
                i -= 1;
            }
            return i >= 0;
        },
        // Poll to see if stylesheet is loaded.
        pollStyleSheetLoaded = function (node, promise, polledTime) {
            if (node.href && isStylesheetLoaded(node.href)) {
                if (promise instanceof rin.internal.Promise) { promise.markSuccess(); }
                return;
            }
            if ((polledTime || 0) >= CONST_CSS_TIMEOUT_MS) {
                if (promise instanceof rin.internal.Promise) { promise.markFailed(); }
                return;
            }
            win.setTimeout(function () { pollStyleSheetLoaded(node, promise, (polledTime || 0) + CONST_CSS_TIME_BETWEEN_POLLS_MS); }, CONST_CSS_TIME_BETWEEN_POLLS_MS);
        },
        // Sets the onload complete method for the node based on node name.
        initOnLoadComplete = function (node, promise) {
            getBrowser();
            if (browser.ie && node.nodeName.toLowerCase() === 'script') {
                node.onload = node.onreadystatechange = function () {
                    if (/loaded|complete/.test(node.readyState)) {
                        node.onload = node.onreadystatechange = null;
                        if (promise instanceof rin.internal.Promise) { promise.markSuccess(); }
                    }
                };
            }
            else if (browser.webkit && node.nodeName.toLowerCase() === 'link') {
                //Only safari doesn't fire onload event for CSS
                //We need to poll the style sheet length for this
                pollStyleSheetLoaded(node, promise);
            }
            else {
                node.onload = function () {
                    if (promise instanceof rin.internal.Promise) { promise.markSuccess(); }
                };
                node.onerror = function () {
                    if (promise instanceof rin.internal.Promise) { promise.markFailed(); }
                };
            }
        },
        // Loads a script by inserting script tag.
        loadScript = function (scriptSrc, checkerFunction) {
            var scriptNode, promise = new rin.internal.Promise(), isScriptLoaded = false;
            try {
                isScriptLoaded = checkerFunction != undefined && typeof checkerFunction === "function" && checkerFunction();
            }
            catch (e) {
                isScriptLoaded = false;
            }
            if (!isScriptLoaded) {
                scriptNode = createAndAddElement("script", { type: "text/javascript" }, scriptReferenceNode);
                initOnLoadComplete(scriptNode, promise);
                scriptNode.src = scriptSrc;
            }
            else {
                promise.markSuccess();
            }
            return promise;
        },
        // Loads a stylesheet by inserting link tag.
        loadCss = function (cssSrc) {
            var linkNode,
                promise = new rin.internal.Promise();
            if (!isStylesheetLoaded(cssSrc)) {
                linkNode = createAndAddElement("link", { rel: "stylesheet" }, cssReferenceNode);
                initOnLoadComplete(linkNode, promise);
                linkNode.href = cssSrc;
            }
            else {
                promise.markSuccess();
            }
            return promise;
        },
        // Loads a templated html and adds the template to the document.
        loadTemplateHtml = function (htmlSrc) {
            var promise = getSource(htmlSrc,
                            function (data) {
                                var domNodes = getHtmlDom(data), i,
                                    len = domNodes.length,
                                    nodeToAdd,
                                    referenceNode = htmlTemplateReferenceNode;
                                for (i = 0; i < len; i += 1) {
                                    //Loop through all the first-level tags
                                    nodeToAdd = domNodes[i];
                                    if (nodeToAdd && nodeToAdd.nodeType && nodeToAdd.nodeType === nodeToAdd.ELEMENT_NODE) {
                                        addElement(nodeToAdd, referenceNode);
                                        referenceNode = nodeToAdd; // The next node to be added should be after this
                                        i -= 1;
                                    }
                                }
                            });
            return promise;
        },
        // Loads any other type of resource and adds it to the loadedSources. To be used for resources other than script, css and templated html.
        loadOtherResource = function (src) {
            var promise = getSource(src);
            return promise;
        },
        // Loads any type of resource.
        loadResource = function (src) {
            var tempSource = src,
            url = src;
            if (typeof url === 'string') {
                url = { src: tempSource };
            }
            if (!url.type) {
                url.type = getUrlType(url.src);
            }
            switch (url.type.toLowerCase()) {
                case "script":
                    return loadScript(url.src, url.loadChecker);
                case "css":
                    return loadCss(url.src);
                case "html":
                    return loadTemplateHtml(url.src);
                default:
                    return loadOtherResource(url.src);
            }
        };

    // Loads the given url(s) in parallel. The promise returned would fire even if atleast one succeeds and others fail.
    this.parallelLoader = function (urls) {
        //To Do - optimize for urls in queue or already loaded
        var promise = new rin.internal.Promise(),
            sources = (urls instanceof Array ? urls : [urls]),
            sourcesLen = sources.length,
            callCount = sourcesLen,
            successCount = 0,
            i,
            callComplete = function () {
                callCount -= 1;
                if (callCount === 0) {
                    successCount > 0 ? promise.markSuccess() : promise.markFailed();
                }
            },
            onSuccess = function () {
                successCount += 1;
                callComplete();
            },
            onFailure = function () {
                callComplete();
            };
        for (i = 0; i < sourcesLen; i += 1) {
            loadResource(sources[i]).then(onSuccess, onFailure);
        }
        return promise;
    };
    // Loads the given url(s) in sequence. The promise returned would fire only if all succeeds.
    this.sequentialLoader = function (urls) {
        var sources = (urls instanceof Array ? urls.slice() : [urls]),
            currentSource,
            len = sources.length,
            promise,
            i;
        for (i = 0; i < len; i += 1) {
            currentSource = sources[i];
            if (promise) {
                promise.then(function () {
                    currentSource = sources.shift();
                    promise = loadResource(currentSource);
                    return promise;
                });
            }
            else {
                currentSource = sources.shift();
                promise = loadResource(currentSource);
            }
        }
        return promise;
    };
    this.otherResources = loadedResources;
    // Load all rin required resources and dependancies.
    this.loadSystemResources = function (systemRoot) {
        var self = this,
            func = function () {
                var promise;
                rin.internal.systemResourcesProcessed = rin.internal.systemResourcesProcessed || false;
                //To Do - Need to look at replacing these with some configuration and letting the ES developer to load his custom libraries.
                if (!rin.internal.systemResourcesProcessed) {
                    promise = self.parallelLoader([
                            { src: rin.util.combinePathElements(systemRoot, 'lib/jquery-1.7.2.min.js'), loadChecker: function () { return window.jQuery !== undefined; } },
                            { src: rin.util.combinePathElements(systemRoot, 'lib/knockout-2.1.0.js'), loadChecker: function () { return window.ko !== undefined; } }
                    ])
                            .then(function () {
                                return self.sequentialLoader([
                                    { src: rin.util.combinePathElements(systemRoot, 'lib/jquery.easing.1.3.js'), loadChecker: function () { return window.jQuery.easing["jswing"] !== undefined; } },
                                    { src: rin.util.combinePathElements(systemRoot, "lib/rin-experiences-1.0.js"), loadChecker: function () { return window.rin.internal.PlayerControllerES !== undefined; } }]);
                            }).then(function () {
                                rin.internal.systemResourcesProcessed = true;
                            });
                }
                else {
                    promise = new rin.internal.Promise(); //A dummy promise with success marked
                    promise.markSuccess();
                }
                return promise;
            };
        if (window.MSApp !== undefined && window.MSApp.execUnsafeLocalFunction) {
            return window.MSApp.execUnsafeLocalFunction(func);
        }
        return func();
    };
    // Load all theme specific resources.
    this.loadAllThemeResources = function (systemRoot) {
        var self = this,
            func = function () {
                return self.parallelLoader([
                rin.util.combinePathElements(systemRoot, 'rin.css'),
                rin.util.combinePathElements(systemRoot, 'rinTemplates.htm') 
                ]);
            };
        if (window.MSApp !== undefined && window.MSApp.execUnsafeLocalFunction) {
            return window.MSApp.execUnsafeLocalFunction(func);
        }
        return func();
    };
};﻿/// <reference path="Common.js"/>
/// <reference path="TaskTimer.js"/>
/// <reference path="../contracts/IExperienceStream.js" />

/*!
* RIN Core JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

window.rin = window.rin || {};
window.rin.internal = window.rin.internal || {};

// Class that describes an experienceStream with its metadata such as id, offsets, zIndex etc.
rin.internal.ESItem = function (id, esData, experienceStream, zIndex, beginOffset, endOffset, experienceStreamLayer) {
    this.id = id;
    this.esData = esData;
    this.experienceStream = experienceStream;
    this.beginOffset = beginOffset || 0;
    this.endOffset = endOffset || Infinity;
    this.experienceStreamLayer = experienceStreamLayer || rin.contracts.experienceStreamLayer.background;
    this.zIndex = zIndex || 0;
    this.providerId = "UnknownOrSystem";
}

rin.internal.ESItem.prototype = {
    id: "",
    esData: null,
    experienceStream: rin.contracts.IExperienceStream,
    beginOffset: 0,
    endOffset: 0,
    experienceStreamLayer: null,
    zIndex: 0,
    screenPlayInfo: null,
    _isLoadCalled: false,

    // string description used in event logs and in debugging.
    toString: function () {
        return "{0} ({1}:{2}-{3}:{4}) ES:{5}".rinFormat(this.id,
            this.beginOffset / 60, this.beginOffset % 60,
            this.endOffset / 60, this.endOffset % 60,
            this.experienceStream.state);
    }
};﻿/// <reference path="../contracts/DiscreteKeyframeESBase.js" />
/// <reference path="../contracts/IExperienceStream.js" />
/// <reference path="../contracts/IOrchestrator.js" />
/// <reference path="../core/Common.js" />
/// <reference path="../core/EventLogger.js" />
/// <reference path="../core/PlayerConfiguration.js" />
/// <reference path="../core/ResourcesResolver.js" />
/// <reference path="../core/TaskTimer.js" />
/// <reference path="../core/OrchestratorProxy.js" />

/*!
* RIN Core JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

window.rin = window.rin || {};
window.rin.internal = window.rin.internal || {};

// Class that manages list of ESItems in given screenPlayId. This class knows what to do when screenplay changes, when current experience streams change etc. 
// It calls preloader, stageAreaManager and orchestrator as needed.
rin.internal.ESItemsManager = function () {
    var self = this;
    this.esStateChangedEventHook = function (eventArgs) { self._onESStateChangedEvent(eventArgs) }; // a simple function that wraps _onESStateChangedEvent with "self" pointer.
    this._screenPlayInterpreterCache = {};
    this._esItemCache = {};
}

rin.internal.ESItemsManager.prototype = {
    _systemESItems: null,
    _orchestrator: null,
    _esTimerES: null,
    _screenPlayES: null,
    _currentESItems: null,
    _esItemCache: null,
    _screenPlayInterpreterCache: null,

    bufferingES: null,
    preloaderES: null,
    screenPlayInterpreter: null,

    esTimer: null,
    preloaderESItem: null,
    esStateChangedEventHook: null, //to be defined in constructor

    // Initialize the item manager and all its internal dependancies.
    initialize: function (rinData, orchestrator, screenPlayId) {
        this._orchestrator = orchestrator;
        this._getSystemESItems();

        if (this.screenPlayInterpreter == null) {
            this.screenPlayInterpreter = this._getScreenPlayInterpreter(screenPlayId || rinData.defaultScreenplayId, rinData.providers[rinData.screenplayProviderId]);
        }

        this.preloaderES.initialize(this._orchestrator, this._orchestrator.playerControl.stageControl, this.screenPlayInterpreter); //td

        this._currentESItems = new rin.internal.List();
        this.onCurrentExperienceStreamsChanged(this._systemESItems, null, this._systemESItems);
    },

    // Unload all ESes.
    unload: function () {
        if (this._currentESItems && this._currentESItems !== null) {
            this._currentESItems.foreach(function (item) {
                item.experienceStream.stateChangedEvent.unsubscribe(this.esStateChangedEventHook)
            }, this);
        }

        if (this.screenPlayInterpreter && this.screenPlayInterpreter !== null) {
            this.screenPlayInterpreter.getESItems().foreach(function (item) {
                if (this._orchestrator.isExperienceStreamLoaded(item.id))
                    item.experienceStream.unload();
            }, this);
        }

        this._systemESItems.foreach(function (item) {
            if (typeof (item.experienceStream.unload) == "function") item.experienceStream.unload();
        });
    },

    // Switches hypertimeline from current screenPlayId to new screenPlayId
    switchHyperTimeline: function (screenPlayId) {
        if (!this.screenPlayInterpreter && this.screenPlayInterpreter.id == screenPlayId) return; // we are in target screenplay already
        if (!this._orchestrator.isValidScreenPlayId(screenPlayId)) return;

        this.screenPlayInterpreter = this._getScreenPlayInterpreter(screenPlayId);

        var narrativeInfo = this._orchestrator.getNarrativeInfo();
        if (this._orchestrator.isDefaultScreenPlayId(screenPlayId)) {
            narrativeInfo.totalDuration = narrativeInfo.narrativeData.estimatedDuration;
        }
        else {
            narrativeInfo.totalDuration = this.screenPlayInterpreter.getEndTime();
        }

        this._esTimerES.load();
        this.preloaderES.updateScreenPlay(this.screenPlayInterpreter);

    },

    // Creates a new ESItem for given provider info, esData & orchestratorProxy, by calling esFactory or by returning a cached instance.
    createESItem: function (providerName, providerVersion, esData, proxy) {
        var esId = esData.id;
        var esItem = this._esItemCache[esId];
        if (esItem) return esItem;

        var factoryFunction = this._getFactory(providerName, providerVersion);
        rin.internal.debug.assert(factoryFunction != null, "could not find factory function");

        if (factoryFunction) {
            esItem = new rin.internal.ESItem(esId, esData);
            var orchestratorProxy = proxy || new rin.internal.OrchestratorProxy(this._orchestrator);
            esItem.experienceStream = factoryFunction(orchestratorProxy, esData);
            rin.internal.debug.assert(esItem.experienceStream != null, "ES Item has no ES");
            orchestratorProxy.init(esItem.experienceStream);
            this._esItemCache[esId] = esItem;
            return esItem;
        };
        rin.internal.debug.assert(false, "Could not create required ES");
        return null;
    },

    // Returns list of ESItems staged at current time
    getCurrentESItems: function () {
        return this._currentESItems;
    },

    // Returns true if all current ESItems are in ready or error state.
    areAllESsReady: function () {
        return !this.getCurrentESItems().firstOrDefault(function (es) { return es.experienceStream.getState() == rin.contracts.experienceStreamState.buffering });
    },

    // Updates current ESs list to match the provided offset.
    updateCurrentESs: function (offset, previousTimeOffset) {
        var currentList = this.getCurrentESItems();
        var newList = this.screenPlayInterpreter.getESItems(offset).concat(this._systemESItems);
        var addedItems = newList.except(currentList);
        var removedItems = currentList.except(newList);

        this.onCurrentExperienceStreamsChanged(addedItems, removedItems, newList, true, previousTimeOffset);
    },

    // Method called when the list of ESes on screen changes.
    onCurrentExperienceStreamsChanged: function (addedItems, removedItems, currentList, isSeek, previousTimeOffset) {
        this._currentESItems = currentList;
        this._orchestrator.stageAreaManager.onCurrentExperienceStreamsChanged(addedItems, removedItems, currentList, isSeek);
        this._orchestrator.eventLogger.logEvent("");

        var wereItemsAdded = (addedItems && addedItems.constructor == Array && addedItems.length > 0);
        var wereItemsRemoved = (removedItems && removedItems.constructor == Array && removedItems.length > 0);
        var self = this;

        // Manage all newly added items.
        if (wereItemsAdded) {
            for (var i = 0, len = addedItems.length; i < len; i++) {
                if (removedItems && removedItems.any(function (item) { return item.experienceStream == addedItems[i].experienceStream })) continue; // These are in removed items also, so skip instead of re-adding.

                var item = addedItems[i];
                item.experienceStream.stateChangedEvent.subscribe(this.esStateChangedEventHook, "ESItemsManager");

                this._setNewlyAddedState(item);
                if (typeof (item.experienceStream.addedToStage) == "function")
                    item.experienceStream.addedToStage();

                var currentTime = this._orchestrator.getCurrentLogicalTimeOffset();
                var epsilon = 0.1;
                rin.internal.debug.assert((currentTime + epsilon) >= item.beginOffset && (currentTime - epsilon) <= item.endOffset, "item added to stage beyond its life time");
                this._orchestrator.eventLogger.logEvent("ES {0} added at {1} time scheduled {2}", item.id,
                     currentTime, item.beginOffset);
            }
        }
        // Managed any items removed recently.
        if (wereItemsRemoved) {
            for (var i = 0, len = removedItems.length; i < len; i++) {
                if (addedItems && addedItems.any(function (item) { return item.experienceStream == removedItems[i].experienceStream })) continue; // No need to remove because it is there for re-add

                var item = removedItems[i];
                item.experienceStream.stateChangedEvent.unsubscribe("ESItemsManager");
                
                item.experienceStream.pause(this._orchestrator._getESItemRelativeOffset(item, previousTimeOffset));

                if (typeof (item.experienceStream.removedFromStage) == "function")
                    item.experienceStream.removedFromStage();

                this._orchestrator.eventLogger.logEvent("ES {0} removed at {1} time scheduled {2}", item.id,
                    this._orchestrator.getCurrentLogicalTimeOffset(), item.endOffset);
            }
        }

        // If there were any items added or removed, check for ES status and show buffering ES if necessary.
        if (wereItemsAdded || wereItemsRemoved) this._checkESStatusesAsync();
    },

    // Executed just before a screenplay comes to an end.
    onBeforeScreenPlayEnd: function () {
        var propertyTable = this._orchestrator.getScreenPlayPropertyTable(null);

        var endAction = propertyTable ? propertyTable["endActionUrl"] : null;
        if (endAction && endAction["beforeEndAction"] == "pause")
            this._orchestrator.pause();
    },

    // Executed while screenplay has just come to an end.
    onScreenPlayEnding: function () {
        var propertyTable = this._orchestrator.getScreenPlayPropertyTable(null);

        var endAction = propertyTable ? propertyTable["endActionUrl"] : null;
        var url = endAction ? endAction["endActionUrl"] : null;

        if (url) {
            this._orchestrator.seekUrl(url);
            return true;
        }
        else if (!this._orchestrator.isDefaultScreenPlayId(this.screenPlayInterpreter.id)) {
            this._orchestrator.play(0, this._orchestrator.getSegmentInfo().defaultScreenplayId);
            return true;
        }
        return false;
    },

    // Executed when the screenplay has ended.
    onScreenPlayEnded: function () {
        var configuration = this._orchestrator.playerConfiguration;
        if (configuration.loop) {
            this._orchestrator.play(0);
        }
        else if (configuration.playerMode !== rin.contracts.playerMode.AuthorerEditor && configuration.playerMode !== rin.contracts.playerMode.AuthorerPreview) {
            this._orchestrator.pause(0);
        }
        else {
            this._orchestrator.pause();
        }
    },

    _getScreenPlayInterpreter: function (screenPlayId, screenplayProviderInfo) {
        var screenPlayInterpreter = this._screenPlayInterpreterCache[screenPlayId];
        if (!screenPlayInterpreter) {
            rin.internal.debug.assert(screenplayProviderInfo, "Screenplay Provider not found");
            screenPlayInterpreter = new rin.internal.DefaultScreenPlayInterpreter(); //V2 need to instantiate the provider based on provider info
            var segmentInfo = this._orchestrator.getSegmentInfo();
            if (segmentInfo.screenplays[screenPlayId]) {
                screenPlayInterpreter.initialize(screenPlayId, segmentInfo, this._orchestrator);
            } else {
                rin.internal.debug.write("Unable to find the screenplay with id " + screenPlayId);
            }
            this._screenPlayInterpreterCache[screenPlayId] = screenPlayInterpreter;
        }
        return screenPlayInterpreter;
    },

    _setNewlyAddedState: function (addedES) {
        this.screenPlayInterpreter.setScreenPlayAttributes(addedES);

        var playerState = this._orchestrator.getPlayerState();
        if (playerState != rin.contracts.playerState.inTransition) {
            var actionDebugInfo = "none";
            switch (playerState) {
                case rin.contracts.playerState.pausedForBuffering:
                case rin.contracts.playerState.pausedForExplore:
                    var relativeOffset = this._orchestrator._getESItemRelativeOffset(addedES);
                    addedES.experienceStream.pause(relativeOffset);
                    actionDebugInfo = "paused";
                    break;

                case rin.contracts.playerState.playing:
                    var esState = addedES.experienceStream.getState();

                    if (esState == rin.contracts.experienceStreamState.ready) {
                        var relativeOffset = this._orchestrator._getESItemRelativeOffset(addedES);
                        addedES.experienceStream.play(relativeOffset);
                        actionDebugInfo = "played";
                    }
                    else if (esState == rin.contracts.experienceStreamState.buffering) {
                        this._orchestrator._pauseForBuffering();
                        actionDebugInfo = "narrative paused";
                    }
                    break;
                case rin.contracts.playerState.stopped:
                    break;

                default:
                    rin.internal.debug.assert(false, "Unknown player state encountered");
                    break;
            }
        }
        this._orchestrator.eventLogger.logEvent("ES {0} added action: {1}", addedES.id, actionDebugInfo);
    },

    _onESStateChangedEvent: function (esStateChangedEventArgs) {
        if (esStateChangedEventArgs.toState == rin.contracts.experienceStreamState.error) {
            this._orchestrator.eventLogger.logErrorEvent("!!!!!ES {0} went to error state.".rinFormat(esStateChangedEventArgs.source));
        }
        this._checkESStatusesAsync();
    },
    _checkESStatusesAsync: function () {
        var self = this;
        setTimeout(function () { self._checkESStatuses() }, 20);
    },
    _checkESStatuses: function () {
        var areAllESReady = this.areAllESsReady();
        this._orchestrator.setIsPlayerReady(areAllESReady);

        var playerState = this._orchestrator.getPlayerState();
        if (playerState == rin.contracts.playerState.pausedForExplore
        || playerState == rin.contracts.playerState.stopped) return;

        if (areAllESReady && this._orchestrator.goalPlayerState == rin.contracts.playerState.playing
        && playerState != rin.contracts.playerState.playing) {
            this._orchestrator.play();
        }

        if (!areAllESReady && playerState == rin.contracts.playerState.playing) {
            this._orchestrator._pauseForBuffering();
        }
    },

    _getSystemESItems: function () {
        this._systemESItems = new rin.internal.List();

        //todo: player controller es

        if (!this.bufferingES) {
            this.bufferingES = new rin.internal.DefaultBufferingES(this._orchestrator);
        }

        var bufferingESItem = new rin.internal.ESItem("BufferingES", null, this.bufferingES, 100001);
        this._systemESItems.push(bufferingESItem);

        if (!this.preloaderES) {
            this.preloaderES = new rin.internal.DefaultPreloaderES();
        }
        this.preloaderESItem = new rin.internal.ESItem("PreloaderES", null, this.preloaderES);
        this._systemESItems.push(this.preloaderESItem);

        this._esTimerES = new rin.internal.ESTimerES(this._orchestrator, this);
        this.esTimer = this._esTimerES.esTimer;
        var esTimerItem = new rin.internal.ESItem("ESTimerES", null, this._esTimerES);
        this._systemESItems.push(esTimerItem);

        if (this._orchestrator.playerConfiguration.playerControllerES && !this._orchestrator.playerConfiguration.hideAllControllers && !this._orchestrator.playerConfiguration.hideDefaultController) {
            var controllerItem = new rin.internal.ESItem("PlayerController", null, this._orchestrator.playerConfiguration.playerControllerES);
            this._systemESItems.push(controllerItem);
        }

    },

    _getFactory: function (providerTypeName, providerVersion) {
        return rin.ext.getFactory(rin.contracts.systemFactoryTypes.esFactory, providerTypeName, providerVersion);
    }


};﻿/// <reference path="Common.js"/>
/// <reference path="TaskTimer.js"/>
/// <reference path="ESItem.js"/>
/// <reference path="../contracts/IExperienceStream.js"/>
/// <reference path="../contracts/IOrchestrator.js"/>
/// <reference path="ScreenPlayInterpreter.js"/>
/// <reference path="Orchestrator.js"/>
/// <reference path="ESItemsManager.js"/>
/// <reference path="EventLogger.js"/>

/*!
* RIN Core JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

window.rin = window.rin || {};
window.rin.internal = window.rin.internal || {};

// Timer implementation for maintaining the narrative timeline.
rin.internal.ESTimer = function (orchestrator, esItemsManager) {
    this._orchestrator = orchestrator;
    this._esItemsManager = esItemsManager;
    this.taskTimer = new rin.internal.TaskTimer(); // Internal timer for triggering tasks at specific time intervals.
};

rin.internal.ESTimer.prototype = {
    taskTimer: null,
    // Load ES items from the current screenplay and initialize the timer.
    loadESItmes: function () {
        var esItems = this._esItemsManager.screenPlayInterpreter.getESItems();
        // Add item to task list.
        for (var i = 0; i < esItems.length; i++) {
            var item = esItems[i];
            this.taskTimer.add(item.beginOffset, new rin.internal.ESTimerItem(item, true));
            // Check for a valid end offset.
            if (item.endOffset != Infinity) this.taskTimer.add(item.endOffset, new rin.internal.ESTimerItem(item, false));
            this._orchestrator.eventLogger.logEvent("ESTimer: add item {0} for {1}-{2}", item.id, item.beginOffset, item.endOffset);
        }

        // Add end indicator. This will be trigered after the timeline is complete.
        var screenPlayEndTime = this._esItemsManager.screenPlayInterpreter.getEndTime();
        this.taskTimer.add(screenPlayEndTime, new rin.internal.ESTimerItem(this._endIndicatorItem, false));

        // This indicator will be triggered before triggering end indicator.
        var beforeEndTime = screenPlayEndTime - this._beforeEndNotificationTime;
        this.taskTimer.add(beforeEndTime, new rin.internal.ESTimerItem(this._beforeEndIndicatorItem, false));

        var self = this;
        this.taskTimer.taskTriggeredEvent.subscribe(function (triggeredItems) { self._taskTimer_taskTriggered(triggeredItems) });
    },

    // Method called every time a task is triggered by the timer.
    _taskTimer_taskTriggered: function (triggeredItems) {
        var addedESItems = new rin.internal.List();
        var removedESItems = new rin.internal.List();

        // Check all triggered items and update addedItems and removedItems list.
        for (var i = 0, len = triggeredItems.length; i < len; i++) {
            var item = triggeredItems[i];
            if (item.isEntry) {
                addedESItems.push(item.esItem);
                this._orchestrator.eventLogger.logEvent("ESTimer Trigger Add: {0} at {1} scheduled {2}", item.esItem.id, this.taskTimer.getCurrentTimeOffset(), item.esItem.beginOffset);
            }
            else {
                removedESItems.push(item.esItem);
                this._orchestrator.eventLogger.logEvent("ESTimer Trigger Rem: {0} at {1} scheduled {2}", item.esItem.id, this.taskTimer.getCurrentTimeOffset(), item.esItem.beginOffset);
            }
        }

        var currentESItems = this._esItemsManager.getCurrentESItems();
        var newESItems = addedESItems.concat(currentESItems).distinct().except(removedESItems);

        // Make sure indicator items are not removed.
        if (removedESItems.contains(this._beforeEndIndicatorItem)) {
            this._esItemsManager.onBeforeScreenPlayEnd();
            removedESItems.remove(this._beforeEndIndicatorItem);
        }

        if (addedESItems.length == 0 && removedESItems.length == 0) return; //No changes, quit early.

        // Check if the task is an end indicator.
        var isScreenPlayEnding = removedESItems.contains(this._endIndicatorItem);
        if (isScreenPlayEnding) {
            removedESItems.remove(this._endIndicatorItem);
            var handled = this._esItemsManager.onScreenPlayEnding();
            if (handled) return;
        }

        // Raise ES list changed event.
        this._esItemsManager.onCurrentExperienceStreamsChanged(addedESItems, removedESItems, newESItems, false);
        this._orchestrator._seekESItems(addedESItems, this._orchestrator.getCurrentLogicalTimeOffset());

        if (isScreenPlayEnding) {
            this._esItemsManager.onScreenPlayEnded();
        }
    },
    _esItemsManager: null, //new rin.internal.ESItemsManager(), 
    _orchestrator: null, //new rin.internal.Orchestrator()
    _beforeEndIndicatorItem: new rin.internal.ESItem("BeforeEndIndicatorItem"),
    _endIndicatorItem: new rin.internal.ESItem("EndIndicatorItem"),
    _beforeEndNotificationTime: 0.5
};

// Format for a timer item to be stored in the task timer.
rin.internal.ESTimerItem = function (esItem, isEntry) {
    this.esItem = esItem; this.isEntry = isEntry;
};﻿/// <reference path="Common.js"/>

/*!
* RIN Core JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

window.rin = window.rin || {};
window.rin.internal = window.rin.internal || {};

rin.internal.EventLogger = function () { }

rin.internal.EventLogger.prototype = {
    logEvent: function (eventInfoFormat, params) {
        var eventInfo = this.formatString(arguments);
        rin.internal.debug.write(eventInfo);
    },

    logErrorEvent: function (eventInfoFormat, params) {
        var eventInfo = this.formatString(arguments);
        rin.internal.debug.write(eventInfo);
    },

    logBeginEvent: function (eventName, eventInfoFormat, params) {
        rin.internal.debug.write("Begin: " + eventName);
        return { begin: Date.now(), name: eventName };
    },

    logEndEvent: function (beginEventToken, eventInfoFormat, params) {
        var eventDuration = Date.now() / 1000 - beginEventToken.begin;
        rin.internal.debug.write("End event {0}. Duration {1}. Info {2}".rinFormat(beginEventToken.name, eventDuration, eventInfoFormat));
    },

    toString: function () {
    },

    _getIndent: function () {
    },

    formatString: function (argsArray, textParamIndex) {
        textParamIndex = textParamIndex || 0;
        var text = argsArray[textParamIndex];
        return text.replace(/\{(\d+)\}/g, function (matchedPattern, matchedValue) {
            return argsArray[parseInt(matchedValue) + textParamIndex + 1];
        });
    },
    _indentLevel: 0,
    _logBuilder: "",
    _errorLogBuilder: ""
};
﻿/// <reference path="Common.js"/>
/// <reference path="TaskTimer.js"/>
/// <reference path="ESItem.js"/>
/// <reference path="../contracts/IExperienceStream.js" />
/// <reference path="../contracts/IOrchestrator.js" />
/// <reference path="ScreenPlayInterpreter.js"/>
/// <reference path="EventLogger.js"/>
/// <reference path="../core/PlayerConfiguration.js"/>
/// <reference path="../core/PlayerControl.js"/>
/// <reference path="../core/ResourcesResolver.js"/>
/// <reference path="StageAreaManager.js"/>

/*!
* RIN Core JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

window.rin = window.rin || {};
window.rin.internal = window.rin.internal || {};

// Orchestrator controls the entire narrative like play/pause/seek etc. It acts as a mediator for many communications. Its the backbone of a narrative.
rin.internal.Orchestrator = function (playerControl, playerConfiguration) {
    this.playerStateChangedEvent = new rin.contracts.Event(); // Raised when the player state changes. Bufferring/Playing/Error etc..
    this.isPlayerReadyChangedEvent = new rin.contracts.Event(); // Raised when player ready state is toggled.
    this.narrativeLoadedEvent = new rin.contracts.Event();
    this.narrativeSeekedEvent = new rin.contracts.Event();
    this.playerESEvent = new rin.contracts.Event(); // Player ES events is a generic set of events which can be used for custom purposes like ES to ES communication.

    this.playerControl = playerControl;
    this.playerConfiguration = playerConfiguration;
    this._resourcesResolver = new rin.internal.ResourcesResolver(playerConfiguration);
    this._esLoadedInfo = {};

    this.stageAreaManager = new rin.internal.StageAreaManager(this, playerControl.stageControl);
    this.eventLogger = new rin.internal.EventLogger();
};


rin.internal.Orchestrator.prototype = {
    // Gets an instance of the resource resolver.
    getResourceResolver: function () {
        return this._resourcesResolver;
    },

    // Gets the narartive info object.
    getNarrativeInfo: function () {
        return this._narrativeInfo;
    },

    // Gets the segment info object.
    getSegmentInfo: function () {
        return this._rinData;
    },

    // Plays the narrative from the specified offset of the screenplay mentioned.
    play: function (offset, screenPlayId) {
        rin.internal.debug.assert(this._isNarrativeLoaded, "Narrative is not loaded");
        // Make sure narrative is loaded before executing play.
        if (!this._isNarrativeLoaded) {
            this._throwInvalidOperation("Invalid operation: Play should be called only after loading narrative.");
            return;
        }

        var playerState = this.getPlayerState();
        if (playerState == rin.contracts.playerState.inTransition) return;

        // Validate the offset.
        var previousTimeOffset = this.getCurrentLogicalTimeOffset();
        var isValidOffset = typeof (offset) == "number" && offset >= 0;
        offset = isValidOffset ? offset : previousTimeOffset;
        screenPlayId = screenPlayId || this.currentScreenPlayId;

        // Round off the offset to a delta to avoid minute seeks.
        var epsilon = .05;
        var isOffsetCurrentTime = offset && (Math.abs(previousTimeOffset - offset) < epsilon);
        var isCurrentScreenPlayId = this.currentScreenPlayId == screenPlayId;

        if (playerState == rin.contracts.playerState.playing && isOffsetCurrentTime && isCurrentScreenPlayId) return;

        var eventToken = this.eventLogger.logBeginEvent("play");

        // Set the state to transition for now as some ESes might take time to seek or load.
        this.setPlayerState(rin.contracts.playerState.inTransition);

        try {
            // Switch screenplays if the requested one is different than the one being played.
            if (!isCurrentScreenPlayId && this.isValidScreenPlayId(screenPlayId)) {
                this.switchHyperTimeline(screenPlayId);
            }

            // Seek all ESes to the offset.
            if (!isOffsetCurrentTime) {
                this.esItemsManager.esTimer.taskTimer.seek(offset);
                this.esItemsManager.updateCurrentESs(offset, previousTimeOffset);
            }

            // Play all ESes.
            if (this.esItemsManager.areAllESsReady()) {
                this._playCurrentESs(offset, screenPlayId);
            }
        }
        finally {
            // Wait for all ESes to be ready and set the state to playing. Set to buffering mode till then.
            this.goalPlayerState = rin.contracts.playerState.playing;
            if (!this.esItemsManager.areAllESsReady()) {
                if (this.getPlayerState() != rin.contracts.playerState.pausedForBuffering)
                    this._pauseForBuffering();

                this.setPlayerState(rin.contracts.playerState.pausedForBuffering);
            }
            else {
                this.setPlayerState(rin.contracts.playerState.playing);
            }
        }

        this.eventLogger.logEndEvent(eventToken);
    },

    // Pause the narrative at the given offset.
    pause: function (offset, screenPlayId) {
        rin.internal.debug.assert(this._isNarrativeLoaded, "Narrative is not loaded");
        if (!this._isNarrativeLoaded) {
            this._throwInvalidOperation("Invalid operation: Pause should be called only after loading narrative.");
            return;
        }

        var playerState = this.getPlayerState();
        if (playerState == rin.contracts.playerState.inTransition) return;

        // Validate offset.
        var previousTimeOffset = this.getCurrentLogicalTimeOffset();
        var isValidOffset = typeof (offset) == "number" && offset >= 0;
        offset = isValidOffset ? offset : previousTimeOffset;
        screenPlayId = screenPlayId || this.currentScreenPlayId;

        // Round off offset.
        var epsilon = .05;
        var isOffsetCurrentTime = offset && (Math.abs(previousTimeOffset - offset) < epsilon);
        var isCurrentScreenPlayId = this.currentScreenPlayId == screenPlayId;

        if (playerState == rin.contracts.playerState.pausedForExplore && isOffsetCurrentTime && isCurrentScreenPlayId) return;

        var eventToken = this.eventLogger.logBeginEvent("pause");
        // Set the state to transition for now as some ESes might take time to seek or load.
        this.setPlayerState(rin.contracts.playerState.inTransition);

        try {
            // Switch screenplay if necessary.
            if (!isCurrentScreenPlayId && this.isValidScreenPlayId(screenPlayId)) {
                this.switchHyperTimeline(screenPlayId);
            }

            // Seek to the offset.
            if (!isOffsetCurrentTime) {
                this.esItemsManager.esTimer.taskTimer.seek(offset);
                this.esItemsManager.updateCurrentESs(offset, previousTimeOffset);
            }

            // Pause all ESes.
            this._pauseCurrentESs(offset, screenPlayId);
        }
        finally {
            // Set player state to pause.
            this.setPlayerState(rin.contracts.playerState.pausedForExplore);
            this.goalPlayerState = rin.contracts.playerState.pausedForExplore;
        }
        this.eventLogger.logEndEvent(eventToken);
    },

    // Seek the narrative using a well defined url. This is used to share a link to a particular time or experience in the narrative.
    seekUrl: function (seekUrl) {
        var queryParams = rin.util.getQueryStringParams(seekUrl);

        // Load parameters from query string.
        var queryScreenPlayId = queryParams["screenPlayId"];
        var screenPlayId = this.isValidScreenPlayId(queryScreenPlayId) ? queryScreenPlayId : this._rinData.defaultScreenplayId;

        var seekTime = parseFloat(queryParams["seekTime"]) || 0;
        var action = queryParams["action"];

        if (action == "pause" || (!action && this.getPlayerState() == rin.contracts.playerState.pausedForExplore)) {
            this.pause(seekTime, screenPlayId);
        }
        else {
            this.play(seekTime, screenPlayId);
        }
        this.narrativeSeekedEvent.publish({ "seekTime": seekTime, "ScreenPlayId": queryScreenPlayId });
    },

    // Helper method to check if a given screenplayId is valid or not.
    isValidScreenPlayId: function (screenPlayId) {
        return !!this._rinData.screenplays[screenPlayId];
    },

    // Helper method to check if a given screenplayId is the default or not.
    isDefaultScreenPlayId: function (screenPlayId) {
        return (screenPlayId == this._rinData.defaultScreenplayId);
    },

    // Method to switch a screenplay.
    switchHyperTimeline: function (screenPlayId) {
        rin.internal.debug.assert(this.isValidScreenPlayId(screenPlayId));

        this.esItemsManager.switchHyperTimeline(screenPlayId);
        this.currentScreenPlayId = screenPlayId;
    },

    // Gets if the player is muted.
    getIsMuted: function () {
        return this._isMuted;
    },

    // Set the muted state of the player.
    setIsMuted: function (value) {
        this._isMuted = value;
        var esItems = this.esItemsManager.getCurrentESItems();
        // Apply to all ESes.
        for (var i = 0; i < esItems.length; i++) {
            var item = esItems[i];
            if (typeof item.experienceStream.setIsMuted === 'function') {
                item.experienceStream.setIsMuted(value);
            }
        }
    },

    // Get the player volume level.
    getPlayerVolumeLevel: function () {
        return this._playerVolumeLevel;
    },

    // Set the player volume level.
    setPlayerVolumeLevel: function (value) {
        this._playerVolumeLevel = value;
        var esItems = this.esItemsManager.getCurrentESItems();
        // Update volume of all ESes.
        for (var i = 0; i < esItems.length; i++) {
            var item = esItems[i];
            if (typeof item.experienceStream.setVolume === 'function') {
                // Set premultipled volume. Player volume chosen by the end user * ES base volume mentioned in the screenplay.
                item.experienceStream.setVolume(value * item.volumeLevel);
            }
        }
    },

    // Generic event which can be raised by any ES or other components. Pass it to all ESes.
    onESEvent: function (sender, eventId, eventData) {
        if (!this.esItemsManager) return;
        var esItems = this.esItemsManager.getCurrentESItems();
        for (var i = 0; i < esItems.length; i++) {
            var item = esItems[i];
            if (item.experienceStream.onESEvent) {
                item.experienceStream.onESEvent(sender, eventId, eventData);
            }
        }

        this.playerESEvent.publish(new rin.contracts.PlayerESEventArgs(sender, eventId, eventData));
    },

    playerESEvent: new rin.contracts.Event(),

    // Get the current logical time at which the narrative is at.
    getCurrentLogicalTimeOffset: function () {
        return (this.esItemsManager && this.esItemsManager.esTimer.taskTimer) ? this.esItemsManager.esTimer.taskTimer.getCurrentTimeOffset() : 0;
    },

    // Get the current player state.
    getPlayerState: function () {
        return this._playerState;
    },

    // Set the player state.
    setPlayerState: function (value) {
        if (value == this._playerState) return;
        var previousState = this._playerState;
        this._playerState = value;
        this.playerStateChangedEvent.publish(new rin.contracts.PlayerStateChangedEventArgs(previousState, value));
    },

    playerStateChangedEvent: new rin.contracts.Event(),

    // Gets if the player is ready or not.
    getIsPlayerReady: function () {
        return this._isPlayerReady;
    },

    // Set the ready state of the plaeyr.
    setIsPlayerReady: function (value) {
        if (this._isPlayerReady == value) return;
        this._isPlayerReady = value;
        this.isPlayerReadyChangedEvent.publish(value);
    },

    // Gets if the narrative is loaded.
    getIsNarrativeLoaded: function () {
        return this._isNarrativeLoaded;
    },

    isPlayerReadyChangedEvent: new rin.contracts.Event(),

    playerConfiguration: null,

    // Get the logical time relative an experience stream.
    getRelativeLogicalTime: function (experienceStream, experienceStreamId, absoluteLogicalTime) {
        absoluteLogicalTime = absoluteLogicalTime || this.getCurrentLogicalTimeOffset();

        // System ESes is not present on the timeline. So return absolute logical time.
        if (experienceStream.isSystemES) return absoluteLogicalTime;

        if (experienceStream instanceof rin.internal.ESItem)
            return this.esItemsManager.screenPlayInterpreter.getRelativeLogicalTime(experienceStream, absoluteLogicalTime);

        var allESItems = this.esItemsManager.screenPlayInterpreter.getESItems();
        // First search current ES Items in case keyframe sequence is repeated used in same screenplay.
        var esItem = this.getCurrentESItems().firstOrDefault(function (item) { return item.experienceStream == experienceStream && item.currentExperienceStreamId == experienceStreamId; });
        if (!esItem) {
            esItem = allESItems.firstOrDefault(function (item) { return item.experienceStream == experienceStream && item.currentExperienceStreamId == experienceStreamId; });
        }

        if (!esItem) {
            //todo: This is for backward compat with old xrins. Remove after porting all old xrins.
            esItem = allESItems.firstOrDefault(function (item) { return item.experienceStream == experienceStream; });
        }

        var relativeTime = this.esItemsManager.screenPlayInterpreter.getRelativeLogicalTime(esItem, absoluteLogicalTime);
        return Math.max(relativeTime, 0);
    },

    // Create and returns a new instance of the specified ES.
    createExperienceStream: function (providerId, esData, orchestratorProxy) {
        var providerName, providerVersion, esInfo;
        if (this._rinData.providers[providerId]) {
            providerName = this._rinData.providers[providerId].name;
            providerVersion = this._rinData.providers[providerId].version;
        }
        else {
            providerName = providerId;
        }

        esInfo = this.esItemsManager.createESItem(providerName, providerVersion, esData, orchestratorProxy);
        rin.internal.debug.assert(esInfo, "missing ES Info");
        return esInfo ? esInfo.experienceStream : null;

    },

    // Makes sure the given experience stream is loaded, If not load it.
    ensureExperienceStreamIsLoaded: function (experienceStreamInfo) {
        if (!this.isExperienceStreamLoaded(experienceStreamInfo.id)) {
            var experienceStreamId = experienceStreamInfo.currentExperienceStreamId;
            experienceStreamInfo.experienceStream.load(experienceStreamId);
            this._esLoadedInfo[experienceStreamInfo.id] = true;
        }
    },

    // Check if the given ES is loaded or not.
    isExperienceStreamLoaded: function (experienceStreamInfoId) {
        return !!this._esLoadedInfo[experienceStreamInfoId];
    },

    // Removed the loaded marker from the ES.
    removeLoadedState: function (experienceStreamInfoId) {
        delete this._esLoadedInfo[experienceStreamInfoId];
    },

    debugOnlyGetESItemInfo: function (experienceStream) {
        return this.esItemsManager.screenPlayInterpreter.getESItems().firstOrDefault(function (item) { return item.experienceStream == experienceStream });
    },

    // Method to load and get an instance of the interaction controls mentioned. The controls returned will be in the same order as the controlNames.
    getInteractionControls: function (controlNames, controlsLoadedCallback) {
        var controlNameCount = controlNames.length;
        var loadedControls = new rin.internal.List(); // Keep all loaded controls till all controls are loaded.
        loadedControls.length = controlNameCount; // Number of controls already loaded.

        // Called after each control is loaded.
        var interactionControlLoaded = function (interactionControl, index) {
            // Save the control to the correct index.
            loadedControls[index] = interactionControl;

            // check if all controls are loaded
            if (loadedControls.any(function (item) {
                return !item;
            }))
                return; // Wait for more controls to load.

            // as all controls are loaded, wrap it in a container and return it to the ES
            var interactionControlsWrap = document.createElement("div");
            loadedControls.foreach(function (item) {
                interactionControlsWrap.appendChild(item);
            });

            controlsLoadedCallback(interactionControlsWrap);
        };

        if (controlsLoadedCallback && controlNames instanceof Array) {
            for (var i = 0; i < controlNameCount; i++) {
                var self = this;
                (function () { // create a self executing function to capture the current index.
                    var currentIndex = i;
                    // Get the factory for the control requested.
                    var factoryFunction = rin.ext.getFactory(rin.contracts.systemFactoryTypes.interactionControlFactory, controlNames[i]);
                    // Create an instance of the control.
                    factoryFunction(self._resourcesResolver, function (interactionControl) {
                        interactionControlLoaded(interactionControl, currentIndex);
                    });
                })();
            }
        }
    },

    getAllSupportedControls: function (experienceStream) {
        //todo2
    },

    narrativeLoadedEvent: null,
    narrativeSeekedEvent: null,
    eventLogger: rin.internal.EventLogger,

    // Gets of the specified ES is on stage as of now.
    getIsOnStage: function (experienceStream) {
        var currentItems = this.getCurrentESItems();
        return currentItems && currentItems.firstOrDefault(function (item) { item.experienceStream == experienceStream });
    },

    // Loads and initializes the orchestrator.
    load: function (rinData, onCompleted) {
        rin.internal.debug.assert(rinData, "Missing rin data");
        this._rinData = rinData;
        this._resourcesResolver.rinModel = rinData;
        this.currentScreenPlayId = rinData.defaultScreenplayId;
        var eventToken = this.eventLogger.logBeginEvent("Load");

        // Clean up the stage in case.
        rin.util.removeAllChildren(this.playerControl.stageControl);
        this._esLoadedInfo = {};
        if (this.esItemsManager) this.esItemsManager.unload();

        this.setPlayerState(rin.contracts.playerState.pausedForBuffering);
        this._initializeNarrativeInfo(rinData);

        this.esItemsManager = new rin.internal.ESItemsManager();
        this.esItemsManager.initialize(rinData, this);

        this._isNarrativeLoaded = true;
        this.narrativeLoadedEvent.publish();
        this.eventLogger.logEndEvent(eventToken);
        if (typeof onCompleted == "function") onCompleted();
    },

    // Get all ES items currently on stage.
    getCurrentESItems: function () {
        return (this.esItemsManager) ? this.esItemsManager.getCurrentESItems() : new rin.internal.List();
    },

    // Capture keyframe information from the active ES.
    captureKeyframe: function () {
        var firstES = this.getCurrentESItems().firstOrDefault(function (item) { return typeof item.experienceStream.captureKeyframe == "function"; });
        return firstES ? firstES.experienceStream.captureKeyframe() : "";
    },

    getScreenPlayPropertyTable: function (experienceStream) {
        //todo
    },

    // Get seek url for the current state of the narrative.
    getCurrentStateSeekUrl: function () {
        return "http://default/?screenPlayId={0}&seekTime={1}&action=play".rinFormat(this.currentScreenPlayId, this.getCurrentLogicalTimeOffset());
    },

    stageAreaManager: null,
    esItemsManager: null,
    playerControl: null,
    goalPlayerState: null,
    currentScreenPlayId: null,

    _initializeNarrativeInfo: function (rinData, onCompleted) {
        this._rinData = rinData;
        this._narrativeInfo = new rin.internal.NarrativeInfo(this._rinData.data.narrativeData);

        //todo: resolve resource table
    },

    _pauseForBuffering: function () {
        var playerState = this.getPlayerState();
        rin.internal.debug.assert(this._isNarrativeLoaded);
        if (!this._isNarrativeLoaded || playerState == rin.contracts.playerState.inTransition || playerState == rin.contracts.playerState.pausedForBuffering) return;

        var eventToken = this.eventLogger.logBeginEvent("PauseNarrativeForBuffering");
        this.setPlayerState(rin.contracts.playerState.inTransition);
        try {
            this._pauseCurrentESs(this.getCurrentLogicalTimeOffset(), this.currentScreenPlayId || this._rinData.defaultScreenplayId);
        }
        finally {
            this.setPlayerState(rin.contracts.playerState.pausedForBuffering);
            this.goalPlayerState = rin.contracts.playerState.playing;
        }
        this.eventLogger.logEndEvent(eventToken);
    },

    _getESItemRelativeOffset: function (esItem, offset) {
        offset = typeof offset == "undefined" ? this.getCurrentLogicalTimeOffset() : offset;
        var relativeOffset = esItem.experienceStream.isSystemES ? offset : this.esItemsManager.screenPlayInterpreter.getRelativeLogicalTime(esItem, offset);
        return Math.max(relativeOffset, 0);
    },
    
    _playCurrentESs: function (offset, screenPlayId) {
        this.esItemsManager.getCurrentESItems().foreach(function (item) {
            item.experienceStream.play(this._getESItemRelativeOffset(item, offset), item.currentExperienceStreamId);
        } .bind(this));
    },

    _pauseCurrentESs: function (offset, screenPlayId) {
        this.esItemsManager.getCurrentESItems().foreach(function (item) {
            item.experienceStream.pause(this._getESItemRelativeOffset(item, offset), item.currentExperienceStreamId);
        } .bind(this));
    },

    _seekESItems: function (esItems, offset) {
        var isPlaying = this.getPlayerState() == rin.contracts.playerState.playing;
        esItems.foreach(function (item) {
            var relativeOffset = this._getESItemRelativeOffset(item);

            var experienceStreamId = item.currentExperienceStreamId;
            if (isPlaying) {
                item.experienceStream.play(relativeOffset, experienceStreamId);
            }
            else {
                item.experienceStream.pause(relativeOffset, experienceStreamId);
            }
        }, this);
    },

    _throwInvalidOperation: function (errorDetails) {
        rin.internal.debug.assert(false, errorDetails);
        if (!this.playerConfiguration.degradeGracefullyOnErrors) throw new Error(errorDetails);
    },

    _rinData: null,
    _serviceItemsManager: null,
    _interactionControlsManager: null,
    _isNarrativeLoaded: null,
    _narrativeInfo: null,
    _resourcesResolver: null,
    _playerState: rin.contracts.playerState.stopped,
    _isPlayerReady: false,
    _stageAreaManager: null,
    _playerVolumeLevel: 1,
    _isMuted: false,
    _loadStartTime: 0,
    _esLoadedInfo: {}

};

// Metadata about a narrative.
rin.internal.NarrativeInfo = function (narrativeData) {
    this.narrativeData = narrativeData;
    this.totalDuration = parseFloat(narrativeData.estimatedDuration);
    this.title = narrativeData.title;
    this.description = narrativeData.description;
    this.branding = narrativeData.branding;
    this.aspectRatio = narrativeData.aspectRatio || "None";
};

rin.internal.NarrativeInfo.prototype = {
    narrativeData: null,
    description: null,
    branding: null,
    title: null,
    totalDuration: null,
    beginOffset: null,
    aspectRatio: "None"
};﻿/// <reference path="Common.js"/>
/// <reference path="TaskTimer.js"/>
/// <reference path="ESItem.js"/>
/// <reference path="../contracts/IExperienceStream.js"/>
/// <reference path="../contracts/IOrchestrator.js"/>
/// <reference path="ScreenPlayInterpreter.js"/>
/// <reference path="Orchestrator.js"/>
/// <reference path="ESItemsManager.js"/>
/// <reference path="EventLogger.js"/>

/*!
* RIN Core JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

window.rin = window.rin || {};
window.rin.internal = window.rin.internal || {};

rin.internal.OrchestratorProxy = function (orchestrator) {
    this._orchestrator = orchestrator;

    this.playerStateChangedEvent = orchestrator.playerStateChangedEvent;
    this.eventLogger = orchestrator.eventLogger;
};

rin.internal.OrchestratorProxy.prototype = {
    _experienceStream: null,
    _orchestrator: null,

    init: function (experienceStream) {
        this._experienceStream = experienceStream;
    },

    getResourceResolver: function () {
        return this._orchestrator.getResourceResolver();
    },

    getCurrentLogicalTimeOffset: function () {
        return this._orchestrator.getCurrentLogicalTimeOffset();
    },

    getRelativeLogicalTime: function (experienceStreamId, absoluteLogicalTime) {
        return this._orchestrator.getRelativeLogicalTime(this._experienceStream, experienceStreamId, absoluteLogicalTime);
    },

    play: function (offset, screenPlayId) {
        this._orchestrator.play(offset, screenPlayId);
    },

    pause: function (offset, screenPlayId) {
        this._orchestrator.pause(offset, screenPlayId);
    },

    getIsMuted: function () {
        return this._orchestrator.getIsMuted();
    },

    setIsMuted: function (value) {
        this._orchestrator.setIsMuted(value);
    },

    getPlayerVolumeLevel: function () {
        return this._orchestrator.getPlayerVolumeLevel();
    },

    setPlayerVolumeLevel: function (value) {
        this._orchestrator.setPlayerVolumeLevel(value);
    },

    onESEvent: function (eventId, eventData) {
        this._orchestrator.onESEvent(this._experienceStream, eventId, eventData);
    },

    getInteractionControls: function (controlNames, callback) {
        return this._orchestrator.getInteractionControls(controlNames, callback);
    },

    getAllSupportedControls: function () {
        return this._orchestrator.getAllSupportedControls(this._experienceStream);
    },

    getPlayerState: function () {
        return this._orchestrator.getPlayerState();
    },

    getIsOnStage: function () {
        return this._orchestrator.getIsOnStage(this._experienceStream);
    },

    getScreenplayPropertyTable: function () {
        return this._orchestrator.getScreenplayPropertyTable(this._experienceStream);
    },

    getCurrentStateSeekUrl: function () {
        return this._orchestrator.getCurrentStateSeekUrl();
    },

    seekUrl: function (seekUrl) {
        return this._orchestrator.seekUrl(seekUrl);
    },

    debugOnlyGetESItemInfo: function () {
        return this._orchestrator.debugOnlyGetESItemInfo(this._experienceStream);
    },

    getCurrentESItems: function(){
        return this._orchestrator.getCurrentESItems();
    },

    createExperienceStream: function (providerId, esData, orchestratorProxy) {
        return this._orchestrator.createExperienceStream(providerId, esData, orchestratorProxy);
    },

    getStageControl: function () {
        return this._orchestrator.playerControl.stageControl;
    },
    getPlayerRootControl: function () {
        return this._orchestrator.playerControl.playerRootElement;
    },
    getNarrativeInfo: function () {
        return this._orchestrator.getNarrativeInfo();
    },
    getSegmentInfo: function () {
        return this._orchestrator.getSegmentInfo();
    }
};
﻿/// <reference path="PlayerConfiguration.js"/>
/// <reference path="../core/PlayerControl.js"/>
/// <reference path="../player/DefaultController.js" />
/// <reference path="../../../web/js/jquery-1.7.2-dev.js" />

/*!
* RIN Core JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

window.rin = window.rin || {};

/// <summary>Constructs a new Player object.</summary>
/// <param name="playerElement" type="element">HTML element that will host the player.</param>
/// <param name="options" type="rin.PlayerConfiguration or string">(optional) The player configuration. in query string form or rin.PlayerConfiguration object.</param>
/// <returns type="rin.Player">Returns a new Player object.</returns>
rin.createPlayerControl = function (playerElement, options, systemRootUrl) {
    var playerConfiguration = options && options.constructor == rin.PlayerConfiguration ? options : new rin.PlayerConfiguration(options);
    if (systemRootUrl) {
        playerConfiguration.systemRootUrl = systemRootUrl;
    }
    var playerControl;

    if (playerConfiguration.hideAllControllers || playerConfiguration.hideDefaultController || !playerConfiguration.playerControllerES) {
        playerControl = new rin.internal.PlayerControl(playerElement, playerConfiguration);
    }
    else {
        playerConfiguration.playerControllerES.initialize(playerElement, playerConfiguration);
        playerControl = playerConfiguration.playerControllerES.playerControl;
    }

    return playerControl;
};

// Get the player control associated with a DOM element.
rin.getPlayerControl = function (playerElement) {
    return playerElement && playerElement.rinPlayer;
};

// Bind a player control with a DOM element.
rin.bindPlayerControls = function (rootElement, systemRootUrl) {
    var playerElements = (rootElement || document).getElementsByClassName("rinPlayer");
    for (var i = 0, len = playerElements.length; i < len; i++) {
        var playerElement = playerElements[i];
        if (playerElement.rinPlayer instanceof rin.internal.PlayerControl) continue;

        playerElement.rinPlayer = rin.createPlayerControl(playerElement, playerElement.getAttribute("data-options"), systemRootUrl);
        var src = playerElement.getAttribute("data-src");
        if (src) {
            playerElement.rinPlayer.load(src);
        }
    }
};

// Start processing/loading the rin player.
rin.processAll = function (element, systemRootUrl) {
    var defLoader = new rin.internal.DeferredLoader();
    var promise = defLoader.loadSystemResources(systemRootUrl).then(function () {
        rin.bindPlayerControls(element, systemRootUrl);
    });
    return promise;
};﻿/// <reference path="../core/Common.js"/>
/// <reference path="../core/TaskTimer.js"/>
/// <reference path="../core/ESItem.js"/>
/// <reference path="../core/ESTimer.js"/>
/// <reference path="../contracts/IExperienceStream.js"/>
/// <reference path="../contracts/IOrchestrator.js"/>
/// <reference path="../core/ScreenPlayInterpreter.js"/>
/// <reference path="../core/Orchestrator.js"/>
/// <reference path="../core/ESItemsManager.js"/>
/// <reference path="../core/EventLogger.js"/>
/// <reference path="../experiences/PlayerControllerES.js" />

/*!
* RIN Core JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

window.rin = window.rin || {};

// Rin player configuration to be used for the startup of the player. These may be changed on the course of the narrative.
rin.PlayerConfiguration = function (options) {
    // Read any config data from query string.
    var queryStrings = rin.util.getQueryStringParams();
    if (typeof (options) == "string") {
        var baseOptions = rin.util.getQueryStringParams(options);
        queryStrings = rin.util.overrideProperties(queryStrings, baseOptions);
    }
    else if (options && typeof (options) == "object") {
        queryStrings = rin.util.overrideProperties(queryStrings, options);
    } else if (!!options) {
        throw new Error("options should be a valid JSON formatted object or string formatted in 'query string' format");
    }

    // Checks HTML5 standard video tags like loop, autoplay, muted etc along with RIN player specific query strings.
    this.loop = queryStrings["loop"] && queryStrings["loop"] != "false";
    this.isFromRinPreviewer = queryStrings["isFromRinPreviewer"] && queryStrings["isFromRinPreviewer"] != "false";
    this.isGreedyBufferingDisabled = !!queryStrings["isGreedyBufferingDisabled"];
    this.rootUrl = queryStrings["rootUrl"];
    var playerStartupAction = rin.contracts.playerStartupAction[queryStrings["playerStartupAction"]];
    var isAutoPlay = queryStrings["autoplay"] && queryStrings["autoplay"] != "false";
    this.playerStartupAction = playerStartupAction || (isAutoPlay ? rin.contracts.playerStartupAction.play : rin.contracts.playerStartupAction.none);

    this.isMuted = queryStrings["muted"] && queryStrings["muted"] != "false";

    this.hideAllControllers = queryStrings["controls"] == "false" || queryStrings["controls"] === false || (queryStrings["hideAllControllers"] && queryStrings["hideAllControllers"] != "false");
    this.hideDefaultController = queryStrings["hideDefaultController"] && queryStrings["hideDefaultController"] != "false";
    this.narrativeRootUrl = queryStrings["narrativeRootUrl"];
    this.systemRootUrl = queryStrings["systemRootUrl"];
    this.playerControllerES = new rin.internal.PlayerControllerES();
    this.playerMode = queryStrings["playerMode"];
};

rin.PlayerConfiguration.prototype = {
    mediaLoadTimeout: 30,
    playerMode: rin.contracts.playerMode.demo,
    playerStartupAction: rin.contracts.playerStartupAction.play,
    startSeekerPosition: 0,
    playerControllerES: null, //new rin.internal.PlayerControllerES(),

    hideAllControllers: false,
    hideDefaultController: false,
    hideTroubleshootingControls: false,
    degradeGracefullyOnErrors: false,
    playInDebugMode: true,
    defaultSegementId: null,
    defaultScreenplayId: null,
    narrativeRootUrl: null,
    systemRootUrl: null,
    loop: false,
    isGreedyBufferingDisabled: false,
    isMuted: false,
    controls: true,
    playerMode: rin.contracts.playerMode.Demo,
    isFromRinPreviewer: false
};﻿/// <reference path="Common.js"/>
/// <reference path="TaskTimer.js"/>
/// <reference path="ESItem.js"/>
/// <reference path="../contracts/IExperienceStream.js"/>
/// <reference path="ScreenPlayInterpreter.js"/>
/// <reference path="EventLogger.js"/>

/// <reference path="../core/PlayerConfiguration.js"/>
/// <reference path="../core/PlayerControl.js"/>
/// <reference path="../core/ResourcesResolver.js"/>
/// <reference path="StageAreaManager.js" />
/// <reference path="Orchestrator.js" />
/// <reference path="../SystemESs/BufferingES.js" />
/// <reference path="RinDataProxy.js" />

/*!
* RIN Core JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

window.rin = window.rin || {};
window.rin.internal = window.rin.internal || {};

// Player control contains a set of API's exposed for access by developers who integrate RIN to their products.
// Most of the calls are delegated to respective controllers. This class acts more or less like a proxy.
rin.internal.PlayerControl = function (stageControl, playerConfiguration, playerRoot) {
    this.stageControl = stageControl; // Control where all the rin content is displayed.
    this.playerConfiguration = playerConfiguration; // Player configuration for startup.
    this.orchestrator = new rin.internal.Orchestrator(this, playerConfiguration); // Orchestrator instance.
    this._defaultBufferingES = new rin.internal.DefaultBufferingES(this.orchestrator); // Create a new buffering ES to show while loading the RIN.
    this.playerRootElement = playerRoot || stageControl; // The root DOM element of the player.
};

rin.internal.PlayerControl.prototype = {
    playerConfiguration: null,
    orchestrator: null,
    stageControl: null,
    playerRootElement: null,
    // Load a narrative at the given URL and make a callback once loading is complete.
    load: function (narrativeUrl, onCompleted) {
        var dataProxy = this._getDataProxy(this.playerConfiguration.playerMode);
        var self = this;

        dataProxy.getRinDataAsync(narrativeUrl,
            function (message) {
                self._showLoadingMessage(message);
            },
            function (rinData) {
                if (rinData && !rinData.error) {
                    if (!self.playerConfiguration.rootUrl) {
                        var lastSlashPos = narrativeUrl.lastIndexOf("/");
                        self.playerConfiguration.rootUrl = narrativeUrl.substr(0, lastSlashPos);
                    }

                    self.loadData(rinData, onCompleted);
                }
                else {
                    var error = "Error while loading narrative: " + (rinData ? rinData.error : "Narrative data not found.");
                    self.orchestrator.eventLogger.logErrorEvent(error);
                }
            });
    },

    // Load a narrative from the rinData provided and make a callback once loading is complete.
    loadData: function (rinData, onComplete) {
        var self = this;

        this.orchestrator.load(rinData, function (error) {
            if (!error) {
                if (self.playerConfiguration.playerStartupAction == rin.contracts.playerStartupAction.play) {
                    self.orchestrator.play();
                }
                //todo: handle pause action
                self._hideLoadingMessage();
                if (typeof onComplete === 'function') {
                    onComplete();
                }
            }
            else {
                if (!self.playerConfiguration.degradeGracefullyOnErrors) throw new Error(error);
                self.orchestrator.eventLogger.logErrorEvent(error);
            }
        });
    },

    // Play the narrative at the given offset of the screenplay specified.
    play: function (offset, screenPlayId) {
        this.orchestrator.play(offset, screenPlayId);
    },

    // Pause the narrative at the given offset of the screenplay specified.
    pause: function (offset, screenPlayId) {
        this.orchestrator.pause(offset, screenPlayId);
    },

    // Returns the players current state.
    getPlayerState: function () {
        return this.orchestrator.getPlayerState();
    },

    // Returns the current logical offset of the player.
    getCurrentTimeOffset: function () {
        return this.orchestrator.getCurrentLogicalTimeOffset();
    },

    // Returns the control used to host ESes.
    getStageControl : function(){
        return this.stageControl;
    },

    // Returns the root DOM element of the player.
    getPlayerRoot: function () {
        return this.playerRootElement;
    },

    // Captures and returns a keyframe at the current logical offset.
    captureKeyframe: function() {
        return this.orchestrator.captureKeyframe();
    },

    _showLoadingMessage: function (message) {
        if (!this._defaultBufferingES) this._defaultBufferingES = new rin.internal.DefaultBufferingES(this.orchestrator);

        var uiControl = this._defaultBufferingES.getUserInterfaceControl();
        if (rin.util.hasChildElement(this.stageControl.childNodes, uiControl)) return;

        this.stageControl.appendChild(uiControl);

        if (this.playerConfiguration.playInDebugMode) {
            rin.util.assignAsInnerHTMLUnsafe(uiControl, "<div>" + message + "</div>");
        }
        this._defaultBufferingES.showBuffering();
    },
    _hideLoadingMessage: function () {
        var uiControl = this._defaultBufferingES.getUserInterfaceControl();
        if (this._defaultBufferingES && rin.util.hasChildElement(this.stageControl.childNodes, uiControl)) {
            this._defaultBufferingES.hideBuffering();
            this.stageControl.removeChild(uiControl);
        }
    },

    _defaultBufferingES: null,
    _getDataProxy: function (playerMode) {
        //if (playerMode == rin.contracts.playerMode.demo) 
        rin.internal.debug.assert(playerMode == rin.contracts.playerMode.demo, "Player mode must be Demo for now");
        return new rin.internal.DemoRinDataProxy();
    },
    _showEventLog: function () { //todo
    },
    _getEventLog: function () { //todo
    },
};﻿/// <reference path="../core/Common.js"/>
/// <reference path="../core/TaskTimer.js"/>
/// <reference path="../core/ESItem.js"/>
/// <reference path="../core/ESTimer.js"/>
/// <reference path="../contracts/IExperienceStream.js"/>
/// <reference path="../contracts/IOrchestrator.js"/>
/// <reference path="../core/ScreenPlayInterpreter.js"/>
/// <reference path="../core/Orchestrator.js"/>
/// <reference path="../core/ESItemsManager.js"/>
/// <reference path="../core/EventLogger.js"/>

/*!
* RIN Core JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

window.rin = window.rin || {};
window.rin.internal = window.rin.internal || {};

// ResourceResolver handles resolving named resources to absolute URIs.
rin.internal.ResourcesResolver = function (playerConfiguration) {
    this._playerConfiguration = playerConfiguration;
};

rin.internal.ResourcesResolver.prototype = {
    rinModel: null,
    _playerConfiguration: null,
    _systemRootUrl: null,
    // Resolve a named resource to an absolute URI.
    resolveResource: function (resourceItemId, experienceId, bandwidth) { //todo: implement
        var resourceItem = this.rinModel.resources[resourceItemId];
        if (experienceId && this.rinModel.experiences[experienceId] && this.rinModel.experiences[experienceId].resources)
            resourceItem = this.rinModel.experiences[experienceId].resources[resourceItemId] || resourceItem;
        var url = resourceItem ? resourceItem.uriReference : resourceItemId;

        // See if the resource URL is relative.
        if (!rin.util.isAbsoluteUrl(url)) {
            var baseUrl = this._playerConfiguration.rootUrl || rin.util.getDocumentLocationRootUrl();
            url = rin.util.combinePathElements(baseUrl, this._playerConfiguration.narrativeRootUrl, url);
        }
        return url;
    },
    // Return the root URL of the player.
    getSystemRootUrl: function () {
        this._systemRootUrl = this._systemRootUrl || rin.util.combinePathElements(rin.util.getDocumentLocationRootUrl(), this._playerConfiguration.systemRootUrl, "systemResources/themeResources");
        return this._systemRootUrl;
    },
    // Resolve a resource from relative to absolute URI.
    resolveSystemResource: function (relativeResourceLocation) {
        // FUTURE$ Theme & language will be looked up to resolve to right URL.
        var absoluteUrl = rin.util.combinePathElements(this.getSystemRootUrl(), relativeResourceLocation);
        return absoluteUrl;
    }
};﻿/// <reference path="Common.js"/>
/// <reference path="TaskTimer.js"/>
/// <reference path="ESItem.js"/>
/// <reference path="../contracts/IExperienceStream.js"/>
/// <reference path="ScreenPlayInterpreter.js"/>
/// <reference path="EventLogger.js"/>
/// <reference path="../core/PlayerConfiguration.js"/>
/// <reference path="../core/PlayerControl.js"/>
/// <reference path="../core/ResourcesResolver.js"/>
/// <reference path="StageAreaManager.js" />
/// <reference path="Orchestrator.js" />
/// <reference path="../SystemESs/BufferingES.js" />

/*!
* RIN Core JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

window.rin = window.rin || {};
window.rin.internal = window.rin.internal || {};

rin.internal.DemoRinDataProxy = function () {
};

rin.internal.DemoRinDataProxy.prototype = {
    getRinDataAsync: function (narrativeUrl, onSetStatusMessage, onComplete) {
        var self = this,
            rinData;
        if (onSetStatusMessage) {
            onSetStatusMessage("Loading Narrative...");
        }

        // Download the narrative.
        var options = {
            url: narrativeUrl,
            dataType: "json",
            error: function (jqxhr, textStatus, errorThrown) {
                if (typeof onComplete == "function") {
                    rinData = { error: errorThrown.message || errorThrown };
                    if (onComplete) {
                        onComplete(rinData);
                    }
                }
            },
            success: function (data, textStatus, jqxhr) {
                if (typeof onComplete == "function") {
                    rinData = data[0];
                    if (onComplete) {
                        onComplete(rinData);
                    }
                }
            }
        };
        $.ajax(options);
    },
}; ﻿/// <reference path="Common.js"/>
/// <reference path="TaskTimer.js"/>
/// <reference path="ESItem.js"/>
/// <reference path="../contracts/IExperienceStream.js"/>
/// <reference path="EventLogger.js"/>

/*!
* RIN Core JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

window.rin = window.rin || {};
window.rin.internal = window.rin.internal || {};

rin.internal.DefaultScreenPlayInterpreter = function () {
    this._allESItems = new rin.internal.List();
};

rin.internal.DefaultScreenPlayInterpreter.prototype = {
    _allESItems: null,
    _orchestrator: null,
    _screenPlayData: null,

    initialize: function (screenPlayId, segmentData, orchestrator) {
        this._screenPlayData = segmentData.screenplays[screenPlayId].data;
        this.id = screenPlayId;
        this._orchestrator = orchestrator;

        var esItems = new rin.internal.List(),
            lastZIndex = 0,
            experienceStreamReferenceList = this._screenPlayData.experienceStreamReferences,
            experienceStreamReference, experienceId, esData, es, esLayer, experienceStreamId, esItem, control;
        for (var i = 0, len = experienceStreamReferenceList.length; i < len; i++) {
            experienceStreamReference = experienceStreamReferenceList[i];
            experienceId = experienceStreamReference.experienceId;
            experienceStreamId = experienceStreamReference.experienceStreamId;
            if (experienceStreamReference.layer) {
                esLayer = rin.contracts.experienceStreamLayer[experienceStreamReference.layer] || rin.contracts.experienceStreamLayer.background;
            }
            esData = segmentData.experiences[experienceId];
            if (!esData) { rin.internal.debug.write("Experience Data not available for " + experienceId); continue; }
            esData.id = experienceId;
            esData.experienceId = experienceId;
            es = orchestrator.createExperienceStream(esData.providerId, esData);
            if (!es) continue; //todo: need to implement delay loading
            esItem = new rin.internal.ESItem(esData.id, esData, es,
                                lastZIndex++,
                                experienceStreamReference.begin,
                                (parseFloat(experienceStreamReference.begin) + parseFloat(experienceStreamReference.duration)),
                                esLayer);
            esItem.currentExperienceStreamId = experienceStreamId;
            esItem.providerId = esData.providerId;
            esItem.volumeLevel = parseFloat(experienceStreamReference.volume) || 1;
            control = es.getUserInterfaceControl();
            if (control && control.setAttribute) control.setAttribute("ES_ID", esData.id);
            esItems.push(esItem);
        }
        this._allESItems = esItems;
    },

    getESItems: function (fromOffset, toOffset) {
        if (typeof fromOffset == "undefined") return this._allESItems;
        // change to milliseconds
        fromOffset = fromOffset;
        toOffset = toOffset || fromOffset + .1 /*epsilon*/ ;
        return this._allESItems.filter(function (es) { return es.beginOffset <= toOffset && es.endOffset > fromOffset; });

    },

    setScreenPlayAttributes: function (esInfo) {
        if (!esInfo.experienceStream || !esInfo.experienceStream.setVolume || !esInfo.experienceStream.setIsMuted || esInfo.volumeLevel == "undefined") return;

        esInfo.experienceStream.setVolume(this._orchestrator.getPlayerVolumeLevel() * esInfo.volumeLevel);
        esInfo.experienceStream.setIsMuted(this._orchestrator.getIsMuted());
    },

    getRelativeLogicalTime: function (esItem, absoluteLogicalTimeOffset) {
        rin.internal.debug.assert(esItem instanceof rin.internal.ESItem);
        rin.internal.debug.assert(esItem.experienceStream.isSystemES || this._allESItems.firstOrDefault(function (item) { return item.experienceStream == esItem.experienceStream; }));

        var relativeLogicalTimeOffset = esItem ? absoluteLogicalTimeOffset - esItem.beginOffset : absoluteLogicalTimeOffset;
        relativeLogicalTimeOffset = Math.max(relativeLogicalTimeOffset, 0);
        return relativeLogicalTimeOffset;
    },

    getEndTime: function () {
        if (this._allESItems.length == 0) return 0;

        var lastItem = this._allESItems.max(function (item) { return item.endOffset; });
        return lastItem ? lastItem.endOffset : 0;
    }
};﻿///<reference path="Common.js"/>
///<reference path="..\Core\Utils.js"/>
///<reference path="TaskTimer.js"/>
///<reference path="ESItem.js"/>
///<reference path="..\contracts\IExperienceStream.js"/>
///<reference path="ScreenPlayInterpreter.js"/>
///<reference path="EventLogger.js"/>
///<reference path="..\Core\PlayerConfiguration.js"/>
///<reference path="..\Core\PlayerControl.js"/>
///<reference path="..\Core\ResourcesResolver.js"/>
/// <reference path="TransitionService.js" />

/*!
* RIN Core JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

window.rin = window.rin || {};
window.rin.internal = window.rin.internal || {};

rin.internal.StageAreaManager = function (orchestrator, stageControl) {
    this._orchestrator = orchestrator;
    this._stageControl = stageControl;
};

rin.internal.StageAreaManager.prototype = {

    onCurrentExperienceStreamsChanged: function (addedItems, removedItems, currentList, isSeek) {
        var self = this;
        var wereItemsAdded = addedItems && addedItems.length > 0;
        var wereItemsRemoved = removedItems && removedItems.length > 0;
        
        if (wereItemsRemoved) {
            for (var i = 0; i < removedItems.length; i++) {
                var item = removedItems[i];
                if (addedItems && addedItems.length > 0 && addedItems.any(function (i) { return i.experienceStream == item.experienceStream; })) continue;

                var uiElement = item.experienceStream.getUserInterfaceControl();
                if (!uiElement) continue;

                if (isSeek) {
                    // cancel any existing transition and hide element without transition
                    uiElement.style.zIndex = -1;
                    var transition = uiElement.transition;
                    if (transition) transition.cancelTransition();
                    rin.util.hideElementByOpacity(uiElement);
                }
                else { // show es with transition
                    //item.ExperienceStream.UserInterfaceControl.IsHitTestVisible = false;
                    (function (uiElement, item) {
                        uiElement.style.zIndex = 99999; // bring to top so the next ES is not blocking the transition.
                        var currentTransition = self._getTransition(item);
                        uiElement.transition = currentTransition;
                        currentTransition.transition.TransitionOut(uiElement, currentTransition.transitionOutDuration, function () {
                            uiElement.transition = null;
                                rin.util.hideElementByOpacity(uiElement);
                                uiElement.style.zIndex = -1;
                        });
                    })(uiElement, item);
                }
            }
        }

        if (wereItemsAdded) {
            for (var i = 0; i < addedItems.length; i++) {
                var item = addedItems[i];

                this._orchestrator.ensureExperienceStreamIsLoaded(item);
                var uiControl = item.experienceStream.getUserInterfaceControl();
                if (uiControl) {
                    if (removedItems && removedItems.length > 0 && removedItems.any(function (i) { return i.experienceStream == item.experienceStream; })) continue;

                    if (!rin.util.hasChildElement(this._stageControl.childNodes, uiControl))
                        this._stageControl.appendChild(uiControl);

                    self._setZIndex(item);

                    var currentUIControl = item.experienceStream.getUserInterfaceControl();

                    if (isSeek) {
                        // cancel any existing transition and hide element without transition
                        var transition = currentUIControl.transition;
                        if (transition) transition.cancelTransition();
                        rin.util.unhideElementByOpacity(currentUIControl);
                    }
                    else {
                        (function (item, currentUIControl) {
                            var currentTransition = self._getTransition(item);
                            setTimeout(function () {

                                currentUIControl.transition = currentTransition;
                                if (currentUIControl) {
                                    currentTransition.transition.TransitionIn(currentUIControl, currentTransition.transitionInDuration, function () {
                                        currentUIControl.transition = null;
                                        rin.util.unhideElementByOpacity(currentUIControl);
                                    });
                                }
                            }, 15);
                        })(item, currentUIControl);
                    }
                }

            }
        }
    },

    _setZIndex: function (esInfo) {
        var esLayer = esInfo.experienceStreamLayer;
        var layerRangeStart = (esLayer == rin.contracts.experienceStreamLayer.background) ? 10000 :
            (esLayer == rin.contracts.experienceStreamLayer.foreground || esLayer == rin.contracts.experienceStreamLayer.projection) ? 20000 : 30000;

        var zIndex = layerRangeStart + esInfo.zIndex || 0;
        var uiElement = esInfo.experienceStream.getUserInterfaceControl();
        if (uiElement && uiElement.style) {
            uiElement.style.zIndex = zIndex;
            uiElement.style.position = "absolute";
            this._orchestrator.eventLogger.logEvent("ZIndex set for {0} to {1}", esInfo.id, zIndex);
        }
    },
    _getTransition: function (esInfo) {
        var transition = new rin.internal.TransitionEffect(),
            transitionData;
        if (esInfo && esInfo.esData) {
            if (esInfo.esData.data && esInfo.esData.data.transition) {
                transitionData = transitionData || {};
                rin.util.overrideProperties(esInfo.esData.data.transition, transitionData);
            }
            if (esInfo.currentExperienceStreamId) {
                var currentExperienceStream = esInfo.esData.experienceStreams[esInfo.currentExperienceStreamId];
                if (currentExperienceStream && currentExperienceStream.data && currentExperienceStream.data.transition) {
                    transitionData = transitionData || {};
                    rin.util.overrideProperties(currentExperienceStream.data.transition, transitionData);
                }
            }
        }        
        if(transitionData) {
            transition.transitionInDuration = transitionData.inDuration;
            transition.transitionOutDuration = transitionData.outDuration;
        }

        return transition;
    },
    _orchestrator: null,
    _stageControl: null
};

rin.internal.TransitionEffect = function (transition) {
    this.transition = transition || new rin.FadeInOutTransitionService();
};

rin.internal.TransitionEffect.prototype = {
    transition: null,
    transitionInDuration: .5,
    transitionOutDuration: .5,
    cancelTransition: function () { this.transition.cancelTransition(); }
};﻿/// <reference path="Common.js"/>
/// <reference path="../contracts/IExperienceStream.js" />

/*!
* RIN Core JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

window.rin = window.rin || {};
window.rin.internal = window.rin.internal || {};

// Data structure to hold an item inside the TaskTimer.
rin.internal.TaskTimerItem = function (timeOffset, context) {
    this.offset = timeOffset;
    this.context = context
};

// TaskTimer manages a list of tasks each with its own time offsets and fires an event with the appropriate task on time.
rin.internal.TaskTimer = function (taskItems) {
    this._timerItems = new rin.internal.List(); // List to hold all tasks.
    this._stopWatch = new rin.internal.StopWatch(); // Stopwatch to maintain time.
    this.taskTriggeredEvent = new rin.contracts.Event(); // Event to be fired when a time times out.
    this.addRange(taskItems); // Add the list of tasks to the TaskTimer.
};

rin.internal.TaskTimer.prototype = {
    _timerTriggerPrecision: 0.1,
    _timerItems: null,
    _timerId: -1,
    _stopWatch: null,
    _nextItemIndex: 0,
    _itemsChanged: false,

    taskTriggeredEvent: new rin.contracts.Event(),

    // Returns the current time offset of the TaskTimer.
    getCurrentTimeOffset: function () { return this._stopWatch.getElapsedSeconds(); },

    // Add a task at the offset specified.
    add: function (offset, context) {
        if (this._timerId > 0)
        { throw new Error("Items cannot be added when timer is running. Stop the timer and then add items"); }

        this._timerItems.push(new rin.internal.TaskTimerItem(offset, context));
        this._itemsChanged = true;
    },

    // Add multiple tasks at once.
    addRange: function (taskItems) {
        if (!taskItems || taskItems.length == 0) return;
        if (this._timerId > 0)
        { throw new Error("Items cannot be added when timer is running. Stop the timer and then add items"); }

        this._timerItems = this._timerItems.concat(taskItems);
        this._itemsChanged = true;
    },

    // Remove an existing task from the list.
    remove: function (offset, context) { throw new Error("to be implemented"); },

    // Start playing the task timer.
    play: function () {
        this._checkChangedItems();
        this._triggerCurrentItems();
        this._scheduleNextItem();
        this._stopWatch.start();
    },

    // Pause the TaskTimer.
    pause: function () {
        clearTimeout(this._timerId);
        this._timerId = -1;
        this._stopWatch.stop();
    },

    // Seek the timer to a specified offset. Optionally specify if the timer should play from that point automatically.
    seek: function (offset, autoStartAfterSeek) {
        var change = Math.abs(offset - this.getCurrentTimeOffset());
        if (change > this._timerTriggerPrecision) {
            this.pause();
            this._stopWatch.reset();
            this._stopWatch.addElapsed(offset);
            this._checkChangedItems();
            this._nextItemIndex = this._findFirstTaskIndexAtTime(offset);
            this._triggerCurrentItems();
            this._scheduleNextItem();
        }

        if (autoStartAfterSeek) this._stopWatch.start();
    },

    // Get the task item at the current offset. If there is nothing at the current offset, get the previous item.
    getCurrentOrPrevious: function (offset) {
        var item = this._timerItems.lastOrDefault(function (x) {
            return x.offset <= offset;
        });
        return item ? item.context : null;
    },

    _timer_tick: function () {
        this._triggerCurrentItems();
        this._scheduleNextItem();
    },

    _triggerCurrentItems: function () {
        if (this._nextItemIndex < 0) return;

        var index = this._nextItemIndex;
        var endOffset = this.getCurrentTimeOffset() + this._timerTriggerPrecision;
        var currentItems = new rin.internal.List();

        while (index < this._timerItems.length && this._timerItems[index].offset <= endOffset) {
            currentItems.push(this._timerItems[index].context);
            index++;
        }

        if (currentItems.length > 0) {
            var self = this;
            setTimeout(function () {
                self.taskTriggeredEvent.publish(currentItems);
            }, 1);
        }

        this._nextItemIndex = (index < this._timerItems.length) ? index : -1;
    },

    _scheduleNextItem: function () {
        if (this._nextItemIndex < 0) return;

        var nextItem = this._timerItems[this._nextItemIndex];
        if (nextItem.offset == Infinity) return;

        var interval = Math.max((nextItem.offset - this.getCurrentTimeOffset()), 0);

        clearTimeout(this._timerId);
        var self = this;
        this._timerId = setTimeout(function () { self._timer_tick() }, interval * 1000);
    },


    _checkChangedItems: function () {
        if (this._itemsChanged) {
            this._timerItems.sort(function (a, b) { return a.offset - b.offset; });
            this._nextItemIndex = this._findFirstTaskIndexAtTime(this.getCurrentTimeOffset());
            this._itemsChanged = false;
        }
    },

    _findFirstTaskIndexAtTime: function (offset) {
        return this._timerItems.firstOrDefaultIndex(function (x) { return x.offset >= offset; });
    }

};﻿/// <reference path="Common.js"/>
/// <reference path="../core/Utils.js"/>
/// <reference path="TaskTimer.js"/>
/// <reference path="ESItem.js"/>
/// <reference path="../contracts/IExperienceStream.js"/>
/// <reference path="ScreenPlayInterpreter.js"/>
/// <reference path="EventLogger.js"/>
/// <reference path="../core/PlayerConfiguration.js"/>
/// <reference path="../core/PlayerControl.js"/>
/// <reference path="../core/ResourcesResolver.js"/>

/*!
* RIN Core JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

window.rin = window.rin || {};
window.rin.internal = window.rin.internal || {};

// Transition to immediatly switch from one ES to other without any gradual changes.
rin.internal.CutSceneTransitionService = function () {
};

rin.internal.CutSceneTransitionService.prototype = {
    // Show an ES with the in transition.
    TransitionIn: function (element, transitionTime, onCompleted) {
        rin.util.unhideElementByOpacity(element); // Show the ES immediatly.
        if (typeof onCompleted == "function") onCompleted();
    },

    // Hide an ES with the out transition.
    TransitionOut: function (element, transitionTime, onCompleted) {
        rin.util.hideElementByOpacity(element);
        if (typeof onCompleted == "function") onCompleted();
    }
};

// Transition to gradually fade in the new ES and fade out the previous one.
rin.FadeInOutTransitionService = function () {
};

rin.FadeInOutTransitionService.prototype = {
    attachedElement: null,
    _storyboard : null,

    // Show an ES with the in transition.
    TransitionIn: function (element, transitionTime, onCompleted) {
        this.attachedElement = element;
        this._animate(element, transitionTime, 0, 1, onCompleted);
    },

    // Hide an ES with the out transition.
    TransitionOut: function (element, transitionTime, onCompleted) {
        this.attachedElement = element;
        this._animate(element, transitionTime, 1, 0, onCompleted);
    },

    // Cancel the active transition.
    cancelTransition: function () {
        this._storyboard.stop();
        rin.util.setElementOpacity(this.attachedElement, 1);
    },

    _animate: function (element, transitionTime, opacityFrom, opacityTo, onCompleted) {
        var onAnimate = function (value) { rin.util.setElementOpacity(element, value); }
        this._storyboard = new rin.internal.Storyboard(new rin.internal.DoubleAnimation(transitionTime, opacityFrom, opacityTo), onAnimate, onCompleted);
        this._storyboard.begin();
    }
};﻿/*!
* RIN Experience Provider JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

/// <reference path="../core/Common.js"/>
/// <reference path="../core/TaskTimer.js"/>
/// <reference path="../core/ESItem.js"/>
/// <reference path="../core/ESTimer.js"/>
/// <reference path="../contracts/IExperienceStream.js"/>
/// <reference path="../contracts/IOrchestrator.js"/>
/// <reference path="../core/ScreenPlayInterpreter.js"/>
/// <reference path="../core/Orchestrator.js"/>
/// <reference path="../core/ESItemsManager.js"/>
/// <reference path="../core/EventLogger.js"/>

window.rin = window.rin || {};

// ES for showing the buffering state.
rin.internal.DefaultBufferingES = function (orchestrator) {
    this.stateChangedEvent = new rin.contracts.Event();
    this._orchestrator = orchestrator;
    this._userInterfaceControl = rin.util.createElementWithHtml(rin.internal.DefaultBufferingES.elementHTML);
    rin.util.overrideProperties({zIndex:200000, backgroundColor:"black", width:"100%", height:"100%"}, this._userInterfaceControl.style);
};

rin.internal.DefaultBufferingES.prototype = {
    isSystemES: true,
    load: function (experienceStreamId) {
        var self = this;
        this._orchestrator.playerStateChangedEvent.subscribe(function () { self._onOrchestratorIsPlayerReadyStateChanged() });
        this._updateBufferingState();
    },
    play: function (offset, experienceStreamId) {
        this._updateBufferingState();
    },
    pause: function (offset, experienceStreamId) {
        this._updateBufferingState();
    },
    unload: function () {
        this._updateBufferingState();
    },
    getState: function () {
        return rin.contracts.experienceStreamState.ready;
    },
    stateChangedEvent: new rin.contracts.Event(),
    getUserInterfaceControl: function () {
        return this._userInterfaceControl;
    },
    // Show the buffering visual.
    showBuffering: function () {
        this._userInterfaceControl.style["display"] = "block";
        rin.util.setElementOpacity(this._userInterfaceControl, .5);
        //todo: animation
        if (this._orchestrator) this._orchestrator.eventLogger.logEvent("->-> BufferingES: ShowBuffering called.");
    },
    // Hide the buffering visual.
    hideBuffering: function () {
        this._userInterfaceControl.style["display"] = "none";
        if (this._orchestrator) this._orchestrator.eventLogger.logEvent("->-> BufferingES: HideBuffering called.");
    },

    _userInterfaceControl: rin.util.createElementWithHtml(""),
    _onOrchestratorIsPlayerReadyStateChanged: function () {
        this._updateBufferingState();
    },
    _updateBufferingState: function () {
        var playerState = this._orchestrator.getPlayerState();
        if (playerState == rin.contracts.playerState.pausedForBuffering) {
            this.showBuffering();
        }
        else if (playerState != rin.contracts.playerState.inTransition) {
            this.hideBuffering();
        }
    },
    _orchestrator: null
};

rin.internal.DefaultBufferingES.elementHTML = "<div id='bufferingDiv' style='margin:auto;width:100%;height:100%;font-size:30px;color:white;display:table;'><div style='text-align:center;vertical-align: middle;display:table-cell;'>Buffering...</div></div>";﻿/*!
* RIN Experience Provider JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

/// <reference path="../core/Common.js"/>
/// <reference path="../core/TaskTimer.js"/>
/// <reference path="../core/ESItem.js"/>
/// <reference path="../core/ESTimer.js"/>
/// <reference path="../contracts/IExperienceStream.js"/>
/// <reference path="../contracts/IOrchestrator.js"/>
/// <reference path="../core/ScreenPlayInterpreter.js"/>
/// <reference path="../core/Orchestrator.js"/>
/// <reference path="../core/ESItemsManager.js"/>
/// <reference path="../core/EventLogger.js"/>

window.rin = window.rin || {};

rin.internal.ESTimerES = function (orchestrator, esManager) {
    this.stateChangedEvent = new rin.contracts.Event();
    this._orchestrator = orchestrator;
    this.esTimer = new rin.internal.ESTimer(orchestrator, esManager);
};

rin.internal.ESTimerES.prototype = {
    isSystemES: true,
    load: function (offset) {
        this.esTimer.loadESItmes();
        if (offset > 0) this.seek(0);
    },
    play: function (offset, experienceStreamId) {
        var self = this;

        // If another play got called before previous pause async call got chance to finish, cancel that call.
        if (this._playTimerId && this._playTimerId > 0) {
            clearInterval(this._playTimerId);
            this._playTimerId = -1;
        }

        this._playTimerId = setTimeout(function () {
            self._orchestrator.eventLogger.logEvent("!! Logical timer played at : {0}", self.esTimer.taskTimer.getCurrentTimeOffset() / 1000);
            self.esTimer.taskTimer.seek(offset);
            self.esTimer.taskTimer.play();
        }, 30);
    },
    pause: function (offset, experienceStreamId) {
        var self = this;

        // If another pause got called before previous pause async call got chance to finish, cancel that call.
        if (this._pauseTimerId && this._pauseTimerId > 0) {
            clearInterval(this._pauseTimerId);
            this._pauseTimerId = -1;
        }

        this._pauseTimerId = setTimeout(function () {
            self._orchestrator.eventLogger.logEvent("!! Logical timer paused at : {0}", self.esTimer.taskTimer.getCurrentTimeOffset() / 1000);
            self.esTimer.taskTimer.seek(offset);
            self.esTimer.taskTimer.pause();
        }, 30);
    },
    unload: function () {
        this.esTimer.taskTimer.pause();
    },
    getState: function () {
        return rin.contracts.experienceStreamState.ready;
    },
    stateChangedEvent: new rin.contracts.Event(),
    getUserInterfaceControl: function () { return null; },
    esTimer: null,

    _orchestrator: null
};
﻿/*!
* RIN Experience Provider JavaScript Library v1.0
* http://research.microsoft.com/rin
*
* Copyright 2012-2013, Microsoft Research
* <placeholder for RIN License>
*
* Date: <placeholder for SDK release date>
*/

/// <reference path="../contracts/DiscreteKeyframeESBase.js" />
/// <reference path="../contracts/IExperienceStream.js" />
/// <reference path="../contracts/IOrchestrator.js" />
/// <reference path="../core/Common.js" />
/// <reference path="../core/EventLogger.js" />
/// <reference path="../core/PlayerConfiguration.js" />
/// <reference path="../core/ResourcesResolver.js" />
/// <reference path="../core/TaskTimer.js" />

window.rin = window.rin || {};

(function (rin) {
    // Dummy ES to replace with any ES which cannot be displayed or missing.
    var PlaceholderES = function (orchestrator, esData) {
        this.stateChangedEvent = new rin.contracts.Event();
        this._orchestrator = orchestrator;
        this._userInterfaceControl = rin.util.createElementWithHtml(PlaceholderES.elementHTML).firstChild;
        this._valuePlaceholder = $(".rinPlaceholderValue", this._userInterfaceControl)[0];
        this._esData = esData;
        if (esData.data) {
            this._mode = esData.data.mode;
        }
    };

    rin.util.extend(rin.contracts.DiscreteKeyframeESBase, PlaceholderES);

    PlaceholderES.prototypeOverrides = {
        // Load and display the ES.
        load: function (experienceStreamId) {
            PlaceholderES.parentPrototype.load.call(this, experienceStreamId);
            this.setState(rin.contracts.experienceStreamState.ready);

            if (this._mode == "stresstest") {
                rin.util.assignAsInnerHTMLUnsafe(this._userInterfaceControl.firstChild, "Stress test narrative loaded.");
            }
            else {
                var esInfo = this._orchestrator.debugOnlyGetESItemInfo();
                if (esInfo) {
                    rin.util.assignAsInnerHTMLUnsafe(this._userInterfaceControl.firstChild, "Placeholder ES for {0}:{1} <br/> Lifetime {2}-{3}".rinFormat(esInfo.providerId, esInfo.id,
                        esInfo.beginOffset, esInfo.endOffset));
                }
            }
        },
        // Pause the player.
        pause: function (offset, experienceStreamId) {
            PlaceholderES.parentPrototype.pause.call(this, offset, experienceStreamId);
            if (this._activeValueAnimation !== null) {
                this._activeValueAnimation.stop();
                this._activeValueAnimation = null;
            }
        },
        // Apply/Interpolate to a keyframe.
        displayKeyframe: function (keyframeData, nextKeyframeData, interpolationOffset) {
            if (this._mode == "stresstest") {
                var curKeyValue, curKeyText, nextKeyValue;
                // If there is another keyframe following current one, load that for interpolation.
                if (nextKeyframeData) {
                    var nextData = new rin.internal.XElement(nextKeyframeData.data["default"]);
                    if (nextData)
                        nextKeyValue = parseFloat(nextData.attributeValue("Value"));
                }

                // Load current keyframe.
                var curData = new rin.internal.XElement(keyframeData.data["default"]);
                if (curData) {
                    curKeyValue = parseFloat(curData.attributeValue("Value"));
                    curKeyText = curData.attributeValue("Text");

                    // start volume interpolation to next key volume if one is present.
                    if (nextKeyValue != null) {
                        var keyframeDuration = nextKeyframeData.offset - keyframeData.offset;
                        var animation = new rin.internal.DoubleAnimation(keyframeDuration, curKeyValue, nextKeyValue);
                        curKeyValue = animation.getValueAt(interpolationOffset);
                        this._animateValue(curKeyValue, nextKeyValue, keyframeDuration - interpolationOffset);
                    }

                    rin.util.assignAsInnerHTMLUnsafe(this._userInterfaceControl.firstChild, curKeyText);
                    rin.util.assignAsInnerHTMLUnsafe(this._valuePlaceholder, ~~curKeyValue);
                }
            }
        },
        // Interpolate volume for smooth fade in and out.
        _animateValue: function (from, to, animationTime) {
            var self = this;
            var valueAnim = new rin.internal.DoubleAnimation(animationTime, from, to);
            var valueAnimationStoryboard = new rin.internal.Storyboard(
                valueAnim,
                function (value) {
                    rin.util.assignAsInnerHTMLUnsafe(self._valuePlaceholder, ~~value);
                },
                function () { self._activeValueAnimation = null; });

            if (this._activeValueAnimation !== null) {
                this._activeValueAnimation.stop();
                this._activeValueAnimation = null;
            }

            valueAnimationStoryboard.begin();
            this._activeValueAnimation = valueAnimationStoryboard;
        },
        // Get the state of the ES.
        getState: function () {
            return this._state;
        },
        // Set the state of the ES.
        setState: function (value) {
            if (this._state == value) return;
            var previousState = this._state;
            this._state = value;
            this.stateChangedEvent.publish(new rin.contracts.ESStateChangedEventArgs(previousState, value, this));
        },
        stateChangedEvent: new rin.contracts.Event(),
        getUserInterfaceControl: function () {
            return this._userInterfaceControl;
        },

        _userInterfaceControl: null,
        _orchestrator: null,
        _esData: null,
        _activeValueAnimation: null,
    };

    rin.util.overrideProperties(PlaceholderES.prototypeOverrides, PlaceholderES.prototype);
    PlaceholderES.elementHTML = "<div style='position:absolute;width:100%;height:100%'><div style='color:red;position:absolute;width:100%;height:100%'></div><div style='color:white;position:absolute;right:20px;top:20px;' class='rinPlaceholderValue'></div></div>";
    rin.ext.registerFactory(rin.contracts.systemFactoryTypes.esFactory, "MicrosoftResearch.Rin.PlaceholderExperienceStream", function (orchestrator, esData) { return new PlaceholderES(orchestrator, esData); });
    rin.ext.setDefaultFactory(rin.contracts.systemFactoryTypes.esFactory, function (orchestrator, esData) { return new PlaceholderES(orchestrator, esData); });
})(rin);﻿/// <reference path="../core/Common.js"/>
/// <reference path="../core/Utils.js"/>
/// <reference path="../core/TaskTimer.js"/>
/// <reference path="../core/ESItem.js"/>
/// <reference path="../core/ESTimer.js"/>
/// <reference path="../contracts/IExperienceStream.js"/>
/// <reference path="../contracts/IOrchestrator.js"/>
/// <reference path="../core/ScreenPlayInterpreter.js"/>
/// <reference path="../core/Orchestrator.js"/>
/// <reference path="../core/ESItemsManager.js"/>
/// <reference path="../core/EventLogger.js"/>

window.rin = window.rin || {};

rin.internal.DefaultPreloaderES = function () {
    this._currentPreloadList = new rin.internal.List();
    this.stateChangedEvent = new rin.contracts.Event();
    this._preloaderTimer = new rin.internal.Timer();
};

rin.internal.DefaultPreloaderES.prototype = {
    _orchestrator: null,
    _stageControl: null,
    _esListInfo: null,
    _currentPreloadList: null,
    _preloaderTimer: null,
    _defaultPreloadingTime: 30,
    _defaultInitialMinRequiredBuffering: 9.5,
    _state: rin.contracts.experienceStreamState.closed,

    stateChangedEvent: new rin.contracts.Event(),
    getUserInterfaceControl: function () { return null; },
    isPreloader: true,
    isSystemES: true,
    initialize: function (orchestrator, stageControl, esInfoList) {
        this._orchestrator = orchestrator;
        this._stageControl = stageControl;
        this._esListInfo = esInfoList;

        this._preloaderTimer.interval = 1000;
        var self = this;
        this._preloaderTimer.tick = function () { self._preloaderTimer_Tick(); };
        this._addListenersToAllItems();
    },

    updateScreenPlay: function (newESListInfo) {
        this._preloaderTimer.stop();
        this._removeListenersToAllItems();
        this._esListInfo = newESListInfo;
        this.load(0);
    },

    load: function (experienceStreamId) {
        this._updateCurrentPreloadList(0, this._defaultPreloadingTime);
        this._preloadCurrentItems(0, true);
        this._preloaderTimer.start();
    },

    pause: function (offset, experienceStreamId) {
        this._seek(offset, experienceStreamId);
    },

    play: function (offset, experienceStreamId) {
        this._seek(offset, experienceStreamId);
    },

    unload: function () {
        this._preloaderTimer.stop();
    },

    getPreloaderItemStatesInfo: function () { //todo
    },

    getState: function () {
        return this._state;
    },

    setState: function (value) {
        if (this._state != value)
            var previousState = this._state;

        this._state = value;
        this.stateChangedEvent.publish(new rin.contracts.ESStateChangedEventArgs(previousState, value, this));
    },

    _preloaderTimer_Tick: function () {
        var currentTime = this._orchestrator.getCurrentLogicalTimeOffset();
        this._preloadItems(currentTime);
    },

    _preloadItems: function (offset) {
        this._updateCurrentPreloadList(offset, offset + this._defaultPreloadingTime);
        this._preloadCurrentItems(offset, false);
    },

    _addListenersToAllItems: function () {
        var items = this._esListInfo.getESItems();
        var self = this;
        items.foreach(function (item) {
            item.experienceStream.stateChangedEvent.subscribe(function (args) { self._experienceStream_ESStateChanged(args) }, "preloader");
        });
    },

    _removeListenersToAllItems: function () {
        var items = this._esListInfo.getESItems();
        items.foreach(function (item) {
            item.experienceStream.stateChangedEvent.unsubscribe("preloader");
        });
    },

    _experienceStream_ESStateChanged: function (esStateChangedEventArgs) {
        var sourceES = esStateChangedEventArgs.source;
        if (sourceES == this || sourceES.isPreloader) return;

        if (esStateChangedEventArgs.toState == rin.contracts.experienceStreamState.error) {
            var es = this._esListInfo.getESItems().firstOrDefault(function (item) { return item.experienceStream == sourceES });
            var esName = es ? es.id : "";
            var esType = es ? es.esData.providerId : "NotAvailable";
            this._orchestrator.eventLogger.logErrorEvent("ES {0} of type {1} went to error state in preloader.".rinFormat(esName, esType));
        }
        this._checkCurrentPreloadListStates();
    },

    _checkCurrentPreloadListStates: function () {
        if (this._areAllItemsPreloaded(this._currentPreloadList)) this.setState(rin.contracts.experienceStreamState.ready);
    },

    _updateCurrentPreloadList: function (offset, endOffset) {
        var preloadList = this._esListInfo.getESItems(offset, endOffset);
        this._currentPreloadList = preloadList.where(function (item) { return item.experienceStream != this });
    },

    _preloadCurrentItems: function (offset, bufferIfNotAllLoaded) {
        var esInfoList = this._currentPreloadList;
        rin.internal.debug.assert(!esInfoList.firstOrDefault(function (i) { return i.experienceStream == this }));

        if (this._areAllItemsPreloaded(esInfoList)) {
            this.setState(rin.contracts.experienceStreamState.ready);

            if (this._isGreedyBufferingCompleted || this._orchestrator.playerConfiguration.isGreedyBufferingDisabled) return;

            var esItemToBuffer = this._getNextESItemToBuffer(offset);
            if (!esItemToBuffer) {
                return;
            }
            else {
                esInfoList.push(esItemToBuffer);
                bufferIfNotAllLoaded = false;
            }
        }

        if (bufferIfNotAllLoaded) this.setState(rin.contracts.experienceStreamState.buffering);

        for (var i = 0; i < esInfoList.length; i++) {
            var esInfo = esInfoList[i];
            this._orchestrator.ensureExperienceStreamIsLoaded(esInfo);

            var contentControl = esInfo.experienceStream.getUserInterfaceControl();

            if (contentControl && !rin.util.hasChildElement(this._stageControl.childNodes, contentControl)) {
                rin.util.hideElementByOpacity(contentControl);
                contentControl.style.zIndex = -1;
                contentControl.style.position = "absolute";
                this._stageControl.appendChild(contentControl);
            }
        }
    },

    _areAllItemsPreloaded: function (esInfoList) {
        for (var i = 0, len = esInfoList.length; i < len; i++) {
            var state = esInfoList[i].experienceStream.getState();
            if (!state || state == rin.contracts.experienceStreamState.buffering ||
                state == rin.contracts.experienceStreamState.closed) return false;
        }
        return true;
    },

    _seek: function (offset, experienceStreamId) {
        var epsilon = .05;
        if (Math.abs(this._orchestrator.getCurrentLogicalTimeOffset() - offset) < epsilon) return;
        this._preloadItems(offset);
    },

    _getNextESItemToBuffer: function (offset) {
        var firstItemToBuffer = this._getNextNotLoadedOrBufferingItem(offset);
        if (!firstItemToBuffer) {
            // Now check if there is something else in whole timeline to buffer. Something before current offset might be non-loaded in case of seek.
            firstItemToBuffer = this._getNextNotLoadedOrBufferingItem(0);
            if (!firstItemToBuffer) {
                this._onGreedyBufferingCompleted();
                return null; // nothing to buffer anymore.
            }
        }

        if (firstItemToBuffer.experienceStream.getState() == rin.contracts.experienceStreamState.buffering) return null; // something is already buffering, do not buffer additional ones yet.
        rin.internal.debug.assert(this._orchestrator.isExperienceStreamLoaded(firstItemToBuffer) == false);
        rin.internal.debug.assert(firstItemToBuffer.experienceStream.getState() != rin.contracts.experienceStreamState.ready);
        this._orchestrator.eventLogger.logEvent("Preloader greety buffer {0} at begin offset {1}. Current Logical Time {2}",
            firstItemToBuffer.id, firstItemToBuffer.beginOffset, this._orchestrator.getCurrentLogicalTimeOffset());
        return firstItemToBuffer;
    },

    _onGreedyBufferingCompleted: function () {
        /* When we need to buffer addional items like console, add that code here. */
        this._isGreedyBufferingCompleted = true;
    },

    _getNextNotLoadedOrBufferingItem: function (offset) {
        var allESItems = this._esListInfo.getESItems();
        for (var i = 0, len = allESItems.length; i < len; i++)
        {
            var es = allESItems[i];
            if (es.beginOffset >= offset) {
                var esState = es.experienceStream.getState();
                if (esState == rin.contracts.experienceStreamState.error) continue;
                if (esState == rin.contracts.experienceStreamState.buffering) return es;
                if (esState != rin.contracts.experienceStreamState.ready && this._orchestrator.isExperienceStreamLoaded(es) == false) return es;
            }
        }

    }

};﻿window.rin = window.rin || {};
window.rin.internal = window.rin.internal || {};

rin.internal.XElement = function (xmlElement) {
    var elem = xmlElement;
    if (typeof xmlElement == "string") {
        elem = rin.internal.XmlHelper.parseXml(xmlElement).documentElement;
    }
    this.xmlElement = elem;
};

rin.internal.XElement.prototype = {
    xmlElement: null,
    element: function (childElementName) {
        var children = this.xmlElement.childNodes;
        for (var i = 0, len = children.length; i < len; i++)
            if (!childElementName || children[i].nodeName == childElementName) return new rin.internal.XElement(children[i]);
        return null;
    },
    elements: function (childElementName, elementOperation) {
        var out = [];
        var children = this.xmlElement.childNodes;
        for (var i = 0, len = children.length; i < len; i++)
            if (!childElementName || children[i].nodeName == childElementName) {
                var rinElement = new rin.internal.XElement(children[i]);
                out.push(rinElement);
                if (typeof elementOperation == "function") elementOperation(rinElement);
            }
        return out;
    },
    elementValue: function (childElementName, defaultValue) {
        var elem = this.element(childElementName);
        return elem ? elem.value() : defaultValue;
    },
    attributeValue: function (attributeName, defaultValue) {
        var attributes = this.xmlElement.attributes;
        for (var i = 0, len = attributes.length; i < len; i++)
            if (attributes[i].nodeName == attributeName) return attributes[i].value;
        return defaultValue;
    },
    value: function () {
        return this.xmlElement.text || this.xmlElement.textContent;
    }
};

rin.internal.XmlHelper = {
    parseXml: function (xmlString) {
        var xmlDoc;
        if (window.DOMParser) {
            var parser = new DOMParser();
            xmlDoc = parser.parseFromString(xmlString, "text/xml");
        }
        else // IE
        {
            xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
            xmlDoc.async = "false";
            xmlDoc.loadXML(xmlString);
        }
        return xmlDoc;
    },
    loadXml: function (xmlFileUrl) {
        var xmlDoc, xmlhttp;
        if (window.XMLHttpRequest) {
            xmlhttp = new XMLHttpRequest();
        }
        else {
            xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
        }
        xmlhttp.open("GET", xmlFileUrl, false);
        xmlhttp.send();
        xmlDoc = xmlhttp.responseXML;
        return xmlDoc;
    }
};