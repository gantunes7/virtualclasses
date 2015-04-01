var listItemsDefaultLink = function (scope,element,attr,controller,ams,ps,rp){
	scope.loading = true
	ps.Initialize(scope)
	scope.items = []
	var client = ams(attr.msurl, attr.msauthkey);
	var _items = client.getTable(attr.tableName);
	scope.read = function(){
		scope.loading = true
		_items.read().then(function(items){
			scope.$apply(function(){
				scope.items = items
				scope.loading = false
			})
		});
	}
	scope.read()
	scope.subscribe('refresh_items',scope.read)
}