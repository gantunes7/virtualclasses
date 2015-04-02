var timeoutNumber = 3000;
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
			scope:true,
			link:function(scope,element,attr){
				var added = 'multconnect-show-contact-form-true';
				var removed = 'multconnect-show-contact-form-false';
				pbs.Initialize(scope);
				var addedSuccess = function(_scope){
					scope.loading = false
					scope.contatoSuccess = true;
					setTimeout(removeMessage,timeoutNumber);
				}
				var removeMessage = function(){
					scope.$apply(function(){
						scope.contatoSuccess = false;
					})
				}
				var start_add = function () {scope.loading = true}

				scope.show = function(bool){
					if(bool){
						element.addClass(added);
						element.removeClass(removed);
					}else{
						element.removeClass(added);
						element.addClass(removed);
					}
					scope.form = scope.form || {}
					scope.form.show = bool
				}
				scope.subscribe('item_added',addedSuccess)
				scope.subscribe('start_add',start_add)
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
					 	'<h3 class="message" data-ng-if="contatoSuccess">Contato Enviado com sucesso, Obrigado!</h3>'+
					 	'<h3 class="message" data-ng-if="loading">Enviando...</h3>'+
					 '</div>'
		}
	})


	multconnect.controller('sectionContactCtrl',function($scope,PubSubService){
		PubSubService.Initialize($scope)
		var loadingTrue = function(){
			$scope.loading = true
		}
		var removeMessage = function(){
			$scope.$apply(function(){
				$scope.interesseSuccessPage = false
			})
		}
		var addedSuccess = function(_scope){
			$scope.loading = false
			$scope.interesseSuccessPage = true
			setTimeout(removeMessage,timeoutNumber)
		}
		$scope.subscribe('start_add',loadingTrue)
		$scope.subscribe('item_added',addedSuccess)
	})
})();