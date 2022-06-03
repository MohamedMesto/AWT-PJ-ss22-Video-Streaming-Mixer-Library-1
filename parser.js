const HLS = require('hls-parser');
const { Variant } = HLS.types;

const urls = ["https://moctobpltc-i.akamaihd.net/hls/live/571329/eight/playlist.m3u8",
    "https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8",
    "http://amssamples.streaming.mediaservices.windows.net/634cd01c-6822-4630-8444-8dd6279f94c6/CaminandesLlamaDrama4K.ism/manifest(format=m3u8-aapl)",
    "http://amssamples.streaming.mediaservices.windows.net/91492735-c523-432b-ba01-faba6c2206a2/AzureMediaServicesPromo.ism/manifest(format=m3u8-aapl)",
"http://amssamples.streaming.mediaservices.windows.net/69fbaeba-8e92-4740-aedc-ce09ae945073/AzurePromo.ism/manifest(format=m3u8-aapl)"];
let variantsDict = {};
let objectsArr = []

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
}

run();

function algorithmA() {
    let neededResolutions = getResolutions(variantsDict[0])
    let keys = ['width', 'height']
    let matchingArr = []

    neededResolutions = neededResolutions.filter( // remove duplicates
        (s => o =>
            (k => !s.has(k) && s.add(k))
                (keys.map(k => o[k]).join('|'))
        )
            (new Set)
    );

    console.log("needed resolutions", neededResolutions)

    for (let idx in variantsDict) {
        if (idx != 0) {
            let resolutionsArr = getResolutions(variantsDict[idx])
            resolutionsArr.pop()
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
                console.log("matching resolution", resolutionsArr)
            } else {
                console.log("not matching resolution", resolutionsArr)
            }
        }
    }
}


function getResolutions(variantsArr) {
    let result = []
    for (let variant of variantsArr) {
        let varTemp = new Variant(variant)
        result.push(varTemp.resolution)
    }
    return result
}