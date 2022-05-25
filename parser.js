const { EventEmitter } = require('events');
const HLS = require('hls-parser');
const { Variant } = HLS.types;

const emitter = new EventEmitter();

const urls = ["http://media.developer.dolby.com/DolbyVision_Atmos/profile5_HLS/master.m3u8", 
            "https://multiplatform-f.akamaihd.net/i/multi/april11/sintel/sintel-hd_,512x288_450_b,640x360_700_b,768x432_1000_b,1024x576_1400_m,.mp4.csmil/master.m3u8"];
let dictionary = [];

async function parseStreamData(payload) {
    const variants = [];
    let playlist = HLS.parse(await payload.text());
    for (let plainVariant of playlist.variants) {
        variants.push(new Variant(plainVariant));
    }

    return variants;
}

async function run() {
    for(let url of urls) {
        let payload = await fetch(url);
        dictionary = dictionary.concat(await parseStreamData(payload));
    }
    
    console.log('dict:', dictionary);
}
run();

//Entonces puedo usar el for in y voy añadiendo el índice al diccionario