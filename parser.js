const { EventEmitter } = require('events');
const HLS = require('hls-parser');
const { Variant } = HLS.types;

const emitter = new EventEmitter();

const urls = ["https://moctobpltc-i.akamaihd.net/hls/live/571329/eight/playlist.m3u8",
    "http://amssamples.streaming.mediaservices.windows.net/634cd01c-6822-4630-8444-8dd6279f94c6/CaminandesLlamaDrama4K.ism/manifest(format=m3u8-aapl)"];
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

    //console.log("needed resolutions", neededResolutions)

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
            }

        }
    }

    console.log(matchingArr)
}


function getResolutions(variantsArr) {
    let result = []
    for (let variant of variantsArr) {
        let varTemp = new Variant(variant)
        result.push(varTemp.resolution)
    }
    return result
}

function checkElementsinArray(fixedArray,inputArray)
{
    var fixedArraylen = fixedArray.length;
    var inputArraylen = inputArray.length;
    if(fixedArraylen<=inputArraylen)
    {
        for(var i=0;i<fixedArraylen;i++)
        {
            if(!(inputArray.indexOf(fixedArray[i])>=0))
            {
                return false;
            }
        }
    }
    else
    {
        return false;
    }
    return true;
}