var viewItemDefaultLink = function(scope,element,attr,controller,ams,ps,rp){
	scope.loading = true
	ps.Initialize(scope)
	var client = ams(attr.msurl, attr.msauthkey);
	scope._items = client.getTable(attr.tableName);
	var query = scope._items.where({id:rp.itemId})
	scope._items.read(query).then(function (items){
		scope.$apply(function(){
			scope.item = items[0]
			scope.loading = false
			
		})
	})
}