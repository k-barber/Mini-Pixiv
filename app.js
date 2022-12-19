
const express = require('express');
const tmi = require("tmi.js");
const cors = require("cors");
const fs = require('fs');
var formidable = require("formidable");
var mime = require('mime-types')
var sanitize = require("sanitize-filename");

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
    "bokunohi-ro-akademia" : "BNHA",
    // "beastars" : "Beastars",
    "sonobisukudo-ruhakoiwosuru" : "Bisque",
    "bureiburu-" : "Blazblue",
    "bleach" : "Bleach",
    "burenndoesu" : "Blend_S",
    "hitoriboxtsuchinomarumaruseikatsu" : "Hitori_Bocchi",
    "boxtsuchizarokku" : "Bocchi_the_Rock",
    "itainohaiyananodebougyorixyokunikyokufurishitaitoomoimasu" : "Bofuri",
    "yofukashinouta" : "Call_of_the_Night",
    "shinnchouyuusha" : "Cautious_Hero",
    "hatarakusaibouburakku" : "Cells_At_Work",
    "hatarakusaibou" : "Cells_At_Work",
    "Centaur's Worries" : "Centaur_No_Nayami",
    "chennso-mann" : "Chainsaw_Man",
    "chuunibyoudemokoigashitai" : "Chuunibyou",
    "senntouinnhakennshimasu" : "Combatants",
    "Cult_of_the_lamb": "Cult_of_the_Lamb",
    "cultofthelamb" : "Cult_of_the_Lamb",
    "saiba-pannkuejjirannna-zu" : "Cyberpunk_Edgerunners",
    "bokunokokoronoyabaiyatsu" : "Dangers_In_My_Heart",
    "Death Parade" : "Death_Parade",
    "demichannhakataritai" : "Demi_Chan",
    "matoseiheinosureibu" : "Demon_Slave",
    "dororo" : "Dororo",
    "douki" : "Douki_Chan",
    "dokidokibunngeibu" : "DDLC",
    "dokuta-suto-nn" : "Dr_Stone",
    "kobayashisannchinomeidoragonn" : "Dragon_Maid",
    "dannjonnmeshi" : "Dungeon_Meshi",
    "eizoukennnihatewodasuna" : "Eizouken",
    "eromanngasennsei" : "Eromanga",
    "eurekasebunn" : "Eureka_7",
    "Fullmetal Alchemist" : "FMA",
    "faia-emuburemu" : "Fire_Emblem",
    "faia-emuburemufuukasetsugetsu" : "Fire_Emblem",
    "ennennnoshouboutai" : "Fire_Force",
    "do-ruzufuronntorainn" : "Girls_Frontline",
    "goburinnsureiya-" : "Goblin_Slayer",
    "go-rudennkamui" : "Golden_Kamuy",
    // "LARGE_PLACEHOLDER_TEXT" : "Gravity_Falls",
    "Gleipnir" : "Gleipnir",
    "giruthigia" : "Guilty_Gear",
    // "LARGE_PLACEHOLDER_TEXT" : "Hades",
    "jibakushounennhanakokunn" : "Hanako_Kun",
    // "LARGE_PLACEHOLDER_TEXT" : "Helluva_Boss",
    // "LARGE_PLACEHOLDER_TEXT" : "Hensuki",
    "hitomisennseinohokennshitsu" : "Hitomi_sensei",
    "Higehiro" : "Higehiro",
    "LARGE_PLACEHOLDER_TEXT" : "Hokaido_Gals",
    "shinnryakuikamusume" : "Ika_Musume",
    "kyokousuiri" : "InSpectre",
    "ishuzokurebyua-zu" : "Interspecies_Reviewers",
    "inuyasha" : "Inuyasha",
    "mairimashitairumakunn" : "Iruma_San",
    // "LARGE_PLACEHOLDER_TEXT" : "Isekai_Quartet",
    "jahi-samahakujikenai" : "Jahy",
    "jitsuhawatashiha" : "Jitsu_Wa",
    // "LARGE_PLACEHOLDER_TEXT" : "JoJo",
    "Jujutsu Kaisen" : "Jujutsu_Kaisen",
    "keionn" : "K-On",
    "kaguyasamahakokurasetai" : "Kaguya",
    "otomekaijuukyaramerize" : "Kaiju_Caramelise",
    "kakegurui" : "Kakegurui",
    "kanojomokanojo" : "Kanojo_Kanojo",
    "hataagekemonomichi" : "Kemono_Michi",
    // "Kimetsu no Yaiba" : "Kimetsu_No_Yaiba",
    "koihasekaiseifukunoatode " : "Koi_Wa_Sekai",
    "komisannhakomyushoudesu" : "Komi_San",
    "konohi-ra-menndokusai" : "Kono_Healer",
    "konosuba" : "Konosuba",
    "konosubarashiisekainishukufukuwo" : "Konosuba",
    "kubosannhamobuwoyurusanai" : "Kubo",
    "kunoichitsubakinomunenouchi" : "Kunoichi_Tsubaki",
    // "LARGE_PLACEHOLDER_TEXT" : "LOGH",
    "ritoruwixtsuchiakademia" : "LWA",
    "League_of_Legends" : "League_of_Legends",
    "zerudanodennsetsu" : "Legend_of_Zelda",
    // "LARGE_PLACEHOLDER_TEXT" : "Lovecraft Girls",
    "rikorisurikoiru": "Lycoris_Recoil",
    // "LARGE_PLACEHOLDER_TEXT" : "MLP",
    "machikadomazoku" : "Machikado_Mazoku",
    "meidoinnabisu" : "Made_in_Abyss",
    "rennkinnsannkyuumajikarupoka-nn" : "Magical_Pokaan",
    "Magical Sempai" : "Magical_Senpai",
    "魔人アリス" : "Majin_Alice",
    "maoyuu" : "Maoyu",
    "metoroido" : "Metroid",
    "mierukochann" : "Mieruko_Chan",
    "Monster Girl Doctor" : "Monster_Girl_Doctor",
    "monnsuta-musumenoirunichijou" : "Monster_Musume",
    "mushokutennsei" : "Mushoku_Tensei",
    "sennpaigauzaikouhainohanashi" : "My_Senpai_Is_Annoying",
    "ijiranaidenagatorosann" : "Nagatoro",
    "Why the Hell are You Here Teacher!?" : "Nande_Koko_Ni",
    "naruto" : "Naruto",
    "gekkannshoujonozakikunn" : "Nozaki_Kun",
    "tsuujoukougekigazenntaikougekidenikaikougekinookaasannhasukidesuka" : "Okaasan_Online",
    "ousamarannkinngu" : "Ousama_Ranking",
    "オーバーロード" : "Overlord",
    // "LARGE_PLACEHOLDER_TEXT" : "Overwatch",
    "pannthianndosutokkinnguwizuga-ta-beruto" : "Panty_Stocking",
    "parasyte" : "Parasyte",
    // "LARGE_PLACEHOLDER_TEXT" : "Part_Timer",
    "Plastic Memories" : "Plastic_Memories",
    // "LARGE_PLACEHOLDER_TEXT" : "Portal",
    "paripikoumei" : "Paripi_Koumei",
    "purikonea-ru" : "Princess_Connect",
    "purinnsesukonekutoridaibu" : "Princess_Connect",
    "purizunnsuku-ru" : "Prison_School",
    "yakusokunoneba-ranndo" : "Promised_Neverland",
    // "LARGE_PLACEHOLDER_TEXT" : "Pseudo-Harem",
    "gotoubunnnohanayome" : "Quintessential_Quintuplets",
    "huumatsunowarukyu-re" : "Record_of_Ragnarok",
    "rikeigakoiniochitanodeshoumeishitemita" : "RikeKoi",
    "kaifukujutsushinoyarinaoshi" : "Redo_of_Healer",
    "ruridoragonn" : "Ruri_Dragon",
    // "LARGE_PLACEHOLDER_TEXT" : "Sailor_Moon",
    "刺客伍六七" : "Scissor_Seven",
    "sewayakikitsunenosennkosann" : "Senko_San",
    "nanatsunotaizai" : "Seven_Deadly_Sins",
    "tatenoyuushanonariagari" : "Shield_Hero",
    "kawaiidakejanaishikimorisann" : "Shikimori",
    "shado-hausu" : "Shadows_House",
    "shimonetatoiugainenngasonnzaishinaitaikutsunasekai" : "Shimoneta",
    "shinigamiboxtsuchanntokuromeido" : "Shinigami_Bochann",
    // "LARGE_PLACEHOLDER_TEXT" : "Sirius",
    "maoujoudeoyasumi" : "Sleepy_Princess",
    // "最近雇ったメイドが怪しい" : "Suspicious_Maid",
    // "LARGE_PLACEHOLDER_TEXT" : "Sound_Euphonium",
    // "LARGE_PLACEHOLDER_TEXT" : "Spice_And_Wolf",
    // "LARGE_PLACEHOLDER_TEXT" : "Spirit_Chronicles",
    "supaifamiri-" : "Spy_X_Family",
    "karakaijouzunotakagisann" : "Takagi_San",
    "bijinnonnnajoushitakizawasann" : "Takizawa_San",
    // "TEENTITANS" : "Teen_Titans",
    "That Time I Got Reincarnated as a Slime" : "Tensura",
    // "LARGE_PLACEHOLDER_TEXT" : "The_Girl_I_like_forgot_her_glasses",
    "tonikakukawaii" : "Tonikaku_Kawaii",
    "toradora" : "Toradora",
    "uchinokonotamenarabaorehamoshikashitaramaoumotaoserukamoshirenai" : "UchiMusume",
    "himoutoumaruchann" : "Umaru_Chan",
    // "LARGE_PLACEHOLDER_TEXT" : "Urusei_Yatsura",
    // "LARGE_PLACEHOLDER_TEXT" : "Useless_Ponko",
    "uzakichannhaasobitai" : "Uzaki_Chan",
    // "LARGE_PLACEHOLDER_TEXT" : "Vinland_Saga",
    "vivi" : "Vivy",
    // "LARGE_PLACEHOLDER_TEXT" : "Wander_Over_Yonder",
    "majonotabitabi" : "Wandering_Witch",
    "watashigamotenainohadoukanngaetemoomaeragawarui" : "Wataten",
    "watashinitennshigamaiorita" : "Wataten",
    // "LARGE_PLACEHOLDER_TEXT" : "Wendys",
    "atorieobuwixtsuchihatto" : "Witch_Hat",
    "wotakunikoihamuzukashii" : "Wotakoi",
    "kumichoumusumetosewagakari": "Yakusas_Guide",
    "youjosennki" : "Youjo_Senki",
    // "LARGE_PLACEHOLDER_TEXT" : "Your_Lie_in_April",
    // "LARGE_PLACEHOLDER_TEXT" : "Yozakura_Family",
    "yotsubato" : "Yotsuba",
    "zonnbiranndosaga" : "ZLS",
    "pokemonn" : "Pokemon"
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
            if (pixiv_dict[tag.romaji]){
                save_locations.push(pixiv_dict[tag.romaji]);
            };
            if (pixiv_dict[tag.tag]){
                save_locations.push(pixiv_dict[tag.tag]);
            };
            if (tag.tag === "R-18" || tag.tag === "R-18G"){
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
            newpath += "OC/";
            if (!fs.existsSync(newpath)){
                fs.mkdirSync(newpath, { recursive: true });
            }
            newpath += sanitize(files.fileupload.originalFilename) + "." + extension
            fs.rename(oldpath, newpath, function (err) {
                if (err) throw err;
                res.send("File uploaded");
                res.end();
            });
        } else {
            save_locations.forEach(location => {
                let dest = newpath + location + "/";
                if (!fs.existsSync(dest)){
                    fs.mkdirSync(dest, { recursive: true });
                }
                dest += sanitize(files.fileupload.originalFilename) + "." + extension;
                fs.copyFileSync(oldpath, dest);
                console.log(dest);
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