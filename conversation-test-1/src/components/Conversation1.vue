<template>
<body>
<!-- <div class="container"> -->
<div class="character" @click="start()">


</div>
<div class="start-box" v-if="isstart">
<button @click="startTalking()">聊天(还可以聊天{{ relationshipStore.talkchance }}次)</button>
<br>
<button @click="startAsking()">请教(还可以请教{{ relationshipStore.askchance }}次)</button>

</div>
<!-- </div> -->

<div class="ask-box" v-if="isasking">
    <div v-if="loading" class="loading">学姐正在思考中...</div>
    <div v-if="showanswer" class="answer">学姐的指点:{{ text_answer }}</div>
</div>

<div class='text-box'  v-if="istalking">
<input type="text" placeholder="开始与学姐对话" v-model="msg">
<button @click="sendMsg()" class="confirm">确定</button>
<button @click="backToStart()" class="back">返回</button>
<div v-if="loading" class="loading">学姐正在思考中...</div>
<div v-if="showresponse" class="response">学姐的回复:{{ text_response }}</div>
<div v-if="showrelation" class="relation">好感度变化：{{ showdelta }}，目前与学姐的好感度：{{ relationshipStore.relationship }}</div>
</div>

<!-- <div class="ask-box" @click="startAsking()" v-if="isasking"> -->


<!-- </div> -->

</body>

</template>


<script setup>
import { ref } from 'vue';
import { onBeforeUnmount } from 'vue';
import { usePropertyStore } from '../stores/property.js'
import { useRelationshipStore } from '../stores/relationship.js'
let isstart = ref(false);
let istalking = ref(false);
let isasking = ref(false);
let msg = ref('');
let loading = ref(false);
let showresponse = ref(false);
let text_response = ref('');
let showrelation = ref(false);
let showdelta = ref('');
let response = ref({});
let text_answer = ref('')
let showanswer = ref(false)
const propertyStore = usePropertyStore();
const relationshipStore = useRelationshipStore();
const ws = new WebSocket('ws://localhost:8000/ws');



function start(){
    if(!istalking.value && !isasking.value)
    isstart.value = true;
}

function startTalking(){
    istalking.value = true;
    isstart.value = false;
    relationshipStore.talkchance--;
}
function backToStart(){
    istalking.value = false;
}

function startAsking(){
    isasking.value = true;
    isstart.value = false;
    relationshipStore.askchance--;
    loading.value = true;
    ws.send(JSON.stringify({
        type: "player_input",
        method: 'ask',
        keypoint: '考研',
        npc_id :1
    }))
}

function sendMsg(){
    if(msg.value.trim()){
        ws.send(JSON.stringify({
            type: 'player_input',
            method:'talk',
            content: msg.value,
            npc_id: 1
        }))
    }
    msg.value = '';
    setTimeout(() => {
        loading.value = true;
    }, 1000);
}



ws.onmessage = function(event){
    response = JSON.parse(event.data)
    try{
    console.log(response)
    if(response["type"] === 'npc_response_talk'){
        text_response.value = response["content"]
        relationshipStore.relationship += response["delta"]
        showresponse.value = true
        showrelation.value = true
        if (response["delta"] > 0) {
          showdelta.value = "+" + response["delta"]
        } else {
          showdelta.value = response["delta"]
      }
      console.log(text_response.value)
      loading.value = false
    }
    if(response["type"] === 'npc_response_ask'){
        text_answer.value = response['content']
        switch(response['property']){
            case "intelligence":
                propertyStore.intelligence += 10
                break
            case "emotion" :
                propertyStore.emotion += 10
                break
            case "strength":
                propertyStore.strength += 10
                break
        }
        showanswer.value = true
        loading.value = false
    }
}catch(e){
        console.error("消息解析失败:",e)
    }
}

onBeforeUnmount(()=>{
    ws.close()
}
)

</script>


<style scoped>
body {
    background-image: url('../images/dormitory.png');
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    height: 100vh;
    margin: 0;
}
.container {
    display: flex;
}
.character {
    width: 150px;
    height: 500px;
    position: absolute;
    left:700px;
    top:250px;
    background-image: url('../images/character.jpg');
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    cursor:pointer;
}
.start-box {
    position: absolute;
    left:850px;
    top:250px;
    width: 300px;
    height: 200px;
}
.start-box button {
    margin: 50px;
    width: 200px;
    height: 100px;
    font-size: 16px;
    color: lightskyblue;
    background-image: url('../images/orange-button.png');
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    border-radius: 20px;
}
.text-box input {
    position:absolute;
    left: 800px;
    top: 400px;
    width: 300px;
    height: 100px;
   
    border-radius: 20px;
    padding: 20px;
}
.back{
    position: absolute;
    left:1000px;
    top:500px;
    width: 100px;
    height: 50px;
    background-image: url('../images/orange-button.png');
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    cursor: pointer;
}
.confirm {
    position: absolute;
    left:1100px;
    top:500px;
    width: 100px;
    height: 50px;
    background-image: url('../images/orange-button.png');
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    cursor: pointer;
}
.answer {
    position: absolute;
    left:500px;
    bottom: 100px;
    width: 800px;
    height: 100px;
    font-size: 16px;
    background-image: url('../images/blue-button.png');
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    z-index: 999
}
.loading {
    position: absolute;
    left:700px;
    top: 250px;
    z-index: 999
}
.response {
    position: absolute;
    left:500px;
    bottom: 100px;
    width: 800px;
    height: 100px;
    font-size: 16px;
    background-image: url('../images/blue-button.png');
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    z-index: 999
}
.relation {
    position: absolute;
    left:500px;
    bottom: 0px;
    width: 800px;
    height: 100px;
    font-size: 16px;
    background-image: url('../images/orange-button.png');
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
}
    

</style>