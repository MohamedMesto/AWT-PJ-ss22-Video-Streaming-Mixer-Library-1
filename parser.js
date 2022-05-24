const HLS = require('hls-parser'); // For node
const urls = ["https://multiplatform-f.akamaihd.net/i/multi/april11/sintel/sintel-hd_,512x288_450_b,640x360_700_b,768x432_1000_b,1024x576_1400_m,.mp4.csmil/master.m3u8", 
                "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8"];


for (let i in urls) {
    fetch(urls[i])
    .then(response => response.text())
    .then(data => {
      const playlist = HLS.parse(data);
      console.log(playlist)
    });
}

