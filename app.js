
const express = require('express');
const tmi = require("tmi.js");
const cors = require("cors");
const fs = require('fs');
var formidable = require("formidable");
var mime = require('mime-types')

const app = express();
app.use(express.json());

const messages = [];

// var jsonContent = JSON.parse(contents);

app.use(cors());

app.options('*', cors());


var settings = JSON.parse(fs.readFileSync('settings.json'));

const pixiv_dict = {
    "aharennsannhahakarenai" : "Aharen_San",
    "ahoga-ru" : "Aho-Girl",
    "kiminokotogadaidaidaidaidaisukinahyakuninnnokanojo" : "100_Girlfriends",
    "suraimutaoshitesannbyakunenn" : "300_Year_Slime",
    "yannchagyarunoannjousann" : "Anjou_San",
    "shinngekinokyojinn" : "AoT",
    "soredemoayumuhayosetekuru" : "ayumu",
    // "My Hero Academia" : "BNHA",
    // "beastars" : "Beastars",
    "sonobisukudo-ruhakoiwosuru" : "Bisque",
    "レイチェル=アルカード" : "Blazblue",
    "bleach" : "Bleach",
    "Blend S" : "Blend_S",
    "bocchi" : "Bocchi",
    "bofuri" : "Bofuri",
    "よふかしのうた" : "Call_of_the_Night",
    "Overpowered but Overly Cautious" : "Cautious_Hero",
    "Cells at Work" : "Cells_At_Work",
    "Centaur's Worries" : "Centaur_No_Nayami",
    "Chainsaw Man" : "Chainsaw_Man",
    "chuunibyou" : "Chuunibyou",
    "Combatants Will" : "Combatants",
    "The Dangers in My Heart" : "Dangers_In_My_Heart",
    "Death Parade" : "Death_Parade",
    "Interviews with Monster Girls" : "Demi_Chan",
    "Slave of the Magic Capital's Elite Troops" : "Demon_Slave",
    "Dororo" : "Dororo",
    "douki" : "Douki_Chan",
    "Doki Doki" : "DDLC",
    "(Dr. Stone|Dr.STONE)" : "Dr_Stone",
    "Dragon Maid" : "Dragon_Maid",
    "Delicious in Dungeon" : "Dungeon_Meshi",
    "Eizouken" : "Eizouken",
    "Eromanga-sensei" : "Eromanga",
    "Eureka Seven" : "Eureka_7",
    "Fullmetal Alchemist" : "FMA",
    "fire emblem" : "Fire_Emblem",
    "Fire Brigade of Flames" : "Fire_Force",
    "Girls' Frontline" : "Girls_Frontline",
    "Goblin Slayer" : "Goblin_Slayer",
    "Golden Kamuy" : "Golden_Kamuy",
    "LARGE_PLACEHOLDER_TEXT" : "Gravity_Falls",
    "Gleipnir" : "Gleipnir",
    "ギルティギア" : "Guilty_Gear",
    "LARGE_PLACEHOLDER_TEXT" : "Hades",
    "Toilet-bound Hanako-kun" : "Hanako_Kun",
    "LARGE_PLACEHOLDER_TEXT" : "Helluva_Boss",
    "LARGE_PLACEHOLDER_TEXT" : "Hensuki",
    "hitomisennseinohokennshitsu" : "Hitomi_sensei",
    "Higehiro" : "Higehiro",
    "LARGE_PLACEHOLDER_TEXT" : "Hokaido_Gals",
    "squid girl" : "Ika_Musume",
    "In/Spectre" : "InSpectre",
    "Interspecies Reviewers" : "Interspecies_Reviewers",
    "inuyasha" : "Inuyasha",
    "Iruma-kun" : "Iruma_San",
    "LARGE_PLACEHOLDER_TEXT" : "Isekai_Quartet",
    "ジャヒ" : "Jahy",
    "My Monster Secret" : "Jitsu_Wa",
    "LARGE_PLACEHOLDER_TEXT" : "JoJo",
    "Jujutsu Kaisen" : "Jujutsu_Kaisen",
    "K-On" : "K-On",
    "Kaguya-Sama" : "Kaguya",
    "otomekaijuukyaramerize" : "Kaiju_Caramelise",
    "Kakegurui" : "Kakegurui",
    "Kanojo mo Kanojo" : "Kanojo_Kanojo",
    "Kemono Michi" : "Kemono_Michi",
    "Kimetsu no Yaiba" : "Kimetsu_No_Yaiba",
    "恋は世界征服のあとで " : "Koi_Wa_Sekai",
    "Komi Can't Communicate" : "Komi_San",
    "このヒーラー" : "Kono_Healer",
    "konosuba" : "Konosuba",
    "konosubarashiisekainishukufukuwo" : "Konosuba",
    "kubosann" : "Kubo",
    "Kunoichi Tsubaki" : "Kunoichi_Tsubaki",
    "LARGE_PLACEHOLDER_TEXT" : "LOGH",
    "Little Witch Academia" : "LWA",
    "League.?of.?Legends" : "League_of_Legends",
    "zelda" : "Legend_of_Zelda",
    "LARGE_PLACEHOLDER_TEXT" : "Lovecraft Girls",
    "LARGE_PLACEHOLDER_TEXT" : "MLP",
    "The Demon Girl Next Door" : "Machikado_Mazoku",
    "Made in Abyss" : "Made_in_Abyss",
    "MagiPoka" : "Magical_Pokaan",
    "Magical Sempai" : "Magical_Senpai",
    "魔人アリス" : "Majin_Alice",
    "maoyuu" : "Maoyu",
    "metroid" : "Metroid",
    "mierukochann" : "Mieruko_Chan",
    "Monster Girl Doctor" : "Monster_Girl_Doctor",
    "Everyday Life with Monster Girls" : "Monster_Musume",
    "mushokutennsei" : "Mushoku_Tensei",
    "先輩がうざい後輩の話" : "My_Senpai_Is_Annoying",
    "Nagatoro" : "Nagatoro",
    "Why the Hell are You Here Teacher!?" : "Nande_Koko_Ni",
    "(naruto|hinata hy)" : "Naruto",
    "Monthly Girls' Nozaki-kun" : "Nozaki_Kun",
    "Do You Love Your Mom and her Two-Hit Multi-Target Attacks?" : "Okaasan_Online",
    "王様ランキング" : "Ousama_Ranking",
    "オーバーロード" : "Overlord",
    "LARGE_PLACEHOLDER_TEXT" : "Overwatch",
    "パンティ&ストッキングwithガーターベルト" : "Panty_Stocking",
    "parasyte" : "Parasyte",
    "LARGE_PLACEHOLDER_TEXT" : "Part_Timer",
    "Plastic Memories" : "Plastic_Memories",
    "LARGE_PLACEHOLDER_TEXT" : "Portal",
    "パリピ孔明" : "Paripi_Koumei",
    "Princess Connect" : "Princess_Connect",
    "Prison School" : "Prison_School",
    "The Promised Neverland" : "Promised_Neverland",
    "LARGE_PLACEHOLDER_TEXT" : "Pseudo-Harem",
    "gotoubunnnohanayome" : "Quintessential_Quintuplets",
    "Record of Ragnarok" : "Record_of_Ragnarok",
    "理系が恋に落ちたので" : "RikeKoi",
    "Kaifuku Jutsushi no Yarinaoshi" : "Redo_of_Healer",
    "LARGE_PLACEHOLDER_TEXT" : "Sailor_Moon",
    "刺客伍六七" : "Scissor_Seven",
    "Sewayaki Kitsune no Senko-san" : "Senko_San",
    "The Seven Deadly Sins" : "Seven_Deadly_Sins",
    "The Rising of the Shield Hero" : "Shield_Hero",
    "可愛いだけじゃない式守さん" : "Shikimori",
    "Shimoneta" : "Shimoneta",
    "shinigamiboxtsuchanntokuromeido" : "Shinigami_Bochann",
    "LARGE_PLACEHOLDER_TEXT" : "Sirius",
    "Sleeping Princess" : "Sleepy_Princess",
    "最近雇ったメイドが怪しい" : "Suspicious_Maid",
    "LARGE_PLACEHOLDER_TEXT" : "Sound_Euphonium",
    "LARGE_PLACEHOLDER_TEXT" : "Spice_And_Wolf",
    "LARGE_PLACEHOLDER_TEXT" : "Spirit_Chronicles",
    "supaifamiri-" : "Spy_X_Family",
    "Takagi-san" : "Takagi_San",
    "takizawa" : "Takizawa_San",
    "TEENTITANS" : "Teen_Titans",
    "That Time I Got Reincarnated as a Slime" : "Tensura",
    "LARGE_PLACEHOLDER_TEXT" : "The_Girl_I_like_forgot_her_glasses",
    "トニカクカワイイ" : "Tonikaku_Kawaii",
    "toradora" : "Toradora",
    "If It's for My Daughter I'd Even Defeat a Demon Lord" : "UchiMusume",
    "Himouto! Umaru-chan" : "Umaru_Chan",
    "LARGE_PLACEHOLDER_TEXT" : "Urusei_Yatsura",
    "LARGE_PLACEHOLDER_TEXT" : "Useless_Ponko",
    "Uzaki-chan wa Asobitai!" : "Uzaki_Chan",
    "LARGE_PLACEHOLDER_TEXT" : "Vinland_Saga",
    "Vivy" : "Vivy",
    "LARGE_PLACEHOLDER_TEXT" : "Wander_Over_Yonder",
    "Wandering Witch" : "Wandering_Witch",
    "Wataten" : "Wataten",
    "LARGE_PLACEHOLDER_TEXT" : "Wendys",
    "Witch Hat Atelier" : "Witch_Hat",
    "Wotakoi" : "Wotakoi",
    "The Saga of Tanya the Evil" : "Youjo_Senki",
    "LARGE_PLACEHOLDER_TEXT" : "Your_Lie_in_April",
    "LARGE_PLACEHOLDER_TEXT" : "Yozakura_Family",
    "Zombieland Saga" : "ZLS",
    "pok.mon" : "Pokemon"
}

app.post('/api/download', (req, res)=>{
    console.log("FILE!")
    var form = new formidable.IncomingForm({
        uploadDir: 'D:/Downloads/PxDownloader/'
    });
    form.parse(req, function(err, fields, files){
        // console.log(files);
        // console.log("FILE saved: " + files.fileupload.filepath);

        // console.log(fields);
        var tags = JSON.parse(fields.tags);

        var save_locations = [];
        var nsfw = false;

        // console.log(tags);

        tags.forEach(function(tag){
            // console.log(tag);
            if (tag.tag === "R-18"){
                nsfw = true;
            }
            if (pixiv_dict[tag.romaji]){
                save_locations.push(pixiv_dict[tag.romaji]);
            };
            if (tag.tag === "R-18"){
                nsfw = true;
            }
        })

        save_locations = [...new Set(save_locations)] //Get unique

        console.log(save_locations);

        var oldpath = files.fileupload.filepath;
        var extension = mime.extension(files.fileupload.mimetype);

        var newpath = 'D:/Downloads/PxDownloader/Sorted/'
        
        if (nsfw == true){
            newpath += "NSFW/"
        } else {
            newpath += "SFW/"
        }

        if (save_locations.length === 0 ){
            newpath = newpath + "oc/" + files.fileupload.originalFilename + "." + extension;
            if (!fs.existsSync(newpath)){
                fs.mkdirSync(newpath, { recursive: true });
            }
            fs.rename(oldpath, newpath, function (err) {
                if (err) throw err;
                res.send("File uploaded");
                res.end();
            });
        } else {
            save_locations.forEach(location => {
                let dest = newpath + location + "/" + files.fileupload.originalFilename + "." + extension;
                if (!fs.existsSync(newpath)){
                    fs.mkdirSync(newpath, { recursive: true });
                }
                fs.copyFileSync(oldpath, dest);
            });
            res.send("File uploaded");
            res.end();
            fs.unlink(oldpath, function(){});
        }

        
        

        // for each tag, get the romanji, set that to the key
        // tag lookup via romanji as dict key - no regex, no contains
        // 
        
    });
});

const port = process.env.PORT || 8080;
app.listen(port, ()=> console.log(`Listening on port ${port}`))