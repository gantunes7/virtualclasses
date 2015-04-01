var addItemDefaultLink = function (scope,element,attr,controller,ams,psvc,rp){
	psvc.Initialize(scope)
	scope.field = {}
	var client = ams(attr.msurl, attr.msauthkey);
	scope._items = client.getTable(attr.tableName);
	
	if(rp.itemId){
		var query = scope._items.where({id:rp.itemId})
		scope._items.read(query).then(function (items){
			scope.$apply(function(){
				scope.itemId = rp.itemId
				scope.field = items[0]
				scope.loading = false
				
			})
		})
	}
	scope.delete_item = function(){
		scope.loading = true
		scope._items.del({id:scope.field.id}).then(function(){
			go_home()
		})
	}
	scope.save = function(){
		if(rp.itemId){
			scope._items.update(scope.field).then(apply);
		}else{
			scope.field.origem = window.location.href;
			scope._items.insert(scope.field).then(apply);
		}		
	}
	function apply() {
		scope.$apply(function(){
			itemAdded()
		})
	}
	function itemAdded(){
		scope.loading = false
		scope.publish('item_added',scope)
		scope.field = {}
		scope.publish('refresh_items',scope.read)
	}
	function go_home(){
		window.location.hash = "#/"
	}
}