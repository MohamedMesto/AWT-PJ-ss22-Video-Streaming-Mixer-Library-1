const HLS = require('hls-parser');
const { Variant } = HLS.types;

const urls = ["https://moctobpltc-i.akamaihd.net/hls/live/571329/eight/playlist.m3u8",
    "https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8",
    "http://amssamples.streaming.mediaservices.windows.net/634cd01c-6822-4630-8444-8dd6279f94c6/CaminandesLlamaDrama4K.ism/manifest(format=m3u8-aapl)",
    "http://amssamples.streaming.mediaservices.windows.net/91492735-c523-432b-ba01-faba6c2206a2/AzureMediaServicesPromo.ism/manifest(format=m3u8-aapl)",
    "http://amssamples.streaming.mediaservices.windows.net/69fbaeba-8e92-4740-aedc-ce09ae945073/AzurePromo.ism/manifest(format=m3u8-aapl)"];
let variantsDict = {};
let objectsArr = []
let keys = ['width', 'height']

async function parseStreamData(payload) {
    const variants = [];
    let playlist = HLS.parse(await payload.text());
    objectsArr = objectsArr.concat(playlist)
    for (let plainVariant of playlist.variants) {
        variants.push(new Variant(plainVariant));
    }

    return variants;
}

async function run() {
    for (let idx in urls) {
        let payload = await fetch(urls[idx]);
        variantsDict[idx] = await parseStreamData(payload);
    }
    algorithmA()
    algorithmB()
}

run();

function algorithmA() {
    console.log("Algorithm A")
    let neededResolutions = getResolutions(variantsDict[0])
    neededResolutions.pop()
    let matchingArr = []

    neededResolutions = neededResolutions.filter( // remove duplicates
        (s => o =>
            (k => !s.has(k) && s.add(k))
                (keys.map(k => o[k]).join('|'))
        )
            (new Set)
    );

    console.log("First URL's resolutions:", neededResolutions)

    for (let idx in variantsDict) {
        if (idx != 0) {
            let resolutionsArr = getResolutions(variantsDict[idx])
            resolutionsArr.pop()

            resolutionsArr = resolutionsArr.filter( // remove duplicates
                (s => o =>
                    (k => !s.has(k) && s.add(k))
                        (keys.map(k => o[k]).join('|'))
                )
                    (new Set)
            );

            let tempMatch = []

            for (let x of neededResolutions) {
                for (let y of resolutionsArr) {
                    if (x.width == y.width && x.height == y.height) {
                        tempMatch.push(y)
                        break
                    }
                }
            }

            let neededString = JSON.stringify(neededResolutions)
            let matchString = JSON.stringify(tempMatch)

            if (neededString === matchString) {
                matchingArr.push(objectsArr[idx])
                console.log("Matching resolution from", urls[idx], resolutionsArr)
            } else {
                console.log("Not matching resolution from", urls[idx], resolutionsArr)
            }
        }
    }
    console.log("number of candidate streams: ", urls.length - 1)
    console.log("number of matching streams using Algorithm A: ", matchingArr.length)
}

function algorithmB() {
    console.log("Algorithm B")
    let resolutions = []
    for (let idx in variantsDict) {
        let tempArr = getResolutions(variantsDict[idx])
        tempArr.pop()
        tempArr = tempArr.filter( // remove duplicates
            (s => o =>
                (k => !s.has(k) && s.add(k))
                    (keys.map(k => o[k]).join('|'))
            )
                (new Set)
        );
        resolutions.push(tempArr)
        console.log("Resolutions from this url: ", urls[idx], tempArr)
    }
    let results = []
    let matchingArr = []

    for (let idx in resolutions) {
        let arr = resolutions[idx]
        for (let obj of arr) {
            let contFound = 0
            for (let arrT of resolutions) {
                if (arr != arrT) {
                    for (let objT of arrT) {
                        if (obj.width == objT.width && obj.height == objT.height) {
                            contFound++
                            break
                        }
                    }
                }
            }
            if (contFound == resolutions.length - 1) {
                matchingArr.push(objectsArr[idx])
                results.push(obj)
            }
        }
    }

    results = results.filter( // remove duplicates
        (s => o =>
            (k => !s.has(k) && s.add(k))
                (keys.map(k => o[k]).join('|'))
        )
            (new Set)
    );

    console.log("Intersection", results)
}

function getResolutions(variantsArr) {
    let result = []
    for (let variant of variantsArr) {
        let varTemp = new Variant(variant)
        result.push(varTemp.resolution)
    }
    return result
}