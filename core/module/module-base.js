
;(function() {
	/**
	*  Module Project Pages
	*
	* Description Definição de tudo
	*/
	angular.module('Project', ['ngResource','ui.bootstrap','angular-loading-bar','DirectiveComuniction']);
})();


//loading bar config
;(function(){
	angular.module('Project').config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {
    	cfpLoadingBarProvider.includeSpinner = false;
  	}]);
});

//run
;(function(){
	angular.module('Project').run(function($rootScope, $location,cfpLoadingBar) {
		$rootScope.cfp = cfpLoadingBar
	    $rootScope.$on( "$routeChangeStart", function(event, next, current) {
			$rootScope.cfp.start()
	    });
	    $rootScope.$on( "$routeChangeSuccess", function(event, next, current) {
			$rootScope.cfp.complete()
			angular.element(document.getElementById('splashScreen')).addClass('ng-hide')
	    });
 	 });
})();


//directives
;(function(){
	angular.module('Project').directive('addItem', function(Azure_MobileServices,PubSubService,loadJS,$routeParams){
		var ams = Azure_MobileServices, ps = PubSubService, ljs = loadJS,rp = $routeParams;
		return {
			restrict:'AE',
			scope:true,
			require:['?defaultJs','?defaultTemplate','?tableName'],
			link:function(scope,element,attr,controller){
				var s = scope,e = element,a = attr,c = controller;
				var resolvedDefaultPromise = function (script){addItemDefaultLink(s,e,a,c,ams,ps,rp)}
				var resolvedCustomPromise = function (script){addItemDefaultLink(s,e,a,c,ams,ps,rp)}
				if(!attr.customJs){
					ljs.loadJS(attr.defaultJs || '/core/js/default/add-item-default-link.js').then(resolvedDefaultPromise)
				}else{
					ljs.loadJS(attr.customJs).then(resolvedCustomPromise)	
				}
			},
			templateUrl:function(element,attr){
				if(attr.customTemplate){
					return attr.customTemplate
				}else{
					return attr.defaultTemplate || 'core/partials/default/add-item-part.html'
				}				
			}
		};
	});
	angular.module('Project').directive('deleteItem', function(Azure_MobileServices,PubSubService,loadJS){
		var ams = Azure_MobileServices;
		 
		var psvc = PubSubService;
		var ljs = loadJS;
		return {
			restrict:'EA',
			scope:true,
			require:['?defaultJs','?defaultTemplate','?tableName'],
			link:function(scope,element,attr,controller){
				var s = scope,e = element,a = attr,c = controller;
				var resolvedDefaultPromise = function (script){deleteItemDefaultLink(s,e,a,c,ams,psvc)}
				var resolvedCustomPromise = function (script){deleteItemDefaultLink(s,e,a,c,ams,psvc)}
				if(!attr.customJs){
					ljs.loadJS(attr.defaultJs || '/core/js/default/delete-item-default-link.js').then(resolvedDefaultPromise)
				}else{
					ljs.loadJS(attr.customJs).then(resolvedCustomPromise)	
				}
			},
			templateUrl:function(element,attr){
				if(attr.customTemplate){
					return attr.customTemplate
				}else{
					return attr.defaultTemplate || '/core/partials/default/del-btn-list-part.html'
				}				
			}
		};
	});
	angular.module('Project').directive('viewItem', function (PubSubService,Azure_MobileServices,$routeParams,loadJS) {
		var ams = Azure_MobileServices;
		 
		var ps = PubSubService;
		var rp = $routeParams;
		var ljs = loadJS;
		return {
			restrict: 'AE',
			scope:true,
			require:['?defaultJs','?defaultTemplate','?tableName'],
			link: function (scope,element,attr,controller) {
				var s = scope,e = element,a = attr,c = controller;
				var resolvedDefaultPromise = function (script){viewItemDefaultLink(s,e,a,c,ams,ps,rp)}
				var resolvedCustomPromise = function (script){viewItemDefaultLink(s,e,a,c,ams,ps,rp)}
				if(!attr.customJs){
					ljs.loadJS(attr.defaultJs || '/core/js/default/view-item-default-link.js').then(resolvedDefaultPromise)
				}else{
					ljs.loadJS(attr.customJs).then(resolvedCustomPromise)	
				}
			},
			templateUrl:function(element,attr){
				if(attr.customTemplate){
					return attr.customTemplate
				}else{
					return attr.defaultTemplate || 'core/partials/default/view-item-part.html'
				}				
			}
		};
	});
	angular.module('Project').directive('listItems', function(Azure_MobileServices,PubSubService,loadJS){
		var ams = Azure_MobileServices;
		 
		var ps = PubSubService;
		var ljs = loadJS;
		return {
			restrict:'EA',
			scope:true,
			require:['?defaultJs','?defaultTemplate','?tableName'],
			link:function(scope,element,attr,controller){
				var s = scope,e = element,a = attr,c = controller;
				var resolvedDefaultPromise = function (script){listItemsDefaultLink(s,e,a,c,ams,ps)}
				var resolvedCustomPromise = function (script){listItemsDefaultLink(s,e,a,c,ams,ps)}
				if(!attr.customJs){
					ljs.loadJS(attr.defaultJs || '/core/js/default/list-items-default-link.js').then(resolvedDefaultPromise)
				}else{
					ljs.loadJS(attr.customJs).then(resolvedCustomPromise)	
				}
			},
			templateUrl:function(element,attr){
				if(attr.customTemplate){
					return attr.customTemplate
				}else{
					return attr.defaultTemplate || 'core/partials/default/list-items-part.html'
				}				
			}
		}
	});
	
	angular.module('Project').directive('loading', function () {
		return {
			restrict: 'EA',
			template:'<div id="loading-bar-spinner" class="static" style=""><div class="spinner-icon"></div></div>'
		};
	});
	angular.module('Project').directive('bootStrapMenu',function(){
		return{
			restrict:'AE',
			templateUrl:'/core/partials/default/menu.html'
		}
	});
})();


//services
;(function(){
	angular.module('Project')
	.factory('Azure_MobileServices', function(){
		return function(serviceEndPoint, authKey){
			return new WindowsAzure.MobileServiceClient(serviceEndPoint, authKey)
		}
	})
	.factory('loadJS', function ($q) {
		function loadJS( src, cb ){
			var defer = $q.defer()
			var ref = window.document.getElementsByTagName( "script" )[ 0 ];
			var script = window.document.createElement( "script" );
			script.src = src;
			script.async = true;
			ref.parentNode.insertBefore( script, ref );
			script.onload = function(){
				defer.resolve(script)
			}
			script.onerror = function (){
				defer.reject(arguments)
			}
			return defer.promise
		}
		return {
			loadJS:loadJS
		};
	});
})();