const HLS = require('hls-parser');
const { Playlist, MasterPlaylist, MediaPlaylist, Rendition } = require('hls-parser/types');
const { join } = require('path');
const { Variant } = HLS.types;
const fs = require('fs')

let testURL = ["https://mtoczko.github.io/hls-test-streams/test-group/playlist.m3u8", "https://playertest.longtailvideo.com/adaptive/elephants_dream_v4/redundant.m3u8",
        "http://cdnapi.kaltura.com/p/1878761/sp/187876100/playManifest/entryId/1_2xvajead/flavorIds/1_tl01409m,1_kptb3ez8,1_re3akioy,1_wuylsxwp/format/applehttp/protocol/http/a.m3u8",
"https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8",
"http://amssamples.streaming.mediaservices.windows.net/634cd01c-6822-4630-8444-8dd6279f94c6/CaminandesLlamaDrama4K.ism/manifest(format=m3u8-aapl)",
"http://amssamples.streaming.mediaservices.windows.net/91492735-c523-432b-ba01-faba6c2206a2/AzureMediaServicesPromo.ism/manifest(format=m3u8-aapl)",
"http://amssamples.streaming.mediaservices.windows.net/69fbaeba-8e92-4740-aedc-ce09ae945073/AzurePromo.ism/manifest(format=m3u8-aapl)",
"https://playertest.longtailvideo.com/adaptive/oceans_aes/oceans_aes.m3u8",
"https://storage.googleapis.com/shaka-demo-assets/angel-one-hls/hls.m3u8","https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8", "https://playertest.longtailvideo.com/adaptive/elephants_dream_v4/redundant.m3u8",
"https://d3rlna7iyyu8wu.cloudfront.net/skip_armstrong/skip_armstrong_stereo_subs.m3u8", "https://playertest.longtailvideo.com/adaptive/hls-test-streams/test-audio-pdt/playlist.m3u8",
"https://playertest.longtailvideo.com/adaptive/hls-test-streams/test-audio-pdt/playlist.m3u8", "https://mtoczko.github.io/hls-test-streams/test-group/playlist.m3u8", "https://playertest.longtailvideo.com/adaptive/elephants_dream_v4/redundant.m3u8",
"https://playertest.longtailvideo.com/adaptive/hls-test-streams/test-audio-pdt/playlist.m3u8", "https://playertest.longtailvideo.com/adaptive/elephants_dream_v4/redundant.m3u8",
"http://amssamples.streaming.mediaservices.windows.net/634cd01c-6822-4630-8444-8dd6279f94c6/CaminandesLlamaDrama4K.ism/manifest(format=m3u8-aapl)", 
"http://amssamples.streaming.mediaservices.windows.net/91492735-c523-432b-ba01-faba6c2206a2/AzureMediaServicesPromo.ism/manifest(format=m3u8-aapl)",
"http://cdnapi.kaltura.com/p/1878761/sp/187876100/playManifest/entryId/1_2xvajead/flavorIds/1_tl01409m,1_kptb3ez8,1_re3akioy,1_wuylsxwp/format/applehttp/protocol/http/a.m3u8",
"https://test-streams.mux.dev/test_001/stream.m3u8"]

let variantsDict = {};
let linksDict = {};
let objectsArr = [];
let keys = ['width', 'height'];
let repDict = {};

// obtain object representation from master manifests
async function parseStreamData(payload, uri) {
    const variants = [];
    let playlist = HLS.parse(await payload.text());
    playlist.uri = uri;
    objectsArr = objectsArr.concat(playlist)
    for (let plainVariant of playlist.variants) {
        variants.push(new Variant(plainVariant));
    }

    return variants;
}

// fill variants dictionary
async function setup(urlsArr) {
    for (let idx in urlsArr) {
        let payload = await fetch(urlsArr[idx]);
        variantsDict[idx] = await parseStreamData(payload, urlsArr[idx]);
    }
}

async function algorithmA(urlsArr) {
    await setup(urlsArr);
    console.log("Algorithm A");
    // save resolutions from first stream url
    let neededResolutions = getResolutions(variantsDict[0])
    if (neededResolutions.length != 1) {
        neededResolutions.pop()
    }
    let matchingArr = [objectsArr[0]]

    neededResolutions = removeDuplicates(neededResolutions);

    console.log("First URL's resolutions:", neededResolutions);
    // iterate all variants from all streams
    for (let idx in variantsDict) {
        if (idx != 0) {
            let resolutionsArr = getResolutions(variantsDict[idx]);
            resolutionsArr.pop();

            resolutionsArr = removeDuplicates(resolutionsArr);

            let tempMatch = [];
            //get resolutions that match with first stream
            for (let x of neededResolutions) {
                for (let y of resolutionsArr) {
                    if (x.width == y.width && x.height == y.height) {
                        tempMatch.push(y);
                        break;;
                    }
                }
            }

            let neededString = JSON.stringify(neededResolutions);
            let matchString = JSON.stringify(tempMatch);
            // the resolutions retrieved must equal the first stream's
            if (neededString === matchString) {
                matchingArr.push(objectsArr[idx])
                console.log("Matching resolution from", urlsArr[idx], resolutionsArr);
            } else {
                console.log("Not matching resolution from", urlsArr[idx], resolutionsArr);
            }
        }
    }
    // create master manifest
    makeRepDict(matchingArr, neededResolutions)
}

async function algorithmB(urlsArr) {
    await setup(urlsArr)
    console.log("Algorithm B");
    let resolutions = [];
    // obtain all resolutions
    for (let idx in variantsDict) {
        let tempArr = getResolutions(variantsDict[idx])
        if (tempArr.length != 1) {
            tempArr.pop()
        }
        tempArr = removeDuplicates(tempArr)
        resolutions.push(tempArr)
        console.log("Resolutions from this url: ", urlsArr[idx], tempArr)
    }
    let results = [];
    let matchingArr = [];
    // find intersection
    for (let idx in resolutions) {
        let arr = resolutions[idx];
        for (let obj of arr) {
            let contFound = 0;
            for (let arrT of resolutions) {
                if (arr != arrT) {
                    for (let objT of arrT) {
                        if (obj.width == objT.width && obj.height == objT.height) {
                            contFound++;
                            break;
                        }
                    }
                }
            }
            // intersections exists if number of times a resolution appears equals the amount of elements in the array
            if (contFound == resolutions.length - 1) {
                if (!matchingArr.includes(objectsArr[idx])) {
                    matchingArr.push(objectsArr[idx])
                }
                results.push(obj)
            }
        }
    }
    // create master manifest
    makeRepDict(matchingArr, removeDuplicates(results))
}

// save variants for each matching resolution
function makeRepDict(matchingArr, neededRep) {
    for (let playlist of matchingArr) {

        let newVariants = [];
        let visited = {};
        for (let variant of playlist.variants) {
            let resolution = variant.resolution
            if (typeof resolution !== 'undefined') {
                let index = resolution.width + 'x' + resolution.height;

                if (typeof visited[index] === 'undefined') {
                    visited[index] = true
                    let minBand = Infinity;
                    let selectedVar;
                    for (let variantT of playlist.variants) {
                        if (variantT.resolution == resolution) {
                            if (variantT.bandwidth < minBand) {
                                selectedVar = variantT
                                minBand = variantT.bandwidth;
                            }
                        }
                    }
                    // handle relativ url paths
                    if (!isValidHttpUrl(selectedVar.uri)) {
                        let masterUri = playlist.uri;
                        const newUrl = masterUri.slice(0, masterUri.lastIndexOf('/'));
                        selectedVar.uri = newUrl + "/" + selectedVar.uri
                        linksDict[selectedVar.uri] = masterUri
                    } 
                    newVariants.push(selectedVar)
                }
            }
        }
        // from the matching streams, find the variants that matched
        for (let variant of newVariants) {
            checkResolution(neededRep, variant)
        }
    }
    // concatenate video and audio segments in the same media playlist
    joinSegments(neededRep)
}

// obtain matching variant
function checkResolution(neededArr, variant) {
    let varTemp = new Variant(variant);
    let resolution = varTemp.resolution;
    for (let needed of neededArr) {
        if (typeof resolution !== 'undefined' && resolution.width == needed.width && resolution.height == needed.height) {
            let index = needed.width + 'x' + needed.height
            if (typeof repDict[index] === 'undefined') {
                repDict[index] = [];
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

// concatenate new video and audio segments for each matching variant
async function joinSegments(neededRes) {
    for (let res of neededRes) {
        let index = res.width + 'x' + res.height;
        let variants = repDict[index];
        let segments = [];
        let audioSegments = []
        let maxBand = -1;
        let maxDuration = -1;
        let maxVersion = -1;
        let maxAudioDuration = -1;
        let maxAudioVersion = -1;

        for (let variant of variants) {
            let payload = await fetch(variant.uri);
            let playlist = await parsePlaylistData(payload);
            // handle target duration tag
            maxDuration = Math.max(maxDuration, playlist.targetDuration)
            // join audio segments
            let found = false
            for (let index in variant.audio) {
                let audio = variant.audio[index]
                let rendition = new Rendition(audio)
                if (rendition.isDefault || (!found && index == variant.audio.length - 1)) {
                    found = true
                    if (!isValidHttpUrl(rendition.uri)) {
                        let masterUri = linksDict[variant.uri]
                        let newUrl = masterUri.slice(0, masterUri.lastIndexOf('/'));
                        rendition.uri = newUrl + "/" + rendition.uri

                        let audioPayload = await fetch(rendition.uri);
                        let audioPlaylist = await parsePlaylistData(audioPayload);
                        maxAudioDuration = Math.max(maxAudioDuration, audioPlaylist.targetDuration)

                        for (let index in audioPlaylist.segments) {
                            let segment = audioPlaylist.segments[index]
                            if (!isValidHttpUrl(segment.uri)) {
                                let renditionUri = rendition.uri;
                                let newUrl = renditionUri.slice(0, renditionUri.lastIndexOf('/'));
                                segment.uri = newUrl + "/" + segment.uri
                                segment.programDateTime = null
                                if (index == 0) {
                                    segment.discontinuity = true
                                }
                            }
                        }
                        audioSegments.push(...audioPlaylist.segments)
                        maxAudioVersion = Math.max(maxAudioVersion, audioPlaylist.version)
                    }
                }
            }
            // join video segments
            for (let index in playlist.segments) {
                let segment = playlist.segments[index]
                if (!isValidHttpUrl(segment.uri)) {
                    let variantUri = variant.uri;
                    let newUrl = variantUri.slice(0, variantUri.lastIndexOf('/'));
                    segment.uri = newUrl + "/" + segment.uri
                    segment.programDateTime = null
                    if (index == 0) {
                        segment.discontinuity = true
                    }
                }
            }
            segments.push(...playlist.segments)
            maxBand = Math.max(maxBand, variant.bandwidth)
            maxVersion = Math.max(maxVersion, playlist.version)
        }
        // create variant playlist manifest
        let newPlaylist = new MediaPlaylist({
            segments: segments,
            endlist: true,
            targetDuration: maxDuration,
            version: maxVersion
        }
        )
        // write the file with that new mediaplaylist
        const content = HLS.stringify(newPlaylist)

        fs.writeFile(index + '.m3u8', content, err => {
            if (err) {
                console.error(err);
                return;
            }
            //file written successfully
        })
        // create new master manifest variant object
        let newVariant = new Variant({
            uri: index + '.m3u8',
            resolution: res,
            bandwidth: maxBand
        })
        // add audio attribute only audio tracks were present
        if (audioSegments.length != 0) {
            let audio = createAudioPlaylist(audioSegments, maxAudioDuration, maxAudioVersion)
            newVariant.audio = [audio]
        }
        repDict[index] = newVariant
    }
    createMasterPlaylist(neededRes)
}

// write new audio medi playlist with audio segments all joined
function createAudioPlaylist(audioSegments, maxAudioDuration, maxAudioVersion) {
    let newAudioPlaylist = new MediaPlaylist({
        segments: audioSegments,
        endlist: true,
        targetDuration: maxAudioDuration,
        version: maxAudioVersion
    })

    const content = HLS.stringify(newAudioPlaylist)

    fs.writeFile('audio.m3u8', content, err => {
        if (err) {
            console.error(err);
            return;
        }
        //file written successfully
    })

    let rendition = new Rendition({
        type: 'AUDIO',
        uri: 'audio.m3u8',
        groupId: 'audio',
        name: 'audio'
    })

    return rendition;
}

// write final master playlist with matching variants media playlists and video/audio segments concatenated
function createMasterPlaylist(neededRes) {
    let variants = [];
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
            console.error(err);
            return;
        }
        //file written successfully
    })
}

// parse manifest text into object representation
async function parsePlaylistData(payload) {
    let playlist = HLS.parse(await payload.text());
    return playlist;
}

// obtain only resolutions attribute
function getResolutions(variantsArr) {
    let result = [];
    for (let variant of variantsArr) {
        let varTemp = new Variant(variant);
        result.push(varTemp.resolution)
    }
    return result;
}

function removeDuplicates(arr) {
    arr = arr.filter(
        (s => o =>
            (k => !s.has(k) && s.add(k))
                (keys.map(k => o[k]).join('|'))
        )
            (new Set)
    );
    return arr;
}

module.exports = {
    algorithmA,
    algorithmB
};