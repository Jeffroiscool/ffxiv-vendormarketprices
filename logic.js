async function GetMarketValuesShopItems(jsonData, realm){
	let item_ids = GetShopItemIds(jsonData);
	let url = `https://xivapi.com/market/items?ids=${item_ids}&max_history=50&servers=${realm}`;
	return await fetch(url).then(response => response.json());
}

function GetShopItemIds(jsonData){
	let item_ids = [];
	for (let [,item] of Object.entries(jsonData)) {
		item_ids.push(item.ID);
	}
	return item_ids;
}

async function GetItems(realm){
	let clothMats = await fetch("data/ClothMats.json").then(response => response.json());
	let cookingMats = await fetch("data/CookingMats.json").then(response => response.json());
	let gatherMats = await fetch("data/GatherMats.json").then(response => response.json());
	let townData = await fetch("data/Town.json").then(response => response.json());
    
	let allItems = Object.assign({}, clothMats.Items, cookingMats.Items, gatherMats.Items);
	//let allItems = $.merge($.merge(clothMats.Items, cookingMats.Items), gatherMats.Items);
	let marketValues = await GetMarketValuesShopItems(allItems, realm);

	let endResult = {Items: allItems, MarketValues: marketValues, Realm: realm, TownData: townData};
	return endResult;
}

function GetTownString(town_id, townData){
	let townObject = townData.Results.find(item => item.ID === town_id);
	return townObject.Name;
}

async function GetServers(){
	return await fetch("data/Servers.json").then(response => response.json());
}

let serverOptions = [];

GetServers().then(data => {
	for (let server of data){
		serverOptions.push(server);
	}
});

async function GetTableData(realm){
	let tableResult = [];
	await GetItems(realm).then(data => {
		console.log(data);
		for (let [,item] of Object.entries(data.Items)) {
			let itemObject;
			for (let marketItem of data.MarketValues){
				if (item.ID === marketItem[data.Realm].ItemID){
					marketItem = marketItem[data.Realm];
					let lowestSalePrice = Math.min.apply(null, marketItem.Prices.map((v) => v.PricePerUnit));
					let highestSalePrice = Math.max.apply(null, marketItem.Prices.map((v) => v.PricePerUnit));
    
					//Assign points based on how quick it sells
					let salePoints = 0;
					let salePrice = 0;
    
					let historyItems = [];
					let historyAmount = 0;
					for (let sale of marketItem.History){
						if(!sale.IsHq){
							salePoints += (sale.Added - sale.PurchaseDate);
							salePrice += sale.PricePerUnit;
							historyAmount++;
						}
						let newItem = {
							hq: sale.IsHQ,
							retainer: sale.CharacterName,
							quantity: sale.Quantity,
							price_per_unit: sale.PricePerUnit,
							price_total: sale.PriceTotal,
							sold_on: sale.PurchaseDate
						};
						historyItems.push(newItem);
					}
    
					let subListings = [];
					for (let listItem of marketItem.Prices){
						let newItem = {
							hq: listItem.IsHQ,
							retainer: listItem.RetainerName,
							quantity: listItem.Quantity,
							price_per_unit: listItem.PricePerUnit,
							price_total: listItem.PriceTotal,
							town: GetTownString(listItem.TownID, data.TownData)
						};
						subListings.push(newItem);
					}
                    
					salePoints = Math.log(Math.sqrt(Math.round(salePoints / historyAmount))).toFixed(2);
					let averageSalePrice = Math.round(salePrice / historyAmount);

					itemObject = {
						ID: item.ID,
						item_name: item.Name,
						listings: marketItem.Prices.length,
						vendor_price: item.PriceMid,
						lowest_price: lowestSalePrice,
						avg_price: averageSalePrice,
						profit: averageSalePrice - item.PriceMid,
						time_to_sell: salePoints,
						last_sale_date: marketItem.History[0].PurchaseDate,
						sub_listings: subListings,
						history: historyItems
					};
				}
			}
			tableResult.push(itemObject);
		}        
	});
	return tableResult;
}