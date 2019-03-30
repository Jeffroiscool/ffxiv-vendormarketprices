async function GetMarketValuesShopItems(jsonData, realm){
    let item_ids = GetShopItemIds(jsonData);
    let url = `https://staging.xivapi.com/market/items?ids=${item_ids}&max_history=50&servers=${realm}`;
    return await fetch(url).then(response => response.json());;
}

function GetShopItemIds(jsonData){
    item_ids = [];
    $.each(jsonData, function() {
        item_ids.push($(this)[0].ID);
    });
    return item_ids;
}

async function GetItems(realm){
    let clothMats = await fetch("data/ClothMats.json").then(response => response.json());
    let cookingMats = await fetch("data/CookingMats.json").then(response => response.json());
    let gatherMats = await fetch("data/GatherMats.json").then(response => response.json());
    let townData = await fetch("data/Town.json").then(response => response.json());
    
    let allItems = $.merge($.merge(clothMats.Items, cookingMats.Items), gatherMats.Items);
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

let tableData = [];
let serverOptions = [];
let testData;

GetServers().then(data => {
    for (let server of data){
        serverOptions.push(server);
    }
})

function GetTableData(realm){
    GetItems(realm).then(data => {
        testData = data;
        for (let item of data.Items){
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
                    for (let sale of marketItem.History){
                        salePoints += (sale.Added - sale.PurchaseDate);
                        salePrice += sale.PricePerUnit;
                        let newItem = {
                            retainer: sale.CharacterName,
                            quantity: sale.Quantity,
                            price_per_unit: sale.PricePerUnit,
                            price_total: sale.PriceTotal,
                            sold_on: sale.PurchaseDate
                        }
                        historyItems.push(newItem);
                    }
    
                    let subListings = [];
                    for (let listItem of marketItem.Prices){
                        let newItem = {
                            retainer: listItem.RetainerName,
                            quantity: listItem.Quantity,
                            price_per_unit: listItem.PricePerUnit,
                            price_total: listItem.PriceTotal,
                            town: GetTownString(listItem.TownID, data.TownData)
                        }
                        subListings.push(newItem);
                    }
                    
                    salePoints = Math.log(Math.sqrt(Math.round(salePoints / marketItem.History.length))).toFixed(2);
                    let averageSalePrice = Math.round(salePrice / marketItem.History.length);
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
            
            tableData.push(itemObject);
        }
    })
}

