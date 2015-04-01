var deleteItemDefaultLink = function(scope,element,attr,controller,ams,psvc){
	psvc.Initialize(scope)
	var client = ams(attr.msurl, attr.msauthkey);
	var _items = client.getTable(attr.tableName);
	scope.delete_item = function(){
		scope.loading = true
		_items.del({id:scope.item.id}).then(function(){
			scope.publish('refresh_items')
		})
	}
}