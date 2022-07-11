const HLS = require('hls-parser');
const { Playlist, MasterPlaylist, MediaPlaylist } = require('hls-parser/types');
const { join } = require('path');
const { Variant } = HLS.types;
const fs = require('fs')

const urls = //["https://playertest.longtailvideo.com/adaptive/aes-with-tracks/master.m3u8",
    ["https://multiplatform-f.akamaihd.net/i/multi/will/bunny/big_buck_bunny_,640x360_400,640x360_700,640x360_1000,950x540_1500,.f4v.csmil/master.m3u8",
        "http://cdnapi.kaltura.com/p/1878761/sp/187876100/playManifest/entryId/1_2xvajead/flavorIds/1_tl01409m,1_kptb3ez8,1_re3akioy,1_wuylsxwp/format/applehttp/protocol/http/a.m3u8"]
//"https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8"]
//"http://amssamples.streaming.mediaservices.windows.net/634cd01c-6822-4630-8444-8dd6279f94c6/CaminandesLlamaDrama4K.ism/manifest(format=m3u8-aapl)"]
//"http://amssamples.streaming.mediaservices.windows.net/91492735-c523-432b-ba01-faba6c2206a2/AzureMediaServicesPromo.ism/manifest(format=m3u8-aapl)"]
//"http://amssamples.streaming.mediaservices.windows.net/69fbaeba-8e92-4740-aedc-ce09ae945073/AzurePromo.ism/manifest(format=m3u8-aapl)"];
let variantsDict = {};
let objectsArr = []
let keys = ['width', 'height']
let repDict = {}

async function parseStreamData(payload, uri) {
    const variants = [];
    let playlist = HLS.parse(await payload.text());
    playlist.uri = uri
    objectsArr = objectsArr.concat(playlist)
    for (let plainVariant of playlist.variants) {
        variants.push(new Variant(plainVariant));
    }

    return variants;
}

async function setup(urlsArr) {
    for (let idx in urlsArr) {
        let payload = await fetch(urlsArr[idx]);
        variantsDict[idx] = await parseStreamData(payload, urlsArr[idx]);
    }
}

async function algorithmA(urlsArr) {
    await setup(urlsArr)
    console.log("Algorithm A")
    let neededResolutions = getResolutions(variantsDict[0])
    if (neededResolutions.length != 1) {
        neededResolutions.pop()
    }
    let matchingArr = [objectsArr[0]]

    neededResolutions = removeDuplicates(neededResolutions)

    console.log("First URL's resolutions:", neededResolutions)

    for (let idx in variantsDict) {
        if (idx != 0) {
            let resolutionsArr = getResolutions(variantsDict[idx])
            resolutionsArr.pop()

            resolutionsArr = removeDuplicates(resolutionsArr)

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
                console.log("Matching resolution from", urlsArr[idx], resolutionsArr)
            } else {
                console.log("Not matching resolution from", urlsArr[idx], resolutionsArr)
            }
        }
    }
    makeRepDict(matchingArr, neededResolutions)
}

async function algorithmB(urlsArr) {
    await setup(urlsArr)
    console.log("Algorithm B")
    let resolutions = []
    for (let idx in variantsDict) {
        let tempArr = getResolutions(variantsDict[idx])
        if (tempArr.length != 1) {
            tempArr.pop()
        }
        tempArr = removeDuplicates(tempArr)
        resolutions.push(tempArr)
        console.log("Resolutions from this url: ", urlsArr[idx], tempArr)
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
                if (!matchingArr.includes(objectsArr[idx])) {
                    matchingArr.push(objectsArr[idx])
                }
                results.push(obj)
            }
        }
    }
    makeRepDict(matchingArr, removeDuplicates(results))
}

function makeRepDict(matchingArr, neededRep) {
    for (let playlist of matchingArr) {

        // remove duplicates
        let newVariants = []
        let visited = {}
        for (let variant of playlist.variants) {
            let resolution = variant.resolution
            if (typeof resolution !== 'undefined') {
                let index = resolution.width + 'x' + resolution.height

                if (typeof visited[index] === 'undefined') {
                    visited[index] = true
                    let minBand = Infinity
                    let selectedVar
                    for (let variantT of playlist.variants) {
                        if (variantT.resolution == resolution) {
                            if (variantT.bandwidth < minBand) {
                                selectedVar = variantT
                                minBand = variantT.bandwidth
                            }
                        }
                    }
                    if (!isValidHttpUrl(selectedVar.uri)) {
                        let masterUri = playlist.uri
                        const newUrl = masterUri.slice(0, masterUri.lastIndexOf('/'));
                        selectedVar.uri = newUrl + "/" + selectedVar.uri
                    }
                    newVariants.push(selectedVar)
                }
            }
        }

        for (let variant of newVariants) {
            checkResolution(neededRep, variant)
        }
    }
    joinSegments(neededRep)
}

function checkResolution(neededArr, variant) {
    let varTemp = new Variant(variant)
    let resolution = varTemp.resolution
    for (needed of neededArr) {
        if (typeof resolution !== 'undefined' && resolution.width == needed.width && resolution.height == needed.height) {
            let index = needed.width + 'x' + needed.height
            if (typeof repDict[index] === 'undefined') {
                repDict[index] = []
            }
            repDict[index].push(varTemp)
        }
    }
}

function isValidHttpUrl(string) {
    let url;

    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }

    return url.protocol === "http:" || url.protocol === "https:";
}

async function joinSegments(neededRes) {
    for (let res of neededRes) {
        let index = res.width + 'x' + res.height
        let variants = repDict[index]
        let segments = []
        let maxBand = -1
        let maxDuration = -1
        for (let variant of variants) {
            let payload = await fetch(variant.uri)
            let playlist = await parsePlaylistData(payload)
            maxDuration = Math.max(maxDuration, playlist.targetDuration)
            for (let segment of playlist.segments) {
                if (!isValidHttpUrl(segment.uri)) {
                    let variantUri = variant.uri
                    let newUrl = variantUri.slice(0, variantUri.lastIndexOf('/'));
                    segment.uri = newUrl + "/" + segment.uri
                }
            }
            segments.push(...playlist.segments)
            maxBand = Math.max(maxBand, variant.bandwidth)
        }
        let newPlaylist = new MediaPlaylist({
            segments: segments,
            endlist: true,
            targetDuration: maxDuration
        }
        )
        // write the file with that new mediaplaylist
        const content = HLS.stringify(newPlaylist)

        fs.writeFile(index + '.m3u8', content, err => {
            if (err) {
                console.error(err)
                return
            }
            //file written successfully
        })

        let newVariant = new Variant({
            uri: index + '.m3u8',
            resolution: res,
            bandwidth: maxBand
        })
        repDict[index] = newVariant
    }
    createMasterPlaylist(neededRes) //remove duplicates from bandwidth
}

function createMasterPlaylist(neededRes) {
    let variants = []
    for (let res of neededRes) {
        let index = res.width + "x" + res.height
        variants.push(repDict[index])
    }

    let masterPlaylist = new MasterPlaylist({
        variants: variants
    }
    )

    const content = HLS.stringify(masterPlaylist)

    fs.writeFile('master.m3u8', content, err => {
        if (err) {
            console.error(err)
            return
        }
        //file written successfully
    })
}

async function parsePlaylistData(payload) {
    let playlist = HLS.parse(await payload.text())
    return playlist
}

function getResolutions(variantsArr) {
    let result = []
    for (let variant of variantsArr) {
        let varTemp = new Variant(variant)
        result.push(varTemp.resolution)
    }
    return result
}

function removeDuplicates(arr) {
    arr = arr.filter(
        (s => o =>
            (k => !s.has(k) && s.add(k))
                (keys.map(k => o[k]).join('|'))
        )
            (new Set)
    );
    return arr
}

module.exports = {
    algorithmA,
    algorithmB
};