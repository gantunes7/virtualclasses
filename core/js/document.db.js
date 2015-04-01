//----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
//----------------------------------------------------------------------------

(function() {
    
    var root = this;
    
    var DocumentDB = {};
    
    DocumentDB.createClient = function(urlConnection, auth, connectionPolicy, consistencyLevel){
        return new DocumentClient(urlConnection, auth, connectionPolicy, consistencyLevel);
    };
    
    root.DocumentDB = DocumentDB;
    
    function initializeProperties(target, members, prefix) {
        var keys = Object.keys(members);
        var properties;
        var i, len;
        for (i = 0, len = keys.length; i < len; i++) {
            var key = keys[i];
            var enumerable = key.charCodeAt(0) !== /*_*/95;
            var member = members[key];
            if (member && typeof member === "object") {
                if (member.value !== undefined || typeof member.get === "function" || typeof member.set === "function") {
                    if (member.enumerable === undefined) {
                        member.enumerable = enumerable;
                    }
                    if (prefix && member.setName && typeof member.setName === "function") {
                        member.setName(prefix + "." + key)
                    }
                    properties = properties || {};
                    properties[key] = member;
                    continue;
                }
            }
            if (!enumerable) {
                properties = properties || {};
                properties[key] = { value: member, enumerable: enumerable, configurable: true, writable: true }
                continue;
            }
            target[key] = member;
        }
        if (properties) {
            Object.defineProperties(target, properties);
        }
    }

    /**
    *  Defines a new namespace with the specified name under the specified parent namespace.
    * @param {Object} parentNamespace - The parent namespace.
    * @param {String} name - The name of the new namespace.
    * @param {Object} members - The members of the new namespace.
    * @returns {Function} - The newly-defined namespace.
    */
    function defineWithParent(parentNamespace, name, members) {
        var currentNamespace = parentNamespace || {};

        if (name) {
            var namespaceFragments = name.split(".");
            for (var i = 0, len = namespaceFragments.length; i < len; i++) {
                var namespaceName = namespaceFragments[i];
                if (!currentNamespace[namespaceName]) {
                    Object.defineProperty(currentNamespace, namespaceName,
                        { value: {}, writable: false, enumerable: true, configurable: true }
                    );
                }
                currentNamespace = currentNamespace[namespaceName];
            }
        }

        if (members) {
            initializeProperties(currentNamespace, members, name || "<ANONYMOUS>");
        }

        return currentNamespace;
    }

    /**
    *  Defines a new namespace with the specified name.
    * @param {String} name - The name of the namespace. This could be a dot-separated name for nested namespaces.
    * @param {Object} members - The members of the new namespace.
    * @returns {Function} - The newly-defined namespace.
    */
    function define(name, members) {
        return defineWithParent(undefined, name, members);
    }

    /**
    *  Defines a class using the given constructor and the specified instance members.
    * @param {Function} constructor - A constructor function that is used to instantiate this class.
    * @param {Object} instanceMembers - The set of instance fields, properties, and methods to be made available on the class.
    * @param {Object} staticMembers - The set of static fields, properties, and methods to be made available on the class.
    * @returns {Function} - The newly-defined class.
    */
    function defineClass(constructor, instanceMembers, staticMembers) {
        constructor = constructor || function () { };
        if (instanceMembers) {
            initializeProperties(constructor.prototype, instanceMembers);
        }
        if (staticMembers) {
            initializeProperties(constructor, staticMembers);
        }
        return constructor;
    }

    /**
    *  Creates a sub-class based on the supplied baseClass parameter, using prototypal inheritance.
    * @param {Function} baseClass - The class to inherit from.
    * @param {Function} constructor - A constructor function that is used to instantiate this class.
    * @param {Object} instanceMembers - The set of instance fields, properties, and methods to be made available on the class.
    * @param {Object} staticMembers - The set of static fields, properties, and methods to be made available on the class.
    * @returns {Function} - The newly-defined class.
    */
    function derive(baseClass, constructor, instanceMembers, staticMembers) {
        if (baseClass) {
            constructor = constructor || function () { };
            var basePrototype = baseClass.prototype;
            constructor.prototype = Object.create(basePrototype);
            Object.defineProperty(constructor.prototype, "constructor", { value: constructor, writable: true, configurable: true, enumerable: true });
            if (instanceMembers) {
                initializeProperties(constructor.prototype, instanceMembers);
            }
            if (staticMembers) {
                initializeProperties(constructor, staticMembers);
            }
            return constructor;
        } else {
            return defineClass(constructor, instanceMembers, staticMembers);
        }
    }

    /**
    *  Defines a class using the given constructor and the union of the set of instance members
    *   specified by all the mixin objects. The mixin parameter list is of variable length.
    * @param {object} constructor - A constructor function that is used to instantiate this class.
    * @returns {Function} - The newly-defined class.
    */
    function mix(constructor) {
        constructor = constructor || function () { };
        var i, len;
        for (i = 1, len = arguments.length; i < len; i++) {
            initializeProperties(constructor.prototype, arguments[i]);
        }
        return constructor;
    }

var Base = {
    NotImplementedException: "NotImplementedException",

    defineWithParent : defineWithParent,
    
    define : define,

    defineClass: defineClass,

    derive: derive,
    
    mix: mix,

    extend: function(obj, extent) {
        for (var property in extent) {
            if (typeof(extent[property]) !== "function") {
                obj[property] = extent[property];
            } 
        }
        return obj;
    },

    map: function(list, fn) {
        var result = [];
        for (var i = 0, n = list.length; i < n; i++){
            result.push(fn(list[i]));
        }
        
        return result;
    },

    getHeaders: function(documentClient, defaultHeaders, verb, path, resourceId, resourceType, options) {

        var headers = Base.extend({}, defaultHeaders);
        options = options || {};
        
        if (options.continuation) {
            headers[Constants.HttpHeaders.Continuation] = options.continuation;
        }

        if (options.preTriggerInclude) {
            headers[Constants.HttpHeaders.PreTriggerInclude] = options.preTriggerInclude.constructor === Array? options.preTriggerInclude.join(","): options.preTriggerInclude;
        }

        if (options.postTriggerInclude) {
            headers[Constants.HttpHeaders.PostTriggerInclude] = options.postTriggerInclude.constructor === Array? options.postTriggerInclude.join(","): options.postTriggerInclude;
        }
        

        if (options.maxItemCount) {
            headers[Constants.HttpHeaders.PageSize] = options.maxItemCount;
        }

        if (options.accessCondition) {
            if (options.accessCondition.type === "IfMatch") {
                headers[Constants.HttpHeaders.IfMatch] = options.accessCondition.condition;
            } else {
                headers[Constants.HttpHeaders.IfNoneMatch] = options.accessCondition.condition;
            }
        }
        
        if (options.indexingDirective) {
            headers[Constants.HttpHeaders.IndexingDirective] = options.indexingDirective;
        }
        
        // TODO: add consistency level validation.
        if (options.consistencyLevel) {
            headers[Constants.HttpHeaders.ConsistencyLevel] = options.consistencyLevel;
        }
        
        if (options.resourceTokenExpirySeconds) {
            headers[Constants.HttpHeaders.ResourceTokenExpiry] = options.resourceTokenExpirySeconds;
        }
        
        // TODO: add session token automatic handling in case of session consistency.
        if (options.sessionToken) {
            headers[Constants.HttpHeaders.SessionToken] = options.sessionToken;
        }
        
        if (documentClient.masterKey) {
            headers[Constants.HttpHeaders.XDate] = new Date().toUTCString();
        }
        
        if (documentClient.masterKey || documentClient.resourceTokens) {
            headers[Constants.HttpHeaders.Authorization] = encodeURIComponent(AuthHandler.getAuthorizationHeader(documentClient, verb, path, resourceId, resourceType, headers));
        }
        
        if (verb === "post" || verb === "put") {
            if (!headers[Constants.HttpHeaders.ContentType]) {
                headers[Constants.HttpHeaders.ContentType] = Constants.MediaTypes.Json;
            }
        }
        
        if (!headers[Constants.HttpHeaders.Accept]) {
            headers[Constants.HttpHeaders.Accept] = Constants.MediaTypes.Json;
        }

        return headers;
    },
    
     /** @ignore */
    parsePath: function(resourcePath) {
        if (resourcePath[resourcePath.length - 1] !== "/") {
            resourcePath = resourcePath + "/";
        }

        if (resourcePath[0] !== "/") {
            resourcePath = "/" + resourcePath;
        }

        /*
        / The path will be in the form of /[resourceType]/[resourceId]/ .... /[resourceType]//[resourceType]/[resourceId]/ .... /[resourceType]/[resourceId]/ 
        / or /[resourceType]/[resourceId]/ .... /[resourceType]/[resourceId]/[resourceType]/[resourceId]/ .... /[resourceType]/[resourceId]/
        / The result of split will be in the form of [[[resourceType], [resourceId] ... ,[resourceType], [resourceId], ""]
        / In the first case, to extract the resourceId it will the element before last ( at length -2 ) and the the type will before it ( at length -3 )
        / In the second case, to extract the resource type it will the element before last ( at length -2 )
        */
        var pathParts = resourcePath.split("/");
        var id, type;
        if (pathParts.length % 2 === 0) {
            // request in form /[resourceType]/[resourceId]/ .... /[resourceType]/[resourceId].
            id = pathParts[pathParts.length - 2];
            type = pathParts[pathParts.length - 3];
        } else {
            // request in form /[resourceType]/[resourceId]/ .... /[resourceType]/.
            id = pathParts[pathParts.length - 3];
            type = pathParts[pathParts.length - 2];
        }
        
        var result = {
            type: type,
            objectBody: {
                id: id,
                self: resourcePath
            }
        };
        
        return result;
    },
    
     /** @ignore */
    getAttachmentIdFromMediaId: function(mediaId) {
        var buffer = new Buffer(mediaId, 'base64');
        var ResoureIdLength = 20;
        var attachmentId = "";
        if (buffer.length > ResoureIdLength) {
            attachmentId = buffer.toString('base64', 0, ResoureIdLength)
        } 
        else {
            attachmentId = mediaId;
        }
        
        return attachmentId;
    },
	
	/** @ignore */
	getHexaDigit: function() {
		return Math.floor(Math.random() * 16).toString(16);
	},
	
	/** @ignore */
	generateGuidId: function() {
		var id = "";
		
		for (var i = 0;i < 8; i++) {
			id+= Base.getHexaDigit();
		}
		
		id+= "-";
		
		for (var i = 0;i < 4; i++) {
			id+= Base.getHexaDigit();
		}
		
		id+= "-";
		
		for (var i = 0;i < 4; i++) {
			id+= Base.getHexaDigit();
		}
		
		id+= "-";
		
		for (var i = 0;i < 4; i++) {
			id+= Base.getHexaDigit();
		}
		
		id+= "-";
		
		for (var i = 0;i < 12; i++) {
			id+= Base.getHexaDigit();
		}
		
		return id;
	}
};

var Constants = {
    MediaTypes: {
        Any: "*/*",
        Json: "application/json",
        Xml: "application/xml",
        OctetStream: "application/octet-stream",
        SQL: "application/sql",
        ImageJpeg: "image/jpeg",
        ImagePng: "image/png",
        TextHtml: "text/html",
        TextPlain: "text/plain",
        Javascript: "application/x-javascript"
    },

    HttpMethods: {
        Get: "GET",
        Post: "POST",
        Put: "PUT",
        Delete: "DELETE",
        Head: "HEAD",
        Options: "OPTIONS"
    },

    HttpHeaders: {
        Authorization: "authorization",
        ETag: "etag",
        MethodOverride: "X-HTTP-Method",
        Slug: "Slug",
        ContentType: "Content-Type",
        LastModified: "Last-Modified",
        ContentEncoding: "Content-Encoding",
        CharacterSet: "CharacterSet",
        UserAgent: "User-Agent",
        IfModified_since: "If-Modified-Since",
        IfMatch: "If-Match",
        IfNoneMatch: "If-None-Match",
        ContentLength: "Content-Length",
        AcceptEncoding: "Accept-Encoding",
        KeepAlive: "Keep-Alive",
        CacheControl: "Cache-Control",
        TransferEncoding: "Transfer-Encoding",
        ContentLanguage: "Content-Language",
        ContentLocation: "Content-Location",
        ContentMd5: "Content-Md5",
        ContentRange: "Content-Range",
        Accept: "Accept",
        AcceptCharset: "Accept-Charset",
        AcceptLanguage: "Accept-Language",
        IfRange: "If-Range",
        IfUnmodifiedSince: "If-Unmodified-Since",
        MaxForwards: "Max-Forwards",
        ProxyAuthorization: "Proxy-Authorization",
        AcceptRanges: "Accept-Ranges",
        ProxyAuthenticate: "Proxy-Authenticate",
        RetryAfter: "Retry-After",
        SetCookie: "Set-Cookie",
        WwwAuthenticate: "Www-Authenticate",
        Origin: "Origin",
        Host: "Host",
        AccessControlAllowOrigin: "Access-Control-Allow-Origin",
        AccessControlAllowHeaders: "Access-Control-Allow-Headers",
        KeyValueEncodingFormat: "application/x-www-form-urlencoded",
        WrapAssertionFormat: "wrap_assertion_format",
        WrapAssertion: "wrap_assertion",
        WrapScope: "wrap_scope",
        SimpleToken: "SWT",
        HttpDate: "date",
        Prefer: "Prefer",
        Location: "Location",
        Referer: "referer",

        // Query
        Query: "x-ms-documentdb-query",
        IsQuery: "x-ms-documentdb-isquery",

        // Our custom DocumentDB headers
        Continuation: "x-ms-continuation",
        PageSize: "x-ms-max-item-count",

        // Request sender generated. Simply echoed by backend.
        ActivityId: "x-ms-activity-id",
        PreTriggerInclude: "x-ms-documentdb-pre-trigger-include",
        PreTriggerExclude: "x-ms-documentdb-pre-trigger-exclude",
        PostTriggerInclude: "x-ms-documentdb-post-trigger-include",
        PostTriggerExclude: "x-ms-documentdb-post-trigger-exclude",
        IndexingDirective: "x-ms-indexing-directive",
        SessionToken: "x-ms-session-token",
        ConsistencyLevel: "x-ms-consistency-level",
        XDate: "x-ms-date",
        CollectionPartitionInfo: "x-ms-collection-partition-info",
        CollectionServiceInfo: "x-ms-collection-service-info",
        RetryAfterInMilliseconds: "x-ms-retry-after-ms",
        IsFeedUnfiltered: "x-ms-is-feed-unfiltered",
        ResourceTokenExpiry: "x-ms-documentdb-expiry-seconds",

        // Version headers and values
        Version: "x-ms-version",
        
        //Quota Info
        MaxEntityCount: "x-ms-root-entity-max-count",
        CurrentEntityCount: "x-ms-root-entity-current-count",            
        CollectionQuotaInMb: "x-ms-collection-quota-mb",
        CollectionCurrentUsageInMb: "x-ms-collection-usage-mb",
        MaxMediaStorageUsageInMB: "x-ms-max-media-storage-usage-mb",
        CurrentMediaStorageUsageInMB: "x-ms-media-storage-usage-mb",
        DatabaseAccountCapacityUnitsConsumed:  "x-ms-database-capacity-units-consumed",
        DatabaseAccountCapacityUnitsProvisioned:  "x-ms-database-capacity-units-provisioned",
        DatabaseAccountConsumedDocumentStorageInMB:  "x-ms-databaseaccount-consumed-mb",
        DatabaseAccountReservedDocumentStorageInMB:  "x-ms-databaseaccount-reserved-mb",
        DatabaseAccountProvisionedDocumentStorageInMB:  "x-ms-databaseaccount-provisioned-mb",
        RequestCharge: "x-ms-request-charge"
    },
    
    CurrentVersion: "2014-08-21",
    
    UserAgent: "documentdb-nodejs-sdk-0.9.0"
}

var QueryIterator = Base.defineClass(
    /**
    * Represents a QueryIterator Object, an implmenetation of feed or query response that enables traversal and iterating over the response.
    * @constructor QueryIterator
    * @param {object} documentclient - The documentclient object.
    * @param {object} body           - the JSON body.
    */
    function(documentclient, query, options, fetchFunction){
        this.documentclient = documentclient;
        this.query = query;
        this.resources = [];
        this.current = 0;
        this.fetchFunction = fetchFunction;
        this.continuation = null;
        this.options = options || {};
        this._states = Object.freeze({start: "start", inProgress: "inProgress", ended: "ended" });
        this._state = this._states.start;
    },
    {
        /**
         * Execute a provided function once per feed element.
         * @memberof QueryIterator
         * @instance
         * @param {callback} callback - Function to execute for each element. the function takes two parameters error, element.
         * Note: the last element the callback will be called on will be undefined.
         * If the callback explicitly returned false, the loop gets stopped.
         */
        forEach: function(callback) {
            if (this._state !== this._states.start) {
                this.reset();
            }           
            
            this._forEachImplementation(callback);
        },
        
         /**
         * Execute a provided function on the next element in the QueryIterator.
         * @memberof QueryIterator
         * @instance
         * @param {callback} callback - Function to execute for each element. the function takes two parameters error, element.
         */
        nextItem: function(callback) {
            var that = this;
            if (this.current < this.resources.length) {
                return callback(undefined, this.resources[this.current++]);
            }
            
            if (this._state === this._states.start || (this.continuation && this._state === this._states.inProgress)) {
                this._fetchMore(function(err, resources){
                    if(err) {
                        return callback(err);
                    }
                    
                    that.resources = resources;
                    if (that.resources.length === 0) {
                        if (!that.continuation) {
                            that._state = that._states.ended;
                            callback(undefined, undefined);
                            return;
                        } else {
                            that.nextItem(callback);
                            return;
                        }
                    }

                    callback(undefined, that.resources[that.current++]);
                });
            } else {
                this._state = this._states.ended;
                callback(undefined, undefined);
            }
        },
        
        /**
         * Retrieve the current element on the QueryIterator.
         * @memberof QueryIterator
         * @instance
         * @returns {Object} The current resource in the QueryIterator, undefined if there isn't.
         */ 
        current: function(){
            return this.resources[this.current];
        },
        
        /**
         * Determine if there are still remaining resources to processs based on the value of the continuation token or the elements remaining on the current batch in the QueryIterator.
         * @memberof QueryIterator
         * @instance
         * @returns {Boolean} true if there is other elements to process in the QueryIterator.
         */ 
        hasMoreResults: function() {
            return this._state === this._states.start || this.continuation !== undefined || this.current < this.resources.length;
        },
        
        /**
         * Retrieve all the elements of the feed and pass them as an array to a function
         * @memberof QueryIterator
         * @instance
         * @param {callback} callback - Function execute on the feed response, takes two parameters error, resourcesList
         */
        toArray: function(callback){
            if (this._state !== this._states.start) {
                this.reset();
            }           
            
            this._toArrayImplementation(callback);
        },
        
        /**
         * Retrieve the next batch of the feed and pass them as an array to a function
         * @memberof QueryIterator
         * @instance
         * @param {callback} callback - Function execute on the feed response, takes two parameters error, resourcesList
         */
        executeNext: function(callback) {
            var that = this;
            this._fetchMore(function(err, resources, responseHeaders) {
                if(err) {
                    return callback(err);
                }
                
                callback(undefined, resources, responseHeaders);
            });
        },

        /**
         * Reset the QueryIterator to the beginning and clear all the resources inside it
         * @memberof QueryIterator
         * @instance
         */
        reset: function() {
            this.current = 0;
            this.continuation = null;
            this.resources = [];
            this._state = this._states.start;
        },
        
         /** @ignore */
        _toArrayImplementation: function(callback){
            var that = this;
            if (this._state === this._states.start || (this.continuation && this._state === this._states.inProgress)) {
                this._fetchMore(function(err, resources){
                    if(err) {
                        return callback(err);
                    }
                    
                    that.resources = that.resources.concat(resources);
                    that._toArrayImplementation(callback);
                });
            } else {
                this._state = this._states.ended;
                callback(undefined, this.resources);
            }
        },
        
         /** @ignore */
        _forEachImplementation: function(callback){
            var that = this;
            if (this._state === this._states.start || (this.continuation && this._state === this._states.inProgress)) {
                this._fetchMore(function(err, resources){
                    if(err) {
                        return callback(err);
                    }
                    
                    that.resources = resources;
                    while (that.current < that.resources.length) {
                        // if the callback explicitly returned false, the loop gets stopped.
                        if (callback(undefined, that.resources[that.current++]) === false) {
                            return;
                        }
                    }
                    
                    that._forEachImplementation(callback);
                });
            } else {
                that._state = that._states.ended;
                callback(undefined, undefined);
            }
        },
        
         /** @ignore */
        _fetchMore: function(callback){
            var that = this;
            this.options.continuation = this.continuation;
            this.fetchFunction(this.options, function(err, resources, responseHeaders){
				if(err) {
                    that._state = that._states.ended;
                    return callback(err);
                }
                
                that.continuation = responseHeaders[Constants.HttpHeaders.Continuation];
                that._state = that._states.inProgress;
                that.current = 0;
                callback(undefined, resources, responseHeaders);
            });
        }
    }
);

var AzureDocuments = Base.defineClass(null, null, 
    {
       /**
         * Represents a DatabaseAccount. A DatabaseAccount is the container for databases.
         * @global
         * @property {string} DatabasesLink 			                        -  The self-link for Databases in the databaseAccount.
         * @property {string} MediaLink  				                        -  The self-link for Media in the databaseAccount.
		 * @property {number} MaxMediaStorageUsageInMB  		                -  Attachment content (media) storage quota in MBs ( Retrieved from gateway ).
		 * @property {number} CurrentMediaStorageUsageInMB                      -  <p> Current attachment content (media) usage in MBs (Retrieved from gateway )<br>
                                                                                    Value is returned from cached information updated periodically and is not guaranteed to be real time. </p>
         * @property {number} CapacityUnitsConsumed                             -  The number is capacity units database account is currently consuming. <br>
                                                                                    Value is returned from cached information updated periodically and is not guaranteed to be real time. </p>
         * @property {number} CapacityUnitsProvisioned                          -  <p> The number of provisioned capacity units for the database account. <br>
                                                                                    Value is returned from cached information updated periodically and is not guaranteed to be real time. </p>         
         * @property {number} ConsumedDocumentStorageInMB  	                    -  <p> The cumulative sum of current sizes of created collection in MB.  <br>
                                                                                    Value is returned from cached information updated periodically and is not guaranteed to be real time. </p>         
         * @property {number} ReservedDocumentStorageInMB                       -  <p> The cumulative sum of maximum sizes of created collection in MB.  <br>       
                                                                                    Value is returned from cached information updated periodically and is not guaranteed to be real time. </p>         
         * @property {number} ProvisionedDocumentStorageInMB                    -  <p> The provisioned documented storage capacity for the database account. <br>    
                                                                                    Value is returned from cached information updated periodically and is not guaranteed to be real time. </p>         
         * @property {object} ConsistencyPolicy                                 -  Gets the UserConsistencyPolicy settings.
         * @property {string} ConsistencyPolicy.defaultConsistencyLevel         -  The default consistency level and it's of type {@link ConsistencyLevel}.
         * @property {number} ConsistencyPolicy.maxStalenessPrefix              -  In bounded staleness consistency, the maximum allowed staleness in terms difference in sequence numbers (aka version).
         * @property {number} ConsistencyPolicy.maxStalenessIntervalInSeconds   -  In bounded staleness consistency, the maximum allowed staleness in terms time interval.
         */
        DatabaseAccount : Base.defineClass(function() {
            Object.defineProperty(this, "DatabasesLink", {
                value: "",
                writable: true,
                configurable: true,
                enumerable: true
            });
			
			Object.defineProperty(this, "MediaLink", {
                value: "",
                writable: true,
                configurable: true,
                enumerable: true
            });
			
			Object.defineProperty(this, "MaxMediaStorageUsageInMB", {
                value: 0,
                writable: true,
                configurable: true,
                enumerable: true
            });
			
			Object.defineProperty(this, "CurrentMediaStorageUsageInMB", {
                value: 0,
                writable: true,
                configurable: true,
                enumerable: true
            });
			
			Object.defineProperty(this, "CapacityUnitsConsumed", {
                value: 0,
                writable: true,
                configurable: true,
                enumerable: true
            });
			
			Object.defineProperty(this, "CapacityUnitsProvisioned", {
                value: 0,
                writable: true,
                configurable: true,
                enumerable: true
            });
			
			Object.defineProperty(this, "ConsumedDocumentStorageInMB", {
                value: 0,
                writable: true,
                configurable: true,
                enumerable: true
            });
			
			Object.defineProperty(this, "ReservedDocumentStorageInMB", {
                value: 0,
                writable: true,
                configurable: true,
                enumerable: true
            });
			
			Object.defineProperty(this, "ProvisionedDocumentStorageInMB", {
                value: 0,
                writable: true,
                configurable: true,
                enumerable: true
            });
			
			Object.defineProperty(this, "ConsistencyPolicy", {
                value: "",
                writable: true,
                configurable: true,
                enumerable: true
            });
        }),
        
        /**
         * <p>Represents the consistency levels supported for DocumentDB client operations.<br>
         * The requested ConsistencyLevel must match or be weaker than that provisioned for the database account. Consistency levels.<br>
         * Consistency levels by order of strength are Strong, BoundedStaleness, Session and Eventual.</p>
         * @readonly
         * @enum {string}
         * @property Strong           Strong Consistency guarantees that read operations always return the value that was last written.
         * @property BoundedStaleness Bounded Staleness guarantees that reads are not too out-of-date. This can be configured based on number of operations (MaxStalenessPrefix) or time (MaxStalenessIntervalInSeconds).
         * @property Session          Session Consistency guarantees monotonic reads (you never read old data, then new, then old again), monotonic writes (writes are ordered)
                                      and read your writes (your writes are immediately visible to your reads) within any single session. 
         * @property Eventual         Eventual Consistency guarantees that reads will return a subset of writes. All writes 
                                      will be eventually be available for reads.
         */
        ConsistencyLevel : Object.freeze({
            Strong: "Strong",
            BoundedStaleness: "BoundedStaleness",
            Session: "Session",
            Eventual: "Eventual"
        }),
        
        
        /**
         * Specifies the supported indexing modes.
         * @readonly
         * @enum {string}
         * @property Consistent     <p>Index is updated synchronously with a create or update operation. <br>
                                    With consistent indexing, query behavior is the same as the default consistency level for the collection. The index is 
                                    always kept up to date with the data. </p>
         * @property Lazy           <p>Index is updated asynchronously with respect to a create or update operation. <br>
                                    With lazy indexing, queries are eventually consistent. The index is updated when the collection is idle.</p>
         */
        IndexingMode : Object.freeze({
            Consistent: "consistent",
            Lazy: "lazy",
        }),
        
		/**
		 * Specifies the supported Index types.
		 * @readonly
         * @enum {string}
		 * @property Hash 	This is supplied for a path which has no sorting requirement.
		 * 					This kind of an index has better precision than corresponding range index.
		 * 
		 * @property Range  This is supplied for a path which requires sorting.
		 */
		 
		IndexType : Object.freeze({
            Hash: "Hash",
            Range: "Range",
        }),

        Protocol : Object.freeze({
            Tcp: 1,
            Https: 2,
        }),

        ConnectionMode : Object.freeze({
            Direct: 0,
            Gateway: 1,
        }),       
         
         
        /**
         * Enum for media read mode values.
         * @readonly
         * @enum {sting}
         * @property Buffered Content is buffered at the client and not directly streamed from the content store.
                              <p>Use Buffered to reduce the time taken to read and write media files.</p> 
         * @property Streamed Content is directly streamed from the content store without any buffering at the client.
                              <p>Use Streamed to reduce the client memory overhead of reading and writing media files. </p>
         */ 
        MediaReadMode : Object.freeze({
            Buffered: "Buffered",
            Streamed: "Streamed"
        }),
         
        /**
         * Enum for permission mode values.
         * @readonly
         * @enum {string}
         * @property None Permission not valid.
         * @property Read Permission applicable for read operations only.
         * @property All Permission applicable for all operations.
         */ 
        PermissionMode: Object.freeze({
            None: "none",
            Read: "read",
            All: "all"
        }),

        /**
         * Enum for trigger type values.
         * Specifies the type of the trigger.
         * @readonly
         * @enum {string}
         * @property Pre  Trigger should be executed before the associated operation(s).
         * @property Post Trigger should be executed after the associated operation(s).
         */
        TriggerType: Object.freeze({
            Pre: "pre",
            Post: "post",
        }),

        /**
         * Enum for trigger operation values.
         * specifies the operations on which a trigger should be executed.
         * @readonly
         * @enum {string}
         * @property All All operations.
         * @property Create Create operations only.
         * @property Update Update operations only.
         * @property Delete Delete operations only.
         * @property Replace Replace operations only.
         */
        TriggerOperation: Object.freeze({
            All: "all",
            Create: "create",
            Update: "update",
            Delete: "delete",
            Replace: "replace"
        }),
        
        /**
         * Enum for udf type values.
         * Specifies the types of user defined functions.
         * @readonly
         * @enum {string}
         * @property Javascript Javascript type.
         */
        UserDefinedFunctionType: Object.freeze({
            Javascript: "Javascript"
        }),
         
        /**
         * @global
         * Represents the Connection policy assocated with a DocumentClient.
         * @property {string} MediaReadMode         -  Attachment content (aka media) download mode. Should be one of the values of {@link MediaReadMode}
         * @property {number} MediaRequestTimeout    - Time to wait for response from network peer for attachment content (aka media) operations. Represented in milliseconds.
         * @property {number} RequestTimeout         - Request timeout (time to wait for response from network peer). Represented in milliseconds.
        */
        ConnectionPolicy : Base.defineClass(function() {
            Object.defineProperty(this, "_defaultMaxConnections", {
                value: 20,
                writable: true,
                configurable: true,
                enumerable: false // this is the default value, so it could be excluded during JSON.stringify
            });

            Object.defineProperty(this, "_defaultMaxConcurrentCallsPerConnection", {
                value: 50,
                writable: true,
                configurable: true,
                enumerable: false // this is the default value, so it could be excluded during JSON.stringify
            });

            Object.defineProperty(this, "_defaultRequestTimeout", {
                value: 10000,
                writable: true,
                configurable: true,
                enumerable: false // this is the default value, so it could be excluded during JSON.stringify
            });

            // defaultMediaRequestTimeout is based upon the blob client timeout and the retry policy.
            Object.defineProperty(this, "_defaultMediaRequestTimeout", {
                value: 300000,
                writable: true,
                configurable: true,
                enumerable: false // this is the default value, so it could be excluded during JSON.stringify
            });

            this.ConnectionMode = AzureDocuments.ConnectionMode.Gateway;
            this.ConnectionProtocol = AzureDocuments.Protocol.Https; 
            this.MediaReadMode = AzureDocuments.MediaReadMode.Buffered;
            this.MediaRequestTimeout = this._defaultMediaRequestTimeout;
            this.RequestTimeout = this._defaultRequestTimeout;
            this.MaxCallsPerConnections = this._defaultMaxConcurrentCallsPerConnection; // for direct connectivity
            this.MaxConnections = this._defaultMaxConnections; // for direct connectivity
        })
    }
);
var RequestHandler = {
    _createXmlHttpRequest: function () {
        if (window.XMLHttpRequest) {
            return new window.XMLHttpRequest();
        }
        var exception;
        if (window.ActiveXObject) {
            try {
                return new window.ActiveXObject("Msxml2.XMLHTTP.6.0");
            } catch (_) {
                try {
                    return new window.ActiveXObject("Msxml2.XMLHTTP.3.0");
                } catch (e) {
                    exception = e;
                }
            }
        } else {
            exception = { message: "XMLHttpRequest not supported" };
        }
        throw exception;
    },

    _readResponseHeaders: function(xhr, headers) {
        var responseHeadersString = xhr.getAllResponseHeaders();
        if (responseHeadersString) {
            var responseHeaders = responseHeadersString.split(/\r?\n/);
            var i, len;
            for (i = 0, len = responseHeaders.length; i < len; i++) {
                if (responseHeaders[i]) {
                    var header = responseHeaders[i].split(": ");
                    headers[header[0]] = header[1];
                }
            }
        }
    }, 
    
    _addRequestHeaders: function(xhr, headers) {
         // Set the name/value pairs.
        if (headers) {
            for (var name in headers) {
                xhr.setRequestHeader(name, headers[name]);
            }
        }
    },
    
    _preProcessUrl: function(url, path, queryParams) {
        path = path || "";
        queryParams = queryParams || "";
        return url + path + "?" + queryParams;
    },
    
    request: function(connectionPolicy, method, url, path, data, queryParams, requestHeaders, callback) {
        var requestObject = {};
        var xhr = null;
        url = this._preProcessUrl(url, path, queryParams);
        var isMedia = ( path.indexOf("media") > -1 );
        var done = false;

        requestObject.abort = function() {
            if (done) {
                return;
            }

            done = true;
            if (xhr) {
                xhr.abort();
                xhr = null;
            }

            callback({ message: "Request aborted" });
        };

        var handleTimeout = function() {
            if (!done) {
                done = true;
                xhr = null;
                callback({ message: "Request timed out" });
            }
        };

        var name;
        xhr = this._createXmlHttpRequest();
        var that = this;
        xhr.onreadystatechange = function() {
            if (done || xhr === null || xhr.readyState !== 4) {
                return;
            }

            // Workaround for XHR behavior on IE.
            var statusText = xhr.statusText;
            var statusCode = xhr.status;
            if (statusCode === 1223) {
                statusCode = 204;
                statusText = "No Content";
            }

            var headers = {};
            that._readResponseHeaders(xhr, headers);
            var data =  xhr.responseText;
            done = true;
            xhr = null;
            if (statusCode >= 300) {
                return callback({code: statusCode, body:data});
            } else {
                var result;
                try {
                    if (isMedia) {
                        result = data;
                    } else {
                        result = data.length > 0 ? JSON.parse(data) : undefined;
                    }
                } catch (exception) {
                   return callback(exception);
                }

                return callback(undefined, result, headers);
            }
        };

        xhr.open(method || "GET", url, true);
        this._addRequestHeaders(xhr, requestHeaders);
        
        // Set the timeout if available.
        if (isMedia) {
            xhr.timeout = connectionPolicy.MediaRequestTimeout;
        } else {
            xhr.timeout = connectionPolicy.RequestTimeout;
        }
        xhr.ontimeout = handleTimeout;

		if (typeof(data) === "object") {
			data = JSON.stringify(data);
		}
		
        xhr.send(data);

        return requestObject;
    }
}
var AuthHandler = {
    getAuthorizationHeader: function (documentClient, verb, path, resourceId, resourceType, headers) {
        if (documentClient.resourceTokens) {
            return this.getAuthorizationTokenUsingResourceTokens(documentClient.resourceTokens, path, resourceId);
        } else if (documentClient.masterKey) {
			return this.getAuthorizationTokenUsingMasterKey(verb, resourceId, resourceType, headers, documentClient.masterKey);
		}

        return "";
    },

	getAuthorizationTokenUsingMasterKey: function(verb, resourceId, resourceType, headers, masterKey) {
		throw "Authentication for javascript client doesn't currently support master key, please use resource tokens instead";
	},
	
    getAuthorizationTokenUsingResourceTokens: function (resourceTokens, path, resourceId) {
        if (resourceTokens[resourceId]) {
            return resourceTokens[resourceId];
        } else {
            var pathParts = path.split("/");
            var resourceTypes = ["dbs", "colls", "docs", "sprocs", "udfs", "triggers", "users", "permissions", "attachments", "media", "conflicts"];
            for (var i = pathParts.length - 1; i >= 0; i--) {
                if (resourceTypes.indexOf(pathParts[i]) === -1) {
                    if (resourceTokens[pathParts[i]]) {
                        return resourceTokens[pathParts[i]];
                    }
                }
            }
        }
    }
}
var DocumentClient = Base.defineClass(
    /**
     * Provides a client-side logical representation of the Azure DocumentDB database account. This client is used to configure and execute requests against the service.
     * @constructor DocumentClient
     * @param {string} urlConnection           - The service endpoint to use to create the client.
     * @param {object} auth                    - An object that is used for authenticating requests and must contains one of the options
     * @param {string} [auth.masterkey]        - The authorization master key to use to create the client.
     * @param {Object} [auth.resourceTokens]   - An object that contains resources tokens. Keys for the object are resource Ids and values are the resource tokens.
     * @param {Array}  [auth.permissionFeed]   - An array of {@link Permission} objects.                              
     * @param {object} [connectionPolicy]      - An instance of {@link ConnectionPolicy} class. This parameter is optional and the default connectionPolicy will be used if omitted.
     * @param {string} [consistencyLevel]      - An optional parameter that represents the consistency level. It can take any value from {@link ConsistencyLevel}.
    */
    function DocumentClient(urlConnection, auth, connectionPolicy, consistencyLevel) {
        this.urlConnection = urlConnection;
        if( auth !== undefined ) {
            this.masterKey = auth.masterKey;
            this.resourceTokens = auth.resourceTokens;
            if (auth.permissionFeed) {
                this.resourceTokens = {};
                for (var i = 0; i < auth.permissionFeed.length; i++ ){
                    var resourceParts = auth.permissionFeed[i].resource.split("/");
                    var rid = resourceParts[resourceParts.length - 1];
                    this.resourceTokens[rid] = auth.permissionFeed[i]._token;
	            }
            }
        }
        
        this.connectionPolicy = connectionPolicy || new AzureDocuments.ConnectionPolicy();
        this.defaultHeaders = {};
        this.defaultHeaders[Constants.HttpHeaders.CacheControl] = "no-cache";
        this.defaultHeaders[Constants.HttpHeaders.Version] = Constants.CurrentVersion; 
        if (consistencyLevel !== undefined){
            this.defaultHeaders[Constants.HttpHeaders.ConsistencyLevel] = consistencyLevel;
        }
        
        if (Constants.UserAgent) {
            this.defaultHeaders[Constants.HttpHeaders.UserAgent] = Constants.UserAgent;
        }
        
        // overide this for default query params to be added to the url.
        this.defaultUrlParams = "";
    },
    {
        /** Send a request for creating a database. 
         * <p>
         *  A database manages users, permissions and a set of collections.  <br>
         *  Each Azure DocumentDB Database Account is able to support multiple independent named databases, with the database being the logical container for data. <br>
         *  Each Database consists of one or more collections, each of which in turn contain one or more documents. Since databases are an an administrative resource, the Service Master Key will be required in order to access and successfully complete any action using the User APIs. <br>
         * </p>
         * @memberof DocumentClient
         * @instance
         * @param {Object} body              - A json object that represents The database to be created.
         * @param {string} body.id           - The id of the database.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request.
        */
        createDatabase: function (body, options, callback) {
            if (!callback) {
                callback = options;
            }

            var path = "/dbs";
            this.create(body, path, "dbs", undefined, undefined, options, callback);
        },
        
        /**
         * Creates a collection.
         * <p>
         * A collection is a named logical container for documents. <br>
         * A database may contain zero or more named collections and each collection consists of zero or more JSON documents. <br>
         * Being schema-free, the documents in a collection do not need to share the same structure or fields. <br>
         * Since collections are application resources, they can be authorized using either the master key or resource keys. <br>
         * </p>
         * @memberof DocumentClient
         * @instance
         * @param {string} databaseLink                  - The self-link of the database.
         * @param {object} body                          - Represents the body of the collection.
         * @param {string} body.id                       - The id of the collection.
         * @param {IndexingPolicy} body.indexingPolicy   - The indexing policy associated with the collection.
         * @param {RequestOptions} [options]             - The request options.
         * @param {RequestCallback} callback             - The callback for the request.
         */
        createCollection: function (databaseLink, body, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }
            
            var path = "/" + databaseLink + "colls/";
            var resourceInfo = Base.parsePath(databaseLink);
            this.create(body, path, "colls", resourceInfo.objectBody.id, undefined, options, callback);
        },
        
        /**
         * Create a document.
         * <p> 
         * There is no set schema for JSON documents. They may contain any number of custom properties as well as an optional list of attachments. <br>
         * A Document is an application resource and can be authorized using the master key or resource keys
         * </p>
         * @memberof DocumentClient
         * @instance
         * @param {string} collectionLink    						- The self-link of the collection.
         * @param {object} body              						- Represents the body of the document. Can contain any number of user defined properties.
         * @param {string} [body.id]         						- The id of the document, MUST be unique for each document.
         * @param {RequestOptions} [options] 						- The request options.
		 * @param {boolean} [options.disableAutomaticIdGeneration]	- Disables the automatic id generation. If id is missing in the body and this option is true, an error will be returned.
         * @param {RequestCallback} callback 						- The callback for the request.
         */
        createDocument: function (collectionLink, body, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

			// Generate random document id if the id is missing in the payload and options.disableAutomaticIdGeneration != true
			if ((body.id === undefined || body.id === "") && !options.disableAutomaticIdGeneration) {
				body.id = Base.generateGuidId();
			}
			
            var path = "/" + collectionLink + "docs/";
            var resourceInfo = Base.parsePath(collectionLink);
            this.create(body, path, "docs", resourceInfo.objectBody.id, undefined, options, callback);
        },

        /**
         * Create an attachment for the document object.
         * <p>
         * Each document may contain zero or more attachemnts. Attachments can be of any MIME type - text, image, binary data. <br>
         * These are stored externally in Azure Blob storage. Attachments are automatically deleted when the parent document is deleted. 
         * </P>
         * @memberof DocumentClient
         * @instance
         * @param {string} documentLink         - The self-link of the document.
         * @param {Object} body                 - The metadata the defines the attachment media like media, contentType. It can include any other properties as part of the metedata.
         * @param {string} body.contentType     - The MIME contentType of the attachment.
         * @param {string} body.media           - Media link associated with the attachment content.
         * @param {RequestOptions} options      - The request options.
         * @param {RequestCallback} callback    - The callback for the request.
        */
        createAttachment: function (documentLink, body, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + documentLink + "attachments/";
            var resourceInfo = Base.parsePath(documentLink);
            this.create(body, path, "attachments", resourceInfo.objectBody.id, undefined, options, callback);
        },
        
        /**
         * Create a database user.
         * @memberof DocumentClient
         * @instance
         * @param {string} databaseLink         - The self-link of the database.
         * @param {object} body                 - Represents the body of the user.
         * @param {string} body.id              - The id of the user.
         * @param {RequestOptions} [options]    - The request options.
         * @param {RequestCallback} callback    - The callback for the request.
         */
        createUser: function (databaseLink, body, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + databaseLink + "users/";
            var resourceInfo = Base.parsePath(databaseLink);
            this.create(body, path, "users", resourceInfo.objectBody.id, undefined, options, callback);
        },

        /**
         * Create a permission.
         * <p> A permission represents a per-User Permission to access a specific resource e.g. Document or Collection.  </p>
         * @memberof DocumentClient
         * @instance
         * @param {string} userLink             - The self-link of the user.
         * @param {object} body                 - Represents the body of the permission.
         * @param {string} body.id              - The id of the permission
         * @param {string} body.permissionMode  - The mode of the permission, must be a value of {@link PermissionMode}
         * @param {string} body.resource        - The link of the resource that the permission will be applied to.
         * @param {RequestOptions} [options]    - The request options.
         * @param {RequestCallback} callback    - The callback for the request.
         */
        createPermission: function(userLink, body, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }
            
            var path = "/" + userLink + "permissions/";
            var resourceInfo = Base.parsePath(userLink);
            this.create(body, path, "permissions", resourceInfo.objectBody.id, undefined, options, callback);
        },

         /**
         * Create a trigger.
         * <p>
         * DocumentDB supports pre and post triggers defined in JavaScript to be executed on creates, updates and deletes. <br>
         * For additional details, refer to the server-side JavaScript API documentation. 
         * </p>
         * @memberof DocumentClient
         * @instance
         * @param {string} collectionLink           - The self-link of the collection.
         * @param {object} trigger                  - Represents the body of the trigger.
         * @param {string} trigger.id             - The id of the trigger.
         * @param {string} trigger.triggerType      - The type of the trigger, should be one of the values of {@link TriggerType}.
         * @param {string} trigger.triggerOperation - The trigger operation, should be one of the values of {@link TriggerOperation}.
         * @param {function} trigger.serverScript   - The body of the trigger, it can be passed as stringified too.
         * @param {RequestOptions} [options]        - The request options.
         * @param {RequestCallback} callback        - The callback for the request.
         */
        createTrigger: function (collectionLink, trigger, options, callback) {
            var that = this;

            if (!callback) {
                callback = options;
                options = {};
            }

            if (trigger.serverScript) {
                trigger.body = trigger.serverScript.toString();
            } else if (trigger.body) {
                trigger.body = trigger.body.toString();
            } 
            
            var resourceInfo = Base.parsePath(collectionLink);
            var path = "/" + collectionLink + "triggers/";
            this.create(trigger, path, "triggers", resourceInfo.objectBody.id, undefined, options, callback);
        },
        
        /**
         * Create a UserDefinedFunction.
         * <p>
         * DocumentDB supports JavaScript UDFs which can be used inside queries, stored procedures and triggers. <br>
         * For additional details, refer to the server-side JavaScript API documentation.
         * </p>
         * @memberof DocumentClient
         * @instance
         * @param {string} collectionLink                - The self-link of the collection.
         * @param {object} udf                           - Represents the body of the userDefinedFunction.
         * @param {string} udf.id                      - The id of the udf.
         * @param {string} udf.userDefinedFunctionType   - The type of the udf, it should be one of the values of {@link UserDefinedFunctionType}
         * @param {function} udf.serverScript            - Represents the body of the udf, it can be passed as stringified too.
         * @param {RequestOptions} [options]             - The request options.
         * @param {RequestCallback} callback             - The callback for the request.
         */
        createUserDefinedFunction: function (collectionLink, udf, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }
            
            if (udf.serverScript) {
                udf.body = udf.serverScript.toString();
            } else if (udf.body) {
                udf.body = udf.body.toString();
            } 
            
            var path = "/" + collectionLink + "udfs/";
            var resourceInfo = Base.parsePath(collectionLink);
            this.create(udf, path, "udfs", resourceInfo.objectBody.id, undefined, options, callback);
        },
        
        /**
         * Create a StoredProcedure.
         * <p>
         * DocumentDB allows stored procedures to be executed in the storage tier, directly against a document collection. The script <br>
         * gets executed under ACID transactions on the primary storage partition of the specified collection. For additional details, <br>
         * refer to the server-side JavaScript API documentation. 
         * </p>
         * @memberof DocumentClient
         * @instance
         * @param {string} collectionLink       - The self-link of the collection.
         * @param {object} sproc                - Represents the body of the stored procedure.
         * @param {string} sproc.id           - The id of the stored procedure.
         * @param {function} sproc.serverScript - The body of the stored procedure, it can be passed as stringified too.
         * @param {RequestOptions} [options]    - The request options.
         * @param {RequestCallback} callback    - The callback for the request.
         */
        createStoredProcedure: function (collectionLink, sproc, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            if (sproc.serverScript) {
                sproc.body = sproc.serverScript.toString();
            } else if (sproc.body) {
                sproc.body = sproc.body.toString();
            }
            
            var path = "/" + collectionLink + "sprocs/";
            var resourceInfo = Base.parsePath(collectionLink);
            this.create(sproc, path, "sprocs", resourceInfo.objectBody.id, undefined, options, callback);
        },
        
        /**
         * Create an attachment for the document object.
         * @memberof DocumentClient
         * @instance
         * @param {string} documentLink             - The self-link of the document.
         * @param {stream.Readable} readableStream  - the stream that represents the media itself that needs to be uploaded.
         * @param {MediaOptions} [options]          - The request options.
         * @param {RequestCallback} callback        - The callback for the request.
        */
        createAttachmentAndUploadMedia: function(documentLink, readableStream, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }
            
            options = options || {};
            
            var initialHeaders = Base.extend({}, this.defaultHeaders);

            // Add required headers slug and content-type.
            if (options.slug) {
                initialHeaders[Constants.HttpHeaders.Slug] = options.slug;
            }

            if (options.contentType) {
                initialHeaders[Constants.HttpHeaders.ContentType] = options.contentType;
            } else {
                initialHeaders[Constants.HttpHeaders.ContentType] = Constants.MediaTypes.OctetStream;
            }
            
            var path = "/" + documentLink + "attachments/";
            var resourceInfo = Base.parsePath(documentLink);
            this.create(readableStream, path, "attachments", resourceInfo.objectBody.id, initialHeaders, options, callback);
        },
        
        /** Reads a database. 
         * @memberof DocumentClient
         * @instance
         * @param {string} databaseLink         - The self-link of the database.
         * @param {RequestOptions} [options]    - The request options.
         * @param {RequestCallback} callback    - The callback for the request.
        */
        readDatabase: function (databaseLink, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + databaseLink;
            var resourceInfo = Base.parsePath(databaseLink);
            this.read(path, "dbs", resourceInfo.objectBody.id, undefined, options, callback);
        },

        /**
         * Reads a collection.
         * @memberof DocumentClient
         * @instance
         * @param {string} collectionLink       - The self-link of the collection.
         * @param {RequestOptions} [options]    - The request options.
         * @param {RequestCallback} callback    - The callback for the request.
         */
        readCollection: function (collectionLink, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + collectionLink;
            var resourceInfo = Base.parsePath(collectionLink);
            this.read(path, "colls", resourceInfo.objectBody.id, undefined, options, callback)
        },
        
        /**
         * Reads a document.
         * @memberof DocumentClient
         * @instance
         * @param {string} documentLink         - The self-link of the document.
         * @param {RequestOptions} [options]    - The request options.
         * @param {RequestCallback} callback    - The callback for the request.
         */
        readDocument: function (documentLink, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + documentLink;
            var resourceInfo = Base.parsePath(documentLink);
            this.read(path, "docs", resourceInfo.objectBody.id, undefined, options, callback);
        },
        
        /**
         * Reads an Attachment object.
         * @memberof DocumentClient
         * @instance
         * @param {string} attachmentLink    - The self-link of the attachment.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request.
        */
        readAttachment: function (attachmentLink, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + attachmentLink;
            var resourceInfo = Base.parsePath(attachmentLink);
            this.read(path, "attachments", resourceInfo.objectBody.id, undefined, options, callback);
        },
        
        /**
         * Reads a user.
         * @memberof DocumentClient
         * @instance
         * @param {string} userLink          - The self-link of the user.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request.
         */
        readUser: function (userLink, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + userLink;
            var resourceInfo = Base.parsePath(userLink);
            this.read(path, "users", resourceInfo.objectBody.id, undefined, options, callback);
        },
        
        /**
         * Reads a permission.
         * @memberof DocumentClient
         * @instance
         * @param {string} permissionLink    - The self-link of the permission.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request.
         */
        readPermission: function (permissionLink, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + permissionLink;
            var resourceInfo = Base.parsePath(permissionLink);
            this.read(path, "permissions", resourceInfo.objectBody.id, undefined, options, callback);
        },
        
        /**
         * Reads a trigger object.
         * @memberof DocumentClient
         * @instance
         * @param {string} triggerLink       - The self-link of the trigger.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request.
         */
        readTrigger: function (triggerLink, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var resourceInfo = Base.parsePath(triggerLink);
            var path = "/" + triggerLink;
            this.read(path, "triggers", resourceInfo.objectBody.id, undefined, options, callback);
        },
        
        /**
         * Reads a udf object.
         * @memberof DocumentClient
         * @instance
         * @param {string} udfLink           - The self-link of the user defined function.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request.
         */
        readUserDefinedFunction: function (udfLink, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + udfLink;
            var resourceInfo = Base.parsePath(udfLink);
            this.read(path, "udfs", resourceInfo.objectBody.id, undefined, options, callback);
        },
        
        /**
         * Reads a StoredProcedure object.
         * @memberof DocumentClient
         * @instance
         * @param {string} sprocLink         - The self-link of the stored procedure.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request.
         */
        readStoredProcedure: function (sprocLink, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + sprocLink;
            var resourceInfo = Base.parsePath(sprocLink);
            this.read(path, "sprocs", resourceInfo.objectBody.id, undefined, options, callback);
        },
       
        /**
         * Reads a conflict.
         * @memberof DocumentClient
         * @instance
         * @param {string} conflictLink      - The self-link of the conflict.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request.
         */
        readConflict: function (conflictLink, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + conflictLink;
            var resourceInfo = Base.parsePath(conflictLink);
            this.read(path, "conflicts", resourceInfo.objectBody.id, undefined, options, callback);
        },
       
        /** lLsts all databases. 
         * @memberof DocumentClient
         * @instance
         * @param {FeedOptions} [options] - The feed options.
         * @returns {QueryIterator}       - An instance of queryIterator to handle reading feed.
        */
        readDatabases: function (options) {
            return this.queryDatabases(undefined, options);
        },

        /**
         * Get all collections in this database.
         * @memberof DocumentClient
         * @instance
         * @param {string} databaseLink   - The self-link of the database.
         * @param {FeedOptions} [options] - The feed options.
         * @returns {QueryIterator}       - An instance of queryIterator to handle reading feed.
         */
        readCollections: function (databaseLink, options) {
            return this.queryCollections(databaseLink, undefined, options);
        },

        /**
         * Get all documents in this collection.
         * @memberof DocumentClient
         * @instance
         * @param {string} collectionLink - The self-link of the collection.
         * @param {FeedOptions} [options] - The feed options.
         * @returns {QueryIterator}       - An instance of queryIterator to handle reading feed.
         */
        readDocuments:  function (collectionLink, options) {
            return this.queryDocuments(collectionLink, undefined, options);
        },
        
         /**
         * Get all attachments for this document.
         * @memberof DocumentClient
         * @instance
         * @param {string} documentLink   - The self-link of the document.
         * @param {FeedOptions} [options] - The feed options.
         * @returns {QueryIterator}       - An instance of queryIterator to handle reading feed.
        */
        readAttachments: function (documentLink, options) {
            return this.queryAttachments(documentLink, undefined, options);
        },

        /**
         * Get all users in this database.
         * @memberof DocumentClient
         * @instance
         * @param {string} databaseLink       - The self-link of the database.
         * @param {FeedOptions} [feedOptions] - The feed options.
         * @returns {QueryIterator}           - An instance of queryIterator to handle reading feed.
         */
        readUsers: function (databaseLink, options) {
            return this.queryUsers(databaseLink, undefined, options);
        },

        /**
         * Get all permissions for this user.
         * @memberof DocumentClient
         * @instance
         * @param {string} userLink           - The self-link of the user.
         * @param {FeedOptions} [feedOptions] - The feed options.
         * @returns {QueryIterator}           - An instance of queryIterator to handle reading feed.
         */
        readPermissions: function(userLink, options) {
            return this.queryPermissions(userLink, undefined, options);
        },

        /**
         * Get all triggers in this collection.
         * @memberof DocumentClient
         * @instance
         * @param {string} collectionLink   - The self-link of the collection.
         * @param {FeedOptions} [options]   - The feed options.
         * @returns {QueryIterator}         - An instance of queryIterator to handle reading feed.
         */
        readTriggers:  function (collectionLink, options) {
            return this.queryTriggers(collectionLink, undefined, options);
        },
        
        /**
         * Get all UserDefinedFunctions in this collection.
         * @memberof DocumentClient
         * @instance
         * @param {string} collectionLink - The self-link of the collection.
         * @param {FeedOptions} [options] - The feed options.
         * @returns {QueryIterator}       - An instance of queryIterator to handle reading feed.
         */
        readUserDefinedFunctions:  function (collectionLink, options) {
            return this.queryUserDefinedFunctions(collectionLink, undefined, options);
        },
        
        /**
         * Get all StoredProcedures in this collection.
         * @memberof DocumentClient
         * @instance
         * @param {string} collectionLink - The self-link of the collection.
         * @param {FeedOptions} [options] - The feed options.
         * @returns {QueryIterator}       - An instance of queryIterator to handle reading feed.
         */
        readStoredProcedures:  function (collectionLink, options, callback) {
            return this.queryStoredProcedures(collectionLink, undefined, options);
        },
      
        /**
         * Get all conflicts in this collection.
         * @memberof DocumentClient
         * @instance
         * @param {string} collectionLink - The self-link of the collection.
         * @param {FeedOptions} [options] - The feed options.
         * @returns {QueryIterator}       - An instance of QueryIterator to handle reading feed.
         */
        readConflicts:  function (collectionLink, options) {
            var that = this;
            var path = "/" + collectionLink + "conflicts/";
            var resourceInfo = Base.parsePath(collectionLink);
            return new QueryIterator(this, "", options, function(options, callback){
                that.queryFeed.call(that,
                    that,
                    path,
                    "conflicts",
                    resourceInfo.objectBody.id,
                    function(result) { return result.Conflicts; },
                    function(parent, body) { return body; },
                    "",
                    options,
                    callback);
            }); 
        },
   
        /** Lists all databases that satisfy a query. 
         * @memberof DocumentClient
         * @instance
         * @param {string} query          - A SQL query string.
         * @param {FeedOptions} [options] - The feed options.
         * @returns {QueryIterator}       - An instance of QueryIterator to handle reading feed.
        */
        queryDatabases: function (query, options) {
            var that = this;
            return new QueryIterator(this, query, options, function (options, callback) {
                that.queryFeed.call(that,
                        that,
                        "/dbs",
                        "dbs",
                        "",
                        function (result) { return result.Databases; },
                        function (parent, body) { return body; },
                        query,
                        options,
                        callback);
            });
        },
        
        /**
         * Query the collections for the database.
         * @memberof DocumentClient
         * @instance
         * @param {string} databaseLink     - The self-link of the database.
         * @param {string} query            - A SQL query string.
         * @param {FeedOptions} [options]   - Represents the feed options.
         * @returns {QueryIterator} - An instance of queryIterator to handle reading feed.
         */
        queryCollections: function (databaseLink, query, options) {
            var that = this;
            var path = "/" + databaseLink + "colls/";
            var resourceInfo = Base.parsePath(databaseLink);
            return new QueryIterator(this, query, options, function(options, callback) {
                that.queryFeed.call(that,
                    that,
                    path,
                    "colls",
                    resourceInfo.objectBody.id,
                    function(result) { return result.DocumentCollections; },
                    function(parent, body) { return body; },
                    query,
                    options,
                    callback);
            });
        },
         
        /**
         * Query the documents for the collection.
         * @memberof DocumentClient
         * @instance
         * @param {string} collectionLink   - The self-link of the collection.
         * @param {string} query            - A SQL query string.
         * @param {FeedOptions} [options]   - Represents the feed options.
         * @returns {QueryIterator}         - An instance of queryIterator to handle reading feed.
         */
        queryDocuments: function (collectionLink, query, options) {
            var that = this;
            var path = "/" + collectionLink + "docs/";
            var resourceInfo = Base.parsePath(collectionLink);
            return new QueryIterator(this, query, options, function(options, callback){
                that.queryFeed.call(that,
                    that,
                    path,
                    "docs",
                    resourceInfo.objectBody.id,
                    function(result) { return result.Documents; },
                    function(parent, body) { return body; },
                    query,
                    options,
                    callback);
            });
        },
         
        /**
         * Query the attachments for the document.
         * @memberof DocumentClient
         * @instance
         * @param {string} documentLink     - The self-link of the document.
         * @param {string} query            - A SQL query string.
         * @param {FeedOptions} [options]   - Represents the feed options.
         * @returns {QueryIterator}         - An instance of queryIterator to handle reading feed.
        */
        queryAttachments: function (documentLink, query, options) {
            var that = this;
            var path = "/" + documentLink + "attachments/";
            var resourceInfo = Base.parsePath(documentLink);
            return new QueryIterator(this, query, options, function(options, callback){
                that.queryFeed.call(that,
                        that,
                        path,
                        "attachments",
                        resourceInfo.objectBody.id,
                        function(result) { return result.Attachments; },
                        function(parent, body) { return body;},
                        query,
                        options,
                        callback);
            }); 
        },
         
        /**
         * Query the users for the database.
         * @memberof DocumentClient
         * @instance
         * @param {string} databaseLink     - The self-link of the database.
         * @param {string} query            - A SQL query string.
         * @param {FeedOptions} [options]   - Represents the feed options.
         * @returns {QueryIterator}         - An instance of queryIterator to handle reading feed.
         */
        queryUsers: function(databaseLink, query, options) {
            var that = this;
            var path = "/" + databaseLink + "users/";
            var resourceInfo = Base.parsePath(databaseLink);
            return new QueryIterator(this, query, options, function(options, callback){
                that.queryFeed.call(that,
                    that,
                    path,
                    "users",
                    resourceInfo.objectBody.id,
                    function(result) { return result.Users; },
                    function(parent, body) { return body; },
                    query,
                    options,
                    callback);
            });
        },

        /**
         * Query the permission for the user.
         * @memberof DocumentClient
         * @instance
         * @param {string} userLink         - The self-link of the user.
         * @param {string} query            - A SQL query string.
         * @param {FeedOptions} [options]   - Represents the feed options.
         * @returns {QueryIterator}         - An instance of queryIterator to handle reading feed.
         */
        queryPermissions: function(userLink, query, options) {
            var that = this;
            var resourceInfo = Base.parsePath(userLink);
            var path = "/" + userLink + "permissions/";
            return new QueryIterator(this, query, options, function(options, callback){
                that.queryFeed.call(that,
                    that,
                    path,
                    "permissions",
                    resourceInfo.objectBody.id,
                    function(result) { return result.Permissions; },
                    function(parent, body) { return body; },
                    query,
                    options,
                    callback);
            });
        },

        /**
         * Query the triggers for the collection.
         * @memberof DocumentClient
         * @instance
         * @param {string} collectionLink   - The self-link of the collection.
         * @param {string} query            - A SQL query string.
         * @param {FeedOptions} [options]   - Represents the feed options.
         * @returns {QueryIterator}         - An instance of queryIterator to handle reading feed.
         */
        queryTriggers: function (collectionLink, query, options) {
            var that = this;
            var resourceInfo = Base.parsePath(collectionLink);
            var path = "/" + collectionLink + "triggers/";
            return new QueryIterator(this, query, options, function(options, callback){
                that.queryFeed.call(that,
                    that,
                    path,
                    "triggers",
                    resourceInfo.objectBody.id,
                    function(result) { return result.Triggers; },
                    function(parent, body) { return body; },
                    query,
                    options,
                    callback);
            });
        },
        
        /**
         * Query the user defined functions for the collection.
         * @memberof DocumentClient
         * @instance
         * @param {string} collectionLink   - The self-link of the collection.
         * @param {string} query            - A SQL query string.
         * @param {FeedOptions} [options]   - Represents the feed options.
         * @returns {QueryIterator}         - An instance of queryIterator to handle reading feed.
         */
        queryUserDefinedFunctions: function (collectionLink, query, options) {
            var that = this;
            var path = "/" + collectionLink + "udfs/";
            var resourceInfo = Base.parsePath(collectionLink);
            return new QueryIterator(this, query, options, function(options, callback){
                that.queryFeed.call(that,
                    that,
                    path,
                    "udfs",
                    resourceInfo.objectBody.id,
                    function(result) { return result.UserDefinedFunctions; },
                    function(parent, body) { return body; },
                    query,
                    options,
                    callback);
            });
        },
       
        /**
         * Query the storedProcedures for the collection.
         * @memberof DocumentClient
         * @instance
         * @param {string} collectionLink   - The self-link of the collection.
         * @param {string} query            - A SQL query string.
         * @param {FeedOptions} [options]   - Represents the feed options.
         * @returns {QueryIterator}         - An instance of queryIterator to handle reading feed.
         */
        queryStoredProcedures: function (collectionLink, query, options) {
            var that = this;
            var resourceInfo = Base.parsePath(collectionLink);
            var path = "/" + collectionLink + "sprocs/";
            return new QueryIterator(this, query, options, function(options, callback){
                that.queryFeed.call(that,
                    that,
                    path,
                    "sprocs",
                    resourceInfo.objectBody.id,
                    function(result) { return result.StoredProcedures; },
                    function(parent, body) { return body; },
                    query,
                    options,
                    callback);
            }); 
        },

        /**
         * Delete the database object.
         * @memberof DocumentClient
         * @instance
         * @param {string} databaseLink         - The self-link of the database.
         * @param {RequestOptions} [options]    - The request options.
         * @param {RequestCallback} callback    - The callback for the request. 
        */
        deleteDatabase: function (databaseLink, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + databaseLink;
            var resourceInfo = Base.parsePath(databaseLink);
            this.deleteResource(path, "dbs", resourceInfo.objectBody.id, undefined, options, callback);
        },
        
        /**
         * Delete the collection object.
         * @memberof DocumentClient
         * @instance
         * @param {string} collectionLink    - The self-link of the collection.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request. 
        */
        deleteCollection: function (collectionLink, options, callback) {
            var that = this;

            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + collectionLink;
            var resourceInfo = Base.parsePath(collectionLink);
            this.deleteResource(path, "colls", resourceInfo.objectBody.id, undefined, options, callback);
        },
        
        /**
         * Delete the document object.
         * @memberof DocumentClient
         * @instance
         * @param {string} documentLink      - The self-link of the document.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request. 
        */
        deleteDocument: function (documentLink, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + documentLink;
            var resourceInfo = Base.parsePath(documentLink);
            this.deleteResource(path, "docs", resourceInfo.objectBody.id, undefined, options, callback);
        },

        /**
         * Delete the attachment object.
         * @memberof DocumentClient
         * @instance
         * @param {string} attachmentLink    - The self-link of the attachment.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request. 
         */
        deleteAttachment: function (attachmentLink, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + attachmentLink;
            var resourceInfo = Base.parsePath(attachmentLink);
            this.deleteResource(path, "attachments", resourceInfo.objectBody.id, undefined, options, callback)
        },
        
        /**
         * Delete the user object.
         * @memberof DocumentClient
         * @instance
         * @param {string} userLink          - The self-link of the user.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request. 
        */
        deleteUser: function(userLink, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + userLink;
            var resourceInfo = Base.parsePath(userLink);
            this.deleteResource(path, "users", resourceInfo.objectBody.id, undefined, options, callback);
        },
        
        /**
         * Delete the permission object.
         * @memberof DocumentClient
         * @instance
         * @param {string} permissionLink    - The self-link of the permission.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request. 
        */
        deletePermission: function(permissionLink, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + permissionLink;
            var resourceInfo = Base.parsePath(permissionLink);
            this.deleteResource(path, "permissions", resourceInfo.objectBody.id, undefined, options, callback);
        },
        
        /**
         * Delete the trigger object.
         * @memberof DocumentClient
         * @instance
         * @param {string} triggerLink       - The self-link of the trigger.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request. 
        */
        deleteTrigger: function(triggerLink, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + triggerLink;
            var resourceInfo = Base.parsePath(triggerLink);
            this.deleteResource(path, "triggers", resourceInfo.objectBody.id, undefined, options, callback)
        },
        
        /**
         * Delete the UserDefinedFunction object.
         * @memberof DocumentClient
         * @instance
         * @param {string} udfLink           - The self-link of the user defined function.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request. 
        */
        deleteUserDefinedFunction: function(udfLink, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + udfLink;
            var resourceInfo = Base.parsePath(udfLink);
            this.deleteResource(path, "udfs", resourceInfo.objectBody.id, undefined, options, callback)
        },
        
        /**
         * Delete the StoredProcedure object.
         * @memberof DocumentClient
         * @instance
         * @param {string} sprocLink         - The self-link of the stored procedure.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request. 
        */
        deleteStoredProcedure: function(sprocLink, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + sprocLink;
            var resourceInfo = Base.parsePath(sprocLink);
            this.deleteResource(path, "sprocs", resourceInfo.objectBody.id, undefined, options, callback)
        },
       
        /**
         * Delete the conflict object.
         * @memberof DocumentClient
         * @instance
         * @param {string} conflictLink      - The self-link of the conflict.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request. 
        */
        deleteConflict: function(conflictLink, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + conflictLink;
            var resourceInfo = Base.parsePath(conflictLink);
            this.deleteResource(path, "conflicts", resourceInfo.objectBody.id, undefined, options, callback);
        },
        
        /**
         * Replace the database object.
         * @memberof DocumentClient
         * @instance
         * @param {string} databaseLink      - The self-link of the database.
         * @param {object} db                - Represent the new database body.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request.
        */
        replaceDatabase: function (databaseLink, db, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + databaseLink;
            var resourceInfo = Base.parsePath(databaseLink);
            this.replace(db, path, "dbs", resourceInfo.objectBody.id, undefined, options, callback);
        },
       
        /**
         * Replace the document object.
         * @memberof DocumentClient
         * @instance
         * @param {string} documentLink      - The self-link of the document.
         * @param {object} document          - Represent the new document body.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request.
        */
        replaceDocument: function (documentLink, newDocument, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + documentLink;
            var resourceInfo = Base.parsePath(documentLink);
            this.replace(newDocument, path, "docs", resourceInfo.objectBody.id, undefined, options, callback);
        },
        
        /**
         * Replace the attachment object.
         * @memberof DocumentClient
         * @instance
         * @param {string} attachmentLink    - The self-link of the attachment.
         * @param {object} attachment        - Represent the new attachment body.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request.
         */
        replaceAttachment: function (attachmentLink, attachment, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + attachmentLink;
            var resourceInfo = Base.parsePath(attachmentLink);
            this.replace(attachment, path, "attachments", resourceInfo.objectBody.id, undefined, options, callback);
        },
        
        /**
         * Replace the user object.
         * @memberof DocumentClient
         * @instance
         * @param {string} userLink          - The self-link of the user.
         * @param {object} user              - Represent the new user body.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request.
        */
        replaceUser: function(userLink, user, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + userLink;
            var resourceInfo = Base.parsePath(userLink);
            this.replace(user, path, "users", resourceInfo.objectBody.id, undefined, options, callback);
        },
       
        /**
         * Replace the permission object.
         * @memberof DocumentClient
         * @instance
         * @param {string} permissionLink    - The self-link of the permission.
         * @param {object} permission        - Represent the new permission body.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request.
        */
        replacePermission: function(permissionLink, permission, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            var path = "/" + permissionLink;
            var resourceInfo = Base.parsePath(permissionLink);
            this.replace(permission, path, "permissions", resourceInfo.objectBody.id, undefined, options, callback);
        },

        /**
         * Replace the trigger object.
         * @memberof DocumentClient
         * @instance
         * @param {string} triggerLink       - The self-link of the trigger.
         * @param {object} trigger           - Represent the new trigger body.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request.
        */
        replaceTrigger: function(triggerLink, trigger, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            if (trigger.serverScript) {
                trigger.body = trigger.serverScript.toString();
            } else if (trigger.body) {
                trigger.body = trigger.body.toString();
            } 
            
            var path = "/" + triggerLink;
            var resourceInfo = Base.parsePath(triggerLink);
            this.replace(trigger, path, "triggers", resourceInfo.objectBody.id, undefined, options, callback);
        },
        
        /**
         * Replace the UserDefinedFunction object.
         * @memberof DocumentClient
         * @instance
         * @param {string} udfLink           - The self-link of the user defined function.
         * @param {object} udf               - Represent the new udf body.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request.
        */
        replaceUserDefinedFunction: function(udfLink, udf, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            if (udf.serverScript) {
                udf.body = udf.serverScript.toString();
            } else if (udf.body) {
                udf.body = udf.body.toString();
            } 
            
            var path = "/" + udfLink;
            var resourceInfo = Base.parsePath(udfLink);
            this.replace(udf, path, "udfs", resourceInfo.objectBody.id, undefined, options, callback);
        },

        /**
         * Replace the StoredProcedure object.
         * @memberof DocumentClient
         * @instance
         * @param {string} sprocLink         - The self-link of the stored procedure.
         * @param {object} sproc             - Represent the new sproc body.
         * @param {RequestOptions} [options] - The request options.
         * @param {RequestCallback} callback - The callback for the request.
        */
        replaceStoredProcedure: function(sprocLink, sproc, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }

            if (sproc.serverScript) {
                sproc.body = sproc.serverScript.toString();
            } else if (sproc.body) {
                sproc.body = sproc.body.toString();
            }
           
            var path = "/" + sprocLink;
            var resourceInfo = Base.parsePath(sprocLink);
            this.replace(sproc, path, "sprocs", resourceInfo.objectBody.id, undefined, options, callback);
        },
            
       /**
         * Read the media for the attachment object.
         * @memberof DocumentClient
         * @instance
         * @param {string} mediaLink         - The media link of the media in the attachment.
         * @param {RequestCallback} callback - The callback for the request, the result parameter can be a buffer or a stream
         *                                     depending on the value of {@link MediaReadMode}.
         */
        readMedia: function (mediaLink, callback) {
            var resourceInfo = Base.parsePath(mediaLink);
            var path = "/" + mediaLink;
            var initialHeaders = Base.extend({}, this.defaultHeaders);
            initialHeaders[Constants.HttpHeaders.Accept] = Constants.MediaTypes.Any;
            var attachmentId = Base.getAttachmentIdFromMediaId(resourceInfo.objectBody.id);
            var headers = Base.getHeaders(this, initialHeaders, "get", path, attachmentId, "media", {});
            this.get(this.urlConnection, path, headers, function (err, result, headers) {
                if (err) return callback(err);
                callback(undefined, result, headers);
            });
        },

        /**
         * Update media for the attachment
         * @memberof DocumentClient
         * @instance
         * @param {string} mediaLink                - The media link of the media in the attachment.
         * @param {stream.Readable} readableStream  - The stream that represents the media itself that needs to be uploaded.
         * @param {MediaOptions} [options]          - options for the media
         * @param {RequestCallback} callback        - The callback for the request.
         */
        updateMedia: function (mediaLink, readableStream, options, callback) {
            if (!callback) {
                callback = options;
                options = {};
            }
            
            var defaultHeaders = this.defaultHeaders;
            var initialHeaders = Base.extend({}, defaultHeaders);

            // Add required headers slug and content-type in case the body is a stream
            if (options.slug) {
                initialHeaders[Constants.HttpHeaders.Slug] = options.slug;
            }

            if (options.contentType) {
                initialHeaders[Constants.HttpHeaders.ContentType] = options.contentType;
            } else {
                initialHeaders[Constants.HttpHeaders.ContentType] = Constants.MediaTypes.OctetStream;
            }
            
            initialHeaders[Constants.HttpHeaders.Accept] = Constants.MediaTypes.Any;
            
            var urlConnection = this.urlConnection;
            var resourceInfo = Base.parsePath(mediaLink);
            var path = "/" + mediaLink;
            var attachmentId = Base.getAttachmentIdFromMediaId(resourceInfo.objectBody.id);
            var headers = Base.getHeaders(this, initialHeaders, "put", path, attachmentId, "media", options);

            this.put(urlConnection, path, readableStream, headers, function (err, result, headers) {
                if (err) return callback(err);
                callback(undefined, result, headers);
            });
        },
        
        /**
         * Execute the StoredProcedure represented by the object.
         * @memberof DocumentClient
         * @instance
         * @param {string} sprocLink            - The self-link of the stored procedure.
         * @param {Array} [params]              - represent the parameters of the stored procedure.
         * @param {RequestCallback} callback    - The callback for the request.
        */
        executeStoredProcedure: function(sprocLink, params, callback) {
            if (!callback) {
                callback = params;
                params = null;
            }
            
            var defaultHeaders = this.defaultHeaders;
            var initialHeaders = {};
            initialHeaders = Base.extend(initialHeaders, defaultHeaders);
            
            // Accept a single parameter or an array of parameters.
            if (params && params.constructor !== Array) {
                params = [params];
            }
            
            var urlConnection = this.urlConnection;
            var path = "/" + sprocLink;
            var resourceInfo = Base.parsePath(sprocLink);         
            var headers = Base.getHeaders(this, initialHeaders, "post", path, resourceInfo.objectBody.id, "sprocs", {});
            
            this.post(urlConnection, path, params, headers, function (err, result, headers) {
                if (err) return callback(err);

                callback(undefined, result, headers);
            });
        },
        
         /** Gets the Database account information.
        * @memberof DocumentClient
        * @instance
        * @param {RequestCallback} callback - The callback for the request. The second parameter of the callback will be of type {@link DatabaseAccount}.
        */
        getDatabaseAccount: function(callback) {
            var headers = Base.getHeaders(this, this.defaultHeaders, "get", "", "", "", {});
            this.get(this.urlConnection, "", headers, function(err, result, headers) {
                if (err) return callback(err);
                
                var databaseAccount = new AzureDocuments.DatabaseAccount();
                databaseAccount.DatabasesLink                    = "/dbs/";
                databaseAccount.MediaLink                        = "/media/";
                databaseAccount.MaxMediaStorageUsageInMB         = headers[Constants.HttpHeaders.MaxMediaStorageUsageInMB];
                databaseAccount.CurrentMediaStorageUsageInMB     = headers[Constants.HttpHeaders.CurrentMediaStorageUsageInMB];
                databaseAccount.CapacityUnitsConsumed            = headers[Constants.HttpHeaders.DatabaseAccountCapacityUnitsConsumed];
                databaseAccount.CapacityUnitsProvisioned         = headers[Constants.HttpHeaders.DatabaseAccountCapacityUnitsProvisioned];
                databaseAccount.ConsumedDocumentStorageInMB      = headers[Constants.HttpHeaders.DatabaseAccountConsumedDocumentStorageInMB];
                databaseAccount.ReservedDocumentStorageInMB      = headers[Constants.HttpHeaders.DatabaseAccountReservedDocumentStorageInMB];
                databaseAccount.ProvisionedDocumentStorageInMB   = headers[Constants.HttpHeaders.DatabaseAccountProvisionedDocumentStorageInMB];
                databaseAccount.ConsistencyPolicy                = result.userConsistencyPolicy;
                
                callback(undefined, databaseAccount, headers);
            });
        },

        /** @ignore */
        create: function (body, path, type, id, initialHeaders, options, callback) {
            var that = this;
            var urlConnection = this.urlConnection;
            initialHeaders = initialHeaders || this.defaultHeaders;
            var headers = Base.getHeaders(this, initialHeaders, "post", path, id, type, options);
            this.post(urlConnection, path, body, headers, function (err, result, headers) {
                if (err) return callback(err);
                callback(undefined, result, headers);
            });
        },

        /** @ignore */
        replace: function (resource, path, type, id, initialHeaders, options, callback) {
            var that = this;
            var urlConnection = this.urlConnection;
            initialHeaders = initialHeaders || this.defaultHeaders;
            var headers = Base.getHeaders(this, initialHeaders, "put", path, id, type, options);
            this.put(urlConnection, path, resource, headers, function (err, result, headers) {
                if (err) return callback(err);
                callback(undefined, result, headers);
            });
        },

        /** @ignore */
        read: function (path, type, id, initialHeaders, options, callback) {
            var that = this;
            var urlConnection = this.urlConnection;
            initialHeaders = initialHeaders || this.defaultHeaders;
            var headers = Base.getHeaders(this, initialHeaders, "get", path, id, type, options);
            this.get(this.urlConnection, path, headers, function (err, result, headers) {
                if (err) return callback(err);
                callback(undefined, result, headers);
            });
        },

        /** @ignore */
        deleteResource: function (path, type, id, initialHeaders, options, callback) {
            var that = this;
            var urlConnection = this.urlConnection;
            initialHeaders = initialHeaders || this.defaultHeaders;
            var headers = Base.getHeaders(this, initialHeaders, "delete", path, id, type, options);
            this.delete(urlConnection, path, headers, callback);
        },
        
        /** @ignore */
        get: function(url, path, headers, callback) {
            return RequestHandler.request(this.connectionPolicy, "GET", url, path, undefined, this.defaultUrlParams, headers, callback);
        },
        
        /** @ignore */
        post: function(url, path, body, headers, callback) {
            return RequestHandler.request(this.connectionPolicy, "POST", url, path, body, this.defaultUrlParams, headers, callback);
        },

        /** @ignore */
        put: function(url, path, body, headers, callback) {
            return RequestHandler.request(this.connectionPolicy, "PUT", url, path, body, this.defaultUrlParams, headers, callback);
        },
        
        /** @ignore */
        head: function(url, path, headers, callback) {
            return RequestHandler.request(this.connectionPolicy, "HEAD", url, path, undefined, this.defaultUrlParams, headers, callback);
        },

        /** @ignore */
        delete: function(url, path, headers, callback) {
            return RequestHandler.request(this.connectionPolicy, "DELETE", url, path, undefined, this.defaultUrlParams, headers, callback);
        },
        
        /** @ignore */
        queryFeed: function(documentclient, path, type, id, resultFn, createFn, query, options, callback) {
            var that = this;

            if (!callback) {
                callback = options;
                options = {};
            }
            
            var successCallback = function (err, result, responseHeaders) {
                if (err) return callback(err);
                var bodies;
                if (query) {
                    bodies = resultFn(result);
                }
                else {
                    bodies = Base.map(resultFn(result), function (body) {
                        return createFn(that, body);
                    });
                }

                callback(undefined, bodies, responseHeaders);
            };
            
            var urlConnection = documentclient.urlConnection;
            var initialHeaders = Base.extend({}, documentclient.defaultHeaders);
            if (query === undefined) {
                var headers = Base.getHeaders(documentclient, initialHeaders, "get", path, id, type, options);
                documentclient.get(urlConnection, path, headers, successCallback);
            } else {
                initialHeaders[Constants.HttpHeaders.IsQuery] = "true";
                if (options.jpath) {
                    initialHeaders[Constants.HttpHeaders.Query] = query;
                    var headers = Base.getHeaders(documentclient, initialHeaders, "get", path, id, type, options);
                    documentclient.get(urlConnection, path, headers, successCallback);
                } else {
                    initialHeaders[Constants.HttpHeaders.ContentType] = Constants.MediaTypes.SQL;
                    var headers = Base.getHeaders(documentclient, initialHeaders, "post", path, id, type, options);
                    documentclient.post(urlConnection, path, query, headers, successCallback)
                }
            }
        }  
    }
);
    
    Base.getAttachmentIdFromMediaId = function(mediaId) {
        var buffer = atob(mediaId);
        var ResoureIdLength = 20;
        var attachmentId = "";
        if (buffer.length > ResoureIdLength) {
            attachmentId = btoa(buffer.substring(0, ResoureIdLength));
        } 
        else {
            attachmentId = mediaId;
        }
        
        return attachmentId;
    }
    
    Constants.UserAgent = null;
    DocumentDB.DocumentBase = AzureDocuments;
    DocumentDB.RequestHandler = RequestHandler;
    DocumentDB.AuthHandler = AuthHandler;
    DocumentDB._parsePath = Base.parsePath;
    
    return DocumentDB;
}.call(this));
