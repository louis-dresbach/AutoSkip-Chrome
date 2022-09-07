
const gogoanime = [ // GogoAnime domains
	"gogoanime.lu", 
	"www1.gogoanime.ee",
	"gogoanime.ee",
	"gogoanime.tel"
]
const bs = [ // BurningSeries domains
	"bs.to",
	"burningseries.co",
	"burningseries.sx",
	"burningseries.ac",
	"burningseries.vc",
	"burningseries.cx",
	"burningseries.nz",
	"burningseries.se",
	"burningseries.tw"
];
	
	
const _jw = [ // websites that use JWPlayer
	"goload.io",
	"gogohd.net",
	"videovard.sx"
];
const _vjs = [ // websites where we access everything through the HTML5 video element
	"vupload.com",
	"streamz.ws",
	"vidoza.net"
];


const parseTime = (input) => {
	let ret = 0;
	let s = input.split(":");
	if(s.length == 3) {
		ret += parseInt(s[0]) * 60 * 60;
		ret += parseInt(s[1]) * 60;
		ret += parseInt(s[2]);
	}
	else if(s.length == 2) {
		ret += parseInt(s[0]) * 60;
		ret += parseInt(s[1]);
	}
	return ret;
};

const capitalize = (str) => {
	str = str.toLowerCase();
    str = str.split(" ");

    for (var i = 0; i < str.length; i++) {
        str[i] = str[i][0].toUpperCase() + str[i].substr(1);
    }

    return str.join(" ");
}

const injectScript = (filePath, tag) => {
	let node = document.getElementsByTagName(tag)[0];
	let script = document.createElement("script");
	script.setAttribute("type", "text/javascript");
	script.setAttribute("src", filePath);
	node.appendChild(script);
}