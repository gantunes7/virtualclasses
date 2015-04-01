
;(function() {

	/**
	*  Module app
	*
	* Description main module
	*/
	var multconnect = angular.module('multconnect', ['Project'])

	multconnect.directive('multconnectContact',function(PubSubService){
		var pbs = PubSubService;
		return{
			restrict:'E',
			link:function(scope,element,attr){
				pbs.Initialize(scope)
				scope.subscribe('item_added',function(){scope.addedSuccess(arguments[0])})

				scope.addedSuccess = function(_scope){scope.contatoSuccess = true}
				
				var added = 'multconnect-show-contact-form-true'
				
				var removed = 'multconnect-show-contact-form-false'
				
				scope.field = scope.field || {}
				
				scope.show = function(bool){
					if(bool){
						element.addClass(added)
						element.removeClass(removed)
					}else{
						element.removeClass(added)
						element.addClass(removed)
					}
					scope.form = scope.form || {}
					scope.form.show = bool
				}
			},
			template:'<a class="btn contact-link" data-ng-if="!form.show" data-ng-click="show(true)">Contato</a>'+
					 '<a class="btn contact-link" data-ng-if="form.show" data-ng-click="show(false)">Fechar</a>'+
					 '<div class="modalContactForm">'+
					 	'<h2 class="page-header ng-hide" data-ng-if="!contatoSuccess">Contato</h2>'+
					 	'<add-item '+
						 	' msurl="https://multmobileservice1.azure-mobile.net/" '+
						 	' msauthkey="pcfkIYgZscBqMDERLCjUwQkguyqKiu43" '+
						 	' data-ng-if="form.show" '+
						 	' table-name="contato" '+
						 	' custom-template="modules/multconnect/contact-form.html">'+
					 	'</add-item>'+
					 	'<h3 class="message" data-ng-if="contatoSuccess">Contato Enviado com sucesso</h3>'+
					 '</div>'
		}
	})


	multconnect.controller('sectionContactCtrl',function($scope,PubSubService){
		$scope.subscribe('item_added',function(){
			$scope.addedSuccess(arguments[0])
		})
		$scope.addedSuccess = function(_scope){
			$scope.contatoSuccessPage = true
		}
	})
})();