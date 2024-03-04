import * as chatapi from "./chatapi.js";

const ROOM_NAME = "test_room_group2";

function dom(id) {
    return document.getElementById(id);
}

//サインイン済みか判断し、適切なフォームを表示する
function check_signin() {
    //id="signin"のelement(ここではbutton)がクリックされたら実行される。

/*
   [async] (引数) => {処理内容} これは無名関数オブジェクトを作る式
*/
    dom("signin").onclick = async () => {
        const username = dom("username").value;
        const password = dom("password").value;
        await chatapi.signin(username, password); //サーバーにアクセスする関数は非同期なのでawaitが必要
        check_signin(); //これも非同期だが、後の処理がないのでawaitしない
    }

    dom("signout").onclick = async () => {
        await chatapi.signout();
        clear_messagees();
        check_signin();
    }

    //ログイン済みか確認
    chatapi.me().then((user) => {
        if (user) {
            //ログイン済みならユーザ名を表示
            dom("user").innerText = `${user.username}`
            dom("sf").hidden = true;
            dom("user_info").hidden = false;
            dom("main").hidden = false;
            dom("msger").hidden = false;
            //全メッセージを受信
            reload_messages();
            
            
        } else {
            dom("sf").hidden = false;
            dom("user_info").hidden = true;
            dom("main").hidden = true;
            dom("msger").hidden = true;
            
            

        }
    })

}

//チャットルーム名を取得(inputタグより)
function get_room_name() {
    return dom("room_name").value;
}

//xssを防ぐ必要があります(xssは検索してください)
const white_list = {
    whiteList: { //許可するhtmlタグと属性のリスト
        b: [], i: [], s: [], u: [],
        font: [], pre: [],
        h1: [], h2: [], h3: [], h4: [],
        table: [], tr: [], td: [],
        sub: [], sup: []
    }
};
function sanitize_html(html) {
    return filterXSS(html, white_list); //white listにないタグは削除される
}

//全メッセージを削除（表示のみ）
function clear_messagees() {
    const container = dom("messages");
    container.innerHTML = "";
}

//メッセージを追加(表示のみ)
function add_message(m) {
    const container = dom("messages");
    const message_wrapper = document.createElement("div")
    const user_name = dom("user");
    if (user_name.textContent == m.sender_id){
        message_wrapper.className = "msg right-msg"
    }else {
        message_wrapper.className = "msg left-msg"
    }

    const msg_bubble = document.createElement("div")
    msg_bubble.className = "msg-bubble"

    const msg_info = document.createElement("div")
    msg_info.className = "msg-info"

    const msg_info_name = document.createElement("div")
    msg_info_name.className = "msg-info-name"

    const msg_text = document.createElement("div")
    msg_text.className = "msg-text"





    msg_text.innerText = JSON.stringify(m);


    const message_text = `${m.text}`;
    const msg_username = `${m.sender_id}`;
    msg_text.innerHTML = sanitize_html(message_text);
    msg_info_name.innerHTML = sanitize_html(msg_username);



    msg_info.appendChild(msg_info_name);
    msg_info.appendChild(msg_text);
    msg_bubble.appendChild(msg_info);
    message_wrapper.appendChild(msg_bubble);
    container.appendChild(message_wrapper);
    

}

//サーバーからのレスポンスを表示(おそらく実際のアプリでは、より親切なテキストに変換する必要あり)
function show_server_message(text) {
    console.log("server:" + text);
    dom("server_message").innerText = text;
}


//チャットクライアントオブジェクト作成(websocketなどの制御)
const client = new chatapi.ChatClinet();

//全メッセージを受信し表示を更新
async function reload_messages() {
    const messages = await client.get_messages(get_room_name());

    clear_messagees();
    for (const m of messages) {
        add_message(m);
    }
}


//google翻訳のAPIを使って翻訳する
function translation(text) {
    let fromLang = 'ja'
    let toLang = 'en'
    let apiKey = 'AIzaSyAXDgy3uHCjELy16IL4eQ8HW4LkyWA3AKs'

    // 翻訳
    const URL = "https://translation.googleapis.com/language/translate/v2?key="+apiKey+
    "&q="+encodeURI(m.text)+"&source="+fromLang+"&target="+toLang
    let xhr = new XMLHttpRequest()
    xhr.open('POST', [URL], false)
    xhr.send();
    var translated_text= ""
    if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText); 
        translated_text =res["data"]["translations"][0]["translatedText"]
    }
    return translated_text
}





//メイン
async function main() {

    //サインイン済みか確認しフォームの表示などを行う
    check_signin();

    //デフォルトルーム名を設定
    dom("room_name").value = ROOM_NAME;


    //メッセージ受信の処理(websocketによりリアルタイム配信)
    client.onmessage = (m) => {
        add_message(m);
    }

    
    //メッセージ更新の処理(dbを表示の同期をとる。メッセージが削除された時など。)
    client.onreload = () => {
        reload_messages();
    }

    //websocketの接続要求
    client.onopen = () => {
        show_server_message("connected");
    }
    show_server_message("connecting to chat server...");
    client.connect();

    //room更新ボタンの処理
    dom("reload_messages").onclick = async () => {
        reload_messages();
    }

    //投稿ボタンの処理
    dom("post_message").onclick = async () => {
        const text = dom("message").value;
        client.post_message(get_room_name(), "None", text);
        // await chatapi.post_message(get_room_name(), "None", text);
        // update_messages();
    }

    //更新ボタンの処理
    dom("update_message").onclick = async () => {
        const id = dom("update_message_id").value;
        const text = dom("updated_message").value;
        // console.log("uodate", id, text)
        client.update_message(id, text);
    }

    //削除ボタンの処理
    dom("delete_message").onclick = async () => {
        const id = dom("delete_message_id").value;
        const res = await client.delete_message(id);
        show_server_message(JSON.stringify(res));
    }

    //全削除ボタンの処理
    dom("delete_all_messages").onclick = async () => {
        const res = await client.delete_all_messages(get_room_name());
        show_server_message(JSON.stringify(res));
    }

    //まずは全メッセージ受信
    reload_messages();
}

main()



